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
        }
      }
    },
  },
  plugins: [],
}
