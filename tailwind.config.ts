import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        muted: 'hsl(var(--muted))',
        mutedForeground: 'hsl(var(--muted-foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
        accent: 'hsl(var(--accent))',
        accentForeground: 'hsl(var(--accent-foreground))',
        success: 'hsl(var(--success))',
        danger: 'hsl(var(--danger))',
        warning: 'hsl(var(--warning))',
        brand: {
          yellow: 'hsl(var(--brand-yellow))',
          red: 'hsl(var(--brand-red))',
          green: 'hsl(var(--brand-green))',
          ink: 'hsl(var(--brand-ink))',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
        malayalam: ['"Noto Sans Malayalam"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--border)), 0 30px 60px -30px rgba(255, 214, 0, 0.35)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at top left, rgba(255,214,0,0.18), transparent 30%), radial-gradient(circle at top right, rgba(0,255,128,0.10), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 40%)',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      backgroundSize: {
        'grid-hero': '32px 32px',
      },
    },
  },
  plugins: [],
} satisfies Config;
