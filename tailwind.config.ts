import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#2F7C57',
        'brand-light': '#E6F4EA',
        'brand-dark': '#1E523A',
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
} satisfies Config;
