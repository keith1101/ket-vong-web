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
          bg: 'var(--kv-paper)',
          paper: 'var(--kv-paper)',
          paperDeep: 'var(--kv-paper-deep)',
          card: 'var(--kv-white)',
          ink: 'var(--kv-ink)',
          inkDeep: 'var(--kv-ink-deep)',
          text: 'var(--kv-text)',
          textMuted: 'var(--kv-text-soft)',
          border: 'var(--color-border)',
          borderStrong: 'var(--color-border-strong)',
          accent: 'var(--kv-blue-bg)',
          pink: 'var(--kv-pink)',
          pinkHover: 'var(--kv-pink-hover)',
          pinkBright: 'var(--kv-pink-bright)',
          orange: 'var(--kv-orange)',
          orangeText: 'var(--kv-orange-text)',
          yellow: 'var(--kv-yellow)',
          green: 'var(--kv-green)',
          purple: 'var(--kv-purple)',
          sky: 'var(--kv-sky)',
          mint: 'var(--kv-mint)',
          blue: 'var(--kv-ink)',
          blueHover: 'var(--kv-ink-deep)',
          success: 'var(--kv-green)',
          danger: 'var(--kv-red)',
          warning: 'var(--kv-yellow)',
        },
        kv: {
          paper: 'var(--kv-paper)',
          paperDeep: 'var(--kv-paper-deep)',
          ink: 'var(--kv-ink)',
          inkDeep: 'var(--kv-ink-deep)',
          text: 'var(--kv-text)',
          textSoft: 'var(--kv-text-soft)',
          pink: 'var(--kv-pink)',
          pinkHover: 'var(--kv-pink-hover)',
          pinkBright: 'var(--kv-pink-bright)',
          orange: 'var(--kv-orange)',
          orangeText: 'var(--kv-orange-text)',
          yellow: 'var(--kv-yellow)',
          green: 'var(--kv-green)',
          purple: 'var(--kv-purple)',
          red: 'var(--kv-red)',
          sky: 'var(--kv-sky)',
          mint: 'var(--kv-mint)',
          blueBg: 'var(--kv-blue-bg)',
          blueFg: 'var(--kv-blue-fg)',
          greenBg: 'var(--kv-green-bg)',
          greenFg: 'var(--kv-green-fg)',
          pinkBg: 'var(--kv-pink-bg)',
          pinkFg: 'var(--kv-pink-fg)',
          purpleBg: 'var(--kv-purple-bg)',
          purpleFg: 'var(--kv-purple-fg)',
          yellowBg: 'var(--kv-yellow-bg)',
          yellowFg: 'var(--kv-yellow-fg)',
          orangeBg: 'var(--kv-orange-bg)',
          orangeFg: 'var(--kv-orange-fg)',
          mintBg: 'var(--kv-mint-bg)',
          mintFg: 'var(--kv-mint-fg)',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'cursive', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        hand: ['var(--font-hand)', 'cursive'],
      },
      borderRadius: {
        crayon: 'var(--radius-crayon)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sticker: 'var(--shadow-sticker)',
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
