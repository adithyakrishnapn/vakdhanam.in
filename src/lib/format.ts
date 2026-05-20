import { formatDistanceToNowStrict } from 'date-fns';

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRelativeTime(value: string) {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    roundingMethod: 'floor',
  });
}
