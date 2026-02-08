/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        geo: {
          deep: '#0B0A10',
          main: '#0F0E17',
          card: '#161526',
          'card-hover': '#1C1B30',
          sidebar: '#0D0C14',
          border: '#2A2840',
          'border-hover': '#3D3A5C',
        },
        status: {
          green: '#4ADE80',
          'green-dim': 'rgba(74, 222, 128, 0.15)',
          red: '#F87171',
          'red-dim': 'rgba(248, 113, 113, 0.15)',
          yellow: '#FBBF24',
          'yellow-dim': 'rgba(251, 191, 36, 0.15)',
          blue: '#60A5FA',
          'blue-dim': 'rgba(96, 165, 250, 0.15)',
          purple: '#A78BFA',
          'purple-dim': 'rgba(167, 139, 250, 0.15)',
        },
        txt: {
          primary: '#F0EFF4',
          secondary: '#B8B6CC',
          muted: '#A09EB4',
          bright: '#E0DEE8',
          faint: '#7B798E',
        },
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74, 222, 128, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(74, 222, 128, 0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
