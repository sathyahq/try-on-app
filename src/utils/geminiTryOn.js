import { blobToBase64, base64ToBlob, downsizeImage } from './imageUtils';

// Calls our Vercel serverless proxy at /api/tryon, which calls Gemini with
// the secret API key. Returns a Blob containing the generated image.
export async function generateTryOn(
  { customerBlob, garmentBlob, garmentType },
  onProgress
) {
  onProgress?.({ stage: 'preparing', message: 'Preparing your photos…', pct: 8 });

  const [customerSmall, garmentSmall] = await Promise.all([
    downsizeImage(customerBlob, 1024),
    downsizeImage(garmentBlob, 1024),
  ]);

  onProgress?.({ stage: 'encoding', message: 'Sending to the AI…', pct: 22 });

  const [customerB64, garmentB64] = await Promise.all([
    blobToBase64(customerSmall),
    blobToBase64(garmentSmall),
  ]);

  onProgress?.({ stage: 'generating', message: 'Generating your try-on…', pct: 35 });

  // Heartbeat tick so the progress bar feels alive during the long wait.
  let pct = 35;
  const tick = setInterval(() => {
    pct = Math.min(92, pct + 2);
    onProgress?.({ stage: 'generating', message: 'Generating your try-on…', pct });
  }, 800);

  let response;
  try {
    response = await fetch('/api/tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerImage: { mimeType: 'image/jpeg', data: customerB64 },
        garmentImage: { mimeType: 'image/jpeg', data: garmentB64 },
        garmentType,
      }),
    });
  } finally {
    clearInterval(tick);
  }

  if (!response.ok) {
    let info = {};
    try {
      info = await response.json();
    } catch {
      // ignore
    }
    const err = new Error(info.error || `Try-on request failed (${response.status})`);
    err.status = response.status;
    err.hint = info.hint;
    throw err;
  }

  const result = await response.json();
  onProgress?.({ stage: 'done', message: 'Done!', pct: 100 });
  return base64ToBlob(result.data, result.mimeType || 'image/png');
}
