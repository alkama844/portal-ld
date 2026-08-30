import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#070707',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.06)',
          active: 'rgba(255, 255, 255, 0.08)',
        },
        border: 'rgba(255, 255, 255, 0.08)',
        brand: {
          50: '#fef2f2',
          100: '#ffe1e1',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          dark: '#450a0a'
        }
      },
      boxShadow: {
        'glow-red': '0 0 25px -5px rgba(220, 38, 38, 0.25)',
        'glow-red-sm': '0 0 15px -3px rgba(220, 38, 38, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
      },
      backgroundImage: {
        'radial-gradient-red': 'radial-gradient(circle at 50% 0%, rgba(153, 27, 27, 0.25) 0%, rgba(7, 7, 7, 0) 70%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'crimson-gradient': 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
      }
    },
  },
  plugins: [],
};

export default config;
