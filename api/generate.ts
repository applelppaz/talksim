import { GoogleGenAI } from '@google/genai';

type Req = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: () => void;
};

interface Body {
  prompt?: string;
  model?: string;
  responseMimeType?: string;
  responseModalities?: string[];
  temperature?: number;
}

function parseBody(raw: unknown): Body {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Body;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Body;
  return {};
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured. Set it in your Vercel project environment variables.',
    });
    return;
  }
  const body = parseBody(req.body);
  if (!body.prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: body.model ?? 'gemini-2.5-flash',
      contents: body.prompt,
      config: {
        ...(body.responseMimeType ? { responseMimeType: body.responseMimeType } : {}),
        ...(body.responseModalities ? { responseModalities: body.responseModalities } : {}),
        ...(typeof body.temperature === 'number' ? { temperature: body.temperature } : {}),
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    res.status(200).json({
      text: response.text ?? '',
      inlineData: part?.inlineData ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
