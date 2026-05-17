import { supabase } from "./supabaseClient";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SupabasePatientData {
  patient_id: string;
  doctor_name: string;
  full_name: string;
  age: number;
  gender: string;
  highest_education: string;
  language: string;
}

export interface SupabaseTestResultData {
  patient_id: string; // Foreign key (UUID of the patient row)
  correct_strikes: number;
  omissions: number;
  commissions: number;
  elapsed_seconds: number;
  classification: string;

  // Additional rich data
  trial_total_targets: number | null;
  trial_correct_strikes: number | null;
  trial_omissions: number | null;
  trial_commissions: number | null;
  total_targets: number;
  grid_snapshot: any | null; // JSONB
}

// ─── Save patient to Supabase ───────────────────────────────────────────────
export async function savePatientToSupabase(
  data: SupabasePatientData,
): Promise<string> {
  const { data: upserted, error } = await supabase
    .from("patients")
    .upsert(data, { onConflict: "patient_id" })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert/upsert error:", error);
    throw new Error(`Failed to save patient: ${error.message}`);
  }

  return upserted.id as string;
}

// ─── Save test result to Supabase ───────────────────────────────────────────
export async function saveTestResultToSupabase(
  data: SupabaseTestResultData,
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from("test_results")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    console.error("Supabase test result insert error:", error);
    throw new Error(`Failed to save test result: ${error.message}`);
  }

  return inserted.id as string;
}

// ─── Upload File to Supabase Storage ────────────────────────────────────────
export async function uploadResultFile(
  bucket: string,
  patientId: string,
  blob: Blob,
  extension: string,
  contentType: string,
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${patientId}_${timestamp}.${extension}`;
  const filePath = `reports/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error(`Supabase upload error [${bucket}]:`, uploadError);
    throw new Error(`Failed to upload file to ${bucket}: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

// ─── Update test result row with File URLs ──────────────────────────────────
export async function updateTestResultUrls(
  rowId: string,
  pdfUrl: string,
  screenshotUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from("test_results")
    .update({ pdf_report_url: pdfUrl, screenshot_url: screenshotUrl })
    .eq("id", rowId);

  if (error) {
    console.error("Supabase update error:", error);
    throw new Error(`Failed to update file URLs: ${error.message}`);
  }
}
