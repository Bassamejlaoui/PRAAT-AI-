
export interface Language {
  code: string;
  name: string;
  flagCode: string; // ISO 3166-1 alpha-2 country code
  nativeName: string;
  flagUrl?: string; // Optional custom URL for the flag
  instructionLanguage?: string; // The language the AI Master uses to explain concepts
  description?: string;
  isOrg?: boolean; // Explicit flag to distinguish professional tracks
  isTool?: boolean;
  toolId?: string;
}

export interface ProgressData {
  level: number;
  xp: number;
}

export interface LearnerProfile {
  level: string; // e.g. "A1", "B2.1"
  interests: string[];
  activeVocabulary: string[];
  passiveVocabulary: string[];
  grammarWeaknesses: string[];
  pronunciationFlaws: string[];
  recentMistakes: string[];
  learningGoal: string; // "moving to Argentina", "VC interviews"
}

export interface LessonContent {
  id: string;
  title: string;
  objective: string;
  coreVocabulary: string[];
  grammarFocus: string;
  culturalNote: string;
  scenario: string;
}

export interface LessonState {
  isActive: boolean;
  language: Language | null;
  transcriptionHistory: string[];
  isThinking: boolean;
}

export interface AudioProcessingRefs {
  inputAudioContext: AudioContext | null;
  outputAudioContext: AudioContext | null;
  inputNode: AudioNode | null;
  outputNode: AudioNode | null;
  inputAnalyzer: AnalyserNode | null;
  outputAnalyzer: AnalyserNode | null;
  scriptProcessor: ScriptProcessorNode | null;
  stream: MediaStream | null;
  sources: Set<AudioBufferSourceNode>;
}

export interface SessionTelemetry {
  startTime: number;
  lastPhase: string;
  constructionsAttempted: number;
  phoneticCorrections: number;
  logicCheckpointsReached: number;
  ahaMoments: number;
  cognitiveOverloadEvents: number;
  activeLanguageTime: number;
  averageResponseLatency: number; // ms
  turnsDetected: number;
}

export interface StoredSessionState {
  languageCode: string;
  timeLeft: number;
  lastPhase: string;
  isComplete: boolean; 
  lastUpdated: number;
  
  // Curriculum / Session tracking
  currentLessonIndex: number;
  lessonProgress: number;
  
  // Display
  topicCursor: string; 
  totalSessions: number;
  totalTimeLearned: number;
  
  // Adaptive Learning Memory profile
  learnerProfile?: LearnerProfile;
  
  focusArea?: string;
  lastPerformance?: string;
}

export interface SRSItem {
  id: string; // Composite: languageCode + "_" + text
  languageCode: string;
  text: string;
  interval: number; // Days until next review
  easeFactor: number; // Multiplier (standard start 2.5)
  nextReview: number; // Timestamp
  streak: number;
}
