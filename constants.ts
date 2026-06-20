
import { Language, LessonContent } from './types';

export const WAITLIST_URL = "https://www.makeform.ai/f/yyXGVerS";

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flagCode: 'us', instructionLanguage: 'English', description: 'The global language of business and travel.' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flagCode: 'es', instructionLanguage: 'English', description: 'Unlock Latin America and Spain.' },
  { code: 'fr', name: 'French', nativeName: 'Français', flagCode: 'fr', instructionLanguage: 'English', description: 'Culture, diplomacy, and romance.' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flagCode: 'de', instructionLanguage: 'English', description: 'The language of engineering and philosophy.' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flagCode: 'it', instructionLanguage: 'English', description: 'Art, music, and culinary mastery.' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', instructionLanguage: 'English', description: 'Deep tradition meets high technology.' },
  { code: 'zh', name: 'Mandarin', nativeName: '中文', flagCode: 'cn', instructionLanguage: 'English', description: 'The most spoken native language.' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flagCode: 'ru', instructionLanguage: 'English', description: 'Literature and vast geography.' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flagCode: 'br', instructionLanguage: 'English', description: 'The vibrant spirit of Brazil.' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flagCode: 'tr', instructionLanguage: 'English', description: 'Bridge between East and West.' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', instructionLanguage: 'English', description: 'Gateway to Southeast Asia.' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flagCode: 'kr', instructionLanguage: 'English', description: 'Pop culture and innovation powerhouse.' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flagCode: 'gr', instructionLanguage: 'English', description: 'The foundation of Western civilization.' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flagCode: 'sa', instructionLanguage: 'English', description: 'Poetry, history, and commerce.' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flagCode: 'ke', instructionLanguage: 'English', description: 'The lingua franca of East Africa.' },
];

export const ORGANISATION_COURSES: Language[] = [
  { isOrg: true, isTool: true, code: 'tool-dubbing', name: 'Real-Time Cognitive Dubbing', nativeName: 'Simultaneous Interpretation', flagCode: 'un', instructionLanguage: 'English', description: 'Instant, emotion-preserving translation.' },
  { isOrg: true, isTool: true, code: 'tool-content', name: 'Content Transformer', nativeName: 'Adaptive Learning Engine', flagCode: 'brain', instructionLanguage: 'English', description: 'Turn any text into an interactive audio lesson.' },
  { isOrg: true, code: 'en-exec', name: 'English for Executives', nativeName: 'Leadership & Strategy', flagCode: 'us', instructionLanguage: 'English', description: 'Boardroom mastery and high-stakes negotiation.' },
  { isOrg: true, code: 'en-tech', name: 'English for Founders', nativeName: 'Pitching & Fundraising', flagCode: 'us', instructionLanguage: 'English', description: 'Secure funding and lead global teams.' },
  { isOrg: true, code: 'de-med', name: 'Deutsch für Pflege', nativeName: 'Krankenpflege & Medizin', flagCode: 'de', instructionLanguage: 'English', description: 'Essential vocabulary for medical professionals.' },
  { isOrg: true, code: 'de-ausbildung', name: 'Deutsch für Ausbildung', nativeName: 'Berufsschule & Handwerk', flagCode: 'de', instructionLanguage: 'English', description: 'Vocational training and technical skills.' },
  { isOrg: true, code: 'es-site', name: 'Spanish for Managers', nativeName: 'Construction Safety', flagCode: 'mx', instructionLanguage: 'English', description: 'Site safety, commands, and compliance.' },
  { isOrg: true, code: 'zh-supply', name: 'Mandarin for Supply Chain', nativeName: 'Logistics & Manufacturing', flagCode: 'cn', instructionLanguage: 'English', description: 'Factory coordination and logistics.' },
  { isOrg: true, code: 'jp-corp', name: 'Business Japanese', nativeName: 'Keigo & Corporate Etiquette', flagCode: 'jp', instructionLanguage: 'English', description: 'Navigate corporate hierarchy with grace.' },
  { isOrg: true, code: 'fr-dip', name: 'French for Diplomacy', nativeName: 'Intl. Relations & Policy', flagCode: 'fr', instructionLanguage: 'English', description: 'International relations and formal policy.' },
  { isOrg: true, code: 'tr-hosp', name: 'Turkish for Hospitality', nativeName: 'Tourism & Service', flagCode: 'tr', instructionLanguage: 'English', description: 'Guest services and hotel management.' },
  { isOrg: true, code: 'vi-mfg', name: 'Vietnamese for Mfg', nativeName: 'Factory & Production', flagCode: 'vn', instructionLanguage: 'English', description: 'Production line efficiency and safety.' },
  { isOrg: true, code: 'ko-biz', name: 'Korean for Business', nativeName: 'Corporate Hierarchy', flagCode: 'kr', instructionLanguage: 'English', description: 'Chaebol dynamics and business manners.' },
];

export const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

export const GET_PLACEMENT_QUIZ = (isOrg: boolean) => [
  {
    question: isOrg ? "How effectively can you perform your job in this language right now?" : "How much of a conversation in this language can you understand right now?",
    options: [
      { text: isOrg ? "Not at all. I rely on translators/tools." : "Nothing at all.", score: 0 },
      { text: isOrg ? "I know basic industry terms." : "A few isolated words.", score: 1 },
      { text: isOrg ? "I can manage routine tasks/emails." : "Basic phrases and greetings.", score: 2 },
      { text: isOrg ? "I handle complex situations but need polish." : "Most of it, if spoken slowly.", score: 5 }
    ]
  },
  {
    question: isOrg ? "What is the critical business outcome you need?" : "Have you studied this language before?",
    options: isOrg ? [
      { text: "Safety & Compliance.", score: 0 },
      { text: "Patient/Client Trust.", score: 1 },
      { text: "Team Management & Clarity.", score: 2 },
      { text: "High-stakes Negotiation/Pitching.", score: 5 }
    ] : [
      { text: "Never.", score: 0 },
      { text: "A little in school years ago.", score: 1 },
      { text: "Yes, using apps like Duolingo.", score: 2 },
      { text: "Yes, lived in the country/serious study.", score: 5 }
    ]
  },
  {
    question: isOrg ? "What is the professional seniority level?" : "Can you form complex sentences (e.g., 'If I had known, I would have come')?",
    options: isOrg ? [
      { text: "Junior / Apprentice / Student.", score: 0 },
      { text: "Mid-level Professional.", score: 3 },
      { text: "Senior Manager / Director.", score: 4 },
      { text: "Executive / Founder.", score: 5 }
    ] : [
      { text: "No idea how.", score: 0 },
      { text: "Maybe, but I'd need to think hard.", score: 3 },
      { text: "Yes, easily.", score: 5 }
    ]
  }
];

export const PLACEMENT_QUIZ = GET_PLACEMENT_QUIZ(false);

const ADAPTIVE_ACQUISITION_METHODOLOGY = (lang: Language, profileContext: string, reviewItems: string[]) => `
You are the **PRAAT ADAPTIVE ACQUISITION ENGINE**, a hyper-intelligent, personal language tutor. 
You are NOT a scripted audio app. You are a live conversation partner. 
Your goal is "Language Acquisition", not "Studying".

### LEARNER PROFILE & CONTEXT:
*   **Target Language**: ${lang.name}
*   **Learner Context / Goal**: ${profileContext}
*   **Review Items**: ${reviewItems.length > 0 ? reviewItems.join(', ') : 'None.'}

### THE 5 PILLARS OF PRAAT AI:

1. **i+1 PERSONALIZED INPUT**: 
   *   Do not follow a fixed curriculum. Speak naturally using vocabulary slightly above the learner's current output level, but perfectly comprehensible through context.
   *   Adapt your vocabulary to their specific goal (${profileContext}).

2. **LIVING CONVERSATION**:
   *   If the user hesitates, slow down and simplify. 
   *   If the user uses a mix of languages, understand it implicitly and respond naturally in ${lang.name}.
   *   Let the conversation drift naturally based on what the user says. The user controls the topic. 

3. **LANGUAGE ACQUISITION MEMORY**:
   *   Weave in their "Review Items" naturally into real questions. Do not say "Let's review this word." Just use it in a fascinating question.

4. **ACCENT-AWARE PRONUNCIATION COACHING**:
   *   If the learner mispronounces a word, do not just say "Wrong." Detect the specific issue (rhythm, stress, intonation, native-accent interference).
   *   Say: "I noticed you used an English 'R'. Let's try it with the tip of your tongue..." 

5. **EMOTIONAL ADAPTATION (THE AFFECTIVE FILTER)**:
   *   Detect the learner's emotional state from their voice (e.g., frustration, excitement, nervousness, boredom).
   *   If they seem frustrated, nervous, or overloaded: immediately drop the difficulty, slow down your speech, and provide explicit reassurance. Say: "Don't worry, we can take it slow" or "Let's just chat about something simple."
   *   If they seem excited or confident: match their energy, increase the pace slightly, and introduce slightly more complex vocabulary (i+1).
   *   Keep their confidence high. Acquisition drops when stress rises.

### CORE TEACHING RULES:
*   **NO Grammar Explanations**: Do not explain "past tense" or "conjugations". Never use textbook logic. Provide *comprehensible input*.
*   **NO Memorization**: We want meaningful conversation, repeated patterns, and personal context.
*   **Constant Feedback loop**: Listen to the user's audio. If they make a mistake in grammar, implicitly correct them in your response by using the correct form. 
*   **Native Accent**: Use a 100% flawless native ${lang.nativeName} accent for all target words. Switch to the instruction language gracefully when you need to provide emotional support or a direct semantic bridge, but try to maximize time spent in the target language.

BE HUMAN. BE ALIVE. ADAPT.
`;

const DUBBING_METHODOLOGY = (sourceLang: string = "Detected Language", targetLang: string = "English") => `
You are a **REAL-TIME COGNITIVE DUBBING AI**. Your goal is to provide instant, emotion-preserving translation.

### CORE RULES:
1.  **TRANSLATE ONLY**: Do not answer questions. Do not have a conversation. Just translate what the user says.
2.  **LANGUAGE PAIR**: 
    *   **SOURCE**: ${sourceLang} (or auto-detect if unsure).
    *   **TARGET**: ${targetLang}.
    *   If the user speaks the TARGET language, translate it back to the SOURCE language (bidirectional mode).
3.  **EMOTION & TONE**: Mimic the user's emotion, speed, and intensity. If they are angry, be angry. If they are whispering, whisper.
4.  **LATENCY**: Be as fast as possible. Do not say "Here is the translation". Just speak the translation.
`;

const CONTENT_TRANSFORMER_METHODOLOGY = (contentContext: string = "General Content") => `
You are the **CONTENT TRANSFORMER**. Your goal is to turn raw text into an interactive, learnable audio lesson.

### SOURCE MATERIAL:
"${contentContext.substring(0, 5000)}..."

### METHODOLOGY:
1.  **DECONSTRUCT**: Break down the source material into small, digestible concepts.
2.  **INTERACTIVE DIALOGUE**: Do not just read the text. Discuss it with the user.
3.  **CHECK FOR UNDERSTANDING**: Ask questions to ensure the user grasps the content.
4.  **ADAPTIVE PACING**: If the user is confused, simplify. If they get it, move on.
`;

export const SYSTEM_INSTRUCTION_TEMPLATE = (lang: Language, profileContext: string, reviewItems: string[] = [], dubbingConfig?: { source: string, target: string }, contentContext?: string) => {
  if (lang.isTool && lang.code === 'tool-dubbing') {
    return DUBBING_METHODOLOGY(dubbingConfig?.source, dubbingConfig?.target);
  }
  if (lang.isTool && lang.code === 'tool-content') {
    return CONTENT_TRANSFORMER_METHODOLOGY(contentContext);
  }
  
  return ADAPTIVE_ACQUISITION_METHODOLOGY(lang, profileContext, reviewItems);
};
