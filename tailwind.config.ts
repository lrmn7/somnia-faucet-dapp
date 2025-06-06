import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-orange': '#f97316',
        'brand-gray': '#a1a1aa',
        'brand-dark': '#1c1917',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
      },
      boxShadow: {
        'pixel': '4px 4px 0px #000',
        'pixel-hover': '6px 6px 0px #000',
      }
    },
  },
  plugins: [],
};
export default config;