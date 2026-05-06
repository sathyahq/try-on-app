import { WATERMARK_TEXT, LOGO_PATH } from '../config';

// Cache loaded HTMLImageElements by source URL so repeated composites are fast.
const imageCache = new Map();

export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

let logoLoadAttempted = false;
let logoImage = null;
async function tryLoadLogo() {
  if (logoLoadAttempted) return logoImage;
  logoLoadAttempted = true;
  try {
    logoImage = await loadImage(LOGO_PATH);
  } catch {
    logoImage = null;
  }
  return logoImage;
}

function drawWatermark(ctx, w, h, logo) {
  ctx.save();
  if (logo) {
    const logoH = Math.max(40, Math.round(h * 0.06));
    const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH;
    const pad = Math.round(h * 0.02);
    ctx.globalAlpha = 0.78;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 6;
    ctx.drawImage(logo, w - logoW - pad, h - logoH - pad, logoW, logoH);
  } else {
    const fontSize = Math.max(14, Math.round(h * 0.022));
    ctx.font = `500 ${fontSize}px "DM Sans", system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const pad = Math.round(h * 0.02);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(WATERMARK_TEXT, w - pad, h - pad);
  }
  ctx.restore();
}

// Composite the customer photo + transformed garment + watermark into a canvas.
// `transform`: { cx, cy, scale, rotation, opacity }
//   cx, cy   - garment center in customer-photo pixel space
//   scale    - multiplier on the garment's natural size
//   rotation - degrees
//   opacity  - 0..1
export async function composeTryOn({
  customerImage,
  garmentImage,
  transform,
  targetCanvas,
}) {
  const w = customerImage.naturalWidth || customerImage.width;
  const h = customerImage.naturalHeight || customerImage.height;

  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(customerImage, 0, 0, w, h);

  if (garmentImage && transform) {
    const { cx, cy, scale, rotation = 0, opacity = 1 } = transform;
    const gw = garmentImage.naturalWidth || garmentImage.width;
    const gh = garmentImage.naturalHeight || garmentImage.height;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(garmentImage, -gw / 2, -gh / 2);
    ctx.restore();
  }

  const logo = await tryLoadLogo();
  drawWatermark(ctx, w, h, logo);

  return canvas;
}

// Apply only the watermark on top of an existing image (used for AI try-on
// outputs, where the AI already produced the full composite).
export async function applyWatermark(image, targetCanvas) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);

  const logo = await tryLoadLogo();
  drawWatermark(ctx, w, h, logo);
  return canvas;
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      type,
      quality
    );
  });
}

// Convenience: produce a JPEG blob of a try-on entirely off-screen.
export async function exportTryOnBlob({
  customerImage,
  garmentImage,
  transform,
  type = 'image/jpeg',
  quality = 0.9,
}) {
  const canvas = await composeTryOn({ customerImage, garmentImage, transform });
  return canvasToBlob(canvas, type, quality);
}
