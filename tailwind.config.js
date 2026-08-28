/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        army: {
          50: '#f4f6f0',
          100: '#e6ebd8',
          200: '#cfdbb5',
          300: '#b1c48a',
          400: '#94ac63',
          500: '#779344',
          600: '#5c7534',
          700: '#465a2a',
          800: '#384824',
          900: '#1b2610',
          950: '#0f1708',
        },
        tactical: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'tactical': '0 4px 20px -2px rgba(15, 23, 42, 0.4), 0 2px 6px -1px rgba(15, 23, 42, 0.2)',
      }
    },
  },
  plugins: [],
}
