/**
 * Client-side photo preparation for Part II: decode, honour EXIF orientation,
 * downscale so the long side is at most `maxSide`, and re-encode as JPEG.
 * Returns base64 without the data-URL prefix. A 12 MP phone photo becomes
 * roughly 300–500 KB, small enough to post four of them in one request.
 */
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_MAX_COUNT = 4;

export async function fileToJpegBase64(file: File, maxSide = PHOTO_MAX_SIDE, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.fillStyle = "#fff"; // flatten transparency (PNG scans) onto white
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", quality);
    return url.slice(url.indexOf(",") + 1);
  } finally {
    bitmap.close();
  }
}
