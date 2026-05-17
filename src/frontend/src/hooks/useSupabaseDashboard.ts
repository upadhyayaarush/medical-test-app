import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface SupabasePatientRecord {
  id: string;
  patient_id: string;
  doctor_name: string;
  full_name: string;
  age: number;
  gender: string;
  highest_education: string;
  language: string;
  created_at: string;
}

export interface SupabaseTestResultRecord {
  id: string;
  patient_id: string; // references patient.id
  correct_strikes: number;
  omissions: number;
  commissions: number;
  elapsed_seconds: number;
  classification: string;
  pdf_report_url: string | null;
  screenshot_url: string | null;
  
  trial_total_targets: number | null;
  trial_correct_strikes: number | null;
  trial_omissions: number | null;
  trial_commissions: number | null;
  total_targets: number;
  grid_snapshot: any | null;
  
  created_at: string;
}

export interface DashboardPatient {
  patient: SupabasePatientRecord;
  results: SupabaseTestResultRecord[];
}

export function useSupabaseDashboard(doctorName: string) {
  const [data, setData] = useState<DashboardPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!doctorName) return;
    
    if (isRefresh) setIsRefetching(true);
    else setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch patients for this doctor
      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .ilike("doctor_name", `%${doctorName.trim()}%`)
        .order("created_at", { ascending: false });

      if (patientsError) throw patientsError;

      if (!patients || patients.length === 0) {
        setData([]);
        setIsLoading(false);
        setIsRefetching(false);
        return;
      }

      // 2. Fetch test results for these patients
      const patientIds = patients.map(p => p.id);
      const { data: results, error: resultsError } = await supabase
        .from("test_results")
        .select("*")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      if (resultsError) throw resultsError;

      // 3. Group results by patient
      const resultsByPatient = (results || []).reduce((acc, result) => {
        if (!acc[result.patient_id]) {
          acc[result.patient_id] = [];
        }
        acc[result.patient_id].push(result);
        return acc;
      }, {} as Record<string, SupabaseTestResultRecord[]>);

      // 4. Map to final structure
      const dashboardData = patients.map(patient => ({
        patient,
        results: resultsByPatient[patient.id] || []
      }));

      setData(dashboardData);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [doctorName]);

  useEffect(() => {
    fetchData();

    // Setup Realtime subscription on test_results
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_results",
        },
        (payload) => {
          console.log("Realtime payload received:", payload);
          // Refetch data when there is a change to test_results
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refetch: () => fetchData(true)
  };
}
