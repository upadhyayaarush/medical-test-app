import { useCallback, useRef, useState } from "react";
import {
  updateTestResultUrls,
  uploadResultFile,
} from "@/lib/supabaseService";

export type CaptureStatus =
  | "idle"
  | "capturing"
  | "generating-pdf"
  | "uploading"
  | "saving"
  | "done"
  | "error";

interface UseReportCaptureReturn {
  resultRef: React.RefObject<HTMLDivElement | null>;
  captureAndUpload: (patientId: string, testResultRowId: string) => Promise<void>;
  status: CaptureStatus;
  error: string | null;
  pdfUrl: string | null;
  imageUrl: string | null;
}

export function useReportCapture(): UseReportCaptureReturn {
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const captureAndUpload = useCallback(
    async (patientId: string, testResultRowId: string) => {
      if (!resultRef.current) {
        setError("Result element not found");
        setStatus("error");
        return;
      }

      try {
        // Step 1: Capture screenshot using html-to-image
        setStatus("capturing");
        const { toPng } = await import("html-to-image");

        const dataUrl = await toPng(resultRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true,
        });

        // Convert data URL to Blob for image upload
        const response = await fetch(dataUrl);
        const imageBlob = await response.blob();

        // Step 2: Generate PDF
        setStatus("generating-pdf");
        const { jsPDF } = await import("jspdf");

        // Load image to get dimensions
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load captured image"));
          img.src = dataUrl;
        });

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // A4 dimensions in points: 595.28 x 841.89
        const pdfWidth = 595.28;
        const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: [pdfWidth, Math.max(pdfHeight, 841.89)],
        });

        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output("blob");

        // Step 3: Upload to Supabase Storage
        setStatus("uploading");
        
        const [publicImageUrl, publicPdfUrl] = await Promise.all([
          uploadResultFile("result-images", patientId, imageBlob, "png", "image/png"),
          uploadResultFile("result-pdfs", patientId, pdfBlob, "pdf", "application/pdf")
        ]);

        // Step 4: Save URLs to test_results record
        setStatus("saving");
        await updateTestResultUrls(testResultRowId, publicPdfUrl, publicImageUrl);

        setPdfUrl(publicPdfUrl);
        setImageUrl(publicImageUrl);
        setStatus("done");
      } catch (err) {
        console.error("Report capture error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate report",
        );
        setStatus("error");
      }
    },
    [],
  );

  return { resultRef, captureAndUpload, status, error, pdfUrl, imageUrl };
}
