// Vercel serverless function: virtual try-on via Gemini 2.5 Flash Image.
// The API key lives in process.env.GEMINI_API_KEY (set in Vercel project
// settings) so it never reaches the browser.
//
// Request:  POST /api/tryon
//   body: {
//     customerImage: { mimeType, data: base64 },
//     garmentImage:  { mimeType, data: base64 },
//     garmentType:   "saree" | "churidar" | "tshirt" | "lehenga" | "full"
//   }
// Response (200): { mimeType, data: base64 }
// Response (4xx/5xx): { error, hint? }

export const config = {
  maxDuration: 60,
};

const PRIMARY_MODEL = 'gemini-2.5-flash-image';
const FALLBACK_MODEL = 'gemini-2.5-flash-image-preview';

const PROMPTS = {
  saree:
    'The garment is a saree. Drape it elegantly across the customer in traditional South Indian style — pleats tucked at the waist, pallu flowing over the left shoulder. Preserve the saree\'s exact colors, border, and pattern from the reference. Show realistic fabric folds and drape.',
  churidar:
    'The garment is a kurti or churidar top. Replace the customer\'s existing upper-body clothing with this top. Match the garment\'s neckline, sleeves, length, and pattern exactly. The fit should look natural on the customer\'s torso.',
  tshirt:
    'The garment is a t-shirt or shirt. Replace the customer\'s existing top with this garment, fitted naturally to the torso and arms. Match the original garment\'s exact color, print, collar, and sleeve length.',
  lehenga:
    'The garment is a lehenga skirt. Replace only the lower-body clothing with this skirt. Keep the upper body clothing unchanged. Show the skirt with its real pleats, length, and embroidery.',
  full:
    'The garment is a complete outfit. Replace all of the customer\'s existing clothing with this outfit, sized and draped naturally on the body. Preserve the outfit\'s exact color and design.',
};

function buildPrompt(garmentType) {
  const specific = PROMPTS[garmentType] || PROMPTS.tshirt;
  return [
    'You are a virtual try-on system for an Indian clothing boutique.',
    'INPUT: Image 1 = a customer photo. Image 2 = a garment.',
    'TASK: Generate a single photorealistic image of the customer wearing the garment from Image 2.',
    'STRICT RULES:',
    '1. Preserve the customer\'s face, hair, skin tone, body proportions, and pose EXACTLY as in Image 1.',
    '2. Preserve the original photo\'s background, lighting, and camera angle.',
    '3. Replace existing clothing only in the area covered by the new garment.',
    '4. The new garment must match Image 2 in color, pattern, fabric, and style — do not invent new colors or patterns.',
    '5. The result must look like a real photograph, not a digital paste-on.',
    specific,
    'Output: ONE generated image. No text.',
  ].join('\n');
}

async function callGemini(model, apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is not configured',
      hint: 'GEMINI_API_KEY environment variable is missing on the server.',
    });
  }

  try {
    const body = req.body || {};
    const { customerImage, garmentImage, garmentType } = body;

    if (!customerImage?.data || !garmentImage?.data) {
      return res.status(400).json({ error: 'Both customer and garment images are required.' });
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(garmentType) },
            {
              inline_data: {
                mime_type: customerImage.mimeType || 'image/jpeg',
                data: customerImage.data,
              },
            },
            {
              inline_data: {
                mime_type: garmentImage.mimeType || 'image/jpeg',
                data: garmentImage.data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        temperature: 0.4,
      },
    };

    let geminiRes = await callGemini(PRIMARY_MODEL, apiKey, requestBody);
    if (geminiRes.status === 404) {
      geminiRes = await callGemini(FALLBACK_MODEL, apiKey, requestBody);
    }

    if (!geminiRes.ok) {
      const text = await geminiRes.text();
      console.error('Gemini error', geminiRes.status, text);
      const status = geminiRes.status;
      let userError = 'Try-on generation failed. Please try again.';
      if (status === 429) {
        userError = "We've hit today's free quota for AI try-ons. Please try again later.";
      } else if (status === 400) {
        userError = "The garment or customer photo couldn't be processed. Try a clearer photo.";
      }
      return res.status(status === 429 ? 429 : 502).json({ error: userError });
    }

    const data = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData || p.inline_data);

    if (!imagePart) {
      const safety = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
      console.error('No image in Gemini response', JSON.stringify(data).slice(0, 1000));
      return res.status(502).json({
        error:
          safety === 'SAFETY' || safety === 'BLOCKED_SAFETY'
            ? 'The photos were blocked by the AI safety filter. Try different photos.'
            : 'The AI did not return an image. Please try again.',
      });
    }

    const inline = imagePart.inlineData || imagePart.inline_data;
    return res.status(200).json({
      mimeType: inline.mimeType || inline.mime_type || 'image/png',
      data: inline.data,
    });
  } catch (err) {
    console.error('Try-on handler error', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
