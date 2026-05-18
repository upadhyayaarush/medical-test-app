import type { TestSession, TrialResult } from "@/backend";
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
import {
  useAllPatientsWithSessions,
  useSavePatient,
  useSaveTestSession,
  useSessionsByDoctor,
} from "@/hooks/useQueries";
import type { PatientFullRecord } from "@/hooks/useQueries";
import { useReportCapture } from "@/hooks/useReportCapture";
import type { CaptureStatus } from "@/hooks/useReportCapture";
import {
  savePatientToSupabase,
  saveTestResultToSupabase,
  verifyDoctorPassword,
  upsertDoctorPassword,
  type SupabasePatientData,
  type SupabaseTestResultData,
} from "./lib/supabaseService";
import { useSupabaseDashboard, type DashboardPatient, type SupabaseTestResultRecord } from "./hooks/useSupabaseDashboard";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  LayoutDashboard,
  Loader2,
  Lock,
  Minus,
  RefreshCw,
  RotateCcw,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  User,
  UserCircle2,
  Users,
} from "lucide-react";
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

// ─── Age-based classification norms (DLCT letter cancellation) ──────────────
const AGE_NORMS: {
  minAge: number;
  maxAge: number;
  mean: number;
  aboveMin: number;
  avgMin: number;
}[] = [
    { minAge: 18, maxAge: 19, mean: 70.3, aboveMin: 81, avgMin: 60 },
    { minAge: 20, maxAge: 29, mean: 71.8, aboveMin: 83, avgMin: 61 },
    { minAge: 30, maxAge: 39, mean: 65.6, aboveMin: 73, avgMin: 58 },
    { minAge: 40, maxAge: 49, mean: 60.2, aboveMin: 71, avgMin: 50 },
    { minAge: 50, maxAge: 59, mean: 56.6, aboveMin: 68, avgMin: 45 },
    { minAge: 60, maxAge: 69, mean: 52.7, aboveMin: 63, avgMin: 43 },
    { minAge: 70, maxAge: 79, mean: 46.2, aboveMin: 55, avgMin: 37 },
    { minAge: 80, maxAge: 999, mean: 39.7, aboveMin: 48, avgMin: 31 },
  ];

type Classification = "Above Average" | "Average" | "Below Average";

