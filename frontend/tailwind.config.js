/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 1s ease-in-out',
        'bounce-subtle': 'bounceSlight 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0.3' },
          '100%': { opacity: '1' },
        },
        bounceSlight: {
          '0%, 100%': { 
            transform: 'translateY(0)' 
          },
          '50%': { 
            transform: 'translateY(-5px)' 
          },
        },
      },
    },
  },
  plugins: [],
} 