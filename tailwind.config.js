/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ASL_ZIYO brand palette — deep emerald + warm gold on near-black.
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        ink: {
          800: '#0f172a',
          900: '#0b1120',
          950: '#060912',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(16, 185, 129, 0.45)',
        card: '0 20px 50px -20px rgba(0, 0, 0, 0.7)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        // GPU-friendly drift for background glow blobs (transform + opacity only,
        // never layout properties — so it can't cause reflow/jank).
        blob: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0.9' },
          '33%': { transform: 'translate3d(5%, -4%, 0) scale(1.08)', opacity: '1' },
          '66%': { transform: 'translate3d(-4%, 5%, 0) scale(0.95)', opacity: '0.85' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        blob: 'blob 20s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
