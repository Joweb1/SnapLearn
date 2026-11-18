import type { CapturedPage } from "../types/study";

const MAX_DIMENSION = 1800;

export function generateId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function resizeImageSource(
  src: string,
  name: string
): Promise<CapturedPage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
          targetWidth = MAX_DIMENSION;
        } else {
          targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
          targetHeight = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, 0.86);
      const base64 = dataUrl.split(",")[1] || "";

      resolve({
        id: generateId("page"),
        name,
        mimeType,
        dataUrl,
        base64,
        width: targetWidth,
        height: targetHeight,
      });
    };
    img.onerror = () => reject(new Error(`Unable to load image "${name}".`));
    img.src = src;
  });
}

export async function fileToCapturedPage(file: File): Promise<CapturedPage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await resizeImageSource(objectUrl, file.name);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function videoFrameToCapturedPage(
  video: HTMLVideoElement,
  pageNumber: number
): Promise<CapturedPage> {
  const rawWidth = video.videoWidth || 1280;
  const rawHeight = video.videoHeight || 720;
  let targetWidth = rawWidth;
  let targetHeight = rawHeight;

  if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
      targetWidth = MAX_DIMENSION;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
      targetHeight = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not capture camera frame.");
  }
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  const mimeType = "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, 0.88);
  const base64 = dataUrl.split(",")[1] || "";

  return {
    id: generateId("page"),
    name: `Camera Snap ${pageNumber}.jpg`,
    mimeType,
    dataUrl,
    base64,
    width: targetWidth,
    height: targetHeight,
  };
}

export async function urlToCapturedPage(
  url: string,
  name: string
): Promise<CapturedPage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load sample note image.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await resizeImageSource(objectUrl, name);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
