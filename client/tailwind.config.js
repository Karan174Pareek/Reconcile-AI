/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#0B72E7', // Razorpay Signature Electric Blue
          600: '#0858B4',
          700: '#074895',
          800: '#053774',
          900: '#02042B', // Razorpay Signature Dark Navy
        },
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          800: '#091133',
          900: '#02042B', // Razorpay Dark Navy Block
          950: '#010217',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          subtle: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(2, 4, 43, 0.04), 0 2px 6px -1px rgba(2, 4, 43, 0.02)',
        'card-hover': '0 10px 25px -5px rgba(2, 4, 43, 0.08), 0 8px 10px -6px rgba(2, 4, 43, 0.04)',
        'dropdown': '0 10px 25px -5px rgba(2, 4, 43, 0.1), 0 4px 6px -4px rgba(2, 4, 43, 0.05)',
        'modal': '0 25px 50px -12px rgba(2, 4, 43, 0.25)',
      },
      borderRadius: {
        'card': '12px',
        'pill': '9999px',
      }
    },
  },
  plugins: [],
}
