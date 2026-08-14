import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import type { AHAPFile } from '../types';

const AHAP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    Version: { type: Type.NUMBER, description: 'Should be 1.0' },
    Pattern: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          Event: {
            type: Type.OBJECT,
            properties: {
              EventType: {
                type: Type.STRING,
                description: 'HapticTransient or HapticContinuous',
              },
              Time: { type: Type.NUMBER, description: 'Start time in seconds' },
              EventDuration: { type: Type.NUMBER, description: 'Duration in seconds (for continuous only)' },
              EventParameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ParameterID: { type: Type.STRING, description: 'HapticIntensity or HapticSharpness' },
                    ParameterValue: { type: Type.NUMBER, description: 'Value between 0.0 and 1.0' },
                  },
                  required: ['ParameterID', 'ParameterValue'],
                },
              },
            },
            required: ['EventType', 'Time', 'EventParameters'],
          },
        },
        required: ['Event'],
      },
    },
  },
  required: ['Version', 'Pattern'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  const { audioBase64, mimeType, hotspotType, label } = (req.body ?? {}) as {
    audioBase64?: string;
    mimeType?: string;
    hotspotType?: string;
    label?: string;
  };

  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: 'audioBase64 and mimeType are required.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              text: `You are a world-class haptic designer for Apple iOS.
Listen to this UI sound effect and design a precise Apple Haptic and Audio Pattern (AHAP) that
would feel synchronized with it when a user interacts with this UI element.

UI element type: ${hotspotType || 'button'}
Element label: ${label || 'unlabeled'}

- Identify sharp impacts/clicks as Transient haptics.
- Identify sustained tones, swells, or textures as Continuous haptics.
- Match Intensity (strength) and Sharpness (crisp vs dull) to the sound's character.
- Keep timing tightly aligned with the audio's transients and envelope.

Output ONLY valid AHAP JSON.`,
            },
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: AHAP_SCHEMA,
      },
    });

    const jsonStr = response.text || '';
    const ahap = JSON.parse(jsonStr) as AHAPFile;
    return res.status(200).json(ahap);
  } catch (error) {
    console.error('Failed to generate haptics from SFX', error);
    return res.status(500).json({ error: 'Failed to generate a haptic pattern from that audio.' });
  }
}
