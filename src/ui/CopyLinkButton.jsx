import React from "react";

/**
 * Small button that copies the current page URL to the clipboard and flashes
 * a toast. Used in the DistrictDetail header.
 */
export default function CopyLinkButton({
  label = "Copy link",
  successText = "Link copied",
  className = "",
}) {
  const [toast, setToast] = React.useState(null);

  const onClick = async () => {
    try {
      const url =
        typeof window !== "undefined" ? window.location.href : "";
      if (!url) return;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setToast(successText);
      setTimeout(() => setToast(null), 1900);
    } catch (e) {
      setToast("Copy failed");
      setTimeout(() => setToast(null), 1900);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={`icon-btn ${className}`.trim()}
        aria-label={label}
        title={label}
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
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
        </svg>
        {label}
      </button>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
