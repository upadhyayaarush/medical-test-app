import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Printer, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  highestEducation: string;
  patientId: string;
  doctorName: string;
}

type Language = "en" | "hi" | "kn";

// ─── SDMT Symbol Definitions ─────────────────────────────────────────────────

interface SymbolPair {
  symbol: string;
  digit: number;
}

const SDMT_SYMBOLS: SymbolPair[] = [
  { symbol: "(", digit: 1 },
  { symbol: "÷", digit: 2 },
  { symbol: "⊣", digit: 3 },
  { symbol: "Γ", digit: 4 },
  { symbol: "⊓", digit: 5 },
  { symbol: ">", digit: 6 },
  { symbol: "+", digit: 7 },
  { symbol: ")", digit: 8 },
  { symbol: "—", digit: 9 },
];

// ─── Internal: SymbolKeyTable ─────────────────────────────────────────────────

function SymbolKeyTable({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {SDMT_SYMBOLS.map((sp) => (
          <div
            key={sp.digit}
            className="flex flex-col items-center border border-border rounded p-1 bg-card"
          >
            <span
              className="text-lg leading-tight text-foreground font-mono font-bold"
              style={{ fontFamily: "monospace, sans-serif" }}
            >
              {sp.symbol}
            </span>
            <span className="text-xs font-bold text-primary leading-tight">
              {sp.digit}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse border border-border w-full">
        <tbody>
          <tr>
            <td className="border border-border px-2 py-1 bg-muted text-xs font-semibold text-muted-foreground w-16 text-center">
              KEY
            </td>
            {SDMT_SYMBOLS.map((sp) => (
              <td
                key={sp.digit}
                className="border border-border text-center px-3 py-3 bg-card"
              >
                <span
                  className="text-3xl text-foreground font-mono font-bold"
                  style={{ fontFamily: "monospace, sans-serif" }}
                >
                  {sp.symbol}
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <td className="border border-border px-2 py-1 bg-muted text-xs font-semibold text-muted-foreground text-center">
              DIGIT
            </td>
            {SDMT_SYMBOLS.map((sp) => (
              <td
                key={sp.digit}
                className="border border-border text-center px-3 py-2 bg-secondary/40"
              >
                <span className="text-xl font-bold text-primary">
                  {sp.digit}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── i18n strings ─────────────────────────────────────────────────────────────

const SCT_STRINGS: Record<
  Language,
  {
    title: string;
    keySection: string;
    introParagraph: string;
    steps: string[];
    therapistNotes: string;
    continueBtn: string;
    practiceTitle: string;
    practiceInstruction: string;
    submitBtn: string;
    startMainTestBtn: string;
    scoreLabel: string;
    readyTitle: string;
    readyMessage: string;
    startTimerBtn: string;
    resultsTitle: string;
    correctLabel: string;
    totalLabel: string;
    timeLabel: string;
    speedLabel: string;
    referenceNorms: string;
    performanceNormal: string;
    performanceBorderline: string;
    performanceBelow: string;
    newTestBtn: string;
    printBtn: string;
  }
> = {
  en: {
    title: "Symbol Digit Modalities Test",
    keySection: "Symbol–Digit Key",
    introParagraph:
      "The Symbol Digit Modalities Test (SDMT) measures processing speed and attention. You will be shown a key pairing 9 symbols with digits 1–9. Below each symbol in the test grid, write or say the matching digit as quickly as possible.",
    steps: [
      "Study the KEY at the top of the page — it pairs each symbol with a digit (1–9).",
      "Look at each symbol in the grid below.",
      "Type the digit that matches the symbol according to the key.",
      "Work as quickly and accurately as possible from left to right, row by row.",
      "You will have 90 seconds. Do not skip any symbols.",
    ],
    therapistNotes:
      "Therapist note: Administer the practice trial first to ensure the patient understands the task. The test begins only after the patient confirms readiness. Record total correct responses and time taken.",
    continueBtn: "Continue to Practice Trial",
    practiceTitle: "PRACTICE TRIAL",
    practiceInstruction:
      "Using the key above, type the matching digit for each symbol. This is a practice round — it does not affect your test results.",
    submitBtn: "Check Answers",
    startMainTestBtn: "Start Main Test",
    scoreLabel: "Practice Score",
    readyTitle: "Ready to Begin",
    readyMessage:
      "The main test will now begin. You will have 90 seconds. Use the key at the top-right corner of the screen to find the digit for each symbol.",
    startTimerBtn: "Start Timer",
    resultsTitle: "Test Results",
    correctLabel: "Correct Responses",
    totalLabel: "Total Items",
    timeLabel: "Time Used",
    speedLabel: "Processing Speed",
    referenceNorms:
      "Reference norms: Adults typically complete 25–60 correct items within 90 seconds.",
    performanceNormal: "Normal Performance",
    performanceBorderline: "Borderline",
    performanceBelow: "Below Normal",
    newTestBtn: "New Test",
    printBtn: "Print Report",
  },
  hi: {
    title: "सिंबल डिजिट मॉडेलिटीज़ टेस्ट",
    keySection: "सिंबल–डिजिट की",
    introParagraph:
      "यह परीक्षण प्रसंस्करण गति और ध्यान को मापता है। आपको 9 प्रतीकों और अंकों 1–9 की एक कुंजी दिखाई जाएगी। प्रत्येक प्रतीक के नीचे कुंजी के अनुसार सही अंक जल्दी से टाइप करें।",
    steps: [
      "पृष्ठ के शीर्ष पर KEY को ध्यान से देखें — हर प्रतीक को एक अंक (1–9) दिया गया है।",
      "ग्रिड में प्रत्येक प्रतीक को देखें।",
      "कुंजी के अनुसार मिलान करने वाला अंक टाइप करें।",
      "बाएं से दाएं, पंक्ति दर पंक्ति जितनी जल्दी और सटीकता से संभव हो काम करें।",
      "आपके पास 90 सेकंड होंगे। कोई भी प्रतीक न छोड़ें।",
    ],
    therapistNotes:
      "चिकित्सक नोट: पहले अभ्यास परीक्षण दें ताकि रोगी कार्य को समझे। परीक्षण केवल तभी शुरू होता है जब रोगी तैयारी की पुष्टि करे।",
    continueBtn: "अभ्यास परीक्षण पर जाएं",
    practiceTitle: "अभ्यास परीक्षण",
    practiceInstruction:
      "ऊपर दी गई कुंजी का उपयोग करके प्रत्येक प्रतीक के लिए मिलान करने वाला अंक टाइप करें। यह अभ्यास दौर है — यह आपके परीक्षण परिणामों को प्रभावित नहीं करता।",
    submitBtn: "उत्तर जांचें",
    startMainTestBtn: "मुख्य परीक्षण शुरू करें",
    scoreLabel: "अभ्यास स्कोर",
    readyTitle: "शुरू करने के लिए तैयार",
    readyMessage:
      "मुख्य परीक्षण अब शुरू होगा। आपके पास 90 सेकंड होंगे। स्क्रीन के ऊपरी दाईं ओर KEY का उपयोग करें।",
    startTimerBtn: "टाइमर शुरू करें",
    resultsTitle: "परीक्षण परिणाम",
    correctLabel: "सही उत्तर",
    totalLabel: "कुल आइटम",
    timeLabel: "समय उपयोग",
    speedLabel: "प्रसंस्करण गति",
    referenceNorms:
      "संदर्भ मानदंड: वयस्क आमतौर पर 90 सेकंड में 25–60 सही आइटम पूर्ण करते हैं।",
    performanceNormal: "सामान्य प्रदर्शन",
    performanceBorderline: "सीमा रेखा",
    performanceBelow: "सामान्य से नीचे",
    newTestBtn: "नया परीक्षण",
    printBtn: "रिपोर्ट प्रिंट करें",
  },
  kn: {
    title: "ಸಿಂಬಲ್ ಡಿಜಿಟ್ ಮೋಡಾಲಿಟೀಸ್ ಟೆಸ್ಟ್",
    keySection: "ಸಿಂಬಲ್–ಡಿಜಿಟ್ ಕೀ",
    introParagraph:
      "ಈ ಪರೀಕ್ಷೆಯು ಸಂಸ್ಕರಣ ವೇಗ ಮತ್ತು ಗಮನವನ್ನು ಅಳೆಯುತ್ತದೆ. ನಿಮಗೆ 9 ಚಿಹ್ನೆಗಳನ್ನು ಅಂಕಿಗಳು 1–9 ರೊಂದಿಗೆ ಜೋಡಿಸುವ ಕೀಲಿಯನ್ನು ತೋರಿಸಲಾಗುವುದು. ಪ್ರತಿ ಚಿಹ್ನೆಗೆ ಸರಿಹೊಂದುವ ಅಂಕಿಯನ್ನು ಸಾಧ್ಯವಾದಷ್ಟು ಬೇಗ ಟೈಪ್ ಮಾಡಿ.",
    steps: [
      "ಪುಟದ ಮೇಲ್ಭಾಗದಲ್ಲಿರುವ KEY ಅನ್ನು ಗಮನವಾಗಿ ನೋಡಿ — ಪ್ರತಿ ಚಿಹ್ನೆಗೆ ಒಂದು ಅಂಕಿ (1–9) ಇದೆ.",
      "ಗ್ರಿಡ್‌ನಲ್ಲಿ ಪ್ರತಿ ಚಿಹ್ನೆಯನ್ನು ನೋಡಿ.",
      "ಕೀಲಿಯ ಪ್ರಕಾರ ಹೊಂದಾಣಿಕೆಯ ಅಂಕಿಯನ್ನು ಟೈಪ್ ಮಾಡಿ.",
      "ಎಡದಿಂದ ಬಲಕ್ಕೆ, ಸಾಲಿನಿಂದ ಸಾಲಿಗೆ ಸಾಧ್ಯವಾದಷ್ಟು ವೇಗವಾಗಿ ಮತ್ತು ನಿಖರವಾಗಿ ಕೆಲಸ ಮಾಡಿ.",
      "ನಿಮಗೆ 90 ಸೆಕೆಂಡ್‌ಗಳಿರುತ್ತವೆ. ಯಾವ ಚಿಹ್ನೆಯನ್ನೂ ಬಿಡಬೇಡಿ.",
    ],
    therapistNotes:
      "ಚಿಕಿತ್ಸಕ ಟಿಪ್ಪಣಿ: ರೋಗಿ ಕಾರ್ಯವನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದಾರೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು ಮೊದಲು ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆ ನೀಡಿ.",
    continueBtn: "ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆಗೆ ಮುಂದುವರಿಯಿರಿ",
    practiceTitle: "ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆ",
    practiceInstruction:
      "ಮೇಲಿನ ಕೀಲಿಯನ್ನು ಬಳಸಿ ಪ್ರತಿ ಚಿಹ್ನೆಗೆ ಹೊಂದಾಣಿಕೆಯ ಅಂಕಿಯನ್ನು ಟೈಪ್ ಮಾಡಿ. ಇದು ಅಭ್ಯಾಸ ಸುತ್ತು — ಇದು ನಿಮ್ಮ ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವುದಿಲ್ಲ.",
    submitBtn: "ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
    startMainTestBtn: "ಮುಖ್ಯ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    scoreLabel: "ಅಭ್ಯಾಸ ಸ್ಕೋರ್",
    readyTitle: "ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧ",
    readyMessage:
      "ಮುಖ್ಯ ಪರೀಕ್ಷೆ ಇನ್ನು ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ನಿಮಗೆ 90 ಸೆಕೆಂಡ್‌ಗಳಿರುತ್ತವೆ. ಪ್ರತಿ ಚಿಹ್ನೆಗೆ ಅಂಕಿ ಹುಡುಕಲು ಪರದೆಯ ಮೇಲ್ಭಾಗ-ಬಲ ಮೂಲೆಯಲ್ಲಿರುವ ಕೀಲಿಯನ್ನು ಬಳಸಿ.",
    startTimerBtn: "ಟೈಮರ್ ಪ್ರಾರಂಭಿಸಿ",
    resultsTitle: "ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು",
    correctLabel: "ಸರಿಯಾದ ಉತ್ತರಗಳು",
    totalLabel: "ಒಟ್ಟು ಐಟಂಗಳು",
    timeLabel: "ಬಳಸಿದ ಸಮಯ",
    speedLabel: "ಸಂಸ್ಕರಣ ವೇಗ",
    referenceNorms:
      "ಉಲ್ಲೇಖ ಮಾನದಂಡ: ವಯಸ್ಕರು ಸಾಮಾನ್ಯವಾಗಿ 90 ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ 25–60 ಸರಿಯಾದ ಐಟಂಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸುತ್ತಾರೆ.",
    performanceNormal: "ಸಾಮಾನ್ಯ ಕಾರ್ಯಕ್ಷಮತೆ",
    performanceBorderline: "ಗಡಿ ರೇಖೆ",
    performanceBelow: "ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಕಡಿಮೆ",
    newTestBtn: "ಹೊಸ ಪರೀಕ್ಷೆ",
    printBtn: "ವರದಿ ಮುದ್ರಿಸಿ",
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function generateSymbolSequence(count: number, seed: number): number[] {
  // Simple seeded shuffle using Math.random seeded index
  const base = Array.from({ length: count }, (_, i) => (i % 9) + 1);
  // Shuffle using seed as offset
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(((seed * (i + 1)) % 1) * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}

// ─── SctInstructionsStep ─────────────────────────────────────────────────────

export function SctInstructionsStep({
  patient,
  language,
  onLanguageChange,
  onContinue,
}: {
  patient: PatientDetails;
  language: Language;
  onLanguageChange: (l: Language) => void;
  onContinue: () => void;
}) {
  const t = SCT_STRINGS[language];

  return (
    <div
      className="min-h-screen bg-background"
      data-ocid="sct.instructions.page"
    >
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              {t.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Patient: {patient.name} &nbsp;|&nbsp; ID: {patient.patientId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Language:</Label>
            <Select
              value={language}
              onValueChange={(v) => onLanguageChange(v as Language)}
            >
              <SelectTrigger
                className="w-36"
                data-ocid="sct.instructions.language_select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Key Table */}
        <Card data-ocid="sct.instructions.key_section">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary">
              {t.keySection}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SymbolKeyTable />
          </CardContent>
        </Card>

        {/* Introduction */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-foreground leading-relaxed">
              {t.introParagraph}
            </p>
          </CardContent>
        </Card>

        {/* Numbered Steps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {t.steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-foreground leading-relaxed pt-0.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Therapist Notes */}
        <Card className="border-accent bg-accent/20">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground leading-relaxed">
              {t.therapistNotes}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button
            size="lg"
            onClick={onContinue}
            data-ocid="sct.instructions.continue_button"
          >
            {t.continueBtn}
          </Button>
        </div>
      </main>
    </div>
  );
}

// ─── SctTrialStep ─────────────────────────────────────────────────────────────

export function SctTrialStep({
  patient,
  language,
  onComplete,
}: {
  patient: PatientDetails;
  language: Language;
  onComplete: () => void;
}) {
  const t = SCT_STRINGS[language];

  // Randomize 10 symbols once on mount — return objects with stable uid
  const trialSymbols = useMemo(() => {
    const seed = Math.random();
    return Array.from({ length: 10 }, (_, i) => ({
      uid: `t${i}-${seed.toFixed(6)}`,
      digit: (Math.floor(seed * 1000 + i * 37) % 9) + 1,
      pos: i,
    }));
  }, []);

  const [answers, setAnswers] = useState<string[]>(Array(10).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = useCallback(
    (idx: number, val: string) => {
      const digit = val.replace(/[^1-9]/g, "").slice(-1);
      const next = [...answers];
      next[idx] = digit;
      setAnswers(next);
      if (digit && idx < 9) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [answers],
  );

  const correctCount = useMemo(
    () =>
      answers.filter(
        (a, i) => a !== "" && Number.parseInt(a) === trialSymbols[i].digit,
      ).length,
    [answers, trialSymbols],
  );

  const symbolFor = (digit: number) =>
    SDMT_SYMBOLS.find((s) => s.digit === digit)?.symbol ?? "?";

  return (
    <div className="min-h-screen bg-background" data-ocid="sct.trial.page">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              {t.practiceTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Patient: {patient.name} &nbsp;|&nbsp; ID: {patient.patientId}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Key Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary">
              Symbol–Digit Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SymbolKeyTable />
          </CardContent>
        </Card>

        {/* Practice instruction */}
        <p
          className="text-sm text-muted-foreground text-center"
          data-ocid="sct.trial.instruction"
        >
          {t.practiceInstruction}
        </p>

        {/* Practice Grid */}
        <Card data-ocid="sct.trial.grid">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {trialSymbols.map(({ uid, digit, pos }) => {
                const answered = answers[pos] !== "";
                const correct =
                  answered && Number.parseInt(answers[pos]) === digit;
                const wrong =
                  answered && Number.parseInt(answers[pos]) !== digit;
                return (
                  <div
                    key={uid}
                    className="flex flex-col items-center gap-1"
                    data-ocid={`sct.trial.item.${pos + 1}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center border border-border rounded bg-muted text-2xl">
                      {symbolFor(digit)}
                    </div>
                    <input
                      ref={(el) => {
                        inputRefs.current[pos] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={answers[pos]}
                      onChange={(e) => handleInput(pos, e.target.value)}
                      disabled={submitted}
                      className={`w-12 h-10 text-center text-lg font-bold border-2 rounded outline-none focus:ring-2 focus:ring-primary bg-card text-foreground transition-colors ${
                        submitted && correct
                          ? "border-green-500 bg-green-50"
                          : submitted && wrong
                            ? "border-destructive bg-red-50"
                            : "border-input focus:border-primary"
                      }`}
                      data-ocid={`sct.trial.input.${pos + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {!submitted ? (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => setSubmitted(true)}
              data-ocid="sct.trial.submit_button"
            >
              {t.submitBtn}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-base text-muted-foreground">
                {t.scoreLabel}:
              </span>
              <Badge
                className={
                  correctCount >= 7
                    ? "bg-green-500 text-white"
                    : correctCount >= 4
                      ? "bg-amber-500 text-white"
                      : "bg-destructive text-destructive-foreground"
                }
              >
                {correctCount} / 10
              </Badge>
            </div>
            <Button
              size="lg"
              onClick={onComplete}
              data-ocid="sct.trial.start_main_test_button"
            >
              {t.startMainTestBtn}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── SctReadyStep ─────────────────────────────────────────────────────────────

export function SctReadyStep({
  patient,
  onStart,
}: {
  patient: PatientDetails;
  onStart: () => void;
}) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-8"
      data-ocid="sct.ready.page"
    >
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-display text-foreground">
            Ready to Begin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Clinical Reference */}
          <div className="bg-secondary/40 rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Patient ID</span>
              <span className="font-semibold text-foreground">
                {patient.patientId}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doctor</span>
              <span className="font-semibold text-foreground">
                {patient.doctorName}
              </span>
            </div>
          </div>

          <p className="text-center text-foreground leading-relaxed">
            The main test will now begin. You will have{" "}
            <span className="font-bold text-primary">90 seconds</span>. Use the
            key at the top-right corner of the screen to find the digit for each
            symbol.
          </p>

          <div className="flex justify-center">
            <Button
              size="lg"
              className="px-10"
              onClick={onStart}
              data-ocid="sct.ready.start_timer_button"
            >
              <Clock className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SctTestStep ──────────────────────────────────────────────────────────────

export function SctTestStep({
  patient,
  onComplete,
}: {
  patient: PatientDetails;
  language: Language;
  onComplete: (elapsed: number, answers: string[], symbols: number[]) => void;
}) {
  const TOTAL = 110;
  const DURATION = 90;

  // Generate 110 symbols on mount — objects with stable uid
  const testSymbols = useMemo(() => {
    const seed = Math.random();
    const digits = generateSymbolSequence(TOTAL, seed);
    return digits.map((digit, pos) => ({
      uid: `ts${pos}-${seed.toFixed(6)}`,
      digit,
      pos,
    }));
  }, []);

  const [answers, setAnswers] = useState<string[]>(Array(TOTAL).fill(""));
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [running, setRunning] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock zoom
  useEffect(() => {
    document.body.classList.add("test-zoom-locked");

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=")) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("test-zoom-locked");
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      onComplete(
        DURATION,
        answers,
        testSymbols.map((s) => s.digit),
      );
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft, answers, testSymbols, onComplete]);

  const handleInput = useCallback(
    (idx: number, val: string) => {
      if (!running) return;
      const digit = val.replace(/[^1-9]/g, "").slice(-1);
      setAnswers((prev) => {
        const next = [...prev];
        next[idx] = digit;
        return next;
      });
      if (digit && idx < TOTAL - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [running],
  );

  const handleSubmit = useCallback(() => {
    setRunning(false);
    onComplete(
      DURATION - timeLeft,
      answers,
      testSymbols.map((s) => s.digit),
    );
  }, [timeLeft, answers, testSymbols, onComplete]);

  const symbolFor = (digit: number) =>
    SDMT_SYMBOLS.find((s) => s.digit === digit)?.symbol ?? "?";

  const timerColor =
    timeLeft > 30
      ? "text-primary"
      : timeLeft > 10
        ? "text-amber-600"
        : "text-destructive";

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background"
      style={{ touchAction: "pan-x pan-y" }}
      data-ocid="sct.test.page"
    >
      {/* Fixed compact key — top right */}
      <div
        className="fixed top-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-2"
        style={{ width: 130 }}
        data-ocid="sct.test.key_panel"
      >
        <p className="text-xs font-bold text-center text-primary mb-1">KEY</p>
        <SymbolKeyTable compact />
      </div>

      {/* Top bar */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {patient.name}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {patient.patientId} &nbsp;|&nbsp; Dr. {patient.doctorName}
            </p>
          </div>
          <div
            className={`text-3xl font-mono font-bold tabular-nums ${timerColor}`}
            data-ocid="sct.test.timer"
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-5xl mx-auto px-4 py-6 pr-40">
        <div className="flex flex-wrap gap-2" data-ocid="sct.test.grid">
          {testSymbols.map(({ uid, digit, pos }) => (
            <div
              key={uid}
              className="flex flex-col items-center gap-0.5"
              data-ocid={`sct.test.item.${pos + 1}`}
            >
              <div className="w-10 h-10 flex items-center justify-center border border-border rounded bg-muted text-xl">
                {symbolFor(digit)}
              </div>
              <input
                ref={(el) => {
                  inputRefs.current[pos] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={answers[pos]}
                onChange={(e) => handleInput(pos, e.target.value)}
                disabled={!running}
                className="w-10 h-9 text-center text-sm font-bold border border-input rounded outline-none focus:ring-1 focus:ring-primary bg-card text-foreground"
                data-ocid={`sct.test.input.${pos + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!running}
            data-ocid="sct.test.submit_button"
          >
            Submit Test
          </Button>
        </div>
      </main>
    </div>
  );
}

// ─── SctResultsStep ───────────────────────────────────────────────────────────

export function SctThankYouStep({ onNewTest }: { onNewTest: () => void }) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      data-ocid="sct.thankyou.page"
    >
      <div className="text-center max-w-md">
        <div className="mb-6">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
            Thank you for taking the test.
          </h1>
          <p className="text-muted-foreground text-base">
            The session has been completed. You may start a new test whenever
            you are ready.
          </p>
        </div>
        <Button
          type="button"
          data-ocid="sct.thankyou.primary_button"
          onClick={onNewTest}
          size="lg"
          className="h-12 px-8 text-base font-semibold"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start New Test
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-10">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
