import { upload } from '@vercel/blob/client';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm'];

export async function uploadScreenshot(file: File, projectId: string): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please upload a PNG, JPG, WEBP or GIF screenshot.');
  }
  const blob = await upload(`screens/${projectId}/${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
  });
  return blob.url;
}

export async function uploadSfx(file: File, projectId: string, hotspotId: string): Promise<string> {
  if (!AUDIO_TYPES.includes(file.type)) {
    throw new Error('Please upload an MP3, WAV, M4A, AAC or OGG audio file.');
  }
  const blob = await upload(`sfx/${projectId}/${hotspotId}-${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
  });
  return blob.url;
}

export function getAudioDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}
