/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/catalog.html', './public/catalog.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Arial', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'Arial', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49'
        },
        whatsapp: {
          light: '#25D366',
          DEFAULT: '#25D366',
          dark: '#128C7E',
          darker: '#075E54'
        },
        surface: {
          card: '#ffffff',
          muted: '#eaf7ff',
          border: '#cfe8f7',
          darkBg: '#060b18',
          darkCard: '#0c1527',
          darkMuted: '#111d35',
          darkBorder: 'rgba(56, 189, 248, 0.15)',
          darkGlass: 'rgba(12, 21, 39, 0.75)'
        }
      },
      boxShadow: {
        glow: '0 12px 28px -12px rgba(8, 120, 209, 0.34)',
        glowGreen: '0 12px 28px -12px rgba(37, 211, 102, 0.38)',
        glowCyan: '0 0 25px -5px rgba(56, 189, 248, 0.25)',
        cardHover: '0 18px 36px -18px rgba(4, 90, 158, 0.38)',
        darkHover: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px -5px rgba(56, 189, 248, 0.2)'
      }
    }
  },
  plugins: []
};
