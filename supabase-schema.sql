-- ============================================================================
-- Supabase Schema for Medical Test App
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- 1. Create the patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  highest_education TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  test_correct_strikes INTEGER,
  test_omissions INTEGER,
  test_commissions INTEGER,
  test_elapsed_seconds INTEGER,
  test_classification TEXT,
  pdf_report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index on patient_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients (patient_id);

-- 3. Create index on doctor_name for dashboard queries
CREATE INDEX IF NOT EXISTS idx_patients_doctor_name ON patients (doctor_name);

-- 4. Create the storage bucket for PDF reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-reports', 'patient-reports', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies: allow public uploads and reads
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patient-reports');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'patient-reports');
