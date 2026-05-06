/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#800020',
          50: '#fbe9ed',
          100: '#f3c2cb',
          600: '#9b1b34',
          700: '#800020',
          800: '#5e0017',
        },
        gold: {
          DEFAULT: '#D4A843',
          light: '#E8C772',
          dark: '#A8842A',
        },
        cream: '#FFF8F0',
        ink: '#1A1A1A',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(128, 0, 32, 0.08)',
        lift: '0 10px 30px rgba(128, 0, 32, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in-right': 'slideInRight 280ms ease-out',
        'slide-in-left': 'slideInLeft 280ms ease-out',
        'pulse-soft': 'pulseSoft 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
