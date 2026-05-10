/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: { glow: "0 0 60px rgba(34, 211, 238, 0.18)" },
      animation: { float: "float 8s ease-in-out infinite" },
      keyframes: { float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-14px)" } } }
    },
  },
  plugins: [],
}
