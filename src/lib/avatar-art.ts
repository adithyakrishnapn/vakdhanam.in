import type { AvatarName } from '@/types';

const palette: Record<AvatarName, { base: string; accent: string; symbol: string }> = {
  sage: { base: '#0f172a', accent: '#4ade80', symbol: '✦' },
  mango: { base: '#1f1300', accent: '#ffd600', symbol: '☀' },
  rocket: { base: '#2a0000', accent: '#ef4444', symbol: '▲' },
  wave: { base: '#00161f', accent: '#38bdf8', symbol: '≈' },
  radio: { base: '#1b1024', accent: '#c084fc', symbol: '◉' },
  lotus: { base: '#0b1b12', accent: '#22c55e', symbol: '❋' },
};

export function getAvatarImage(avatar: AvatarName, label: string) {
  const theme = palette[avatar];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
      <rect width="128" height="128" rx="32" fill="${theme.base}"/>
      <circle cx="40" cy="42" r="26" fill="${theme.accent}" fill-opacity="0.18"/>
      <circle cx="92" cy="86" r="30" fill="${theme.accent}" fill-opacity="0.12"/>
      <path d="M20 92C32 78 48 72 64 72C80 72 96 78 108 92" stroke="${theme.accent}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <text x="64" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${theme.accent}">${theme.symbol}</text>
      <text x="64" y="111" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" letter-spacing="2" fill="rgba(255,255,255,0.7)">${label.slice(0, 8).toUpperCase()}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
