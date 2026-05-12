import React, { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

/**
 * ReceiptScanner
 * Handles photo capture → upload → OCR via InvokeLLM vision.
 * Calls onScanned({ merchant, receipt_date, total, suggested_category, receipt_url, raw_text })
 * Calls onManual() if user wants to skip scanning.
 */
export default function ReceiptScanner({ onScanned, onManual, onClose }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | scanning | error
  const [errorMsg, setErrorMsg] = useState("");

  const processFile = async (file) => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    try {
      // 1. Upload image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Run OCR via LLM vision
      setStatus("scanning");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a receipt OCR assistant. Analyze this receipt image and extract the following information.
Be accurate and concise. If a field is unclear or missing, use null.

Return ONLY valid JSON with these exact fields:
{
  "merchant": "store or restaurant name (string or null)",
  "total": the final total amount as a number with no currency symbol (number or null),
  "receipt_date": "date in YYYY-MM-DD format (string or null)",
  "suggested_category": one of: "groceries", "meals", "misc", "personal" — choose based on merchant type,
  "confidence": "high", "medium", or "low"
}

Rules:
- For grocery stores (Walmart, Kroger, Aldi, etc.) → "groceries"
- For restaurants, fast food, cafes, diners → "meals"  
- For gas stations, convenience stores → "misc"
- For pharmacies, personal care → "personal"
- total should be the FINAL total (after tax), not subtotal
- If the date is not visible, use null`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            total: { type: "number" },
            receipt_date: { type: "string" },
            suggested_category: { type: "string" },
            confidence: { type: "string" },
          },
        },
      });

      onScanned({
        merchant: result.merchant || null,
        total: result.total || null,
        receipt_date: result.receipt_date || null,
        suggested_category: result.suggested_category || "misc",
        confidence: result.confidence || "low",
        receipt_url: file_url,
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg("Couldn't read receipt. Try a clearer photo or enter manually.");
    }
  };

  const handleInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const isProcessing = status === "uploading" || status === "scanning";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
        onClick={!isProcessing ? onClose : undefined}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full bg-card rounded-t-3xl border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-6 pb-10 pt-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Scan Receipt</h2>
                <p className="text-xs text-muted-foreground mt-0.5">AI will auto-fill your expense</p>
              </div>
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Processing state */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center py-8 gap-4"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {status === "uploading" ? "Uploading photo…" : "Reading receipt…"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status === "scanning" ? "AI is extracting amount & details" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-5 text-center"
              >
                <p className="text-sm text-destructive font-medium">{errorMsg}</p>
              </motion.div>
            )}

            {/* Action buttons */}
            {!isProcessing && (
              <div className="space-y-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-3 text-base"
                >
                  <Camera className="h-5 w-5" />
                  Take Photo
                </button>

                <button
                  onClick={() => libraryRef.current?.click()}
                  className="w-full h-12 rounded-2xl bg-muted text-foreground font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  Choose from Library
                </button>

                <button
                  onClick={onManual}
                  className="w-full h-10 text-sm text-muted-foreground font-medium"
                >
                  Enter manually instead
                </button>
              </div>
            )}

            {/* Hidden inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInput} />
            <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}