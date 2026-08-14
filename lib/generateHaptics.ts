import { AHAPFile } from '../types';

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch the uploaded audio file.');
  const blob = await res.blob();
  const mimeType = blob.type || 'audio/mpeg';

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the audio file.'));
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType };
}

/** Sends the already-uploaded SFX audio to /api/generate-haptics, which calls Gemini server-side. */
export async function generateHapticsFromSfxUrl(
  sfxUrl: string,
  hotspotType: string,
  label: string
): Promise<AHAPFile> {
  const { base64, mimeType } = await urlToBase64(sfxUrl);

  const res = await fetch('/api/generate-haptics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64: base64, mimeType, hotspotType, label }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to generate a haptic pattern.');
  }

  return res.json();
}
