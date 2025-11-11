// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  // 1. Enable dark mode using the 'class' strategy
  darkMode: 'class',

  // 2. Update content paths (should be correct from last step)
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // 3. Map Tailwind's color names to your new CSS variables
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--muted))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: { // <-- New color for "Delivered", "Saved"
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`, // 6px
        sm: `calc(var(--radius) - 4px)`, // 4px
      },
    },
  },

  // 4. Add the 'tailwindcss-animate' plugin.
  //    (You should have already installed this)
  plugins: [
    require('tailwindcss-animate')
  ],
};