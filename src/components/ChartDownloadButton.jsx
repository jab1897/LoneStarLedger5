import React from "react";
import { downloadContainerSvgAsPng } from "../lib/exportChart";

/**
 * A small icon button that exports the first SVG found inside the referenced
 * container as a PNG. Used on every chart section in DistrictSpendingTimeline.
 *
 * Props:
 *   targetRef  — React ref pointing to a container element that holds an SVG
 *   filename   — filename (without extension) for the downloaded PNG
 *   children   — optional label text, defaults to "PNG"
 */
export default function ChartDownloadButton({ targetRef, filename, children }) {
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    if (!targetRef?.current || busy) return;
    setBusy(true);
    try {
      await downloadContainerSvgAsPng(targetRef.current, filename);
    } catch (e) {
      console.warn("[ChartDownloadButton] export failed:", e?.message || e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onClick}
      disabled={busy}
      aria-label="Download chart as PNG"
      title="Download chart as PNG"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {children || "PNG"}
    </button>
  );
}
