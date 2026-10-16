/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#0A0D14',
          surface: '#101522',
          surface2: '#161C2C',
          card: '#121724',
          cardHover: '#182032',
          border: '#1E2638',
          borderLight: '#2A364E',
          cyan: '#38BDF8',
          cyanGlow: '#00F2FE',
          emerald: '#10B981',
          emeraldGlow: '#059669',
          amber: '#F59E0B',
          purple: '#8B5CF6',
          rose: '#F43F5E',
          muted: '#818DA4',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
