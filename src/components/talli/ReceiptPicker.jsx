import React, { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ReceiptPicker — handles camera capture and photo library selection.
 * Uploads the file via UploadFile integration and returns a receipt_url.
 *
 * Future OCR hook: after upload, call an OCR backend function with the receipt_url
 * to extract merchant, date, total, and suggested_category.
 */
export default function ReceiptPicker({ receiptUrl, onChange }) {
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setShowOptions(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
    setShowOptions(false);
  };

  // If receipt exists, show thumbnail with replace/remove options
  if (receiptUrl) {
    return (
      <div className="relative w-16 h-16 flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/40 focus:outline-none"
        >
          <img
            src={receiptUrl}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
        </button>

        {/* Remove badge */}
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Replace options popover */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]"
            >
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
                Take Photo
              </button>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={() => libraryInputRef.current?.click()}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                Choose Photo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
        <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
      </div>
    );
  }

  // No receipt yet — show add button
  return (
    <div className="relative">
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowOptions(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="absolute bottom-full mb-2 left-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]"
            >
              <button
                type="button"
                onClick={() => { cameraInputRef.current?.click(); setShowOptions(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
                Take Photo
              </button>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={() => { libraryInputRef.current?.click(); setShowOptions(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                Choose from Library
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        disabled={uploading}
        className="h-12 px-4 rounded-xl bg-muted border border-dashed border-muted-foreground/30 flex items-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            <span>Add Receipt</span>
          </>
        )}
      </button>

      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
    </div>
  );
}