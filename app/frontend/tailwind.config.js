/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        coffee: {
          50: '#FAF6F0',
          100: '#F5EBE1',
          200: '#E6D2BF',
          300: '#D4B598',
          400: '#B88E68',
          500: '#9C6E44',
          600: '#7E532D',
          700: '#5F3B1A',
          800: '#43260F',
          900: '#2A1708',
          950: '#180B03',
        },
        primary: {
          50: '#FAF6F0',
          100: '#F5EBE1',
          200: '#E6D2BF',
          300: '#D4B598',
          400: '#B88E68',
          500: '#9C6E44',
          600: '#7E532D',
          700: '#5F3B1A',
          800: '#43260F',
          900: '#2A1708',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#0B0F19',
        },
      },
    },
  },
  plugins: [],
};
