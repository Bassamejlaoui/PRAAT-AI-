
import { StoredSessionState, SRSItem } from './types';

const DB_NAME = 'PraatInternalDB';
const DB_VERSION = 3; // Incremented for SRS Store
const STORE_PROGRESS = 'user_progress';
const STORE_TELEMETRY = 'telemetry_logs';
const STORE_SETTINGS = 'app_settings';
const STORE_SRS = 'user_srs_items';

export interface TelemetryEvent {
  id?: number;
  timestamp: number;
  eventType: string;
  sessionId?: string;
  language?: string;
  payload: any;
}

export interface AppSetting {
  key: string;
  value: any;
}

export class DatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Database error:", (event.target as IDBOpenDBRequest).error);
        reject('Database failed to open');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store 1: User Progress (State of learning)
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS, { keyPath: 'languageCode' });
        }
        
        // Store 2: Telemetry (Tracking system)
        if (!db.objectStoreNames.contains(STORE_TELEMETRY)) {
          const tStore = db.createObjectStore(STORE_TELEMETRY, { keyPath: 'id', autoIncrement: true });
          tStore.createIndex('eventType', 'eventType', { unique: false });
          tStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store 3: App Settings (Waitlist, Access Codes, etc.)
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }

        // Store 4: SRS Items (Spaced Repetition)
        if (!db.objectStoreNames.contains(STORE_SRS)) {
          const sStore = db.createObjectStore(STORE_SRS, { keyPath: 'id' });
          sStore.createIndex('languageCode', 'languageCode', { unique: false });
          sStore.createIndex('nextReview', 'nextReview', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // --- SETTINGS API ---
  async saveSetting(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORE_SETTINGS], 'readwrite');
        const store = transaction.objectStore(STORE_SETTINGS);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to save setting');
      } catch (e) {
        reject(e);
      }
    });
  }

  async getSetting(key: string): Promise<any> {
    await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_SETTINGS], 'readonly');
        const store = transaction.objectStore(STORE_SETTINGS);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // --- PROGRESS API ---

  async saveProgress(data: StoredSessionState): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORE_PROGRESS], 'readwrite');
        const store = transaction.objectStore(STORE_PROGRESS);
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to save progress');
      } catch (e) {
        reject(e);
      }
    });
  }

  async getProgress(languageCode: string): Promise<StoredSessionState | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORE_PROGRESS], 'readonly');
        const store = transaction.objectStore(STORE_PROGRESS);
        const request = store.get(languageCode);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Failed to get progress');
      } catch (e) {
        reject(e);
      }
    });
  }

  async getAllProgress(): Promise<StoredSessionState[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORE_PROGRESS], 'readonly');
        const store = transaction.objectStore(STORE_PROGRESS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject('Failed to get all progress');
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- SRS API ---

  async getDueReviews(languageCode: string): Promise<SRSItem[]> {
    await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_SRS], 'readonly');
        const store = transaction.objectStore(STORE_SRS);
        const index = store.index('languageCode');
        const request = index.getAll(IDBKeyRange.only(languageCode));
        
        request.onsuccess = () => {
          const allItems = request.result as SRSItem[];
          const now = Date.now();
          // Filter items where nextReview is in the past
          const due = allItems.filter(item => item.nextReview <= now);
          // Sort by oldest review date first (prioritize overdue)
          due.sort((a, b) => a.nextReview - b.nextReview);
          resolve(due);
        };
        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  async updateSRSReview(languageCode: string, items: { text: string; score: number }[]): Promise<void> {
    await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_SRS], 'readwrite');
        const store = transaction.objectStore(STORE_SRS);

        items.forEach(review => {
          const id = `${languageCode}_${review.text.toLowerCase().trim()}`;
          const request = store.get(id);

          request.onsuccess = () => {
            const existing = request.result as SRSItem;
            
            // Default Values for New Items
            let interval = 1;
            let easeFactor = 2.5;
            let streak = 0;

            if (existing) {
              interval = existing.interval;
              easeFactor = existing.easeFactor;
              streak = existing.streak;
            }

            // Simplified SM-2 Algorithm
            // Score 0-2: Fail (Reset)
            // Score 3: Pass (Hard)
            // Score 4: Pass (Good)
            // Score 5: Pass (Easy)
            
            if (review.score < 3) {
               // Failed
               streak = 0;
               interval = 1;
            } else {
               // Passed
               streak += 1;
               if (streak === 1) {
                 interval = 1;
               } else if (streak === 2) {
                 interval = 6;
               } else {
                 interval = Math.ceil(interval * easeFactor);
               }
               
               // Adjust Ease Factor based on score
               // 5 -> Ease increases slightly
               // 3 -> Ease decreases
               easeFactor = easeFactor + (0.1 - (5 - review.score) * (0.08 + (5 - review.score) * 0.02));
               if (easeFactor < 1.3) easeFactor = 1.3;
            }

            const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);

            const newItem: SRSItem = {
              id,
              languageCode,
              text: review.text.trim(),
              interval,
              easeFactor,
              nextReview,
              streak
            };

            store.put(newItem);
          };
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve(); // Fail silent
      } catch (e) {
        resolve();
      }
    });
  }

  // --- TRACKING SYSTEM API ---

  async trackEvent(eventType: string, payload: any, language?: string): Promise<void> {
    // Fire and forget - don't block UI for tracking
    try {
      await this.init();
      const event: TelemetryEvent = {
        timestamp: Date.now(),
        eventType,
        language,
        payload
      };
      const transaction = this.db!.transaction([STORE_TELEMETRY], 'readwrite');
      const store = transaction.objectStore(STORE_TELEMETRY);
      store.add(event);
    } catch (e) {
      console.warn("Telemetry tracking failed silent: ", e);
    }
  }

  async getTelemetryStats(): Promise<any> {
    await this.init();
    return new Promise((resolve) => {
       const transaction = this.db!.transaction([STORE_TELEMETRY], 'readonly');
       const store = transaction.objectStore(STORE_TELEMETRY);
       const request = store.count();
       request.onsuccess = () => resolve({ totalEvents: request.result });
    });
  }
}

export const db = new DatabaseService();