function classifyScore(
  score: number,
  age: number,
): { label: Classification; mean: number } {
  const norm =
    AGE_NORMS.find((n) => age >= n.minAge && age <= n.maxAge) ?? AGE_NORMS[3];
  let label: Classification;
  if (score >= norm.aboveMin) label = "Above Average";
  else if (score >= norm.avgMin) label = "Average";
  else label = "Below Average";
  return { label, mean: norm.mean };
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function GridSnapshotView({
  snapshotKey,
  gridSnapshot,
  isLarge = false,
}: {
  snapshotKey: string;
  gridSnapshot?: any;
  isLarge?: boolean;
}) {
  // Prefer canister-stored snapshot; fall back to localStorage
  let rows: string[][] | null = null;
  let markedSet: Set<string> = new Set();

  let parsedGrid = gridSnapshot;
  if (typeof parsedGrid === "string") {
    try {
      parsedGrid = JSON.parse(parsedGrid);
    } catch (e) {
      console.error("Failed to parse gridSnapshot string", e);
    }
  }

  if (
    parsedGrid &&
    Array.isArray(parsedGrid.rows) &&
    parsedGrid.rows.length > 0
  ) {
    rows = parsedGrid.rows;
    markedSet = new Set(Array.isArray(parsedGrid.markedIds) ? parsedGrid.markedIds : []);
  } else {
    try {
      const raw = localStorage.getItem(snapshotKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.rows)) {
          rows = data.rows;
          markedSet = new Set(Array.isArray(data.marked) ? data.marked : []);
        }
      }
    } catch (e) {
      console.error("Failed to parse gridSnapshot from localStorage", e);
    }
  }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        No test sheet available for this session.
      </div>
    );
  }

  return (
    <div className={`border border-border rounded-lg bg-muted/20 ${isLarge ? "p-6 mt-6" : "p-3 mt-3"}`}>
      <div className={`${isLarge ? "text-base" : "text-xs"} font-semibold text-foreground mb-1 uppercase tracking-wide`}>
        Test Sheet Snapshot
      </div>
      <div className={`${isLarge ? "text-sm" : "text-[10px]"} italic text-muted-foreground mb-4 font-serif`}>
        Strike only C and E
      </div>
      <div className={`${isLarge ? "space-y-[4px]" : "space-y-[2px]"}`}>
        {rows.map((row, ri) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static grid rows, order never changes
          <div key={`row-${ri}`} className={`flex flex-wrap ${isLarge ? "gap-[2px]" : "gap-[1px]"}`}>
            {Array.isArray(row) ? row.map((letter, ci) => {
              const isMarked = markedSet.has(`${ri}-${ci}`);
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static letter positions, order never changes
                  key={`cell-${ri}-${ci}`}
                  className={`${isLarge ? "text-[11px] px-[1px]" : "text-[7px] px-[1px]"} font-mono leading-none ${isMarked
                      ? "line-through text-red-600 font-bold"
                      : "text-foreground/70"
                    }`}
                >
                  {letter}
                </span>
              );
            }) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingStep({
  onPatientLogin,
  onDoctorLogin,
}: { onPatientLogin: () => void; onDoctorLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Double Alphabet Test
            </h1>
            <p className="text-xs text-muted-foreground">
              Clinical Assessment Platform
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Cognitive Attention Assessment
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-3 leading-tight">
              Welcome to the
              <br />
              Assessment Portal
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Please select your role to continue. Patients proceed to the test
              workflow; doctors access the clinical dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Patient Login Card */}
            <button
              type="button"
              data-ocid="landing.patient_button"
              onClick={onPatientLogin}
              className="group relative bg-card border-2 border-border rounded-2xl p-8 text-left hover:border-primary hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Patient Login
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Begin your cognitive assessment. Enter your details and follow
                the guided test workflow.
              </p>
              <div className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold">
                <span>Start assessment</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </div>
            </button>

            {/* Doctor Login Card */}
            <button
              type="button"
              data-ocid="landing.doctor_button"
              onClick={onDoctorLogin}
              className="group relative bg-card border-2 border-border rounded-2xl p-8 text-left hover:border-primary hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <LayoutDashboard className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Doctor Login
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Access the clinical dashboard to review patient results, scores,
                and classifications.
              </p>
              <div className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold">
                <span>View dashboard</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 border-t border-border py-4 px-6">
        <p className="text-center text-xs text-muted-foreground">
          Double Alphabet Test
        </p>
      </footer>
    </div>
  );
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
function DoctorDashboardStep({
  onBack,
  loggedDoctorName,
}: {
  onBack: () => void;
  loggedDoctorName: string;
}) {
  const {
    data: records = [],
    isLoading,
    refetch,
    isRefetching,
  } = useSupabaseDashboard(loggedDoctorName);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const classificationBadge = (c: string) => {
    if (c === "Above Average")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          <TrendingUp className="w-3 h-3" /> Above Average
        </span>
      );
    if (c === "Average")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Minus className="w-3 h-3" /> Average
        </span>
      );
    if (c === "Below Average")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <TrendingDown className="w-3 h-3" /> Below Average
        </span>
      );
    return null;
  };

  const formatTime = (s: number) => {
    if (s <= 0) return "—";
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return "—";
    }
  };

  const totalSessions = records.reduce((sum, r) => sum + r.results.length, 0);
  const aboveAvgCount = records.reduce(
    (sum, r) =>
      sum + r.results.filter((s) => s.classification === "Above Average").length,
    0,
  );

  const LANG_LABELS_FULL: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    kn: "Kannada",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                Results for Dr. {loggedDoctorName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {records.length} patient{records.length !== 1 ? "s" : ""}{" "}
                &middot; {totalSessions} test{totalSessions !== 1 ? "s" : ""}{" "}
                completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="dashboard.refresh_button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              type="button"
              data-ocid="dashboard.back_button"
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Total Patients
            </p>
            <p className="text-3xl font-bold text-foreground">
              {records.length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Test Sessions
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalSessions}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Above Average
            </p>
            <p className="text-3xl font-bold text-green-600">{aboveAvgCount}</p>
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Patient Records
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {records.length} patient(s)
            </span>
          </div>

          {isLoading ? (
            <div
              className="flex items-center justify-center py-16"
              data-ocid="dashboard.loading_state"
            >
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading patient data…
                </p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="dashboard.empty_state"
            >
              <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">
                No patient records yet
              </p>
              <p className="text-xs text-muted-foreground">
                Patient results will appear here once tests are completed under
                Dr. {loggedDoctorName}.
              </p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="bg-muted/30 border-b border-border grid grid-cols-[2fr_1.2fr_0.7fr_0.8fr_1.5fr_0.8fr_2rem] gap-3 px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient ID
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gender
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Education
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Sessions
                </span>
                <span />
              </div>

              <div className="divide-y divide-border">
                {records.map((record, i) => {
                  const p = record.patient;
                  const isExpanded = expandedIds.has(p.patient_id);
                  return (
                    <div
                      key={p.patient_id}
                      data-ocid={`dashboard.item.${i + 1}`}
                    >
                      {/* Row */}
                      <button
                        type="button"
                        className="w-full grid grid-cols-[2fr_1.2fr_0.7fr_0.8fr_1.5fr_0.8fr_2rem] gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-left items-center"
                        onClick={() => toggleExpand(p.patient_id)}
                        data-ocid={`dashboard.item.${i + 1}.toggle`}
                      >
                        <span className="font-medium text-foreground text-sm truncate">
                          {p.full_name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {p.patient_id}
                        </span>
                        <span className="text-sm text-foreground tabular-nums">
                          {Number(p.age) > 0 ? Number(p.age) : "—"}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                          {p.gender}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                          {p.highest_education}
                        </span>
                        <span className="text-sm text-foreground text-right tabular-nums">
                          {record.results.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="bg-muted/10 border-t border-border px-5 py-5 space-y-5">
                          {/* Patient Details Card */}
                          <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                              Patient Details
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Full Name
                                </span>
                                <p className="font-medium text-foreground">
                                  {p.full_name}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Patient ID
                                </span>
                                <p className="font-mono text-foreground">
                                  {p.patient_id}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Age
                                </span>
                                <p className="font-medium text-foreground">
                                  {Number(p.age) > 0 ? Number(p.age) : "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Gender
                                </span>
                                <p className="font-medium text-foreground">
                                  {p.gender || "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Education
                                </span>
                                <p className="font-medium text-foreground">
                                  {p.highest_education || "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Doctor
                                </span>
                                <p className="font-medium text-foreground">
                                  {p.doctor_name}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Language
                                </span>
                                <p className="font-medium text-foreground">
                                  {LANG_LABELS_FULL[p.language] ?? p.language}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Sessions */}
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                              Test Sessions ({record.results.length})
                            </h3>
                            {record.results.length === 0 ? (
                              <p
                                className="text-sm text-muted-foreground italic"
                                data-ocid={`dashboard.item.${i + 1}.empty_state`}
                              >
                                No test sessions recorded yet.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {record.results.map((session, si) => (
                                  <div
                                    key={session.id}
                                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                                    data-ocid={`dashboard.item.${i + 1}.session.${si + 1}`}
                                  >
                                    <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-semibold text-foreground">
                                          {formatDateTime(session.created_at)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {/* Practice Trial */}
                                      {session.trial_total_targets !== null && session.trial_total_targets !== undefined && (
                                        <div className="rounded-lg bg-muted/30 border border-border p-3 flex flex-col justify-between">
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                              Practice Trial
                                            </p>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                              <span className="text-muted-foreground">
                                                Total Targets
                                              </span>
                                              <span className="font-mono tabular-nums text-right">
                                                {session.trial_total_targets}
                                              </span>
                                              <span className="text-muted-foreground">
                                                Correct Strikes
                                              </span>
                                              <span className="font-mono tabular-nums text-right text-green-700">
                                                {session.trial_correct_strikes}
                                              </span>
                                              <span className="text-muted-foreground">
                                                Omissions
                                              </span>
                                              <span className="font-mono tabular-nums text-right text-amber-700">
                                                {session.trial_omissions}
                                              </span>
                                              <span className="text-muted-foreground">
                                                Commissions
                                              </span>
                                              <span className="font-mono tabular-nums text-right text-red-700">
                                                {session.trial_commissions}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Real Test */}
                                      <div className="rounded-lg bg-muted/30 border border-border p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            Real Test
                                          </p>
                                          {classificationBadge(session.classification)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 mb-2">
                                          Age group norm:{" "}
                                          {
                                            classifyScore(
                                              Number(session.correct_strikes),
                                              Number(p.age) || 0,
                                            ).mean
                                          }{" "}
                                          correct
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                                          <span className="text-muted-foreground">
                                            Total Targets
                                          </span>
                                          <span className="font-mono tabular-nums text-right">
                                            {session.total_targets || 105}
                                          </span>
                                          <span className="text-muted-foreground">
                                            Correct Strikes
                                          </span>
                                          <span className="font-mono tabular-nums text-right text-green-700">
                                            {session.correct_strikes}
                                          </span>
                                          <span className="text-muted-foreground">
                                            Omissions
                                          </span>
                                          <span className="font-mono tabular-nums text-right text-amber-700">
                                            {session.omissions}
                                          </span>
                                          <span className="text-muted-foreground">
                                            Commissions
                                          </span>
                                          <span className="font-mono tabular-nums text-right text-red-700">
                                            {session.commissions}
                                          </span>
                                          <span className="text-muted-foreground">
                                            Time Taken
                                          </span>
                                          <span className="font-mono tabular-nums text-right">
                                            {formatTime(session.elapsed_seconds)}
                                          </span>
                                        </div>

                                        {session.grid_snapshot && (
                                          <GridSnapshotView
                                            snapshotKey={`dlct_snapshot_${p.patient_id}_${String(session.created_at)}`}
                                            gridSnapshot={session.grid_snapshot}
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {/* PDF Download Button below the two columns */}
                                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                                      {session.pdf_report_url ? (
                                        <a
                                          href={session.pdf_report_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground py-2 px-6 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
                                        >
                                          <Download className="w-4 h-4" />
                                          Download PDF Report
                                        </a>
                                      ) : (
                                        <button disabled className="inline-flex items-center gap-2 bg-muted text-muted-foreground py-2 px-6 rounded-md text-sm font-semibold cursor-not-allowed">
                                          PDF processing...
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Dashboard auto-updates in real-time when new tests are completed.
        </p>
      </main>

      <footer className="bg-muted/40 border-t border-border py-4 px-6">
        <p className="text-center text-xs text-muted-foreground">
          Double Alphabet Test
        </p>
      </footer>
    </div>
  );
}

// ─── Step 0: Doctor Login ────────────────────────────────────────────────────
const DOCTORS_KEY = "dlct_saved_doctors";

function getSavedDoctors(): string[] {
  try {
    const raw = localStorage.getItem(DOCTORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDoctors(names: string[]) {
  try {
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

function DoctorLoginStep({
  onNext,
  isDashboardLogin = false,
}: { onNext: (name: string) => void; isDashboardLogin?: boolean }) {
  const [inputName, setInputName] = useState("");
  const [savedDoctors, setSavedDoctors] = useState<string[]>(() =>
    getSavedDoctors(),
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [error, setError] = useState("");
  const [selectedFromCarousel, setSelectedFromCarousel] = useState<
    string | null
  >(null);
  const [password, setPassword] = useState("");

  const VISIBLE_COUNT = 3;

  const handleSelectDoctor = (name: string) => {
    setSelectedFromCarousel(name);
    setInputName(name);
    setError("");
  };

  const handlePrev = () => {
    setCarouselIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCarouselIndex((i) =>
      Math.min(savedDoctors.length - VISIBLE_COUNT, i + 1),
    );
  };

  const handleContinue = async () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setError("Please enter or select a doctor name.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");

    // Fixed admin/master password (can be overridden via VITE_DOCTOR_PASSWORD env var)
    const ADMIN_PASSWORD = import.meta.env.VITE_DOCTOR_PASSWORD ?? "doctor@123";

    try {
      const valid = await verifyDoctorPassword(trimmed, password);
      if (!valid) {
        // Not found in Supabase — check against admin master password
        if (password !== ADMIN_PASSWORD) {
          setError("Incorrect password. Please try again.");
          return;
        }
        // Admin password matched — save this doctor to Supabase
        await upsertDoctorPassword(trimmed, password);
      }
    } catch {
      // Supabase unreachable — fall back to admin password only
      if (password !== ADMIN_PASSWORD) {
        setError("Incorrect password. Please try again.");
        return;
      }
    }

    // Save to localStorage if not already present
    if (!savedDoctors.includes(trimmed)) {
      const updated = [trimmed, ...savedDoctors].slice(0, 12);
      setSavedDoctors(updated);
      persistDoctors(updated);
    }
    onNext(trimmed);
  };

  const visibleDoctors = savedDoctors.slice(
    carouselIndex,
    carouselIndex + VISIBLE_COUNT,
  );
  const canGoPrev = carouselIndex > 0;
  const canGoNext = carouselIndex + VISIBLE_COUNT < savedDoctors.length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Doctor Login
          </h1>
          <p className="text-muted-foreground text-sm">
            {isDashboardLogin
              ? "Double Alphabet Test — Doctor Dashboard"
              : "Double Alphabet Test — Clinical Assessment Platform"}
          </p>
        </div>

        <Card className="shadow-md border-border">
          <CardContent className="p-8 space-y-6">
            {/* Name input */}
            <div className="space-y-1.5">
              <Label
                htmlFor="doctorLogin"
                className="text-sm font-semibold text-foreground"
              >
                Doctor's Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="doctorLogin"
                  data-ocid="doctor-login.input"
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setSelectedFromCarousel(null);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinue();
                  }}
                  placeholder="Enter your name"
                  className="h-11 pl-9 text-base border-input focus:border-primary"
                  autoFocus
                />
              </div>
              {error && (
                <p
                  className="text-xs text-destructive font-medium"
                  data-ocid="doctor-login.error_state"
                >
                  {error}
                </p>
              )}
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <Label
                htmlFor="doctorPassword"
                className="text-sm font-semibold text-foreground"
              >
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="doctorPassword"
                  data-ocid="doctor-login.password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinue();
                  }}
                  placeholder="Enter password"
                  className="h-11 pl-9 text-base border-input focus:border-primary"
                />
              </div>
            </div>

            {/* Saved doctors carousel */}
            {savedDoctors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Recent Doctors
                  </Label>
                  {savedDoctors.length > VISIBLE_COUNT && (
                    <span className="text-xs text-muted-foreground">
                      {carouselIndex + 1}–
                      {Math.min(
                        carouselIndex + VISIBLE_COUNT,
                        savedDoctors.length,
                      )}{" "}
                      of {savedDoctors.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Left arrow */}
                  <button
                    type="button"
                    data-ocid="doctor-login.pagination_prev"
                    onClick={handlePrev}
                    disabled={!canGoPrev}
                    className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous doctors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Doctor name cards */}
                  <div className="flex-1 flex gap-2 min-w-0">
                    {visibleDoctors.map((name, idx) => {
                      const isSelected =
                        selectedFromCarousel === name || inputName === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          data-ocid={`doctor-login.item.${carouselIndex + idx + 1}`}
                          onClick={() => handleSelectDoctor(name)}
                          className={[
                            "flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 text-left transition-all duration-150 group",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/5",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-1.5">
                            <UserCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`}
                            />
                            <span className="text-xs font-semibold truncate">
                              {name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {/* Pad with empty slots if fewer than VISIBLE_COUNT */}
                    {visibleDoctors.length < VISIBLE_COUNT &&
                      Array.from({
                        length: VISIBLE_COUNT - visibleDoctors.length,
                      }).map((_, i) => {
                        // biome-ignore lint/suspicious/noArrayIndexKey: static padding slots, order never changes
                        return <div key={`pad-${i}`} className="flex-1" />;
                      })}
                  </div>

                  {/* Right arrow */}
                  <button
                    type="button"
                    data-ocid="doctor-login.pagination_next"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Next doctors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <Separator />

            <Button
              type="button"
              data-ocid="doctor-login.submit_button"
              onClick={handleContinue}
              className="w-full h-12 text-base font-semibold"
            >
              Continue →
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Double Alphabet Test
        </p>
      </div>
    </div>
  );
}

// ─── Step 1: Patient Details ─────────────────────────────────────────────────
function PatientDetailsStep({
  onNext,
  prefillDoctorName,
}: { onNext: (d: PatientDetails) => void; prefillDoctorName?: string }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [highestEducation, setHighestEducation] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorName, setDoctorName] = useState(prefillDoctorName ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const savePatient = useSavePatient();

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
    const details: PatientDetails = {
      name,
      age,
      gender,
      highestEducation,
      patientId,
      doctorName,
    };
    // Save patient to backend (fire-and-forget, don't block navigation)
    savePatient.mutate({
      name,
      age: BigInt(Number.parseInt(age, 10)),
      gender,
      highestEducation,
      patientId,
      doctorName,
      language: "en",
    });
    onNext(details);
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
          Double Alphabet Test
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
}: { language: Language; onNext: (trialResult: TrialResult) => void }) {
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

  const handleProceed = () => {
    const trialResult: TrialResult = {
      totalTargets: BigInt(total),
      correctStrikes: BigInt(correctCount),
      omissions: BigInt(total - correctCount),
      commissions: BigInt(commissions),
      attemptedAt: BigInt(Date.now()) * 1_000_000n,
    };
    onNext(trialResult);
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
            className={`rounded-xl border-2 px-5 py-4 mb-5 ${isPerfect
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
              onClick={handleProceed}
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
  onStop: (marked: Set<string>, elapsed: number, startTime: bigint) => void;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<bigint>(BigInt(Date.now()) * 1_000_000n);

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
    onStop(marked, elapsed, startTimeRef.current);
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

// ─── Step 7: Result Page (replaces ThankYou) ─────────────────────────────────
interface ResultStepProps {
  onNewTest: () => void;
  patient: PatientDetails;
  testData: {
    correctStrikes: number;
    omissions: number;
    commissions: number;
    elapsedSeconds: number;
    classification: string;
    trialResult?: TrialResult;
    gridSnapshot?: { rows: string[][]; markedIds: string[] };
  };
  supabaseRowId: string | null;
}

const STATUS_LABELS: Record<CaptureStatus, string> = {
  idle: "Preparing report…",
  capturing: "Capturing screenshot…",
  "generating-pdf": "Generating PDF…",
  uploading: "Uploading report…",
  saving: "Saving to database…",
  done: "Report saved successfully!",
  error: "Report generation failed",
};

function ResultStep({ onNewTest, patient, testData, supabaseRowId }: ResultStepProps) {
  const { resultRef, captureAndUpload, status, error, pdfUrl, imageUrl } =
    useReportCapture();
  const hasStarted = useRef(false);

  const age = Number.parseInt(patient.age, 10);
  const { label: classification, mean: normMean } = classifyScore(
    testData.correctStrikes,
    age,
  );

  // Auto-trigger capture once on mount
  useEffect(() => {
    if (hasStarted.current) return;
    if (!supabaseRowId) return;
    hasStarted.current = true;

    // Small delay to let the result card fully render
    const timer = setTimeout(() => {
      captureAndUpload(patient.patientId, supabaseRowId);
    }, 800);
    return () => clearTimeout(timer);
  }, [supabaseRowId, captureAndUpload, patient.patientId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const classIcon =
    classification === "Above Average" ? (
      <TrendingUp className="w-5 h-5 text-green-600" />
    ) : classification === "Average" ? (
      <Minus className="w-5 h-5 text-amber-600" />
    ) : (
      <TrendingDown className="w-5 h-5 text-red-600" />
    );

  const classBg =
    classification === "Above Average"
      ? "bg-green-50 border-green-300 text-green-800"
      : classification === "Average"
        ? "bg-amber-50 border-amber-300 text-amber-800"
        : "bg-red-50 border-red-300 text-red-800";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Success header */}
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Assessment Complete
          </h1>
          <p className="text-muted-foreground text-lg mt-4">
            Thank you for completing the test. Your results have been securely transmitted.
          </p>
          <p className="text-muted-foreground mt-2">
            Your assessment has been submitted to Dr. {patient.doctorName}.
          </p>
        </div>

        {/* ── Hidden Result Card (captured as PDF) ── */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={resultRef}
            data-report-capture
            className="bg-background text-foreground"
            style={{ width: "800px", padding: "20px" }}
          >
            <Card className="shadow-lg border-border mb-6">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg font-bold">
                      Assessment Report
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Patient Info */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Full Name</span>
                      <p className="font-semibold text-foreground">{patient.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Patient ID</span>
                      <p className="font-mono font-semibold text-foreground">
                        {patient.patientId}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Age</span>
                      <p className="font-semibold text-foreground">{patient.age}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Gender</span>
                      <p className="font-semibold text-foreground">{patient.gender}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Education</span>
                      <p className="font-semibold text-foreground">
                        {patient.highestEducation}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Doctor</span>
                      <p className="font-semibold text-foreground">
                        {patient.doctorName}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Test Scores */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Test Results
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-700 tabular-nums">
                        {testData.correctStrikes}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Correct</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700 tabular-nums">
                        {testData.omissions}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Omissions</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-700 tabular-nums">
                        {testData.commissions}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Commissions</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {formatTime(testData.elapsedSeconds)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Time</p>
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div
                  className={`flex items-center gap-3 rounded-xl border-2 px-5 py-4 ${classBg}`}
                >
                  {classIcon}
                  <div>
                    <p className="text-sm font-bold">{classification}</p>
                    <p className="text-xs opacity-80">
                      Age group norm: {normMean} correct (age {patient.age})
                    </p>
                  </div>
                </div>

                {/* Practice Trial (for PDF) */}
                {testData.trialResult && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                        Practice Trial
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-muted/30 rounded-xl p-4 text-center">
                          <p className="text-xl font-bold tabular-nums">
                            {Number(testData.trialResult.totalTargets)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Targets</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4 text-center">
                          <p className="text-xl font-bold text-green-700 tabular-nums">
                            {Number(testData.trialResult.correctStrikes)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Correct</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4 text-center">
                          <p className="text-xl font-bold text-amber-700 tabular-nums">
                            {Number(testData.trialResult.omissions)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Omissions</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4 text-center">
                          <p className="text-xl font-bold text-red-700 tabular-nums">
                            {Number(testData.trialResult.commissions)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Commissions</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Grid Snapshot (for PDF) */}
                {testData.gridSnapshot && (
                  <>
                    <Separator />
                    <div className="bg-muted/10 rounded-xl p-4 border border-border">
                      <GridSnapshotView snapshotKey="" gridSnapshot={testData.gridSnapshot} isLarge />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── PDF Generation Status ── */}
        <div className="bg-card border border-border rounded-xl px-5 py-4 mb-6">
          <div className="flex items-center gap-3">
            {status === "done" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : status === "error" ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${status === "done"
                    ? "text-green-700"
                    : status === "error"
                      ? "text-red-700"
                      : "text-foreground"
                  }`}
              >
                {STATUS_LABELS[status]}
              </p>
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>
            {/* Download PDF button is removed from patient view */}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button
            type="button"
            data-ocid="result.primary_button"
            onClick={onNewTest}
            size="lg"
            className="flex-1 h-12 text-base font-semibold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Test
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()}.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP — DLCT State Machine
// ═══════════════════════════════════════════════════════════════════════════════
type AppStep =
  | "landing"
  | "dashboard"
  | "doctor-dashboard-login"
  | "patient-details"
  | "language"
  | "instructions"
  | "confirmation"
  | "trial"
  | "ready"
  | "test"
  | "result";

export default function App() {
  const [step, setStep] = useState<AppStep>("landing");
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [loggedDoctorName, setLoggedDoctorName] = useState("");
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [supabaseRowId, setSupabaseRowId] = useState<string | null>(null);
  const [testResultData, setTestResultData] = useState<{
    correctStrikes: number;
    omissions: number;
    commissions: number;
    elapsedSeconds: number;
    classification: string;
    trialResult?: TrialResult;
    gridSnapshot?: { rows: string[][]; markedIds: string[] };
  } | null>(null);
  const saveTestSession = useSaveTestSession();

  const handleDoctorLoginForDashboard = (name: string) => {
    setLoggedDoctorName(name);
    setStep("dashboard");
  };

  const handlePatient = (d: PatientDetails) => {
    setPatient(d);
    setStep("language");
  };

  const handleLanguage = (l: Language) => {
    setLanguage(l);
    setStep("instructions");
  };

  const handleTrialComplete = (result: TrialResult) => {
    setTrialResult(result);
    setStep("ready");
  };

  const handleStop = (
    markedSet: Set<string>,
    elapsed: number,
    startTime: bigint,
  ) => {
    if (patient) {
      const age = Number.parseInt(patient.age, 10);
      // Count correct strikes from the grid
      let correctStrikes = 0;
      let commissions = 0;
      for (const cellId of markedSet) {
        const [riStr, ciStr] = cellId.split("-");
        const ri = Number.parseInt(riStr, 10);
        const ci = Number.parseInt(ciStr, 10);
        const targetSet = new Set(TARGET_POSITIONS[ri]);
        if (targetSet.has(ci)) {
          correctStrikes++;
        } else {
          commissions++;
        }
      }
      const omissions = 105 - correctStrikes;
      const classifyResult = classifyScore(correctStrikes, age);
      const classification = classifyResult.label;
      const classifyMean = classifyResult.mean; // used in dashboard via classifyScore call
      const snapshotKey = `dlct_snapshot_${patient.patientId}_${String(startTime)}`;
      const gridRows = GRID.map((r) => r.cells.map((c) => c.letter));
      const markedIds = Array.from(markedSet);
      // Save to localStorage as offline fallback
      localStorage.setItem(
        snapshotKey,
        JSON.stringify({ rows: gridRows, marked: markedIds }),
      );
      void classifyMean; // used in dashboard
      const endTime = BigInt(Date.now()) * 1_000_000n;

      const session: TestSession = {
        patientId: patient.patientId,
        patientName: patient.name,
        doctorName: patient.doctorName,
        languageSelected: language,
        startTime,
        endTime,
        trialResult: trialResult ?? undefined,
        gridSnapshot: { rows: gridRows, markedIds },
        testResult: {
          totalTargets: 105n,
          correctStrikes: BigInt(correctStrikes),
          omissions: BigInt(omissions),
          commissions: BigInt(commissions),
          elapsedSeconds: BigInt(elapsed),
          classification,
          completedAt: endTime,
        },
      };
      saveTestSession.mutate(session);

      // Store test result data for the result page
      setTestResultData({
        correctStrikes,
        omissions,
        commissions,
        elapsedSeconds: elapsed,
        classification,
        trialResult: trialResult ?? undefined,
        gridSnapshot: { rows: gridRows, markedIds },
      });

      // Save to Supabase (async, non-blocking)
      const patientData: SupabasePatientData = {
        patient_id: patient.patientId,
        doctor_name: patient.doctorName,
        full_name: patient.name,
        age: Number.parseInt(patient.age, 10),
        gender: patient.gender,
        highest_education: patient.highestEducation,
        language,
      };

      savePatientToSupabase(patientData)
        .then((patientDbId) => {
          // Once patient is saved/upserted, save the test result
          const resultData: SupabaseTestResultData = {
            patient_id: patientDbId,
            correct_strikes: correctStrikes,
            omissions: omissions,
            commissions: commissions,
            elapsed_seconds: elapsed,
            classification: classification,
            trial_total_targets: trialResult ? Number(trialResult.totalTargets) : null,
            trial_correct_strikes: trialResult ? Number(trialResult.correctStrikes) : null,
            trial_omissions: trialResult ? Number(trialResult.omissions) : null,
            trial_commissions: trialResult ? Number(trialResult.commissions) : null,
            total_targets: 105,
            grid_snapshot: { rows: gridRows, markedIds: markedIds },
          };
          return saveTestResultToSupabase(resultData);
        })
        .then((testResultId) => {
          // Pass the test result row ID to the ResultStep for file URL updates
          setSupabaseRowId(testResultId);
        })
        .catch((err) => {
          console.error("Supabase save failed:", err);
          // Still show results even if Supabase fails
          setSupabaseRowId(null);
        });
    }
    setStep("result");
  };

  const handleNewTest = () => {
    setStep("landing");
    setPatient(null);
    setLanguage("en");
    setLoggedDoctorName("");
    setTrialResult(null);
    setSupabaseRowId(null);
    setTestResultData(null);
  };

  if (step === "landing")
    return (
      <LandingStep
        onPatientLogin={() => setStep("patient-details")}
        onDoctorLogin={() => setStep("doctor-dashboard-login")}
      />
    );
  if (step === "doctor-dashboard-login")
    return (
      <DoctorLoginStep
        onNext={handleDoctorLoginForDashboard}
        isDashboardLogin
      />
    );
  if (step === "dashboard")
    if (step === "dashboard")
      return (
        <DoctorDashboardStep
          onBack={() => setStep("landing")}
          loggedDoctorName={loggedDoctorName}
        />
      );
  if (step === "patient-details")
    return (
      <PatientDetailsStep
        onNext={handlePatient}
        prefillDoctorName={loggedDoctorName}
      />
    );
  if (step === "language") return <LanguageStep onNext={handleLanguage} />;
  if (step === "instructions")
    return (
      <InstructionsStep
        language={language}
        onNext={() => setStep("confirmation")}
      />
    );
  if (step === "confirmation")
    return <ConfirmationStep onNext={() => setStep("trial")} />;
  if (step === "trial")
    return <TrialStep language={language} onNext={handleTrialComplete} />;
  if (step === "ready") return <ReadyStep onStart={() => setStep("test")} />;
  if (step === "test") return <TestStep onStop={handleStop} />;
  if (step === "result" && patient && testResultData)
    return (
      <ResultStep
        onNewTest={handleNewTest}
        patient={patient}
        testData={testResultData}
        supabaseRowId={supabaseRowId}
      />
    );

  return null;
}
