// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        abcrom: ['var(--font-abcrom)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
