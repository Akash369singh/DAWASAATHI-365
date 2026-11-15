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
        navy: {
          50: '#F0F4F9',
          100: '#DDE6F1',
          800: '#132A4D',
          900: '#0B1F3A',
          950: '#061324',
        },
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        app: {
          bg: '#F7F9FB',
          surface: '#FFFFFF',
          border: '#E6EBF1',
          'dark-bg': '#0A1424',
          'dark-surface': '#101C30',
          'dark-border': '#1E2F4D',
          'dark-text': '#E8EEF6',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(11, 31, 58, 0.04)',
        'soft-md': '0 6px 18px rgba(11, 31, 58, 0.06)',
        'soft-lg': '0 12px 30px rgba(11, 31, 58, 0.08)',
        'glow-teal': '0 0 25px rgba(20, 184, 166, 0.25)',
      },
    },
  },
  plugins: [],
}
