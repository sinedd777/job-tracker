/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
  ],
  // Removed dark mode
  // darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
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
        },
        glass: {
          // Enhanced glass morphism color palette
          white: 'rgba(255, 255, 255, 0.05)',
          'white-md': 'rgba(255, 255, 255, 0.1)',
          'white-lg': 'rgba(255, 255, 255, 0.15)',
          'white-xl': 'rgba(255, 255, 255, 0.2)',
          black: 'rgba(0, 0, 0, 0.05)',
          'black-md': 'rgba(0, 0, 0, 0.1)',
          'black-lg': 'rgba(0, 0, 0, 0.15)',
          'black-xl': 'rgba(0, 0, 0, 0.2)',
          'highlight': 'rgba(255, 255, 255, 0.1)',
          'highlight-strong': 'rgba(255, 255, 255, 0.15)',
          'shadow': 'rgba(0, 0, 0, 0.1)',
          'shadow-strong': 'rgba(0, 0, 0, 0.2)',
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
        '5xl': '96px',
      },
      backdropSaturate: {
        25: '.25',
        75: '.75',
        125: '1.25',
        150: '1.5',
        200: '2',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px -4px rgba(31, 38, 135, 0.25), 0 4px 16px -4px rgba(31, 38, 135, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glass-sm': '0 4px 16px -2px rgba(31, 38, 135, 0.15), 0 2px 8px -2px rgba(31, 38, 135, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glass-lg': '0 16px 48px -4px rgba(31, 38, 135, 0.35), 0 8px 24px -6px rgba(31, 38, 135, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glass-xl': '0 24px 64px -4px rgba(31, 38, 135, 0.45), 0 12px 32px -8px rgba(31, 38, 135, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'glass-inset': 'inset 0 2px 4px -1px rgba(255, 255, 255, 0.1), inset 0 1px 2px -1px rgba(255, 255, 255, 0.05)',
        'glass-inset-lg': 'inset 0 4px 8px -2px rgba(255, 255, 255, 0.15), inset 0 2px 4px -2px rgba(255, 255, 255, 0.1)',
        'glass-dark': '0 8px 32px -4px rgba(0, 0, 0, 0.25), 0 4px 16px -4px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'glass-dark-sm': '0 4px 16px -2px rgba(0, 0, 0, 0.15), 0 2px 8px -2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'glass-dark-lg': '0 16px 48px -4px rgba(0, 0, 0, 0.35), 0 8px 24px -6px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glass-dark-xl': '0 24px 64px -4px rgba(0, 0, 0, 0.45), 0 12px 32px -8px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glass-highlight': '0 0 16px -4px rgba(255, 255, 255, 0.1), 0 0 8px -2px rgba(255, 255, 255, 0.05)',
        'glass-highlight-lg': '0 0 32px -8px rgba(255, 255, 255, 0.15), 0 0 16px -4px rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'glass-float': 'glass-float 6s ease-in-out infinite',
        'glass-glow': 'glass-glow 2s ease-in-out infinite alternate',
        'glass-shimmer': 'glass-shimmer 3s ease-in-out infinite',
        'glass-pulse': 'glass-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'glass-float': {
          '0%, 100%': { transform: 'translateY(0px)', boxShadow: '0 8px 32px -4px rgba(31, 38, 135, 0.25)' },
          '50%': { transform: 'translateY(-10px)', boxShadow: '0 12px 48px -4px rgba(31, 38, 135, 0.35)' },
        },
        'glass-glow': {
          '0%': { boxShadow: '0 8px 32px -4px rgba(31, 38, 135, 0.25), 0 0 16px -4px rgba(255, 255, 255, 0.1)' },
          '100%': { boxShadow: '0 12px 48px -4px rgba(31, 38, 135, 0.35), 0 0 32px -8px rgba(255, 255, 255, 0.2)' },
        },
        'glass-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'glass-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.85', transform: 'scale(0.98)' },
        },
      },
    },
  },
  plugins: [],
} 