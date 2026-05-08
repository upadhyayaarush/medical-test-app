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
import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Grid definition ────────────────────────────────────────────────────────
const TARGET_POSITIONS: number[][] = [
  [1, 4, 7, 11, 15, 18, 22, 25, 28, 31, 35, 38, 42, 45, 48, 51, 3, 17],
  [2, 5, 9, 12, 16, 19, 23, 26, 29, 32, 36, 39, 43, 46, 49, 0, 8, 24],
  [0, 3, 6, 10, 14, 17, 21, 24, 27, 30, 34, 37, 41, 44, 47, 50, 13, 40],
  [1, 5, 8, 12, 15, 19, 22, 26, 28, 33, 36, 40, 43, 47, 50, 4, 20, 44],
  [0, 4, 7, 11, 14, 18, 21, 25, 29, 32, 35, 39, 42, 46, 49, 2, 16, 38],
  [3, 6, 9, 13, 17, 20, 24, 27, 31, 34, 38, 41, 45, 48, 51, 10, 23, 15],
];
const NON_TARGETS = "ABDFGHIJKLMNOPQRSTUVWXYZ".split("");

function buildGrid(): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: string[] = [];
    const targetSet = new Set(TARGET_POSITIONS[r]);
    let ntIdx = (r * 13) % NON_TARGETS.length;
    for (let c = 0; c < 52; c++) {
      if (targetSet.has(c)) {
        row.push(c % 2 === 0 ? "C" : "E");
      } else {
        row.push(NON_TARGETS[ntIdx % NON_TARGETS.length]);
        ntIdx++;
      }
    }
    grid.push(row);
  }
  return grid;
}

const GRID = buildGrid().map((row, ri) => ({
  id: `row${ri}`,
  rowNum: ri,
  cells: row.map((letter, ci) => ({ id: `${ri}-${ci}`, letter, ci, ri })),
}));

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

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  kn: "ಕನ್ನಡ",
};

const INSTRUCTIONS: Record<Language, string> = {
  en: "You will see rows of letters. Your task is to mark every letter C and every letter E you find by clicking on them. Work as quickly and accurately as possible. Do not skip any rows. You will have limited time.",
  hi: "आपको अक्षरों की पंक्तियाँ दिखाई देंगी। आपका काम है कि आप हर C और E अक्षर पर क्लिक करके उन्हें चिह्नित करें। जितना हो सके जल्दी और सटीकता से काम करें।",
  kn: "ನಿಮಗೆ ಅಕ್ಷರಗಳ ಸಾಲುಗಳನ್ನು ತೋರಿಸಲಾಗುವುದು. ನೀವು ಪ್ರತಿ C ಮತ್ತು E ಅಕ್ಷರವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಗುರುತಿಸಬೇಕು. ಸಾಧ್ಯವಾದಷ್ಟು ಬೇಗ ಮತ್ತು ನಿಖರವಾಗಿ ಕೆಲಸ ಮಾಡಿ.",
};

const THERAPIST_SCRIPTS = {
  en: "Say to the patient: 'I am going to show you a sheet with rows of letters. I want you to cross out every letter C and every letter E you see. Start from the top left and work row by row. Work as fast as you can without making mistakes. You have about 2 minutes. Do you understand?'",
  hi: "रोगी से कहें: 'मैं आपको अक्षरों की एक शीट दिखाऊँगा। आपको हर C और E अक्षर को काटना है। ऊपर बाईं ओर से शुरू करें और पंक्ति दर पंक्ति काम करें।'",
  kn: "ರೋಗಿಗೆ ಹೇಳಿ: 'ನಾನು ನಿಮಗೆ ಅಕ್ಷರಗಳ ಒಂದು ಶೀಟ್ ತೋರಿಸುತ್ತೇನೆ. ನೀವು ಪ್ರತಿ C ಮತ್ತು E ಅಕ್ಷರವನ್ನು ಅಡ್ಡಗೆರೆ ಎಳೆಯಬೇಕು.'",
};

