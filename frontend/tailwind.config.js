/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Agent role colors
        role: {
          pm: '#9333ea',        // purple
          frontend: '#3b82f6',  // blue
          backend: '#10b981',   // green
          qa: '#f59e0b',        // yellow
          devops: '#ef4444',    // red
        }
      }
    },
  },
  plugins: [],
}
