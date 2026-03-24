/**
 * Chart export utilities — download ECharts charts as PNG or SVG.
 * Uses ECharts' built-in getConnectedDataURL() via chart ref.
 */

export type ExportFormat = "png" | "svg";

interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

/**
 * Trigger browser download of a chart.
 * @param getChartInstance - function that returns the echarts instance via ref
 * @param filename - without extension
 * @param format - png (default) or svg
 * @param options - export options
 */
export async function downloadChart(
  getChartInstance: () => echarts.ECharts | undefined,
  filename: string,
  format: ExportFormat = "png",
  options: ExportOptions = {}
): Promise<void> {
  const chart = getChartInstance();
  if (!chart) {
    console.error("[chart-export] No chart instance available");
    return;
  }

  const pixelRatio = options.pixelRatio ?? 2;
  const url = chart.getConnectedDataURL({
    type: format,
    pixelRatio,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    excludeComponents: ["toolbox"],
  });

  if (!url) {
    console.error("[chart-export] Failed to generate data URL");
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export all charts in a dashboard grid.
 * @param getCharts - function returning array of chart instances
 * @param filename - base filename
 */
export async function downloadDashboardCharts(
  getCharts: () => echarts.ECharts[],
  filename: string
): Promise<void> {
  const charts = getCharts();
  if (!charts.length) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gap = 16;
  const chartHeight = 260;
  const chartWidth = 400;
  canvas.width = chartWidth * charts.length + gap * (charts.length - 1);
  canvas.height = chartHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < charts.length; i++) {
    const dataUrl = charts[i].getConnectedDataURL({ type: "png", pixelRatio: 2 });
    if (!dataUrl) continue;
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, i * (chartWidth + gap), 0, chartWidth, chartHeight);
        resolve();
      };
      img.src = dataUrl;
    });
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-dashboard.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}
