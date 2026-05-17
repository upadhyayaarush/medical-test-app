import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TestSession {
    startTime: bigint;
    gridSnapshot?: GridSnapshot;
    testResult?: TestResult;
    endTime: bigint;
    languageSelected: string;
    patientId: string;
    patientName: string;
    doctorName: string;
    trialResult?: TrialResult;
}
export interface TrialResult {
    totalTargets: bigint;
    correctStrikes: bigint;
    omissions: bigint;
    attemptedAt: bigint;
    commissions: bigint;
}
export interface GridSnapshot {
    markedIds: Array<string>;
    rows: Array<Array<string>>;
}
export interface Patient {
    age: bigint;
    patientId: string;
    name: string;
    language: string;
    highestEducation: string;
    gender: string;
    doctorName: string;
}
export interface TestResult {
    completedAt: bigint;
    totalTargets: bigint;
    correctStrikes: bigint;
    omissions: bigint;
    elapsedSeconds: bigint;
    commissions: bigint;
    classification: string;
}
export interface backendInterface {
    getAllPatients(): Promise<Array<Patient>>;
    getAllTestSessions(): Promise<Array<TestSession>>;
    getDoctors(): Promise<Array<string>>;
    getPatient(patientId: string): Promise<Patient | null>;
    getPatientFullRecord(patientId: string): Promise<{
        patient: Patient;
        sessions: Array<TestSession>;
    } | null>;
    getSessionsByDoctor(doctorName: string): Promise<Array<TestSession>>;
    getSessionsByPatientId(patientId: string): Promise<Array<TestSession>>;
    saveDoctor(name: string): Promise<void>;
    savePatient(patient: Patient): Promise<void>;
    saveTestSession(session: TestSession): Promise<void>;
}
