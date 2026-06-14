import type { RiskLevel } from '../lib/risk-map';

interface RiskBadgeProps {
  level: RiskLevel;
  count?: number;
  compact?: boolean;
}

const STYLES: Record<RiskLevel, { bg: string; text: string; icon: string; label: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴', label: 'High risk' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡', label: 'Medium risk' },
  low: { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢', label: 'Low risk' },
};

export default function RiskBadge({ level, count, compact = false }: RiskBadgeProps) {
  const style = STYLES[level];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
        {style.icon} {count ?? ''}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.icon} {style.label} {count !== undefined && `(${count})`}
    </span>
  );
}
