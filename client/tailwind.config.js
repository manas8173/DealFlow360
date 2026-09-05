/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        // Podscan.fm design system
        signal: '#059669',   // emerald signal — primary action verb color
        mint: '#10b981',     // secondary green for icons & emphasis
        onyx: '#18181b',     // near-black primary text + dark CTA
        canvas: '#ffffff',   // page background
        fog: '#f4f4f5',      // subtle surface lift
        whisper: '#71717a',  // muted helper text
        graphite: '#52525b', // secondary body text
        veil: '#a1a1aa',     // tertiary text / disabled / low-contrast strokes
        charcoal: '#3f3f46', // strong secondary text
        ash: '#e5e7eb',      // universal hairline border
        silver: '#d4d4d8',   // secondary border / lighter dividers
        // Brand (mapped to emerald family) — keeps semantic naming intact
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#10b981',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
          950: '#022c22',
        },
        // Categorical accents
        violettier: '#9333ea',
        indigo: { spark: '#4f46e5' },
        pinkpulse: '#ec4899',
        cobalt: '#2563eb',
        skyveil: '#60a5fa',
        tealtrace: '#14b8a6',
        sprout: '#d1fae5',
        crimson: '#b91c1c',
        roseblush: '#db2777',
        forest: '#16a34a',
        marigold: '#eab308',
        mintmist: '#ecfdf5',
        skymist: '#eff6ff',
        lilacmist: '#f3e8ff',
      },
      borderRadius: {
        cards: '12px',
        inputs: '12px',
        buttons: '8px',
        largecards: '16px',
        pills: '9999px',
        badges: '9999px',
      },
      boxShadow: {
        'signal-lg': '0px 10px 15px -3px rgba(5, 150, 105, 0.2), 0px 4px 6px -4px rgba(5, 150, 105, 0.2)',
        'floating': '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
}