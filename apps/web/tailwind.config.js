/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm orange primary based on brand color #ef6b00
        primary: {
          50: '#fff8f1',
          100: '#feecdc',
          200: '#fcd9bd',
          300: '#fac08a',
          400: '#f79c55',
          500: '#f47b2a',
          600: '#ef6b00', // Brand orange
          700: '#c45a00',
          800: '#9c4a00',
          900: '#7d3d00',
        },
        // Muted success (warm green-gray)
        success: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c8d1c8',
          300: '#a3b2a3',
          400: '#7a8f7a',
          500: '#5a7a5a',
          600: '#486248',
          700: '#3d503d',
          800: '#344234',
          900: '#2d382d',
        },
        // Muted error (warm red-gray)
        error: {
          50: '#fdf6f5',
          100: '#fae8e6',
          200: '#f5d0cc',
          300: '#edada6',
          400: '#e08075',
          500: '#cf5c4d',
          600: '#b84a3b',
          700: '#993d31',
          800: '#7f352b',
          900: '#6a2f27',
        },
        // Muted warning
        warning: {
          50: '#fdfaf5',
          100: '#faf2e4',
          200: '#f4e2c4',
          300: '#ebcc99',
          400: '#dfaf66',
          500: '#d49642',
          600: '#c07c30',
          700: '#9f6229',
          800: '#804f26',
          900: '#694222',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
