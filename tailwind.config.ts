import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#e4e2dd',
          surface: '#ffffff',
          'surface-2': '#f5f4f1',
          border: '#d0cdc7',
          maroon: '#4f1c1e',
          accent: '#efff72',
          'accent-hover': '#d9f050',
          taupe: '#a2a092',
          muted: '#7a7870',
          text: '#2e2e2e',
          'text-dim': '#6b6860',
          offwhite: '#e4e2dd',
          dark: '#2e2e2e',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
