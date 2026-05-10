import OpenAI from 'openai';
import { config } from './config.js';

const client = config.openaiKey ? new OpenAI({ apiKey: config.openaiKey }) : null;

export async function extractRunDataFromImage(buffer) {
  if (!client) return null;
  const b64 = buffer.toString('base64');
  const response = await client.chat.completions.create({
    model: config.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Extract running activity data from screenshots. Return strict JSON only. Unknown values are null. Keys: date, distanceKm, durationMin, pace, avgHr, elevationM, cadence, notes.' },
      { role: 'user', content: [
        { type: 'text', text: 'Read this running activity screenshot. Use kilometers, minutes, seconds-per-km pace where visible.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
      ]}
    ],
    temperature: 0.1
  });
  const text = response.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}
