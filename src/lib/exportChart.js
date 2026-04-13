// src/lib/exportChart.js
// Serialize an in-DOM SVG element to a PNG dataURL and trigger a download.
// Mirrors the exportAsPNG pattern in DistrictSpendingPie.jsx so that users
// can save any chart from the Spending Over Time section.

const PIXEL_RATIO = 2; // export at 2x for crisper screenshots

/**
 * Find the first relevant SVG inside a container and export it as a PNG file.
 *
 * @param {HTMLElement} container
 * @param {string} filename  — filename without extension
 * @param {string} [bgColor] — background color; defaults to --surface-0
 * @returns {Promise<void>}  — resolves when the download has started
 */
export async function downloadContainerSvgAsPng(
  container,
  filename,
  bgColor
) {
  if (!container) throw new Error("No chart container supplied");
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("No chart SVG found in container");

  const rect = svg.getBoundingClientRect();
  const w = Math.max(svg.viewBox?.baseVal?.width || rect.width, rect.width, 320);
  const h = Math.max(svg.viewBox?.baseVal?.height || rect.height, rect.height, 200);

  // Serialize a clone so we don't mutate the live SVG
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error("Failed to render chart as image"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * PIXEL_RATIO);
    canvas.height = Math.round(h * PIXEL_RATIO);
    const ctx = canvas.getContext("2d");
    const resolvedBg =
      bgColor ||
      getComputedStyle(document.documentElement)
        .getPropertyValue("--surface-0")
        .trim() ||
      "#ffffff";
    ctx.fillStyle = resolvedBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${filename || "chart"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
