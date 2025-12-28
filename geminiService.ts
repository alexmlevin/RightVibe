
import { GoogleGenAI, Type } from "@google/genai";
import { AHAPFile } from "./types";

const AHAP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    Version: { type: Type.NUMBER, description: "Should be 1.0" },
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
                description: "HapticTransient or HapticContinuous" 
              },
              Time: { type: Type.NUMBER, description: "Start time in seconds" },
              EventDuration: { type: Type.NUMBER, description: "Duration in seconds (for continuous only)" },
              EventParameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ParameterID: { type: Type.STRING, description: "HapticIntensity or HapticSharpness" },
                    ParameterValue: { type: Type.NUMBER, description: "Value between 0.0 and 1.0" }
                  },
                  required: ["ParameterID", "ParameterValue"]
                }
              }
            },
            required: ["EventType", "Time", "EventParameters"]
          }
        },
        required: ["Event"]
      }
    }
  },
  required: ["Version", "Pattern"]
};

export const generateHapticsFromVideo = async (
  frames: { base64: string; timestamp: number }[],
  videoDescription: string
): Promise<AHAPFile> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { text: `You are a world-class haptic designer for Apple iOS. 
            Analyze these video frames and the user's description. 
            Create a precise Apple Haptic and Audio Pattern (AHAP) that synchronizes with the action.
            - Identify impacts (Transient haptics).
            - Identify continuous motion, vibrations, or textures (Continuous haptics).
            - Use appropriate Intensity (strength) and Sharpness (crisp vs dull).
            - Ensure timing is accurate relative to the video.
            
            Description: ${videoDescription}
            
            Output ONLY valid AHAP JSON.` },
          ...frames.map(f => ({
            inlineData: {
              mimeType: 'image/jpeg',
              data: f.base64
            }
          }))
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: AHAP_SCHEMA
    }
  });

  const jsonStr = response.text || "";
  try {
    return JSON.parse(jsonStr) as AHAPFile;
  } catch (e) {
    console.error("Failed to parse AHAP JSON", jsonStr);
    throw new Error("Invalid AI output format.");
  }
};
