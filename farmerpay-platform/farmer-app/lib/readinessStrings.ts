/**
 * Readiness i18n strings — keyed by language code.
 * Supports: en, hi, mr, te, kn, od
 *
 * Usage:
 *   import { getReadinessLabel, t } from "../lib/readinessStrings";
 *   const label = getReadinessLabel("ready", "hi"); // "तैयार"
 *   const text = t("why.title", "hi");              // "आपकी ऋण-तैयारी"
 */

export type ReadinessState = "ready" | "almost" | "notReady" | "needsData";
export type LangCode = "en" | "hi" | "mr" | "te" | "kn" | "od";

interface ReadinessLabels {
  label: string;
  a11yHint: string;
}

const strings: Record<LangCode, Record<ReadinessState, ReadinessLabels>> = {
  en: {
    ready:     { label: "Loan-Ready",     a11yHint: "You are loan-ready. Tap for details." },
    almost:    { label: "Almost Ready",   a11yHint: "You are almost loan-ready. Tap for details." },
    notReady:  { label: "Not Ready Yet",  a11yHint: "You are not loan-ready yet. Tap for details." },
    needsData: { label: "Add Info",       a11yHint: "More information needed. Tap to add info." },
  },
  hi: {
    ready:     { label: "तैयार",           a11yHint: "आप ऋण के लिए तैयार हैं। विवरण के लिए टैप करें।" },
    almost:    { label: "लगभग तैयार",      a11yHint: "आप लगभग तैयार हैं। विवरण के लिए टैप करें।" },
    notReady:  { label: "अभी तैयार नहीं",  a11yHint: "आप अभी तैयार नहीं हैं। विवरण के लिए टैप करें।" },
    needsData: { label: "जानकारी जोड़ें",    a11yHint: "अधिक जानकारी चाहिए। जोड़ने के लिए टैप करें।" },
  },
  mr: {
    ready:     { label: "तयार",            a11yHint: "तुम्ही कर्जासाठी तयार आहात. तपशीलांसाठी टॅप करा." }, // TODO: verify translation
    almost:    { label: "जवळजवळ तयार",    a11yHint: "तुम्ही जवळजवळ तयार आहात. तपशीलांसाठी टॅप करा." }, // TODO: verify translation
    notReady:  { label: "अजून तयार नाही",  a11yHint: "तुम्ही अजून तयार नाही. तपशीलांसाठी टॅप करा." }, // TODO: verify translation
    needsData: { label: "माहिती जोडा",     a11yHint: "अधिक माहिती आवश्यक. जोडण्यासाठी टॅप करा." }, // TODO: verify translation
  },
  te: {
    ready:     { label: "సిద్ధం",           a11yHint: "మీరు రుణానికి సిద్ధంగా ఉన్నారు. వివరాల కోసం నొక్కండి." }, // TODO: verify translation
    almost:    { label: "దాదాపు సిద్ధం",    a11yHint: "మీరు దాదాపు సిద్ధంగా ఉన్నారు. వివరాల కోసం నొక్కండి." }, // TODO: verify translation
    notReady:  { label: "ఇంకా సిద్ధం కాదు", a11yHint: "మీరు ఇంకా సిద్ధంగా లేరు. వివరాల కోసం నొక్కండి." }, // TODO: verify translation
    needsData: { label: "సమాచారం జోడించండి", a11yHint: "మరింత సమాచారం అవసరం. జోడించడానికి నొక్కండి." }, // TODO: verify translation
  },
  kn: {
    ready:     { label: "ಸಿದ್ಧ",            a11yHint: "ನೀವು ಸಾಲಕ್ಕೆ ಸಿದ್ಧರಾಗಿದ್ದೀರಿ. ವಿವರಗಳಿಗಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ." }, // TODO: verify translation
    almost:    { label: "ಬಹುತೇಕ ಸಿದ್ಧ",     a11yHint: "ನೀವು ಬಹುತೇಕ ಸಿದ್ಧರಾಗಿದ್ದೀರಿ. ವಿವರಗಳಿಗಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ." }, // TODO: verify translation
    notReady:  { label: "ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ",   a11yHint: "ನೀವು ಇನ್ನೂ ಸಿದ್ಧರಾಗಿಲ್ಲ. ವಿವರಗಳಿಗಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ." }, // TODO: verify translation
    needsData: { label: "ಮಾಹಿತಿ ಸೇರಿಸಿ",    a11yHint: "ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಬೇಕು. ಸೇರಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ." }, // TODO: verify translation
  },
  od: {
    ready:     { label: "ପ୍ରସ୍ତୁତ",          a11yHint: "ଆପଣ ଋଣ ପାଇଁ ପ୍ରସ୍ତୁତ। ବିବରଣୀ ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ।" }, // TODO: verify translation
    almost:    { label: "ପ୍ରାୟ ପ୍ରସ୍ତୁତ",     a11yHint: "ଆପଣ ପ୍ରାୟ ପ୍ରସ୍ତୁତ। ବିବରଣୀ ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ।" }, // TODO: verify translation
    notReady:  { label: "ଏବେ ପ୍ରସ୍ତୁତ ନୁହଁନ୍ତି", a11yHint: "ଆପଣ ଏବେ ପ୍ରସ୍ତୁତ ନୁହଁନ୍ତି। ବିବରଣୀ ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ।" }, // TODO: verify translation
    needsData: { label: "ତଥ୍ୟ ଯୋଡନ୍ତୁ",      a11yHint: "ଅଧିକ ତଥ୍ୟ ଆବଶ୍ୟକ। ଯୋଡିବାକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ।" }, // TODO: verify translation
  },
};

