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
          bg: '#101318',
          surface: '#171B22',
          surface2: '#1D232D',
          border: '#303744',
          primary: '#7C9CFF',
          secondary: '#66D9C1',
          text: '#F1F4F9',
          muted: '#9AA5B5',
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
