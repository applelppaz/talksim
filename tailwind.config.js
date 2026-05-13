/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Hiragino Sans"',
          '"Yu Gothic UI"',
          '"Meiryo"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
