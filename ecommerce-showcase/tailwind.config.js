/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f7f5', // The light cream from image_54efbc.jpg
        primary: '#2d2d2d', // Soft black for text to avoid harsh contrast
        accent: '#e5e0d8', // Slightly darker beige for borders/hover states
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Clean body font
        serif: ['Playfair Display', 'serif'], // Premium header font
      }
    },
  },
  plugins: [],
}