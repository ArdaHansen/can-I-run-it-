import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px rgba(56, 189, 248, 0.25)',
        orangeGlow: '0 0 40px rgba(249, 115, 22, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
