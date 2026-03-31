/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#042b1f',
          DEFAULT: '#063b2a',
          light: '#0a5c42',
        },
        sidebar: {
          bg: '#042b1f',
          text: '#a1b3ae',
          active: '#ffffff',
          hover: '#063b2a',
        },
        card: {
          bg: '#ffffff',
          border: '#f1f3f2',
        },
        status: {
          ok: '#10b981',
          low: '#f59e0b',
          out: '#ef4444',
          over: '#3b82f6',
        }
      },
      backgroundColor: {
        app: '#f8faf9',
      }
    },
  },
  plugins: [],
}
