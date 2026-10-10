import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.resolve(__dirname, 'index.html'),
    path.resolve(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#fffdf9',
          orange: '#ed7838',
          orangeHover: '#d86526',
          text: '#483426',
          textMuted: '#796050',
          card: '#ffffff',
          border: '#f2e8dc',
          accent: '#fdf3eb',
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        display: ['"Baloo 2"', 'cursive', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      }
    },
  },
  plugins: [],
}

