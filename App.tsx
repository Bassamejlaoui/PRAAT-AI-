
// Top of your file
const apiKey = "AIzaSyDzGa-Wkdv_51zqTorCLzb05PzZLah7A6s";
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AudioVisualizer from './components/AudioVisualizer';
import { LANGUAGES, ORGANISATION_COURSES, SYSTEM_INSTRUCTION_TEMPLATE, VOICES, GET_PLACEMENT_QUIZ, WAITLIST_URL } from './constants';
import { CurriculumEngine } from './curriculum';
import { AudioProcessingRefs, Language, SessionTelemetry, StoredSessionState, LessonContent, SRSItem } from './types';
import { db } from './db';

// PASTE YOUR API KEY HERE IF NOT USING ENV VARS

const SESSION_DURATION = 30 * 60; 
const VISUAL_GATE_THRESHOLD = 0.005; 
const VISUAL_GATE_HANGOVER_MS = 1000; 
const MAX_RETRIES = 5;
const BASE_RECONNECT_DELAY_MS = 1000;

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const Logo: React.FC<{ size?: string; variant?: 'dark' | 'light' }> = ({ size = "w-14 h-14", variant = 'dark' }) => {
  return (
    <div className={`${size} relative group flex-shrink-0 rounded-[14px] overflow-hidden shadow-sm border border-white/10`}>
      <img 
        src="https://lh3.googleusercontent.com/d/1SmaOzaK_eYWQ2bB1jwusulkZhRd2Ubcm" 
        alt="PRAAT AI" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// --- SUB-COMPONENTS FOR VIEWS ---

const CourseDetailScreen: React.FC<{ 
    language: Language; 
    progress: StoredSessionState | null; 
    onStart: () => void; 
    onBack: () => void; 
}> = ({ language, progress, onStart, onBack }) => {
    
    const [dueReviews, setDueReviews] = useState<number>(0);

    useEffect(() => {
        const fetchReviews = async () => {
            const reviews = await db.getDueReviews(language.code);
            setDueReviews(reviews.length);
        };
        fetchReviews();
    }, [language]);

    // Derived Stats from Adaptive Profile
    const profile = progress?.learnerProfile;
    const totalTimeMinutes = Math.floor((progress?.totalTimeLearned || 0) / 60);
    const vocabMasteredCount = profile?.activeVocabulary?.length || 0;
    const currentGoal = profile?.learningGoal || language.description;

    return (
        <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-white animate-in-fade overflow-hidden">
            {/* Header */}
            <div className="pt-safe px-6 pb-4 bg-[var(--ios-bg)]/80 blur-header sticky top-0 z-50 flex items-center justify-between">
                 <button onClick={onBack} className="flex items-center text-[#B2D900] active:opacity-50">
                     <i className="fa-solid fa-chevron-left text-[17px] mr-1"></i>
                     <span className="text-[17px]">Tracks</span>
                 </button>
                 <div className="font-semibold text-[17px] text-white opacity-0">Hidden</div>
                 <div className="w-8"></div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ios-scroll-container px-4 pb-safe pt-2">
                
                {/* Hero Section */}
                <div className="mb-6">
                    <h1 className="text-large-title font-bold mb-1">{language.name}</h1>
                    <p className="text-body text-[#B2D900] mt-1">{profile?.level || "Beginner (A1)"}</p>
                </div>

                {/* Main Progress Card */}
                <div className="ios-card mb-6 border border-white/5 bg-[#1C1C1E]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                             <p className="text-caption-1 uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Goal</p>
                             <h2 className="text-title-2 font-bold max-w-[250px] leading-tight line-clamp-2">
                                 {currentGoal}
                             </h2>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onStart}
                        className="w-full py-4 bg-[#B2D900] text-[#1C1C1E] rounded-[14px] font-bold text-[17px] shadow-lg shadow-[#B2D900]/10 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-bolt text-sm"></i>
                        <span>{progress && progress.timeLeft < SESSION_DURATION && !progress.isComplete ? "Resume Live Session" : "Start Live Session"}</span>
                    </button>
                    {dueReviews > 0 && (
                       <div className="mt-3 text-center">
                          <span className="text-caption-2 text-zinc-400">
                             <i className="fa-solid fa-repeat mr-1 text-orange-400"></i>
                             {dueReviews} memory triggers active
                          </span>
                       </div>
                    )}
                </div>

                {/* Coach's Notes / Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="ios-card p-4 border border-white/5 flex flex-col justify-between h-24">
                         <div className="w-8 h-8 rounded-full bg-[#B2D900]/20 flex items-center justify-center mb-2">
                             <i className="fa-solid fa-clock text-[#B2D900] text-[15px]"></i>
                         </div>
                         <div>
                             <p className="text-title-3 font-bold">{totalTimeMinutes}m</p>
                             <p className="text-caption-2 text-zinc-500">Live Practice</p>
                         </div>
                    </div>
                    <div className="ios-card p-4 border border-white/5 flex flex-col justify-between h-24">
                         <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                             <i className="fa-solid fa-brain text-purple-400 text-[15px]"></i>
                         </div>
                         <div>
                             <p className="text-title-3 font-bold">{vocabMasteredCount}</p>
                             <p className="text-caption-2 text-zinc-500">Active Words</p>
                         </div>
                    </div>
                </div>

                {/* Adaptive Memory Insights */}
                {(profile?.pronunciationFlaws?.length || profile?.grammarWeaknesses?.length) ? (
                    <div className="ios-list-group mb-6">
                        <h3 className="text-caption-1 text-zinc-500 uppercase ml-4 mb-2">Cognitive Map</h3>
                        
                        {profile?.pronunciationFlaws && profile.pronunciationFlaws.length > 0 && (
                            <div className="ios-list-item flex-col items-start gap-1 p-4">
                                <span className="text-caption-1 text-orange-400 font-bold uppercase">Accent Flaws Identified</span>
                                <p className="text-subheadline text-zinc-300">
                                    {profile.pronunciationFlaws.join(', ')}
                                </p>
                            </div>
                        )}
                        
                        {profile?.grammarWeaknesses && profile.grammarWeaknesses.length > 0 && (
                            <div className="ios-list-item flex-col items-start gap-1 p-4">
                                <span className="text-caption-1 text-blue-400 font-bold uppercase">Structural Weaknesses</span>
                                <p className="text-subheadline text-zinc-300">
                                    {profile.grammarWeaknesses.join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="ios-list-group mb-6 p-4 border-white/5 bg-[#1C1C1E] border rounded-[16px]">
                        <p className="text-footnote text-zinc-500 text-center">
                            Complete your first session to unlock your Cognitive Map and adaptive insights.
                        </p>
                    </div>
                )}
                
                <div className="h-8"></div>
            </div>
        </div>
    );
}

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 3500);
    const removeTimer = setTimeout(onFinish, 4500); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center space-y-8 animate-in-up px-6 text-center">
         <div className="shadow-2xl shadow-[#B2D900]/20 rounded-[2rem]">
            <Logo size="w-32 h-32" variant="light" />
         </div>
         <div className="space-y-3">
            <h1 className="text-title-1 text-white font-bold tracking-tight">PRAAT AI</h1>
            <p className="text-body text-zinc-400 font-medium leading-relaxed">
              Learn with your ears,<br/>
              <span className="text-[#B2D900]">not your eyes.</span>
            </p>
         </div>
      </div>
    </div>
  );
};

// iOS Bottom Sheet Style
const WaitlistModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleJoinWaitlist = () => {
    window.open(WAITLIST_URL, '_blank');
    db.saveSetting('waitlist_status', 'joined');
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center transition-all duration-300 ${isVisible ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      
      {/* Modal / Sheet */}
      <div className={`relative w-full max-w-md bg-[#1C1C1E] rounded-t-[20px] sm:rounded-[20px] shadow-2xl overflow-hidden transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-2 pb-1" onClick={handleClose}>
            <div className="w-9 h-1 bg-zinc-600 rounded-full opacity-40"></div>
        </div>

        <div className="p-6 pt-2 text-center pb-safe">
            <div className="flex justify-center mb-6 mt-4">
               <Logo size="w-20 h-20" variant="light" />
            </div>
            
            <h2 className="text-title-2 text-white mb-2">
              Early Access
            </h2>
            <p className="text-body text-zinc-400 mb-8 max-w-xs mx-auto">
              Get notified when PRAAT AI launches on the App Store.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleJoinWaitlist}
                className="w-full py-3.5 rounded-xl bg-[#B2D900] text-black font-semibold text-[17px] active:opacity-80 transition-opacity"
              >
                Join Waitlist
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl bg-[#2C2C2E] text-[#B2D900] font-semibold text-[17px] active:opacity-80 transition-opacity"
              >
                Not Now
              </button>
            </div>
            
            <p className="mt-6 text-caption-2 text-zinc-600 uppercase tracking-wide">
              v2.1 Beta Preview
            </p>
        </div>
      </div>
    </div>
  );
};

const TutorialOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[150] pointer-events-auto font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500" />
      
      {/* Step 0: Welcome Center */}
      {step === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 animate-in-up">
           <div className="bg-[#1C1C1E] p-8 rounded-[24px] max-w-sm w-full relative shadow-2xl text-center border border-white/5">
              <div className="w-16 h-16 rounded-full bg-[#B2D900]/20 flex items-center justify-center mb-6 mx-auto text-[#B2D900] text-2xl">
                <i className="fa-solid fa-ear-listen"></i>
              </div>
              <h3 className="text-title-2 text-white mb-3">Pure Audio Mastery</h3>
              <p className="text-body text-zinc-400 mb-8">
                Learn with your ears, not your eyes. 
                <br/><span className="text-white font-medium">Headphones recommended.</span>
              </p>
              <button onClick={handleNext} className="w-full py-3.5 bg-[#B2D900] text-black rounded-xl font-bold text-[17px] active:scale-[0.98] transition-transform">
                Continue
              </button>
           </div>
        </div>
      )}

      {/* Step 1: Language List (Bottom/Center) */}
      {step === 1 && (
         <div className="absolute bottom-10 left-4 right-4 animate-in-up">
            <div className="bg-[#1C1C1E] p-4 rounded-[18px] shadow-2xl flex items-center gap-4 border border-white/5">
               <div className="w-10 h-10 rounded-full bg-[#B2D900]/20 flex items-center justify-center text-[#B2D900] shrink-0">
                  <i className="fa-solid fa-layer-group"></i>
               </div>
               <div className="flex-1">
                 <h3 className="text-headline text-white">Select a Track</h3>
                 <p className="text-subhead text-zinc-400">Tap a tile to begin.</p>
               </div>
               <button onClick={handleNext} className="px-5 py-2 bg-white/10 text-white rounded-full text-sm font-semibold">Next</button>
            </div>
         </div>
      )}
      
      {/* Step 2: Gift Icon (Top Right) */}
      {step === 2 && (
         <div className="absolute top-16 right-4 max-w-xs animate-in-up">
            <div className="bg-[#1C1C1E] p-4 rounded-[18px] shadow-2xl relative border border-white/5">
               <div className="absolute -top-2 right-5 w-4 h-4 bg-[#1C1C1E] rotate-45 border-t border-l border-white/5"></div>
               <div className="flex items-start gap-3">
                   <div className="mt-1">
                       <i className="fa-solid fa-gift text-[#B2D900]"></i>
                   </div>
                   <div>
                       <p className="text-subhead text-white mb-2">Tap here to join the waitlist for specialized professional tracks.</p>
                       <button onClick={onComplete} className="text-[#B2D900] font-semibold text-sm">Got it</button>
                   </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

const UserTypeScreen: React.FC<{ 
  onSelect: (type: 'INDIVIDUAL' | 'ORGANISATION') => void; 
  onOpenWaitlist: () => void;
}> = ({ onSelect, onOpenWaitlist }) => (
  <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-[var(--ios-text)] animate-in-fade overflow-hidden">
    <div className="flex-1 min-h-0 flex flex-col pt-safe px-4 sm:px-6 pb-safe overflow-y-auto">
      
      <div className="mt-16 mb-12 text-center">
        <div className="inline-block mb-6 shadow-2xl rounded-[22px]">
          <Logo size="w-24 h-24" variant="light" />
        </div>
        <h1 className="text-large-title mb-2">Welcome</h1>
        <p className="text-body text-zinc-500">Choose your learning path</p>
      </div>

      <div className="w-full max-w-md mx-auto">
        <h3 className="text-caption-1 text-zinc-500 uppercase ml-4 mb-2">Track Selection</h3>
        <div className="ios-list-group">
          <button onClick={() => onSelect('INDIVIDUAL')} className="ios-list-item w-full group">
             <div className="flex items-center gap-4">
               <div className="w-7 h-7 rounded-[7px] bg-[#B2D900] flex items-center justify-center text-black">
                 <i className="fa-solid fa-user text-[13px]"></i>
               </div>
               <div className="text-left">
                 <div className="text-body text-white">Individual</div>
               </div>
             </div>
             <div className="flex items-center gap-2">
                 <span className="text-subhead text-zinc-500">Fluency</span>
                 <i className="fa-solid fa-chevron-right text-zinc-600 text-[12px]"></i>
             </div>
          </button>
          
          <button onClick={() => onSelect('ORGANISATION')} className="ios-list-item w-full group">
             <div className="flex items-center gap-4">
               {/* Using white icon for differentiation but branding via text */}
               <div className="w-7 h-7 rounded-[7px] bg-white flex items-center justify-center text-black">
                 <i className="fa-solid fa-briefcase text-[13px]"></i>
               </div>
               <div className="text-left">
                 <div className="text-body text-white">Organisation</div>
               </div>
             </div>
             <div className="flex items-center gap-2">
                 <span className="text-subhead text-zinc-500">Business</span>
                 <i className="fa-solid fa-chevron-right text-zinc-600 text-[12px]"></i>
             </div>
          </button>
        </div>

        <h3 className="text-caption-1 text-zinc-500 uppercase ml-4 mb-2 mt-8">Account</h3>
        <div className="ios-list-group">
           <button onClick={onOpenWaitlist} className="ios-list-item w-full">
             <div className="text-body text-[#B2D900]">Restore Purchase</div>
           </button>
           <button onClick={onOpenWaitlist} className="ios-list-item w-full">
             <div className="text-body text-[#B2D900]">Enter Access Code</div>
           </button>
        </div>
      </div>

    </div>
  </div>
);

const IntroScreen: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="flex flex-col h-full bg-black text-white px-6 pt-safe pb-safe animate-in-fade justify-between">
    <div className="flex-1 flex flex-col items-center justify-center space-y-12">
      <Logo size="w-32 h-32" variant="light" />
      
      <div className="space-y-6 text-center max-w-xs">
        <h2 className="text-title-1">
          Scientific<br/>
          <span className="text-[#B2D900]">Acquisition</span>
        </h2>
        <p className="text-body text-zinc-400 leading-relaxed">
          Based on 50+ years of research in cognitive science. No textbooks. Just listen.
        </p>
      </div>
    </div>

    <button 
      onClick={onNext}
      className="w-full h-14 bg-[#B2D900] text-black font-bold rounded-[14px] text-[17px] active:scale-[0.98] transition-transform"
    >
      Start Analysis
    </button>
  </div>
);

const QuizScreen: React.FC<{ userType: 'INDIVIDUAL' | 'ORGANISATION', onComplete: (level: string, context: string) => void }> = ({ userType, onComplete }) => {
  const [level, setLevel] = useState("Beginner (A1)");
  const [goal, setGoal] = useState("");

  const handleStart = () => {
    if (!goal.trim()) {
      alert("Please tell us your learning goals.");
      return;
    }
    const context = `USER GOAL: ${goal}`;
    onComplete(level, context);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-[var(--ios-text)] px-4 pt-safe pb-safe animate-in-fade overflow-hidden">
      <div className="flex-1 min-h-0 max-w-md mx-auto w-full flex flex-col pt-12 overflow-y-auto">
        <h2 className="text-large-title mb-8 font-semibold">Your Profile</h2>
        
        <div className="mb-8">
          <label className="block text-body font-medium mb-3">1. Tell me what you want to achieve.</label>
          <p className="text-subheadline text-zinc-500 mb-4">
             e.g., "Teach me French for pitching investors" or "I am moving to Argentina next month"
          </p>
          <textarea 
            className="w-full bg-[var(--ios-card)] border border-white/5 rounded-[12px] p-4 text-[var(--ios-text)] focus:outline-none focus:ring-2 focus:ring-[#B2D900]/50 h-32 resize-none"
            placeholder="I want to learn..."
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
        </div>

        <div className="mb-12">
           <label className="block text-body font-medium mb-4">2. Current Level</label>
           <div className="space-y-2">
             {[
               {id: 'Beginner (A1)', title: 'Absolute Beginner', desc: 'No prior knowledge'},
               {id: 'Elementary (A2)', title: 'Elementary', desc: 'I know some basic words'},
               {id: 'Intermediate (B1)', title: 'Intermediate', desc: 'I can have basic conversations'},
               {id: 'Advanced (C1)', title: 'Advanced', desc: 'I want to perfect my accent and fluency'}
             ].map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  className={`w-full text-left p-4 rounded-[12px] border transition-colors flex flex-col ${level === lvl.id ? 'bg-[#B2D900] border-[#B2D900] text-[#1C1C1E]' : 'bg-[var(--ios-card)] border-white/5 text-[var(--ios-text)] hover:bg-[var(--ios-elevated)]'}`}
                >
                  <span className="font-semibold">{lvl.title}</span>
                  <span className={`text-sm mt-1 opacity-80 ${level === lvl.id ? 'text-[#1C1C1E]/80' : 'text-zinc-500'}`}>{lvl.desc}</span>
                </button>
             ))}
           </div>
        </div>

      </div>
      
      <div className="p-4 mx-auto w-full max-w-md pb-8">
         <button 
           onClick={handleStart}
           disabled={!goal.trim()}
           className="w-full bg-[#B2D900] disabled:opacity-50 text-[#1C1C1E] py-4 rounded-[14px] font-semibold text-lg"
         >
            Generate Personal Acquisition Engine
         </button>
      </div>
    </div>
  );
};


const DubbingConfigScreen: React.FC<{ 
    onStart: (source: string, target: string) => void; 
    onBack: () => void; 
}> = ({ onStart, onBack }) => {
    const [source, setSource] = useState('English');
    const [target, setTarget] = useState('Spanish');

    const availableLanguages = [
        'English', 'Spanish', 'French', 'German', 'Italian', 
        'Japanese', 'Mandarin', 'Russian', 'Portuguese', 
        'Turkish', 'Vietnamese', 'Korean', 'Greek', 'Arabic', 'Swahili'
    ];

    return (
        <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-white animate-in-fade overflow-hidden">
             <div className="pt-safe px-6 pb-4 bg-[var(--ios-bg)]/80 blur-header sticky top-0 z-50 flex items-center justify-between">
                 <button onClick={onBack} className="flex items-center text-[#B2D900] active:opacity-50">
                     <i className="fa-solid fa-chevron-left text-[17px] mr-1"></i>
                     <span className="text-[17px]">Back</span>
                 </button>
                 <div className="font-semibold text-[17px] text-white">Dubbing Setup</div>
                 <div className="w-8"></div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ios-scroll-container px-4 pb-safe pt-6">
                <div className="mb-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#B2D900]/20 flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-headphones-simple text-[#B2D900] text-3xl"></i>
                    </div>
                    <h1 className="text-title-1 font-bold mb-2">Cognitive Dubbing</h1>
                    <p className="text-body text-zinc-500 max-w-xs mx-auto">
                        Real-time, emotion-preserving translation. Select your language pair.
                    </p>
                </div>

                <div className="space-y-6 max-w-md mx-auto">
                    <div>
                        <label className="text-caption-1 uppercase text-zinc-500 font-bold ml-4 mb-2 block">I speak (Source)</label>
                        <div className="ios-list-group">
                            <div className="p-2">
                                <select 
                                    value={source} 
                                    onChange={(e) => setSource(e.target.value)}
                                    className="w-full bg-transparent text-white text-[17px] p-2 outline-none"
                                >
                                    {availableLanguages.map(l => <option key={l} value={l} className="bg-black">{l}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -my-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-[#2C2C2E] border border-zinc-700 flex items-center justify-center">
                            <i className="fa-solid fa-arrow-down text-zinc-400"></i>
                        </div>
                    </div>

                    <div>
                        <label className="text-caption-1 uppercase text-zinc-500 font-bold ml-4 mb-2 block">Translate to (Target)</label>
                        <div className="ios-list-group">
                            <div className="p-2">
                                <select 
                                    value={target} 
                                    onChange={(e) => setTarget(e.target.value)}
                                    className="w-full bg-transparent text-white text-[17px] p-2 outline-none"
                                >
                                    {availableLanguages.map(l => <option key={l} value={l} className="bg-black">{l}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onStart(source, target)}
                        className="w-full py-4 bg-[#B2D900] text-black rounded-[14px] font-bold text-[17px] shadow-lg shadow-[#B2D900]/10 active:scale-[0.98] transition-transform mt-8"
                    >
                        Start Dubbing
                    </button>
                </div>
            </div>
        </div>
    );
};

const ContentInputScreen: React.FC<{ 
    onStart: (content: string) => void; 
    onBack: () => void; 
}> = ({ onStart, onBack }) => {
    const [content, setContent] = useState('');

    return (
        <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-white animate-in-fade overflow-hidden">
             <div className="pt-safe px-6 pb-4 bg-[var(--ios-bg)]/80 blur-header sticky top-0 z-50 flex items-center justify-between">
                 <button onClick={onBack} className="flex items-center text-[#B2D900] active:opacity-50">
                     <i className="fa-solid fa-chevron-left text-[17px] mr-1"></i>
                     <span className="text-[17px]">Back</span>
                 </button>
                 <div className="font-semibold text-[17px] text-white">Content Transformer</div>
                 <div className="w-8"></div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ios-scroll-container px-4 pb-safe pt-6">
                <div className="mb-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#B2D900]/20 flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-brain text-[#B2D900] text-3xl"></i>
                    </div>
                    <h1 className="text-title-1 font-bold mb-2">Adaptive Learning</h1>
                    <p className="text-body text-zinc-500 max-w-xs mx-auto">
                        Paste any text (article, email, script) to turn it into an interactive lesson.
                    </p>
                </div>

                <div className="space-y-6 max-w-md mx-auto">
                    <div className="ios-list-group p-4">
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste your content here..."
                            className="w-full h-48 bg-transparent text-white text-[17px] outline-none resize-none"
                        />
                    </div>

                    <button 
                        onClick={() => onStart(content)}
                        disabled={!content.trim()}
                        className="w-full py-4 bg-[#B2D900] text-black rounded-[14px] font-bold text-[17px] shadow-lg shadow-[#B2D900]/10 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Generate Lesson
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [view, setView] = useState<'USER_TYPE' | 'HOME' | 'INTRO' | 'QUIZ' | 'SESSION' | 'COURSE_DETAIL' | 'DUBBING_CONFIG' | 'CONTENT_INPUT'>('USER_TYPE');
  const [dubbingConfig, setDubbingConfig] = useState<{source: string, target: string} | null>(null);
  const [contentContext, setContentContext] = useState<string | null>(null);
  const [userType, setUserType] = useState<'INDIVIDUAL' | 'ORGANISATION'>('INDIVIDUAL');
  
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Access Control Logic
  const [hasAccess, setHasAccess] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('praat_access_granted') === 'true';
    }
    return false;
  });
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(!hasAccess);

  const [showTutorial, setShowTutorial] = useState(false);
  
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const selectedLanguageRef = useRef<Language | null>(null);

  const [currentSessionState, setCurrentSessionState] = useState<StoredSessionState | null>(null);

  const [userLevel, setUserLevel] = useState<string>("Beginner (A1)");
  
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [currentPhase, setCurrentPhase] = useState("NEURO-PRIMING");
  const [isResumedSession, setIsResumedSession] = useState(false);
  
  // State for Curriculum
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const telemetryRef = useRef<SessionTelemetry>({
    startTime: 0, lastPhase: "INIT", constructionsAttempted: 0, phoneticCorrections: 0,
    logicCheckpointsReached: 0, ahaMoments: 0, cognitiveOverloadEvents: 0,
    activeLanguageTime: 0, averageResponseLatency: 0, turnsDetected: 0
  });

  const isActiveRef = useRef(false);
  const summaryAccumulatorRef = useRef("");
  const lastVoiceActivityTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  
  const lastModelSpeechEndRef = useRef<number>(0);
  const isUserSpeakingRef = useRef(false);
  const isModelSpeakingRef = useRef(false); 
  const silenceTimerRef = useRef<number | null>(null);
  const smoothedVolumeRef = useRef(0);
  
  const activeSessionRef = useRef<any>(null);
  
  // Re-usable buffer for audio processing to avoid GC
  const pcmBufferRef = useRef(new Int16Array(256));

  const audioRefs = useRef<AudioProcessingRefs>({
    inputAudioContext: null, outputAudioContext: null, inputNode: null, outputNode: null,
    inputAnalyzer: null, outputAnalyzer: null, scriptProcessor: null, stream: null, sources: new Set(),
  });

  const nextStartTimeRef = useRef(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  // Force Waitlist on Mount if no access
  useEffect(() => {
    if (!hasAccess) {
      setIsWaitlistOpen(true);
    }
  }, [hasAccess]);

  const handleAccessGrant = () => {
    localStorage.setItem('praat_access_granted', 'true');
    setHasAccess(true);
    setIsWaitlistOpen(false);
  };

  useEffect(() => {
    const initDB = async () => {
      try {
        await db.init();
        const allProgress = await db.getAllProgress();
        const map: Record<string, number> = {};
        allProgress.forEach(p => {
          let idx = p.currentLessonIndex || 0;
          if (p.isComplete) idx += 1;
          map[p.languageCode] = idx;
        });
        setProgressMap(map);
        db.trackEvent('APP_LAUNCH', { timestamp: Date.now() });
      } catch(e) {
        console.warn("DB Init failed", e);
      }
    };
    initDB();
  }, []);

  useEffect(() => {
    isModelSpeakingRef.current = isModelSpeaking;
  }, [isModelSpeaking]);

  useEffect(() => {
    if (isActive) {
      document.body.classList.add('session-active');
    } else {
      document.body.classList.remove('session-active');
    }
  }, [isActive]);

  // Tutorial Logic
  useEffect(() => {
    if (view === 'HOME' && hasAccess && !isWaitlistOpen && !showSplash) {
      const hasSeen = localStorage.getItem('hasSeenTutorial');
      if (!hasSeen) {
        setTimeout(() => setShowTutorial(true), 800);
      }
    }
  }, [view, hasAccess, isWaitlistOpen, showSplash]);

  const completeTutorial = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setShowTutorial(false);
  };

  const handleUserTypeSelect = (type: 'INDIVIDUAL' | 'ORGANISATION') => {
      setUserType(type);
      setView('HOME');
      db.trackEvent('USER_TYPE_SELECTED', { type });
  };

  const handleStartSessionFromDetail = async () => {
    if (!selectedLanguage) return;
    const lang = selectedLanguage;

    try {
      const state = await db.getProgress(lang.code);
      let lessonIndex = state ? state.currentLessonIndex : 0;
      if (state && state.isComplete) {
         lessonIndex += 1;
      }
      const lessonContent = CurriculumEngine.getLesson(lang, lessonIndex);
      setCurrentLesson(lessonContent);

      if (state && !state.isComplete && state.timeLeft > 0 && state.timeLeft < SESSION_DURATION) {
         setTimeLeft(state.timeLeft);
         setCurrentPhase(state.lastPhase);
         setIsResumedSession(true);
         db.trackEvent('SESSION_RESUME_INIT', { language: lang.code, lesson: lessonContent.title });
         setView('SESSION');
         setTimeout(() => startSession(false, null, null, lessonContent), 100); 
         return;
      }

      setTimeLeft(SESSION_DURATION);
      setCurrentPhase("NEURO-PRIMING");
      setIsResumedSession(false);
      
      if (state && state.totalSessions > 0) {
          db.trackEvent('SESSION_NEW_INIT_SKIP_INTRO', { language: lang.code });
          setView('SESSION');
          setTimeout(() => startSession(false, null, null, lessonContent), 100);
      } else {
          db.trackEvent('SESSION_FIRST_INIT', { language: lang.code });
          setView('INTRO'); 
      }
    } catch (e) {
      const fallbackLesson = CurriculumEngine.getLesson(lang, 0);
      setCurrentLesson(fallbackLesson);
      setTimeLeft(SESSION_DURATION);
      setView('INTRO'); 
    }
  };

  // UPDATED: Directly logic to Quiz or Session
  const handleLanguageSelect = async (lang: Language) => {
    setSelectedLanguage(lang);
    selectedLanguageRef.current = lang;
    
    if (lang.isTool) {
        if (lang.code === 'tool-dubbing') {
            setView('DUBBING_CONFIG');
        } else if (lang.code === 'tool-content') {
            setView('CONTENT_INPUT');
        }
        return;
    }

    try {
        const state = await db.getProgress(lang.code);
        setCurrentSessionState(state || null);

        let lessonIndex = state ? state.currentLessonIndex : 0;
        if (state && state.isComplete) {
            lessonIndex += 1;
        }
        const lessonContent = CurriculumEngine.getLesson(lang, lessonIndex);
        setCurrentLesson(lessonContent);

        if (state && state.totalSessions > 0) {
            // Existing User -> Session
            if (!state.isComplete && state.timeLeft > 0 && state.timeLeft < SESSION_DURATION) {
                setTimeLeft(state.timeLeft);
                setCurrentPhase(state.lastPhase);
                setIsResumedSession(true);
                db.trackEvent('SESSION_RESUME_INIT', { language: lang.code, lesson: lessonContent.title });
            } else {
                setTimeLeft(SESSION_DURATION);
                setCurrentPhase("NEURO-PRIMING");
                setIsResumedSession(false);
                db.trackEvent('SESSION_NEW_INIT_FAST', { language: lang.code });
            }
            setView('SESSION');
            setTimeout(() => startSession(false, null, null, lessonContent), 100);
        } else {
            // New User -> Quiz
            setTimeLeft(SESSION_DURATION);
            setCurrentPhase("NEURO-PRIMING");
            setIsResumedSession(false);
            db.trackEvent('SESSION_FIRST_INIT_QUIZ', { language: lang.code });
            setView('QUIZ');
        }

    } catch(e) {
        const fallbackLesson = CurriculumEngine.getLesson(lang, 0);
        setCurrentLesson(fallbackLesson);
        setView('QUIZ');
    }
  };

  const handleIntroNext = () => {
    setView('QUIZ');
  };

  const handleQuizComplete = (level: string, profileContext: string) => {
    setUserLevel(level);
    setView('SESSION');
    db.trackEvent('PLACEMENT_QUIZ_COMPLETE', { level, context: profileContext });
    setTimeout(() => startSession(false, level, profileContext, currentLesson), 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseFromTime = (remaining: number, langName?: string) => {
    const elapsed = SESSION_DURATION - remaining;
    if (langName?.includes('English')) {
        if (elapsed < 300) return "STORY PRIMING";
        if (elapsed < 900) return "MSQA CORE";
        if (elapsed < 1440) return "POV SHIFT";
        return "DEEP LEARNING";
    }
    if (elapsed < 480) return "NEURO-PRIMING";
    if (elapsed < 960) return "REFLEX FORGING";
    if (elapsed < 1440) return "CONTEXT WEAVING";
    return "FLUENCY FLOW";
  };

  const cleanupResources = useCallback(async () => {
    activeSessionRef.current = null;
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {}
      sessionPromiseRef.current = null;
    }
    if (audioRefs.current.stream) {
      audioRefs.current.stream.getTracks().forEach(track => track.stop());
    }
    audioRefs.current.sources.forEach(source => { try { source.stop(); } catch (e) {} });
    audioRefs.current.sources.clear();
    if (audioRefs.current.scriptProcessor) { try { audioRefs.current.scriptProcessor.disconnect(); } catch (e) {} }
    if (audioRefs.current.inputAudioContext) { try { await audioRefs.current.inputAudioContext.close(); } catch (e) {} }
    if (audioRefs.current.outputAudioContext) { try { await audioRefs.current.outputAudioContext.close(); } catch (e) {} }
    
    audioRefs.current = {
      inputAudioContext: null, outputAudioContext: null, inputNode: null, outputNode: null,
      inputAnalyzer: null, outputAnalyzer: null, scriptProcessor: null, stream: null, sources: new Set(),
    };
    nextStartTimeRef.current = 0;
    setIsModelSpeaking(false);
    setIsUserSpeaking(false);
    setIsThinking(false);
    isUserSpeakingRef.current = false;
    lastModelSpeechEndRef.current = 0;
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }
    smoothedVolumeRef.current = 0;
  }, []);

  const saveProgress = useCallback(async (langCode: string, time: number, phase: string, complete: boolean, lesson: LessonContent, focusArea?: string, performance?: string, parsedProfileData?: any) => {
    try {
      const existing = await db.getProgress(langCode);
      const prevTotalTime = existing?.totalTimeLearned || 0;
      const prevSessions = existing?.totalSessions || 0;
      
      const mergedProfile = parsedProfileData ? {
        ...existing?.learnerProfile,
        ...parsedProfileData
      } : existing?.learnerProfile;
      
      const state: StoredSessionState = {
        languageCode: langCode, 
        timeLeft: time, 
        lastPhase: phase, 
        isComplete: complete, 
        lastUpdated: Date.now(),
        currentLessonIndex: 0,
        lessonProgress: Math.floor(((SESSION_DURATION - time) / SESSION_DURATION) * 100),
        topicCursor: lesson.title, 
        totalSessions: prevSessions, 
        totalTimeLearned: prevTotalTime,
        focusArea: focusArea || existing?.focusArea,
        lastPerformance: performance || existing?.lastPerformance,
        learnerProfile: mergedProfile
      };
      await db.saveProgress(state);
      // Update local state to reflect changes if we return to details
      if (selectedLanguageRef.current?.code === langCode) {
          setCurrentSessionState(state);
      }
    } catch(e) {
      console.warn("Failed to save to DB", e);
    }
  }, []);

  const stopSession = useCallback(async (reason?: string, resetTimer = true, showSummary = false) => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (selectedLanguageRef.current && isActiveRef.current && currentLesson) {
       const telemetry = telemetryRef.current;
       db.trackEvent('SESSION_STOPPED', { 
         reason, 
         durationPlayed: (SESSION_DURATION - timeLeft),
         telemetry 
       }, selectedLanguageRef.current.code);
       if (!reason?.includes("complete")) {
           saveProgress(selectedLanguageRef.current.code, timeLeft, currentPhase, false, currentLesson);
       }
    }
    setIsActive(false);
    isActiveRef.current = false;
    setIsConnecting(false);
    setIsReconnecting(false);
    setIsGeneratingSummary(false);
    setIsThinking(false);
    retryCountRef.current = 0; 
    
    if (!showSummary) {
        // Return to Home Track Selection
        setView('HOME');
    }

    if (reason) setError(reason);
    await cleanupResources();
  }, [cleanupResources, timeLeft, currentPhase, saveProgress, currentLesson]);

  const handleFinishSession = useCallback(async (reason?: string) => {
    if (!isActiveRef.current || reason) {
      if (reason?.includes("complete") && selectedLanguageRef.current && currentLesson) {
         saveProgress(selectedLanguageRef.current.code, 0, "COMPLETED", true, currentLesson);
         db.trackEvent('SESSION_COMPLETED_SUCCESS', { language: selectedLanguageRef.current.code });
      }
      stopSession(reason, false);
      return;
    }
    setIsGeneratingSummary(true);
    summaryAccumulatorRef.current = "";
    try {
      if (sessionPromiseRef.current && audioRefs.current.outputNode) {
        // Cast to GainNode because AudioNode interface doesn't have gain property
        const outputGainNode = audioRefs.current.outputNode as GainNode;
        if (outputGainNode.gain) {
            outputGainNode.gain.value = 0;
        }
        if (audioRefs.current.scriptProcessor) {
           audioRefs.current.scriptProcessor.disconnect();
        }
        const session = await sessionPromiseRef.current;
        session.sendRealtimeInput({
          text: "GENERATE_SESSION_REPORT. Structure: ## Performance (Assessment), ## Actionable Plan (i+1 Plan), ## JSON_MEMORY (Required). \n\nIMPORTANT: At the end, output a VALID JSON block containing memory data to update my cognitive profile. Format strictly:\n```json\n{\n  \"level\": \"estimated CEFR level\",\n  \"interests\": [\"list\", \"of\", \"topics\"],\n  \"activeVocabulary\": [\"fluent\", \"words\"],\n  \"passiveVocabulary\": [\"understood\", \"but\", \"not\", \"produced\"],\n  \"grammarWeaknesses\": [\"specific\", \"flaws\"],\n  \"pronunciationFlaws\": [\"specific\", \"accent\", \"issues\"],\n  \"recentMistakes\": [\"literal errors\"]\n}\n```"
        });
        setTimeout(() => {
           if (isActiveRef.current) {
               // Try to parse summary for focus area
               let focusArea = undefined;
               let performance = undefined;
               if (summaryAccumulatorRef.current) {
                   const focusMatch = summaryAccumulatorRef.current.match(/## Focus Area\s*([\s\S]*?)(?=##|$)/i);
                   const perfMatch = summaryAccumulatorRef.current.match(/## Performance\s*([\s\S]*?)(?=##|$)/i);
                   if (focusMatch) focusArea = focusMatch[1].trim();
                   if (perfMatch) performance = perfMatch[1].trim();
                   
                   // Adaptive Memory Parsing
                   const jsonMatch = summaryAccumulatorRef.current.match(/```json\s*([\s\S]*?)\s*```/);
                   let parsedProfileData = undefined;
                   if (jsonMatch && jsonMatch[1]) {
                       try {
                           parsedProfileData = JSON.parse(jsonMatch[1]);
                       } catch(e) { console.warn("Memory Parse Error", e); }
                   }
               }

               if (selectedLanguageRef.current && currentLesson) {
                 saveProgress(selectedLanguageRef.current.code, 0, "COMPLETED", true, currentLesson, focusArea, performance, parsedProfileData);
               }
               // Stop session but keep view to show summary
               stopSession(undefined, false, true);
           }
        }, 12000); 
      } else {
        stopSession();
      }
    } catch (e) {
      stopSession("Summary failed");
    }
  }, [stopSession, saveProgress, currentLesson]);

  const startSession = useCallback(async (isAutoReconnect = false, explicitLevel: string | null = null, profileContext: string | null = null, lessonData: LessonContent | null = null, dubbingParams?: { source: string, target: string }, content?: string) => {
    const currentLang = selectedLanguageRef.current;
    const activeLesson = lessonData || currentLesson;
    const activeDubbing = dubbingParams || dubbingConfig;
    const activeContent = content || contentContext;
    
    if (!currentLang || !API_KEY || !activeLesson) {
      console.error("Missing critical session data");
      return;
    }

    let isFirstSession = false;

    try {
      if (isAutoReconnect) {
        setIsReconnecting(true);
        db.trackEvent('SESSION_RECONNECT_ATTEMPT', { retryCount: retryCountRef.current }, currentLang.code);
      } else {
        setIsConnecting(true);
        setSummary(null); 
        retryCountRef.current = 0; 
        const existing = await db.getProgress(currentLang.code);
        isFirstSession = !existing || existing.totalSessions === 0;
        const newState = {
           ...(existing || { 
             languageCode: currentLang.code, 
             timeLeft: SESSION_DURATION, 
             lastPhase: currentLang.isTool ? "ACTIVE DUBBING" : "NEURO-PRIMING", 
             isComplete: false, 
             topicCursor: activeLesson.title,
             currentLessonIndex: activeLesson.index,
             lessonProgress: 0,
             totalSessions: 0,
             totalTimeLearned: 0
           }),
           totalSessions: (existing?.totalSessions || 0) + 1,
           lastUpdated: Date.now()
        };
        await db.saveProgress(newState as StoredSessionState);
        db.trackEvent('SESSION_STARTED', { 
            startTime: Date.now(), 
            lesson: activeLesson.title,
            isFirstSession
        }, currentLang.code);
        telemetryRef.current = {
          startTime: Date.now(), lastPhase: "INIT", constructionsAttempted: 0, phoneticCorrections: 0,
          logicCheckpointsReached: 0, ahaMoments: 0, cognitiveOverloadEvents: 0,
          activeLanguageTime: 0, averageResponseLatency: 0, turnsDetected: 0
        };
      }
      setError(null);
      setIsThinking(false);
      
      // SRS Fetch
      let reviewItems: string[] = [];
      try {
          const items = await db.getDueReviews(currentLang.code);
          reviewItems = items.map(i => i.text).slice(0, 5); // Limit to top 5 urgent
      } catch(e) {}
      
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const randomVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000, latencyHint: 'interactive' });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' });
      
      await inputCtx.resume();
      await outputCtx.resume();

      const inputAnalyzer = inputCtx.createAnalyser();
      inputAnalyzer.fftSize = 256;
      const outputAnalyzer = outputCtx.createAnalyser();
      outputAnalyzer.fftSize = 256;
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputAnalyzer);
      outputAnalyzer.connect(outputCtx.destination);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }});
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(256, 1, 1);

      audioRefs.current = {
        ...audioRefs.current,
        inputAudioContext: inputCtx, outputAudioContext: outputCtx,
        inputNode: source,
        outputNode,
        inputAnalyzer, outputAnalyzer, scriptProcessor, stream,
      };

      const learnerContext = profileContext || 
                             (currentSessionState?.learnerProfile?.learningGoal) || 
                             activeLesson?.title || 
                             "General Language Acquisition";
                             
      const adaptiveContextString = `Level: ${currentSessionState?.learnerProfile?.level || explicitLevel || 'A1'}. Goal: ${learnerContext}. Pronunciation Flaws: ${(currentSessionState?.learnerProfile?.pronunciationFlaws || []).join(', ') || 'None known'}. Grammar Weaknesses: ${(currentSessionState?.learnerProfile?.grammarWeaknesses || []).join(', ') || 'None known'}.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {}, 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: randomVoice } } },
          systemInstruction: SYSTEM_INSTRUCTION_TEMPLATE(currentLang, adaptiveContextString, reviewItems, activeDubbing || undefined, activeContent || undefined),
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            isActiveRef.current = true;
            setIsConnecting(false);
            setIsReconnecting(false);
            retryCountRef.current = 0; 
            
            sessionPromise.then(session => {
              activeSessionRef.current = session;
              const elapsed = SESSION_DURATION - timeLeft;
              let instruction = "";
              if (currentLang.isTool) {
                 if (currentLang.code === 'tool-dubbing') {
                    instruction = `TOOL_PROTOCOL: MODE: REAL-TIME DUBBING. SOURCE: ${activeDubbing?.source || 'Auto'}. TARGET: ${activeDubbing?.target || 'English'}. 1. Listen to user audio. 2. Translate immediately. 3. Maintain emotion. START NOW.`;
                 } else if (currentLang.code === 'tool-content') {
                    instruction = `TOOL_PROTOCOL: MODE: CONTENT TRANSFORMER. SOURCE MATERIAL PROVIDED. 1. Deconstruct the text. 2. Teach me the key concepts interactively. 3. Ask questions. START NOW.`;
                 }
              } else if (isAutoReconnect) {
                 instruction = `RECONNECT_PROTOCOL: Timer ${formatTime(elapsed)}. Resume teaching immediately. Provide i+1 input based on my level.`;
              } else if (isFirstSession && timeLeft > (SESSION_DURATION - 60)) {
                 const introText = "Welcome to PRAAT Adaptive AI. Tell me about your goals and let's get started conversationally.";
                 instruction = `NEW_SESSION_PROTOCOL: 1. USER CONTEXT: ${adaptiveContextString}. 2. METHOD: ADAPTIVE REALTIME COACHING. 3. START: Say "${introText}" then immediately begin exploring my goals in ${currentLang.name}. CORE_BEHAVIOR_OVERRIDE: MODE: HYPER-REALISTIC CONVERSATIONALIST. ACCENT: PERFECT NATIVE. BEHAVIOR: Ask follow-up questions. Be curious. Assess my level intuitively. Make it a fluid conversation.`;
              } else {
                 instruction = `RESUME_PROTOCOL: 1. STATUS: The user paused the session. WE ARE NOT RESTARTING. 2. RESUME POINT: Minute ${Math.floor(elapsed / 60)} of ${SESSION_DURATION / 60}. 3. CONTEXT: ${adaptiveContextString}. 4. INSTRUCTION: Say "Welcome back." then seamlessly pick up the conversation or practice where we left off. Adapt to my current emotional state and fluency. If I seem frustrated or nervous, explicitly reassure me.`;
              }
              session.sendRealtimeInput({ text: instruction });
            });

            scriptProcessor.onaudioprocess = (e) => {
              if (!isActiveRef.current || isGeneratingSummary) return; 
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = pcmBufferRef.current; 
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) { 
                const s = inputData[i];
                sum += s * s;
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              const rms = Math.sqrt(sum / inputData.length);
              const alpha = 0.2;
              smoothedVolumeRef.current = (smoothedVolumeRef.current * (1 - alpha)) + (rms * alpha);
              const now = Date.now();
              if (rms > VISUAL_GATE_THRESHOLD) lastVoiceActivityTimeRef.current = now;
              const isVisualGateOpen = (now - lastVoiceActivityTimeRef.current) < VISUAL_GATE_HANGOVER_MS;
              const speaking = isVisualGateOpen && rms > VISUAL_GATE_THRESHOLD;
              setIsUserSpeaking(speaking);
              if (speaking && !isUserSpeakingRef.current) {
                  isUserSpeakingRef.current = true;
                  setIsThinking(false);
                  if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                  if (lastModelSpeechEndRef.current > 0) {
                      const latency = now - lastModelSpeechEndRef.current;
                      if (latency > 100 && latency < 10000) {
                          const prevAvg = telemetryRef.current.averageResponseLatency;
                          const count = telemetryRef.current.turnsDetected;
                          telemetryRef.current.averageResponseLatency = ((prevAvg * count) + latency) / (count + 1);
                          telemetryRef.current.turnsDetected += 1;
                      }
                      lastModelSpeechEndRef.current = 0; 
                  }
              } else if (!speaking && isUserSpeakingRef.current) {
                  isUserSpeakingRef.current = false;
                  silenceTimerRef.current = window.setTimeout(() => {
                      if (isActiveRef.current && !isModelSpeakingRef.current) setIsThinking(true);
                  }, 300);
              }
              if (speaking) telemetryRef.current.activeLanguageTime += (256 / 16000); 
              const isInputGateOpen = rms > VISUAL_GATE_THRESHOLD || isVisualGateOpen;
              if (activeSessionRef.current && isInputGateOpen) {
                   activeSessionRef.current.sendRealtimeInput({ audio: { data: encode(new Uint8Array(pcmData.buffer)), mimeType: 'audio/pcm;rate=16000' } });
              }
            };
            source.connect(inputAnalyzer);
            source.connect(scriptProcessor);
            const silentNode = inputCtx.createGain();
            silentNode.gain.value = 0;
            scriptProcessor.connect(silentNode);
            silentNode.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("Live API incoming message:", message);
            if (message.serverContent?.modelTurn) {
                telemetryRef.current.constructionsAttempted++;
                lastModelSpeechEndRef.current = 0;
                setIsThinking(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            }
            if (message.serverContent?.outputTranscription?.text) {
               summaryAccumulatorRef.current += message.serverContent.outputTranscription.text;
            }
            if (isActiveRef.current && message.serverContent?.turnComplete) {
               if (isGeneratingSummary || summaryAccumulatorRef.current.length > 0 && isGeneratingSummary) {
                   const finalSummary = summaryAccumulatorRef.current;
                   setSummary(finalSummary);
                   // Wait for user to click Done in summary view, which triggers stopSession
               }
            }
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && isActiveRef.current && !isGeneratingSummary) {
              const { outputAudioContext: outCtx, outputNode: outNode, sources } = audioRefs.current;
              if (!outCtx || !outNode) return;
              try {
                const audioBuffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                const sourceNode = outCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(outNode);
                sourceNode.onended = () => {
                  sources.delete(sourceNode);
                  if (sources.size === 0) {
                      setIsModelSpeaking(false);
                      lastModelSpeechEndRef.current = Date.now();
                  }
                };
                const startTime = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                sourceNode.start(startTime);
                setIsModelSpeaking(true);
                setIsThinking(false);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                sources.add(sourceNode);
              } catch (e) { console.error("Audio Pipeline Error:", e); }
            }
            if (message.serverContent?.interrupted) {
              telemetryRef.current.cognitiveOverloadEvents++;
              db.trackEvent('COGNITIVE_OVERLOAD_INTERRUPT', { timeLeft }, currentLang.code);
              audioRefs.current.sources.forEach(s => { try { s.stop(); } catch(e) {} });
              audioRefs.current.sources.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
              lastModelSpeechEndRef.current = 0; 
              setIsThinking(false); 
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            if (isActiveRef.current && timeLeft > 5 && !isGeneratingSummary) {
                if (retryCountRef.current < MAX_RETRIES) {
                    setIsReconnecting(true);
                    cleanupResources();
                    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, retryCountRef.current);
                    retryCountRef.current += 1;
                    reconnectTimeoutRef.current = window.setTimeout(() => startSession(true), delay);
                } else stopSession("Connection lost.");
            } else stopSession("Sync failed.");
          },
          onclose: () => { 
            console.log("Live API Connection Closed");
            if (isActiveRef.current && timeLeft > 5 && !isGeneratingSummary) {
                if (retryCountRef.current < MAX_RETRIES) {
                    setIsReconnecting(true);
                    cleanupResources();
                    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, retryCountRef.current);
                    retryCountRef.current += 1;
                    reconnectTimeoutRef.current = window.setTimeout(() => startSession(true), delay);
                } else stopSession("Connection closed.");
            } else if (isActiveRef.current) stopSession(); 
          },
        },
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setError("Link failed.");
      setIsConnecting(false);
      setIsReconnecting(false);
    }
  }, [cleanupResources, stopSession, isGeneratingSummary, isResumedSession, currentPhase, currentLesson, saveProgress]);

  useEffect(() => {
    let interval: number;
    if (isActive && !isReconnecting && timeLeft > 0 && !isGeneratingSummary) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          const newPhase = selectedLanguageRef.current?.isTool 
              ? "ACTIVE DUBBING" 
              : getPhaseFromTime(next, selectedLanguageRef.current?.name);
          if (next % 5 === 0 && selectedLanguageRef.current && currentLesson) {
             saveProgress(selectedLanguageRef.current.code, next, newPhase, false, currentLesson);
          }
          if (newPhase !== currentPhase) {
            setCurrentPhase(newPhase);
            telemetryRef.current.lastPhase = newPhase;
            db.trackEvent('PHASE_SHIFT', { phase: newPhase }, selectedLanguageRef.current?.code);
          }
          if ((SESSION_DURATION - next) % 60 === 0) {
            telemetryRef.current.logicCheckpointsReached++;
            sessionPromiseRef.current?.then(session => {
              const pulse = `SYSTEM_PULSE: TIME REMAINING: ${formatTime(next)}. PHASE: ${newPhase}. ACTION: Analyze my emotional state (frustration, excitement, nervousness) from my voice and answers. If I am frustrated or nervous, lower the difficulty immediately and explicitly reassure me. If I am excited, match my energy, increase pace/challenge slightly. If answers are short, I might be bored—ask open-ended questions. If I hesitate, slow down and simplify immediately. If I mix languages, understand and respond fluidly in the target language. If I drift from the current topic, follow my lead and allow the conversation to drift naturally. Give me i+1 comprehensible input. Keep the conversation alive and adapt to my mood and flow continuously.`;
[diff_block_end]
              session.sendRealtimeInput({ text: pulse });
            });
          }
          if (next <= 0) {
            handleFinishSession("Complete.");
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isReconnecting, timeLeft, handleFinishSession, currentPhase, isGeneratingSummary, saveProgress, currentLesson]);

  const getStatusColor = () => {
    if (isGeneratingSummary) return { border: 'border-purple-500/40', text: 'text-purple-400', dot: 'bg-purple-500', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' };
    if (isModelSpeaking) return { border: 'border-[#B2D900]/40', text: 'text-[#B2D900]', dot: 'bg-[#B2D900]', shadow: 'shadow-[0_0_20px_rgba(178,217,0,0.15)]' };
    if (isUserSpeaking) return { border: 'border-white/40', text: 'text-white', dot: 'bg-white', shadow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]' };
    if (isThinking) return { border: 'border-white/40', text: 'text-white/90', dot: 'bg-white', shadow: 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' };
    if (isReconnecting) return { border: 'border-orange-500/40', text: 'text-orange-500', dot: 'bg-orange-500', shadow: 'shadow-none' };
    return { border: 'border-white/10', text: 'text-white/40', dot: 'bg-white/20', shadow: 'shadow-none' };
  };
  
  const statusStyles = getStatusColor();

  const renderSummaryContent = () => {
    if (!summary) return null;
    
    // Clean JSON block from summary before rendering
    const cleanSummary = summary.replace(/```json[\s\S]*?```/, '');
    
    const performanceMatch = cleanSummary.match(/## Performance\s*([\s\S]*?)(?=##|$)/i);
    const conceptsMatch = cleanSummary.match(/## Key Concepts\s*([\s\S]*?)(?=##|$)/i);
    const focusMatch = cleanSummary.match(/## Focus Area\s*([\s\S]*?)(?=##|$)/i);
    
    const performance = performanceMatch ? performanceMatch[1].trim() : "";
    const concepts = conceptsMatch ? conceptsMatch[1].trim() : "";
    const focus = focusMatch ? focusMatch[1].trim() : "";
    
    if (!performance && !concepts && !focus) {
         return (
             <div className="ios-card p-6 border border-white/5">
                 <h3 className="text-caption-1 text-[#B2D900] uppercase tracking-widest mb-4">Session Overview</h3>
                 <div className="text-body text-zinc-300 whitespace-pre-line leading-relaxed">
                    {cleanSummary.replace(/NEXT_CURSOR:.*$/, '')}
                 </div>
              </div>
         );
    }

    return (
        <div className="space-y-4">
            {performance && (
                <div className="ios-card p-5 border border-white/5 animate-in-up" style={{animationDelay: '0.1s'}}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#B2D900]/20 flex items-center justify-center">
                            <i className="fa-solid fa-chart-simple text-[#B2D900] text-sm"></i>
                        </div>
                        <h3 className="text-subhead font-bold text-zinc-400 uppercase">Performance</h3>
                    </div>
                    <p className="text-body text-white/90 leading-relaxed">{performance}</p>
                </div>
            )}
            
            {concepts && (
                <div className="ios-card p-5 border border-white/5 animate-in-up" style={{animationDelay: '0.2s'}}>
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <i className="fa-solid fa-lightbulb text-white text-sm"></i>
                        </div>
                        <h3 className="text-subhead font-bold text-zinc-400 uppercase">Key Learnings</h3>
                    </div>
                    <div className="text-body text-white/90 leading-relaxed whitespace-pre-line">{concepts}</div>
                </div>
            )}

            {focus && (
                <div className="ios-card p-5 border border-white/5 animate-in-up" style={{animationDelay: '0.3s'}}>
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#ff453a]/20 flex items-center justify-center">
                            <i className="fa-solid fa-bullseye text-[#ff453a] text-sm"></i>
                        </div>
                        <h3 className="text-subhead font-bold text-zinc-400 uppercase">Focus Area</h3>
                    </div>
                    <p className="text-body text-white/90 leading-relaxed">{focus}</p>
                </div>
            )}
        </div>
    );
  };

  const handleStartDubbing = (source: string, target: string) => {
      if (!selectedLanguageRef.current) return;
      
      setDubbingConfig({ source, target });
      const lang = selectedLanguageRef.current;
      
      const dummyLesson: LessonContent = {
          id: lang.code,
          index: 0,
          title: lang.name,
          objective: lang.description || 'Real-time translation',
          coreVocabulary: [],
          grammarFocus: 'N/A',
          culturalNote: 'N/A',
          scenario: `Real-time translation from ${source} to ${target}.`
      };
      setCurrentLesson(dummyLesson);
      setTimeLeft(SESSION_DURATION);
      setCurrentPhase("ACTIVE DUBBING");
      setIsResumedSession(false);
      db.trackEvent('TOOL_STARTED', { tool: lang.code, source, target });
      setView('SESSION');
      setTimeout(() => startSession(false, null, null, dummyLesson, { source, target }), 100);
  };

  if (view === 'DUBBING_CONFIG') {
      return (
          <DubbingConfigScreen 
              onStart={handleStartDubbing}
              onBack={() => setView('HOME')}
          />
      );
  }

  const handleStartContentLesson = (content: string) => {
      if (!selectedLanguageRef.current) return;
      
      setContentContext(content);
      const lang = selectedLanguageRef.current;
      
      const dummyLesson: LessonContent = {
          id: lang.code,
          index: 0,
          title: "Adaptive Lesson",
          objective: "Master concepts from source text",
          coreVocabulary: [],
          grammarFocus: 'N/A',
          culturalNote: 'N/A',
          scenario: `Interactive lesson based on user content.`
      };
      setCurrentLesson(dummyLesson);
      setTimeLeft(SESSION_DURATION);
      setCurrentPhase("ADAPTIVE LEARNING");
      setIsResumedSession(false);
      db.trackEvent('TOOL_STARTED', { tool: lang.code, contentLength: content.length });
      setView('SESSION');
      setTimeout(() => startSession(false, null, null, dummyLesson, undefined, content), 100);
  };

  if (view === 'CONTENT_INPUT') {
      return (
          <ContentInputScreen 
              onStart={handleStartContentLesson}
              onBack={() => setView('HOME')}
          />
      );
  }

  if (view === 'INTRO') {
    return <IntroScreen onNext={handleIntroNext} />;
  }

  if (view === 'USER_TYPE') {
    return (
        <>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <UserTypeScreen onSelect={handleUserTypeSelect} onOpenWaitlist={() => setIsWaitlistOpen(true)} />
            {isWaitlistOpen && <WaitlistModal onClose={handleAccessGrant} />}
        </>
    );
  }

  if (view === 'QUIZ' && selectedLanguage) {
    return <QuizScreen userType={userType} onComplete={handleQuizComplete} />;
  }

  if (view === 'COURSE_DETAIL' && selectedLanguage) {
      return (
          <CourseDetailScreen 
              language={selectedLanguage}
              progress={currentSessionState}
              onStart={handleStartSessionFromDetail}
              onBack={() => setView('HOME')}
          />
      );
  }

  if (view === 'PROFILE') {
      return <ProfileScreen onBack={() => setView('HOME')} />;
  }

  if (view === 'HOME') {
    const languagesToShow = userType === 'ORGANISATION' ? ORGANISATION_COURSES : LANGUAGES;
    
    return (
      <div className="flex flex-col h-full bg-[var(--ios-grouped-bg)] text-[var(--ios-text)] overflow-hidden">
        {showTutorial && <TutorialOverlay onComplete={completeTutorial} />}
        {isWaitlistOpen && <WaitlistModal onClose={handleAccessGrant} />}
        
        {/* Navigation Bar */}
        <header className="pt-safe px-4 pb-2 bg-[var(--ios-bg)]/80 blur-header sticky top-0 z-50 flex items-center justify-between h-[44px]">
            <button onClick={() => setView('USER_TYPE')} className="flex items-center text-[#B2D900] active:opacity-50 transition-opacity">
                 <i className="fa-solid fa-chevron-left text-[17px] mr-1"></i>
                 <span className="text-[17px]">Back</span>
            </button>
            <div className="font-semibold text-[17px] text-white">Tracks</div>
            <button onClick={() => setIsWaitlistOpen(true)} className="text-[#B2D900] active:opacity-50 transition-opacity">
                 <i className="fa-solid fa-gift text-[20px]"></i>
            </button>
        </header>

        <main className="flex-1 min-h-0 px-4 pt-4 pb-safe ios-scroll-container">
            <h1 className="text-large-title text-white mb-6 px-1">{userType === 'ORGANISATION' ? 'Professional' : 'Languages'}</h1>
            
            <div className="flex flex-col gap-3 pb-20">
                {languagesToShow.map((lang, index) => {
                  const currentLessonIndex = progressMap[lang.code] || 0;
                  const displayLesson = currentLessonIndex + 1;
                  const flagSource = lang.flagUrl || `https://flagcdn.com/w160/${lang.flagCode}.png`;
                  const hasProgress = progressMap[lang.code] !== undefined;
                  
                  return (
                    <button 
                      key={lang.code} 
                      onClick={() => handleLanguageSelect(lang)} 
                      className="ios-card w-full p-4 flex items-center gap-4 text-left shadow-sm group border border-white/5 active:bg-[#B2D900]/10 transition-colors"
                      style={{ animation: `slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards ${index * 0.05}s`, opacity: 0 }}
                    >
                       {/* Flag / Icon */}
                       <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shadow-inner border border-white/10 shrink-0">
                          {lang.code === 'tool-content' ? (
                              <i className="fa-solid fa-brain text-2xl text-[#B2D900]"></i>
                          ) : (
                              <img src={flagSource} alt={lang.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                          )}
                       </div>

                       {/* Text Content */}
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                              <h3 className="text-headline text-white truncate pr-2">{lang.name}</h3>
                              {hasProgress && (
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#B2D900]/20 border border-[#B2D900]/30">
                                       <span className="w-1.5 h-1.5 rounded-full bg-[#B2D900]"></span>
                                       <span className="text-[10px] font-bold text-[#B2D900]">Lvl {displayLesson}</span>
                                   </div>
                              )}
                          </div>
                          <p className="text-subhead text-zinc-500 truncate">{lang.nativeName}</p>
                       </div>

                       {/* Arrow */}
                       <div className="text-zinc-600 pl-1">
                           <i className="fa-solid fa-chevron-right text-[14px]"></i>
                       </div>
                    </button>
                  );
                })}
              </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden transition-colors duration-1000">
      
      {summary && !isActive && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-2xl animate-in-fade flex flex-col pt-safe px-6 pb-safe">
           <div className="flex items-center justify-between mb-8 pt-4">
              <h2 className="text-title-2">Session Recap</h2>
              <button onClick={() => { setSummary(null); setView('HOME'); }} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
              {renderSummaryContent()}
           </div>

           <button 
             onClick={() => {
                setSummary(null);
                setView('HOME');
             }}
             className="w-full h-14 mt-6 bg-[#B2D900] text-black font-bold rounded-xl text-[17px] active:scale-[0.98] transition-transform"
           >
             Done
           </button>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden bg-black animate-in-fade h-full">
          <div className={`absolute inset-0 transition-all duration-[2000ms] blur-[120px] opacity-20 -z-10 ${
            isGeneratingSummary ? 'bg-purple-600' : isModelSpeaking ? 'bg-[#B2D900]' : isUserSpeaking ? 'bg-white' : isThinking ? 'bg-white' : 'bg-zinc-800'
          }`}></div>

          <header className="pt-safe px-6 flex flex-col items-center">
             {/* Dynamic Island Style Status */}
            <div className="h-12 flex items-center justify-center w-full relative mt-2">
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border backdrop-blur-xl transition-all duration-500 ${statusStyles.border} ${statusStyles.shadow} bg-black/60`}>
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${statusStyles.dot} ${isActive && !isReconnecting ? 'animate-pulse' : ''}`}></div>
                {isReconnecting ? (
                   <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500">RECONNECTING</span>
                ) : isGeneratingSummary ? (
                   <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">SUMMARIZING</span>
                ) : isThinking ? (
                   <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 animate-pulse">PROCESSING</span>
                ) : (
                   <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${statusStyles.text}`}>{selectedLanguage?.name}</span>
                )}
              </div>
            </div>
            
            <div className={`font-light tracking-tighter tabular-nums mt-12 transition-all duration-700 leading-none select-none ${
              isModelSpeaking || isUserSpeaking || isGeneratingSummary || isThinking ? 'opacity-20 blur-[1px]' : isReconnecting ? 'opacity-30' : 'opacity-100 text-white'
            }`} style={{ fontSize: 'clamp(4rem, 18vw, 7rem)' }}>
               {formatTime(timeLeft)}
            </div>
            
            <div className="mt-4 flex flex-col items-center text-center">
               <p className="text-zinc-500 text-xs font-semibold tracking-[0.15em] uppercase">
                 {currentPhase}
               </p>
               {currentLesson && (
                 <p className="text-[#B2D900] text-[10px] font-bold tracking-widest uppercase mt-2 max-w-[240px] truncate">
                   {currentLesson.title}
                 </p>
               )}
             </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center p-4 w-full relative">
            {isConnecting || isReconnecting ? (
              <div className="flex flex-col items-center gap-6 animate-pulse">
                <Logo size="w-24 h-24" variant="light" />
                <span className="text-caption-1 font-bold tracking-[0.2em] text-zinc-500 uppercase">
                  {isReconnecting ? 'RESYNCING' : 'CONNECTING...'}
                </span>
              </div>
            ) : isGeneratingSummary ? (
              <div className="flex flex-col items-center gap-6">
                 <div className="w-12 h-12 rounded-full border-2 border-t-purple-500 border-white/10 animate-spin"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center relative">
                 <AudioVisualizer isActive={isActive} isModelSpeaking={isModelSpeaking} isUserSpeaking={isUserSpeaking} audioRefs={audioRefs} />
              </div>
            )}
          </main>

          <footer className="pb-safe px-8 flex flex-col items-center mb-6 shrink-0 justify-end min-h-[100px]">
             {!isGeneratingSummary && (
                <button 
                onClick={() => handleFinishSession()}
                className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 active:bg-zinc-800 active:scale-90 transition-all flex items-center justify-center shadow-lg"
                aria-label="End Session"
                >
                <i className="fa-solid fa-ear-deaf text-2xl text-[#FF453A]"></i>
                </button>
            )}
          </footer>
      </div>
    </div>
  );
};

export default App;