// ─── General readiness screen strings ─────────────────────────────

type StringKey =
  | "why.title"
  | "why.subtitle"
  | "why.trust"
  | "why.financialHealth"
  | "why.whatWillHelp"
  | "why.loading"
  | "why.error"
  | "why.retry"
  | "why.noData"
  | "why.noDataDesc"
  | "why.band.strong"
  | "why.band.building"
  | "why.band.low"
  | "why.met"
  | "why.below"
  | "why.missing"
  | "why.stale"
  | "why.showScores"
  | "why.hideScores";

const screenStrings: Record<LangCode, Record<StringKey, string>> = {
  en: {
    "why.title": "Your Loan-Readiness",
    "why.subtitle": "Why you are / aren't ready",
    "why.trust": "Community Trust",
    "why.financialHealth": "Financial Health",
    "why.whatWillHelp": "What will help",
    "why.loading": "Loading readiness details...",
    "why.error": "Something went wrong",
    "why.retry": "Try Again",
    "why.noData": "No Data Yet",
    "why.noDataDesc": "Complete your profile and connect your bank to see readiness.",
    "why.band.strong": "Strong",
    "why.band.building": "Building",
    "why.band.low": "Low",
    "why.met": "Threshold met",
    "why.below": "Below threshold",
    "why.missing": "Data not available",
    "why.stale": "Data may be outdated",
    "why.showScores": "Show numeric scores",
    "why.hideScores": "Hide numeric scores",
  },
  hi: {
    "why.title": "आपकी ऋण-तैयारी",
    "why.subtitle": "आप तैयार क्यों हैं / क्यों नहीं",
    "why.trust": "सामुदायिक विश्वास",
    "why.financialHealth": "आर्थिक स्वास्थ्य",
    "why.whatWillHelp": "क्या मदद करेगा",
    "why.loading": "तैयारी विवरण लोड हो रहा है...",
    "why.error": "कुछ गलत हो गया",
    "why.retry": "पुनः प्रयास करें",
    "why.noData": "अभी कोई डेटा नहीं",
    "why.noDataDesc": "अपनी प्रोफ़ाइल पूरी करें और बैंक जोड़ें।",
    "why.band.strong": "मजबूत",
    "why.band.building": "विकासशील",
    "why.band.low": "कम",
    "why.met": "सीमा पूरी",
    "why.below": "सीमा से नीचे",
    "why.missing": "डेटा उपलब्ध नहीं",
    "why.stale": "डेटा पुराना हो सकता है",
    "why.showScores": "अंक दिखाएं",
    "why.hideScores": "अंक छुपाएं",
  },
  mr: { // TODO: verify translations
    "why.title": "तुमची कर्ज-तयारी",
    "why.subtitle": "तुम्ही तयार का आहात / नाही",
    "why.trust": "सामुदायिक विश्वास",
    "why.financialHealth": "आर्थिक आरोग्य",
    "why.whatWillHelp": "काय मदत करेल",
    "why.loading": "तयारी तपशील लोड होत आहे...",
    "why.error": "काहीतरी चूक झाली",
    "why.retry": "पुन्हा प्रयत्न करा",
    "why.noData": "अजून डेटा नाही",
    "why.noDataDesc": "तुमची प्रोफाइल पूर्ण करा आणि बँक जोडा.",
    "why.band.strong": "मजबूत",
    "why.band.building": "विकसनशील",
    "why.band.low": "कमी",
    "why.met": "मर्यादा पूर्ण",
    "why.below": "मर्यादेखाली",
    "why.missing": "डेटा उपलब्ध नाही",
    "why.stale": "डेटा कालबाह्य असू शकतो",
    "why.showScores": "गुण दाखवा",
    "why.hideScores": "गुण लपवा",
  },
  te: { // TODO: verify translations
    "why.title": "మీ రుణ-సిద్ధత",
    "why.subtitle": "మీరు సిద్ధంగా ఎందుకు ఉన్నారు / లేరు",
    "why.trust": "సామాజిక నమ్మకం",
    "why.financialHealth": "ఆర్థిక ఆరోగ్యం",
    "why.whatWillHelp": "ఏది సహాయపడుతుంది",
    "why.loading": "సిద్ధత వివరాలు లోడ్ అవుతున్నాయి...",
    "why.error": "ఏదో తప్పు జరిగింది",
    "why.retry": "మళ్ళీ ప్రయత్నించండి",
    "why.noData": "ఇంకా డేటా లేదు",
    "why.noDataDesc": "మీ ప్రొఫైల్ పూర్తి చేయండి మరియు బ్యాంక్ కనెక్ట్ చేయండి.",
    "why.band.strong": "బలమైన",
    "why.band.building": "నిర్మాణంలో",
    "why.band.low": "తక్కువ",
    "why.met": "పరిమితి చేరింది",
    "why.below": "పరిమితి కింద",
    "why.missing": "డేటా అందుబాటులో లేదు",
    "why.stale": "డేటా పాతది కావచ్చు",
    "why.showScores": "స్కోర్లు చూపించు",
    "why.hideScores": "స్కోర్లు దాచు",
  },
  kn: { // TODO: verify translations
    "why.title": "ನಿಮ್ಮ ಸಾಲ-ಸಿದ್ಧತೆ",
    "why.subtitle": "ನೀವು ಏಕೆ ಸಿದ್ಧರಾಗಿದ್ದೀರಿ / ಇಲ್ಲ",
    "why.trust": "ಸಮುದಾಯ ನಂಬಿಕೆ",
    "why.financialHealth": "ಆರ್ಥಿಕ ಆರೋಗ್ಯ",
    "why.whatWillHelp": "ಏನು ಸಹಾಯ ಮಾಡುತ್ತದೆ",
    "why.loading": "ಸಿದ್ಧತೆ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    "why.error": "ಏನೋ ತಪ್ಪಾಗಿದೆ",
    "why.retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "why.noData": "ಇನ್ನೂ ಡೇಟಾ ಇಲ್ಲ",
    "why.noDataDesc": "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ಬ್ಯಾಂಕ್ ಸಂಪರ್ಕಿಸಿ.",
    "why.band.strong": "ಬಲವಾದ",
    "why.band.building": "ನಿರ್ಮಾಣದಲ್ಲಿ",
    "why.band.low": "ಕಡಿಮೆ",
    "why.met": "ಮಿತಿ ತಲುಪಿದೆ",
    "why.below": "ಮಿತಿಗಿಂತ ಕೆಳಗೆ",
    "why.missing": "ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ",
    "why.stale": "ಡೇಟಾ ಹಳೆಯದಾಗಿರಬಹುದು",
    "why.showScores": "ಅಂಕಗಳನ್ನು ತೋರಿಸಿ",
    "why.hideScores": "ಅಂಕಗಳನ್ನು ಮರೆಮಾಡಿ",
  },
  od: { // TODO: verify translations
    "why.title": "ଆପଣଙ୍କ ଋଣ-ପ୍ରସ୍ତୁତି",
    "why.subtitle": "ଆପଣ କାହିଁକି ପ୍ରସ୍ତୁତ / ନୁହଁନ୍ତି",
    "why.trust": "ସାମୁଦାୟିକ ବିଶ୍ୱାସ",
    "why.financialHealth": "ଆର୍ଥିକ ସ୍ୱାସ୍ଥ୍ୟ",
    "why.whatWillHelp": "କ'ଣ ସାହାଯ୍ୟ କରିବ",
    "why.loading": "ପ୍ରସ୍ତୁତି ବିବରଣୀ ଲୋଡ୍ ହେଉଛି...",
    "why.error": "କିଛି ଭୁଲ ହୋଇଗଲା",
    "why.retry": "ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ",
    "why.noData": "ଏବେ କୌଣସି ତଥ୍ୟ ନାହିଁ",
    "why.noDataDesc": "ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ ଏବଂ ବ୍ୟାଙ୍କ ସଂଯୋଗ କରନ୍ତୁ।",
    "why.band.strong": "ଶକ୍ତିଶାଳୀ",
    "why.band.building": "ନିର୍ମାଣାଧୀନ",
    "why.band.low": "କମ୍",
    "why.met": "ସୀମା ପୂରଣ",
    "why.below": "ସୀମା ତଳେ",
    "why.missing": "ତଥ୍ୟ ଉପಲବ୍ଧ ନାହିଁ",
    "why.stale": "ତଥ୍ୟ ପୁରୁଣା ହୋଇପାରେ",
    "why.showScores": "ସ୍କୋର୍ ଦେଖାନ୍ତୁ",
    "why.hideScores": "ସ୍କୋର୍ ଲୁଚାନ୍ତୁ",
  },
};

const DEFAULT_LANG: LangCode = "en";

export function getReadinessLabel(state: ReadinessState, lang: LangCode = DEFAULT_LANG): string {
  return strings[lang]?.[state]?.label ?? strings[DEFAULT_LANG][state].label;
}

export function getReadinessA11yHint(state: ReadinessState, lang: LangCode = DEFAULT_LANG): string {
  return strings[lang]?.[state]?.a11yHint ?? strings[DEFAULT_LANG][state].a11yHint;
}

/**
 * General screen string lookup with English fallback.
 */
export function t(key: StringKey, lang: LangCode = DEFAULT_LANG): string {
  return screenStrings[lang]?.[key] ?? screenStrings[DEFAULT_LANG][key] ?? key;
}

/**
 * Map a band key to its localized label.
 */
export function bandLabel(band: string | null, lang: LangCode = DEFAULT_LANG): string {
  if (!band) return t("why.missing", lang);
  const key = `why.band.${band}` as StringKey;
  return t(key, lang);
}
