/**
 * photo-sanitizer.ts — Frontend EXIF / PHI stripping for photo uploads.
 *
 * Health-app photos may carry EXIF metadata (GPS coordinates, device serial,
 * capture timestamp) which is PHI under HIPAA.  Re-encoding through the HTML
 * canvas pipeline discards ALL metadata segments because canvas only preserves
 * raw pixel data — no EXIF, XMP, IPTC, or ICC profiles are written to the
 * output blob.
 *
 * Usage:
 *   const safeBlob = await sanitizePhotoForUpload(file);
 *   formData.append("image", safeBlob, "photo.jpg");
 */

/**
 * Strips EXIF metadata from a File by drawing it onto an offscreen canvas
 * and re-encoding to a clean Blob.  Returns a Blob with the same MIME type
 * (jpeg or png); all other formats are coerced to jpeg.
 *
 * Throws if the image cannot be decoded or the canvas is unavailable.
 */
export async function sanitizePhotoForUpload(file: File): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("canvas 2d context unavailable — cannot strip EXIF"));
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Determine output MIME: preserve PNG losslessly, everything else to JPEG.
        const outputMime =
          file.type === "image/png" ? "image/png" : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("canvas.toBlob produced null — EXIF strip failed"));
            }
          },
          outputMime,
          // Quality 0.85 — good visual fidelity, meaningfully smaller than 1.0.
          // Do NOT lower below 0.85 per security spec constraint.
          0.85,
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image decode failed — cannot strip EXIF"));
    };

    img.src = objectUrl;
  });
}
