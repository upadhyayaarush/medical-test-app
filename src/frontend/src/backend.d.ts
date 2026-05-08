import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Patient {
    age: bigint;
    patientId: string;
    name: string;
    gender: string;
}
export interface TestSession {
    startTime: bigint;
    endTime: bigint;
    languageSelected: string;
    patientId: string;
}
export interface backendInterface {
    getAllPatients(): Promise<Array<Patient>>;
    getAllTestSessions(): Promise<Array<TestSession>>;
    getPatient(patientId: string): Promise<Patient | null>;
    getSessionsByPatientId(patientId: string): Promise<Array<TestSession>>;
    savePatient(patient: Patient): Promise<void>;
    saveTestSession(session: TestSession): Promise<void>;
}
