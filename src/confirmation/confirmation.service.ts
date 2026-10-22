import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

type ConfirmationInput = {
  clientName: string;
  title: string;
  when: string;
  durationMinutes: number;
};

function givenName(clientName: string): string {
  return clientName.trim().split(/\s+/)[0] || clientName;
}

function cleanMessage(value: string): string {
  return value
    .replace(/```/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .slice(0, 500);
}

@Injectable()
export class ConfirmationService {
  fallback(clientName: string, when: string, title: string): string {
    return `You're booked, ${givenName(clientName)}. See you ${when} for ${title}.`;
  }

  async generate(input: ConfirmationInput): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const trainerName = process.env.TRAINER_NAME || 'your trainer';
    const prompt = [
      'Write exactly two plain sentences confirming a gym session booking.',
      `Client first name: ${givenName(input.clientName)}`,
      `Session: ${input.title}`,
      `When: ${input.when}`,
      `Duration: ${input.durationMinutes} minutes`,
      `Trainer: ${trainerName}`,
      'Tone: warm and direct, like a coach. No medical advice, no hashtags, no markdown.',
    ].join('\n');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await Promise.race([
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { thinkingConfig: { thinkingBudget: 0 } },
        }),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 8000);
        }),
      ]);
      if (!result?.text) {
        return null;
      }
      const text = cleanMessage(result.text);
      return text || null;
    } catch {
      return null;
    }
  }
}
