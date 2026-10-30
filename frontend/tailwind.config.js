/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flipkart: {
          blue: '#2874f0',
          darkBlue: '#1a5dc8',
          yellow: '#ff9f00',
          green: '#388e3c',
          red: '#ff6161',
          orange: '#fb641b',
          // transparent: page background ab index.css ke ambient glow se aata hai
          bg: 'transparent',
          dark: '#131a2e',
        },
        spatial: {
          ink: '#131a2e',
          mist: '#e8edf9',
          violet: '#7c6cf0',
          mint: '#2dd4aa',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Rounder, softer corners everywhere (rounded-sm / rounded etc. ab bade hain)
      borderRadius: {
        sm: '12px',
        DEFAULT: '14px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '28px',
        '3xl': '36px',
      },
      // Default border colour theme ke saath badalta hai (light/dark)
      borderColor: {
        DEFAULT: 'var(--s-line)',
      },
      // Layered depth shadows (values index.css mein variables ke roop mein hain)
      boxShadow: {
        sm: 'var(--s-sh-1)',
        DEFAULT: 'var(--s-sh-1)',
        md: 'var(--s-sh-2)',
        lg: 'var(--s-sh-2)',
        xl: 'var(--s-sh-3)',
        '2xl': 'var(--s-sh-3)',
        glass: 'var(--s-hl), var(--s-sh-1)',
        lift: 'var(--s-hl), var(--s-sh-3)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};