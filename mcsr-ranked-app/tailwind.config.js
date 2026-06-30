/** @type {import('tailwindcss').Config} */
// The real MCSR site is a plain Tailwind *zinc* dashboard (bg #18181b) with
// green-500 as the only saturated accent and the pixel "Minecraft" font on all
// chrome. We mirror that: keep Tailwind's default zinc/green/red/orange ramps,
// add only semantic aliases + the bundled Monocraft pixel font. No custom
// green-tint, no glow shadows, no glassmorphism — those were the AI tells.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // semantic aliases over Tailwind zinc, for readable class names
        ink: '#18181b', // zinc-900  — app background
        abyss: '#09090b', // zinc-950 — deepest panels / table viewport
        panel: '#161618', // off-black — header / nav bars
        raised: '#27272a', // zinc-800 — cards, rows hover
        brand: {
          DEFAULT: '#22c55e', // green-500 — THE accent
          text: '#4ade80', // green-400 — accent text on dark
        },
      },
      fontFamily: {
        // pixel Minecraft-style face for chrome, numbers, headings, tier labels
        mc: ['Monocraft', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // readable system grotesk only for longer descriptive copy
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'bar-stripes': { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '24px 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out both',
        'sheet-up': 'sheet-up 0.24s cubic-bezier(0.2,0.9,0.3,1) both',
        'bar-stripes': 'bar-stripes 0.6s linear infinite',
      },
    },
  },
  plugins: [],
}
