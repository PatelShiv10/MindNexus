/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'nexus-dark': '#020617', // Slate 950
                'nexus-glass-dark': 'rgba(15, 23, 42, 0.6)',
                'nexus-glass-light': 'rgba(255, 255, 255, 0.7)',
                'neon-blue': '#06b6d4', // Cyan 500
                'neon-purple': '#8b5cf6', // Violet 500
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
