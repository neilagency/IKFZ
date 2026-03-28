import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eafff5',
          100: '#c5ffe3',
          200: '#8effc9',
          300: '#4dffab',
          400: '#16e88a',
          500: '#00c96e',
          600: '#00a85a',
          700: '#008549',
          800: '#006b3c',
          900: '#005831',
          DEFAULT: '#00a85a',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          DEFAULT: '#22c55e',
        },
        dark: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#adb5bd',
          500: '#868e96',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#16191d',
          950: '#0d0f12',
          DEFAULT: '#0d0f12',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.03em' }],
        'hero-mobile': ['2.5rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }],
        'section': ['2.75rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'section-mobile': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
        'subsection': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-gentle': 'bounceGentle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(4px) rotate(-1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 168, 90, 0.15)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 168, 90, 0.3)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1)',
        'card-lg': '0 8px 30px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.06)',
        'button': '0 4px 14px rgba(0, 168, 90, 0.35), 0 2px 6px rgba(0,168,90,0.2)',
        'button-hover': '0 8px 24px rgba(0, 168, 90, 0.4), 0 4px 12px rgba(0,168,90,0.25)',
        'glass': '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.1)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.1)',
        'elevated': '0 20px 60px rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
