import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#7c3aed',
          foreground: '#ffffff',
        },
        safety: {
          alert: '#ef4444',
          warning: '#f59e0b',
          safe: '#10b981',
        },
      },
    },
  },
  plugins: [],
};

export default config;
