"use client";

// A tiny client control that triggers the browser's print dialog (Save as PDF).
// Lives on the read-only /interview/[id]/review page; hidden in the printout
// itself via the `.no-print` class.
export default function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      🖨 Print / PDF
    </button>
  );
}
