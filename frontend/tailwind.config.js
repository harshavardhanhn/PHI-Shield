/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ember: "#b12f25",
        tealdeep: "#0e5b64",
        slateink: "#0f172a",
        cream: "#fcf9f3",
      },
      boxShadow: {
        glow: "0 20px 45px -20px rgba(13, 148, 136, 0.45)",
      },
    },
  },
  plugins: [],
};
