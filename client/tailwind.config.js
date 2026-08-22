/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          dark: '#0B1220',
          card: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.09)',
        },
        text: {
          primary: '#F3F5F4',
          secondary: '#94A3A0',
          muted: '#637370',
        },
        teal: {
          400: '#2DD4A8',
          500: '#20B991',
          600: '#149574',
          900: '#0F5C4C',
          950: '#073027',
        },
        amber: {
          400: '#F2BD69',
          500: '#E8A94A',
          600: '#C9892E',
          900: '#8A5A1F',
          950: '#3D2409',
        },
        coral: {
          400: '#F08B82',
          500: '#E8746A',
          600: '#C7574D',
          900: '#6E2520',
          950: '#3D120F',
        },
        navy: {
          800: '#1E293B',
          850: '#151F33',
          900: '#0F172A',
          950: '#0B1220',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'panel': '18px',
        'element': '8px',
      },
      boxShadow: {
        'glass': 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        'glass-sm': 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 16px -4px rgba(0, 0, 0, 0.35)',
        'glow-teal': '0 0 24px -4px rgba(45, 212, 168, 0.25)',
        'glow-amber': '0 0 24px -4px rgba(232, 169, 74, 0.25)',
      }
    },
  },
  plugins: [],
}
