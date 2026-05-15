/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indiamart: {
          blue: '#0066CC',
          orange: '#FF6600',
          green: '#00A651',
        },
      },
    },
  },
  plugins: [],
}