// ─── Step 1: Patient Details ─────────────────────────────────────────────────
function PatientDetailsStep({
  onNext,
}: { onNext: (d: PatientDetails) => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [highestEducation, setHighestEducation] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!patientId.trim()) newErrors.patientId = "Patient ID is required";
    if (!doctorName.trim()) newErrors.doctorName = "Doctor's Name is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!age.trim()) newErrors.age = "Age is required";
    if (!gender) newErrors.gender = "Gender is required";
    if (!highestEducation.trim())
      newErrors.highestEducation = "Highest Education is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onNext({ name, age, gender, highestEducation, patientId, doctorName });
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Double Alphabet Test — Clinical Assessment
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Patient Details
          </h1>
          <p className="text-muted-foreground text-sm">
            Please fill in all required fields before proceeding.
          </p>
        </div>

        <Card className="shadow-md border-border">
          <CardContent className="p-8 space-y-6">
            {/* Clinical Reference */}
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 px-6 py-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Clinical Reference
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="patientId"
                    className="text-base font-semibold text-foreground"
                  >
                    Patient ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientId"
                    data-ocid="patient-id.input"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g. PT-00142"
                    className="h-11 text-base border-input focus:border-primary"
                  />
                  {errors.patientId && (
                    <p
                      className="text-xs text-destructive font-medium"
                      data-ocid="patient-id.error_state"
                    >
                      {errors.patientId}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="doctorName"
                    className="text-base font-semibold text-foreground"
                  >
                    Doctor's Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="doctorName"
                    data-ocid="doctor-name.input"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Referring doctor's name"
                    className="h-11 text-base border-input focus:border-primary"
                  />
                  {errors.doctorName && (
                    <p
                      className="text-xs text-destructive font-medium"
                      data-ocid="doctor-name.error_state"
                    >
                      {errors.doctorName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Info */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    data-ocid="patient.input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter patient name"
                  />
                  {errors.name && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="patient.error_state"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="age">
                    Age <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age"
                    data-ocid="age.input"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 68"
                    type="number"
                  />
                  {errors.age && (
                    <p className="text-xs text-destructive">{errors.age}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="gender">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" data-ocid="gender.select">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-xs text-destructive">{errors.gender}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="highestEducation">
                    Highest Education{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="highestEducation"
                    data-ocid="education.input"
                    value={highestEducation}
                    onChange={(e) => setHighestEducation(e.target.value)}
                    placeholder="e.g., Bachelor's Degree, High School, Post Graduate"
                  />
                  {errors.highestEducation && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="education.error_state"
                    >
                      {errors.highestEducation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                data-ocid="patient.primary_button"
                onClick={handleSave}
                className="w-full h-12 text-base font-semibold"
              >
                Save & Continue →
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
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

// ─── Step 2: Language Selection ───────────────────────────────────────────────
function LanguageStep({ onNext }: { onNext: (l: Language) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5">
            Step 2 of 6
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Select Language
          </h1>
          <p className="text-muted-foreground">
            Choose the language for test instructions.
          </p>
        </div>
        <div className="space-y-3">
          {(["en", "hi", "kn"] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              data-ocid={`lang-${lang}.button`}
              onClick={() => onNext(lang)}
              className="w-full py-5 px-6 border-2 border-border rounded-xl text-xl font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Instructions ─────────────────────────────────────────────────────
function InstructionsStep({
  language,
  onNext,
}: { language: Language; onNext: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5">
            Step 3 of 6
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Test Instructions
          </h1>
          <p className="text-muted-foreground text-sm">
            Read carefully before proceeding.
          </p>
        </div>

        <Card className="shadow-md mb-5">
          <CardContent className="p-8">
            <p className="text-lg leading-relaxed text-foreground">
              {INSTRUCTIONS[language].split(/\b([CE])\b/).map((part, i) =>
                part === "C" || part === "E" ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static instruction string split
                  <strong key={i} className="font-bold">
                    {part}
                  </strong>
                ) : (
                  part
                ),
              )}
            </p>
          </CardContent>
        </Card>

        {/* Therapist Note */}
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6 mb-8">
          <h3 className="font-bold text-amber-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Therapist Administration Script
          </h3>
          <div className="space-y-4">
            {(["en", "hi", "kn"] as Language[]).map((lang) => (
              <div key={lang}>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  {LANG_LABELS[lang]}
                </span>
                <p className="mt-1 text-amber-900 text-sm leading-relaxed">
                  {THERAPIST_SCRIPTS[lang]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          data-ocid="instructions.primary_button"
          onClick={onNext}
          className="w-full h-12 text-base font-semibold"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────
function ConfirmationStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5">
          Step 4 of 6
        </Badge>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Do you understand the instructions?
        </h1>
        <p className="text-muted-foreground mb-10">
          Press the button below to confirm you are ready to proceed.
        </p>
        <Button
          type="button"
          data-ocid="confirm.primary_button"
          onClick={onNext}
          size="lg"
          className="h-14 px-12 text-lg font-bold"
        >
          I Understand
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Trial Test ───────────────────────────────────────────────────────
const TRIAL_ROW_1 = "F A C B E D G C H A E B F C D G A E H B C F A D E G"
  .split(" ")
  .slice(0, 26)
  .map((letter, i) => ({ id: `t${i}`, letter }));

const TRIAL_ROW_2 = "G H B C F A D E G C B A E F H C D A E B G C H F A D"
  .split(" ")
  .slice(0, 26)
  .map((letter, i) => ({ id: `u${i}`, letter }));

const TRIAL_ITEMS = [...TRIAL_ROW_1, ...TRIAL_ROW_2];

const TRIAL_INSTRUCTIONS: Record<
  Language,
  {
    heading: string;
    body: string;
    badge: string;
    proceed: string;
    note: string;
  }
> = {
  en: {
    heading: "Practice Round",
    badge: "Step 5 of 6 — Practice Trial",
    body: "This is a practice round. Click on every letter C and every letter E you see. This does not affect your real test results.",
    proceed: "Start Real Test →",
    note: "This trial does not count toward your final score.",
  },
  hi: {
    heading: "अभ्यास दौर",
    badge: "चरण 5 में से 6 — अभ्यास परीक्षण",
    body: "यह एक अभ्यास दौर है। नीचे दी गई पंक्तियों में हर C और E अक्षर पर क्लिक करें। यह आपके वास्तविक परीक्षण परिणामों को प्रभावित नहीं करता।",
    proceed: "वास्तविक परीक्षण शुरू करें →",
    note: "यह अभ्यास आपके अंतिम स्कोर में नहीं गिना जाता।",
  },
  kn: {
    heading: "ಅಭ್ಯಾಸ ಸುತ್ತು",
    badge: "ಹಂತ 5 ರಲ್ಲಿ 6 — ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆ",
    body: "ಇದು ಒಂದು ಅಭ್ಯಾಸ ಸುತ್ತು. ಕೆಳಗಿನ ಸಾಲುಗಳಲ್ಲಿ ಪ್ರತಿ C ಮತ್ತು E ಅಕ್ಷರವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ. ಇದು ನಿಮ್ಮ ನಿಜವಾದ ಪರೀಕ್ಷೆಯ ಫಲಿತಾಂಶಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವುದಿಲ್ಲ.",
    proceed: "ನಿಜವಾದ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ →",
    note: "ಈ ಅಭ್ಯಾಸವು ನಿಮ್ಮ ಅಂತಿಮ ಸ್ಕೋರ್‌ಗೆ ಲೆಕ್ಕಿಸುವುದಿಲ್ಲ.",
  },
};

const TRIAL_FEEDBACK: Record<
  Language,
  {
    perfect: (n: number) => string;
    partial: (marked: number, correct: number, total: number) => string;
  }
> = {
  en: {
    perfect: (n) =>
      `Excellent! You found all ${n} targets correctly. You're ready for the real test.`,
    partial: (marked, correct, total) =>
      `You've marked ${marked} letter(s) — ${correct} correct out of ${total} targets. Review and try again, or proceed when ready.`,
  },
  hi: {
    perfect: (n) =>
      `शाबाश! आपने सभी ${n} लक्ष्य सही ढंग से पाए। आप वास्तविक परीक्षण के लिए तैयार हैं।`,
    partial: (marked, correct, total) =>
      `आपने ${marked} अक्षर(ों) को चिह्नित किया — ${total} में से ${correct} सही। दोबारा कोशिश करें या तैयार होने पर आगे बढ़ें।`,
  },
  kn: {
    perfect: (n) =>
      `ಅದ್ಭುತ! ನೀವು ಎಲ್ಲಾ ${n} ಗುರಿಗಳನ್ನು ಸರಿಯಾಗಿ ಕಂಡುಹಿಡಿದಿದ್ದೀರಿ. ನೀವು ನಿಜವಾದ ಪರೀಕ್ಷೆಗೆ ಸಿದ್ಧರಾಗಿದ್ದೀರಿ.`,
    partial: (marked, correct, total) =>
      `ನೀವು ${marked} ಅಕ್ಷರ(ಗಳನ್ನು) ಗುರುತಿಸಿದ್ದೀರಿ — ${total} ರಲ್ಲಿ ${correct} ಸರಿ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಸಿದ್ಧರಾದಾಗ ಮುಂದೆ ಹೋಗಿ.`,
  },
};

function TrialStep({
  language,
  onNext,
}: { language: Language; onNext: () => void }) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const t = TRIAL_INSTRUCTIONS[language];
  const fb = TRIAL_FEEDBACK[language];

  const toggleCell = (id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const trialTargets = new Set(
    TRIAL_ITEMS.filter(
      (item) => item.letter === "C" || item.letter === "E",
    ).map((item) => item.id),
  );
  const correctCount = [...marked].filter((id) => trialTargets.has(id)).length;
  const commissions = [...marked].filter((id) => !trialTargets.has(id)).length;
  const total = trialTargets.size;
  const isPerfect = correctCount === total && commissions === 0;

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => {
    setMarked(new Set());
    setSubmitted(false);
  };

  const renderRow = (items: typeof TRIAL_ROW_1, rowLabel: string) => (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-10 text-right shrink-0">
          {rowLabel}
        </span>
        <div
          className="flex flex-wrap bg-muted/20 border border-border rounded-lg px-3 py-2 gap-0"
          data-ocid={`trial.${rowLabel.toLowerCase()}`}
        >
          {items.map(({ id, letter }) => {
            const isTarget = letter === "C" || letter === "E";
            const isMarked = marked.has(id);
            const isWrong = submitted && isMarked && !isTarget;
            const isMissed = submitted && !isMarked && isTarget;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCell(id)}
                data-ocid={`trial.item.${id}`}
                className={[
                  "font-mono text-[14px] font-normal w-[20px] h-[28px] leading-[28px] text-center select-none cursor-pointer transition-colors duration-100 rounded-sm",
                  isTarget ? "hover:bg-primary/10" : "hover:bg-muted/50",
                  isMarked && !isWrong ? "text-red-600 line-through" : "",
                  isWrong ? "text-orange-500 line-through bg-orange-50" : "",
                  isMissed ? "bg-yellow-100 rounded" : "",
                  !isMarked && !isMissed && isTarget ? "text-foreground" : "",
                  !isMarked && !isTarget ? "text-muted-foreground" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5">
            {t.badge}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t.heading}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            {t.body.split(/\b([CE])\b/).map((part, i) =>
              /^[CE]$/.test(part) ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: static instruction string split
                <strong key={i} className="font-bold text-base text-foreground">
                  {part}
                </strong>
              ) : (
                part
              ),
            )}
          </p>
        </div>

        {/* Visual hint strip */}
        <div className="flex items-center justify-center gap-6 mb-6 bg-primary/5 border border-primary/20 rounded-xl px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] font-normal text-foreground">
              C
            </span>
            <span className="font-mono text-[14px] font-normal text-foreground">
              E
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              = targets to mark
            </span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] text-muted-foreground">
              A B D F …
            </span>
            <span className="text-sm text-muted-foreground ml-1">= ignore</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] font-normal text-red-600 line-through">
              C
            </span>
            <span className="text-sm text-muted-foreground ml-1">= marked</span>
          </div>
        </div>

        <Card className="shadow-md mb-5 border-primary/20">
          <CardHeader className="pb-2 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Practice Grid
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {marked.size} marked · {correctCount}/{total} targets found
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-6">
            {renderRow(TRIAL_ROW_1, "Row 1")}
            {renderRow(TRIAL_ROW_2, "Row 2")}
          </CardContent>
        </Card>

        {/* Feedback Banner */}
        {submitted && (
          <div
            className={`rounded-xl border-2 px-5 py-4 mb-5 ${
              isPerfect
                ? "bg-green-50 border-green-400"
                : "bg-amber-50 border-amber-400"
            }`}
            data-ocid="trial.success_state"
          >
            <div className="flex items-start gap-3">
              {isPerfect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold mb-1 ${isPerfect ? "text-green-800" : "text-amber-800"}`}
                >
                  {isPerfect
                    ? fb.perfect(total)
                    : fb.partial(marked.size, correctCount, total)}
                </p>
                {!isPerfect && (
                  <div className="text-xs text-amber-700 mt-1 space-y-0.5">
                    <p>
                      ✓ Correct hits: {correctCount} / {total}
                    </p>
                    {commissions > 0 && (
                      <p>✗ False marks (wrong letters): {commissions}</p>
                    )}
                    {total - correctCount > 0 && (
                      <p>
                        ◯ Missed targets: {total - correctCount} (highlighted in
                        yellow)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live progress */}
        {!submitted && marked.size > 0 && (
          <div
            className="flex items-center gap-3 bg-muted/40 border border-border rounded-xl px-5 py-3 mb-5"
            data-ocid="trial.loading_state"
          >
            <span className="text-sm text-muted-foreground">
              {marked.size} letter(s) marked
            </span>
            <span className="text-border">·</span>
            <span className="text-sm text-foreground font-medium">
              {correctCount} correct of {total} targets
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {submitted && !isPerfect && (
            <Button
              type="button"
              data-ocid="trial.secondary_button"
              variant="outline"
              onClick={handleReset}
              className="h-12 px-6 font-semibold"
            >
              Try Again
            </Button>
          )}
          {!submitted ? (
            <Button
              type="button"
              data-ocid="trial.submit_button"
              onClick={handleSubmit}
              className="flex-1 h-12 text-base font-semibold"
              disabled={marked.size === 0}
            >
              Submit Trial
            </Button>
          ) : (
            <Button
              type="button"
              data-ocid="trial.primary_button"
              onClick={onNext}
              className="flex-1 h-12 text-base font-semibold"
            >
              {t.proceed}
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t.note}
        </p>
      </div>
    </div>
  );
}

// ─── Step 5 (between trial and test): Ready to Begin ─────────────────────────
function ReadyStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5">
          Step 6 of 6
        </Badge>
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Ready to Begin
        </h1>
        <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
          The test is about to begin. When you press Start Timer, the clock will
          start and you should begin marking letters immediately.
        </p>
        <Button
          type="button"
          data-ocid="ready.primary_button"
          onClick={onStart}
          size="lg"
          className="h-14 px-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
        >
          Start Timer
        </Button>
      </div>
    </div>
  );
}

// ─── Step 6: Test Page ────────────────────────────────────────────────────────
function TestStep({
  onStop,
}: {
  onStop: (marked: Set<string>, elapsed: number) => void;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ZOOM_LOCKED =
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no";
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.setAttribute("content", ZOOM_LOCKED);

    const blockWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockKeyZoom = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" ||
          e.key === "-" ||
          e.key === "=" ||
          e.key === "0" ||
          e.code === "Equal" ||
          e.code === "Minus" ||
          e.code === "Digit0" ||
          e.code === "NumpadAdd" ||
          e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockTouchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("wheel", blockWheelZoom, { passive: false });
    document.addEventListener("keydown", blockKeyZoom, { passive: false });
    document.addEventListener("touchstart", blockTouchZoom, { passive: false });
    document.addEventListener("touchmove", blockTouchZoom, { passive: false });
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", blockGesture, { passive: false });
    document.body.classList.add("test-zoom-locked");

    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (meta) meta.setAttribute("content", ZOOM_LOCKED);
      document.removeEventListener("wheel", blockWheelZoom);
      document.removeEventListener("keydown", blockKeyZoom);
      document.removeEventListener("touchstart", blockTouchZoom);
      document.removeEventListener("touchmove", blockTouchZoom);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      document.body.classList.remove("test-zoom-locked");
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleCell = useCallback((key: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onStop(marked, elapsed);
  };

  return (
    <div
      className="min-h-screen bg-muted flex flex-col items-center py-6 px-4"
      style={{ touchAction: "pan-x pan-y", userSelect: "none" }}
    >
      {/* Timer Bar */}
      <div className="w-full max-w-[900px] flex items-center justify-between mb-4 bg-card rounded-xl shadow-sm border border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            Elapsed Time
          </span>
          <span
            data-ocid="test.panel"
            className="font-mono text-2xl font-bold text-foreground tabular-nums"
          >
            {formatTime(elapsed)}
          </span>
        </div>
        <Button
          type="button"
          data-ocid="test.primary_button"
          onClick={handleStop}
          variant="destructive"
          className="font-semibold"
        >
          Stop Test
        </Button>
      </div>

      {/* Paper Sheet */}
      <div
        style={{ minHeight: "1100px", touchAction: "pan-x pan-y" }}
        className="w-fit mx-auto bg-card shadow-xl border border-border rounded-sm px-8 py-6"
      >
        {/* Strike-through example heading */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <span
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "1.35rem",
              fontWeight: "700",
              color: "#1a1a1a",
              letterSpacing: "0.02em",
            }}
          >
            Strike only
          </span>
          <span
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1a1a1a",
              textDecoration: "line-through",
              textDecorationColor: "#dc2626",
              textDecorationThickness: "3px",
            }}
          >
            C
          </span>
          <span
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "1.35rem",
              fontWeight: "700",
              color: "#1a1a1a",
              letterSpacing: "0.02em",
            }}
          >
            and
          </span>
          <span
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1a1a1a",
              textDecoration: "line-through",
              textDecorationColor: "#dc2626",
              textDecorationThickness: "3px",
            }}
          >
            E
          </span>
        </div>

        {/* Test Rows */}
        <div className="space-y-1.5 flex flex-col items-center">
          {GRID.map(({ id, rowNum, cells }) => (
            <div
              key={id}
              className="flex items-center gap-2 flex-wrap"
              data-ocid={`test.row.${rowNum + 1}`}
            >
              <span className="text-[11px] text-muted-foreground w-16 text-right font-mono shrink-0">
                Row {rowNum + 1}
              </span>
              <div className="flex flex-wrap">
                {cells.map(({ id: cellId, letter }) => {
                  const isMarked = marked.has(cellId);
                  return (
                    <button
                      key={cellId}
                      type="button"
                      onClick={() => toggleCell(cellId)}
                      className={[
                        "font-mono text-[14px] font-normal text-center select-none cursor-pointer transition-colors duration-100 hover:bg-primary/10 rounded-sm w-[18px] h-[24px] leading-[24px]",
                        isMarked
                          ? "text-red-600 line-through"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Click letters to mark/unmark. Press "Stop Test" when done.
      </p>
    </div>
  );
}

// ─── Step 7: Thank You ────────────────────────────────────────────────────────
function ThankYouStep({ onNewTest }: { onNewTest: () => void }) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      data-ocid="thankyou.page"
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
          data-ocid="thankyou.primary_button"
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

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP — DLCT State Machine
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [step, setStep] = useState(1);
  const [, setPatient] = useState<PatientDetails | null>(null);
  const [language, setLanguage] = useState<Language>("en");

  const handlePatient = (d: PatientDetails) => {
    setPatient(d);
    setStep(2);
  };

  const handleLanguage = (l: Language) => {
    setLanguage(l);
    setStep(3);
  };

  const handleStop = (marked: Set<string>, elapsed: number) => {
    // Test complete — record for future use if needed
    void marked;
    void elapsed;
    setStep(7);
  };

  const handleNewTest = () => {
    setStep(1);
    setPatient(null);
    setLanguage("en");
  };

  if (step === 1) return <PatientDetailsStep onNext={handlePatient} />;
  if (step === 2) return <LanguageStep onNext={handleLanguage} />;
  if (step === 3)
    return <InstructionsStep language={language} onNext={() => setStep(4)} />;
  if (step === 4) return <ConfirmationStep onNext={() => setStep(5)} />;
  if (step === 5)
    return <TrialStep language={language} onNext={() => setStep(5.5)} />;
  if (step === 5.5) return <ReadyStep onStart={() => setStep(6)} />;
  if (step === 6) return <TestStep onStop={handleStop} />;
  if (step === 7) return <ThankYouStep onNewTest={handleNewTest} />;

  return null;
}
