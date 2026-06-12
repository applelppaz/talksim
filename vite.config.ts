import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite` alone won't run the /api Vercel Functions. For local dev use
// `vercel dev` (it spins up Vite + Functions together with .env.local).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
