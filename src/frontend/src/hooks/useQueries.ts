import { createActor } from "@/backend";
import type { Patient, TestSession } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type { Patient, TestSession };

export function useAllPatients() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPatients();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllTestSessions() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TestSession[]>({
    queryKey: ["testSessions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTestSessions();
    },
    enabled: !!actor && !isFetching,
  });
}

export interface PatientFullRecord {
  patient: Patient;
  sessions: TestSession[];
}

export function useAllPatientsWithSessions() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PatientFullRecord[]>({
    queryKey: ["patientsWithSessions"],
    queryFn: async () => {
      if (!actor) return [];
      const patients = await actor.getAllPatients();
      const records = await Promise.all(
        patients.map(async (p) => {
          const record = await actor.getPatientFullRecord(p.patientId);
          return record
            ? { patient: record.patient, sessions: record.sessions }
            : { patient: p, sessions: [] };
        }),
      );
      return records;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSessionsByDoctor(doctorName: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PatientFullRecord[]>({
    queryKey: ["sessionsByDoctor", doctorName],
    queryFn: async () => {
      if (!actor || !doctorName) return [];
      const sessions = await actor.getSessionsByDoctor(doctorName);
      // Group sessions by patientId
      const byPatientId = new Map<string, TestSession[]>();
      for (const s of sessions) {
        const arr = byPatientId.get(s.patientId) ?? [];
        arr.push(s);
        byPatientId.set(s.patientId, arr);
      }
      const records = await Promise.all(
        Array.from(byPatientId.entries()).map(
          async ([patientId, patientSessions]) => {
            const patient = await actor.getPatient(patientId);
            const fallbackPatient: Patient = {
              patientId,
              name: patientSessions[0]?.patientName ?? patientId,
              age: 0n,
              gender: "",
              highestEducation: "",
              language: patientSessions[0]?.languageSelected ?? "en",
              doctorName,
            };
            return {
              patient: patient ?? fallbackPatient,
              sessions: patientSessions,
            };
          },
        ),
      );
      return records;
    },
    enabled: !!actor && !isFetching && !!doctorName,
  });
}

export function useSavePatient() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patient: Patient) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.savePatient(patient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patientsWithSessions"] });
    },
  });
}

export function useSaveTestSession() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: TestSession) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.saveTestSession(session);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testSessions"] });
      queryClient.invalidateQueries({ queryKey: ["patientsWithSessions"] });
      queryClient.invalidateQueries({
        queryKey: ["sessionsByDoctor", variables.doctorName],
      });
    },
  });
}
