/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MCSR-inspired dark, green-tinted palette
        ink: {
          DEFAULT: '#0b0f0d', // app background (near-black, green tint)
          900: '#0b0f0d',
          800: '#10160f',
        },
        surface: {
          DEFAULT: '#141b16',
          raised: '#1a2419',
          high: '#212d20',
        },
        line: {
          DEFAULT: '#283a2a',
          soft: '#1e2a20',
        },
        grass: {
          // primary brand accent (Minecraft grass / emerald)
          DEFAULT: '#4cc15a',
          50: '#eafaec',
          100: '#c8f0cd',
          200: '#9be3a4',
          300: '#6fd57c',
          400: '#4cc15a',
          500: '#36a945',
          600: '#288537',
          700: '#1f6a2c',
          800: '#184f22',
        },
        // tier accents (also defined in lib/ranks.ts for data use)
        coal: '#8b95a1',
        iron: '#d9dde2',
        gold: '#f5c542',
        emerald: '#2ee06b',
        diamond: '#54d8e6',
        netherite: '#b58bd6',
        muted: '#7e8c80',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(76,193,90,0.35), 0 8px 30px -8px rgba(76,193,90,0.25)',
        card: '0 10px 30px -12px rgba(0,0,0,0.6)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'grass-fade': 'linear-gradient(135deg, rgba(76,193,90,0.18), rgba(76,193,90,0) 60%)',
        'top-glow': 'radial-gradient(60% 40% at 50% -10%, rgba(76,193,90,0.14), transparent 70%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
}
