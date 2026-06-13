type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
};

export default function handler(_req: unknown, res: Res): void {
  res.status(200).json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}
