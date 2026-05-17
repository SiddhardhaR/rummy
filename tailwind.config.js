/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        felt: "#14533d",
        ink: "#18211f",
        clay: "#b85c38",
        gold: "#d6a84f"
      }
    }
  },
  plugins: []
};
