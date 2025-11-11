// tailwind.config.js (at root)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], // Scans all source files for Tailwind classes
  theme: {
    extend: {
      // Extend for custom themes, e.g., your serene greens/blues
      colors: {
        'green-800': '#1B5E20', // Example for rural serenity
        'blue-100': '#E3F2FD',
      },
    },
  },
  plugins: [],
};