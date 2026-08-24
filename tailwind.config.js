/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1a365d',
          light: '#2c5282',
          50: '#e6ebf1',
        },
        // Paleta corporativa FMV, misma que en FMV Producción
        fmv: {
          50: '#F5F8FC',
          100: '#EBF2FA',
          200: '#D6E4F0',
          500: '#3182CE',
          600: '#2B6CB0',
          700: '#2c5282',
          800: '#1a365d',
          900: '#0F1D2F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
