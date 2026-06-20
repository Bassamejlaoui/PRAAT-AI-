
import { Language, LessonContent } from './types';

const CEFR_STAGES = [
  { start: 0, end: 9, level: 'A1 (Survival)', focus: 'Basic Needs & Greetings' },
  { start: 10, end: 19, level: 'A2 (Foundation)', focus: 'Daily Routine & Past Tense' },
  { start: 20, end: 39, level: 'B1 (Intermediate)', focus: 'Opinions, Future, & Travel' },
  { start: 40, end: 59, level: 'B2 (Upper Intermediate)', focus: 'Abstract Concepts & Complex Narrative' },
  { start: 60, end: 79, level: 'C1 (Advanced)', focus: 'Nuance, Idioms, & Professional Fluency' },
  { start: 80, end: 89, level: 'C2 (Mastery)', focus: 'Cultural Deep Dives & Literature' }
];

// Helper to generate a deterministic lesson based on index
const generateLesson = (lang: Language, index: number, isOrg: boolean): LessonContent => {
  const stage = CEFR_STAGES.find(s => index >= s.start && index <= s.end) || CEFR_STAGES[0];
  
  // 1. INDIVIDUAL TRACK (Real Life Long Sentences / Sentence Stacking)
  if (!isOrg) {
    const sentenceThemes = [
        { 
            title: "The 'But' Connector", 
            focus: "Linking desires with obstacles", 
            vocab: ["I would like to...", "but...", "I cannot...", "because..."],
            scenario: "Politely declining an invitation with a valid reason."
        },
        { 
            title: "Temporal Sequencing", 
            focus: "Ordering events in time", 
            vocab: ["Before I...", "I usually...", "and then...", "after that..."],
            scenario: "Explaining your complex morning routine."
        },
        { 
            title: "Causal Chains", 
            focus: "Explaining complex reasons", 
            vocab: ["The reason why...", "is because...", "so therefore...", "I decided to..."],
            scenario: "Justifying a difficult decision to a friend."
        },
        { 
            title: "Conditional Outcomes", 
            focus: "Hypothetical situations", 
            vocab: ["If it happens that...", "then we will...", "provided that...", "you can..."],
            scenario: "Planning a trip with uncertain weather."
        },
        { 
            title: "Relative Descriptions", 
            focus: "Describing people and things deeply", 
            vocab: ["The person who...", "that I met...", "whose car...", "was parked..."],
            scenario: "Describing a suspect or a lost item in detail."
        },
        { 
            title: "Reported Speech", 
            focus: "Relaying information", 
            vocab: ["He told me that...", "he wanted to...", "but didn't know...", "how to..."],
            scenario: "Gossiping or relaying a message from a boss."
        },
        { 
            title: "Expressing Regret", 
            focus: "Past conditionals", 
            vocab: ["I should have...", "but I didn't...", "so now...", "I must..."],
            scenario: "Apologizing for a mistake made yesterday."
        },
        { 
            title: "Negotiating Plans", 
            focus: "Future arrangements", 
            vocab: ["I am planning to...", "unless...", "something comes up...", "in which case..."],
            scenario: "Scheduling a meeting with many conflicts."
        },
        { 
            title: "Justifying Opinions", 
            focus: "Argumentation", 
            vocab: ["From my perspective...", "it seems that...", "although...", "it might be..."],
            scenario: "Debating which restaurant is better."
        },
        { 
            title: "Storytelling Flow", 
            focus: "Narrative continuity", 
            vocab: ["It all started when...", "suddenly...", "meanwhile...", "eventually..."],
            scenario: "Telling a funny story about a travel mishap."
        }
    ];

    const themeIndex = index % sentenceThemes.length;
    const depthLevel = Math.floor(index / sentenceThemes.length) + 1;
    const theme = sentenceThemes[themeIndex];

    const title = `${theme.title} ${depthLevel > 1 ? `(Level ${depthLevel})` : ''}`;
    
    // =========================================================================
    // SPECIFIC THINKING METHOD LESSONS (From Guidebook)
    // =========================================================================
    if (index === 0) {
        if (lang.code === 'fr') {
            return { id: 'fr-0', index: 0, title: "French Cognates", objective: "Identify French words you already know.", coreVocabulary: ["le gâteau", "le café", "je veux", "tu veux"], grammarFocus: "Masculine 'the' (le)", culturalNote: "English has many French roots.", scenario: "Ordering at a café." };
        } else if (lang.code === 'sw') {
            return { id: 'sw-0', index: 0, title: "Echoic Verbs", objective: "Learn how Swahili verbs sound like their action.", coreVocabulary: ["kucheka", "kulala", "kula", "kutaka"], grammarFocus: "The infinitive (ku-)", culturalNote: "Onomatopoeia in language.", scenario: "Associating sounds with actions." };
        } else if (lang.code === 'el') {
            return { id: 'el-0', index: 0, title: "Word Parts", objective: "Build words using Greek prefixes.", coreVocabulary: ["meno", "peri-", "perimeno", "epi-", "epimeno"], grammarFocus: "Prefixes over memory", culturalNote: "Greek roots in English.", scenario: "I stay, wait, and insist." };
        } else if (lang.code === 'de') {
            return { id: 'de-0', index: 0, title: "Germanic Roots", objective: "Convert English words into German verbs.", coreVocabulary: ["lernen", "finden", "kommen", "gehen"], grammarFocus: "The infinitive (-en)", culturalNote: "The Germanic side of English.", scenario: "Discovering German verbs." };
        } else if (lang.code === 'tr') {
            return { id: 'tr-0', index: 0, title: "The Power of Suffixes", objective: "Learn that Turkish uses endings instead of isolated words.", coreVocabulary: ["-im", "-um", "doktorum", "sosyalim"], grammarFocus: "Vowel harmony for 'I am'", culturalNote: "Turkish is an agglutinative language.", scenario: "Describing who you are." };
        } else if (lang.code === 'ar') {
            return { id: 'ar-0', index: 0, title: "Roots and Patterns", objective: "Understand the Semitic root system.", coreVocabulary: ["habibi", "mahboub", "sherbet", "mashroub"], grammarFocus: "Consonant sets", culturalNote: "Dialects vs. Languages in the Arab world.", scenario: "Sourcing words from 3 consonants." };
        }
    } else if (index === 1) {
        if (lang.code === 'fr') {
            return { id: 'fr-1', index: 1, title: "The -ION Suffix", objective: "Convert English -ION nouns to French.", coreVocabulary: ["la collection", "la tradition", "l'opinion", "l'organisation"], grammarFocus: "Feminine 'the' (la) and contractions", culturalNote: "Nasalized N sounds.", scenario: "Discovering identical nouns." };
        } else if (lang.code === 'sw') {
            return { id: 'sw-1', index: 1, title: "I in the Present", objective: "Combine subject and tense markers.", coreVocabulary: ["ni-", "na-", "nina-", "ninataka"], grammarFocus: "Subject (ni-) + Tense (na-)", culturalNote: "Dropping the infinitive ku-", scenario: "Saying what you want." };
        } else if (lang.code === 'el') {
            return { id: 'el-1', index: 1, title: "Negation & Pronouns", objective: "Negate verbs and identify the 'I' sound.", coreVocabulary: ["dhen", "egho", "meni", "perimeni"], grammarFocus: "Third person singular (-i)", culturalNote: "Looking closely at the Greek 'D'.", scenario: "Saying what he/she does not do." };
        } else if (lang.code === 'de') {
            return { id: 'de-1', index: 1, title: "Modals & Consonant Shifts", objective: "Use modals and discover consonant shifts.", coreVocabulary: ["ich will", "ich kann", "hoffen", "helfen", "schlafen"], grammarFocus: "Modal verbs + infinitive at the end", culturalNote: "English P shifts to German F.", scenario: "Expressing ability or desire." };
        } else if (lang.code === 'tr') {
            return { id: 'tr-1', index: 1, title: "You & Negation", objective: "Say 'you are' and 'am not'.", coreVocabulary: ["-sin", "değilim", "diilsin", "komiksin"], grammarFocus: "Negative suffix / word (değil)", culturalNote: "Spoken vs written pronunciation.", scenario: "Contrasting yourself with someone else." };
        } else if (lang.code === 'ar') {
            return { id: 'ar-1', index: 1, title: "Adjective-Verbs", objective: "Use describing words like verbs.", coreVocabulary: ["gayy", "gayya", "ana"], grammarFocus: "Feminine -A ending", culturalNote: "The 'is/am/are' are invisible in Arabic.", scenario: "Saying I am coming." };
        }
    } else if (index === 2) {
        if (lang.code === 'fr') {
            return { id: 'fr-2', index: 2, title: "Converting Verbs", objective: "Turn English -ation / -ate words into French verbs.", coreVocabulary: ["participer", "célébrer", "un peu", "ama"], grammarFocus: "Infinitive ending (-er)", culturalNote: "Word order flexibility.", scenario: "I want to participate a little." };
        } else if (lang.code === 'sw') {
            return { id: 'sw-2', index: 2, title: "You & Objects", objective: "Introduce object markers.", coreVocabulary: ["u-", "-ni-", "unaniona", "sasa", "je"], grammarFocus: "Object marker comes before the verb root", culturalNote: "Sasa as a greeting.", scenario: "Do you see me now?" };
        } else if (lang.code === 'el') {
            return { id: 'el-2', index: 2, title: "Questions & Knowing", objective: "Ask questions and use new question words.", coreVocabulary: ["yiati", "pu", "ksero", "kseris"], grammarFocus: "Question words (why, where)", culturalNote: "Intonation is enough for questions.", scenario: "Why do you know?" };
        } else if (lang.code === 'de') {
            return { id: 'de-2', index: 2, title: "Negation & Sentence Structure", objective: "Place 'nicht' correctly.", coreVocabulary: ["nicht", "baden", "Bruder", "denn"], grammarFocus: "TH to D consonant shift", culturalNote: "German sentence sandwiches.", scenario: "I cannot sleep because..." };
        } else if (lang.code === 'tr') {
            return { id: 'tr-2', index: 2, title: "Modifiers & Pronouns", objective: "Use emphasis pronouns.", coreVocabulary: ["çok", "ama", "boşum", "ben", "sen"], grammarFocus: "Emphatic subject pronouns", culturalNote: "Ben and Sen are optional.", scenario: "I am free but you are busy." };
        } else if (lang.code === 'ar') {
            return { id: 'ar-2', index: 2, title: "Names as Adjectives", objective: "Realize names have meanings.", coreVocabulary: ["kariim", "karima", "amiin", "amina"], grammarFocus: "Masculine vs Feminine names", culturalNote: "Arab names carry root meanings.", scenario: "I am generous, she is honest." };
        }
    }
    
    // Generic fallback for index 0 if not one of the custom languages
    if (index === 0) {
        return {
            id: `${lang.code}-ind-0`,
            index: 0,
            title: "Sentence Building I: Desires",
            objective: "Construct your first complex sentence: 'I want to go but I can't.'",
            coreVocabulary: ["I want", "To go", "But", "I can't"],
            grammarFocus: "Basic Connectors",
            culturalNote: "Natives speak in flows, not isolated words.",
            scenario: "Expressing a frustrated desire."
        };
    }

    return {
      id: `${lang.code}-ind-${index}`,
      index,
      title,
      objective: `Construct long, fluid sentences using ${theme.focus}.`,
      coreVocabulary: theme.vocab,
      grammarFocus: "Sentence Stacking & Connectors",
      culturalNote: "Focus on the melody of the long sentence.",
      scenario: theme.scenario
    };
  } 
  
  // 2. ORGANISATION TRACK (Specialized)
  else {
    // Determine the vertical based on lang code suffix (e.g., 'de-med')
    const vertical = lang.code.split('-')[1] || 'biz'; 
    let specializedFocus = "Business";
    if (vertical === 'med') specializedFocus = "Medical / Care";
    if (vertical === 'tech') specializedFocus = "Tech / Startup";
    if (vertical === 'site') specializedFocus = "Construction";

    let title = `Prof. Lesson ${index + 1}: ${specializedFocus}`;
    let scenario = "Office setting.";
    
    if (index === 0) {
      title = "Professional Protocols: Formal Address";
      scenario = "First day on the job. Meeting the boss.";
    } else if (index === 25) {
       title = "Crisis Management: Reporting an Incident";
       scenario = "Something went wrong. You must report it clearly and objectively.";
    } else {
       title = `${specializedFocus} Module ${index + 1}: Advanced Scenarios`;
       scenario = `Complex interaction within a ${specializedFocus} environment.`;
    }

    return {
      id: `${lang.code}-org-${index}`,
      index,
      title,
      objective: `Master ${specializedFocus} communication at ${stage.level}.`,
      coreVocabulary: ["Professional Term 1", "Professional Term 2"],
      grammarFocus: "Formal Registers & Politeness",
      culturalNote: "Hierarchy and professional etiquette nuances.",
      scenario
    };
  }
};

export class CurriculumEngine {
  static getLesson(lang: Language, index: number): LessonContent {
    // If index > 89, we cap at 89 (Mastery Maintenance)
    const safeIndex = Math.min(Math.max(0, index), 89);
    // Use explicit flag, defaulting to false if undefined
    const isOrgTrack = !!lang.isOrg; 
    return generateLesson(lang, safeIndex, isOrgTrack);
  }

  static getTotalLessons(): number {
    return 90;
  }
}
