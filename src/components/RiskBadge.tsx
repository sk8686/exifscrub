import type { RiskLevel } from '../lib/risk-map';
import type { Translations } from '../i18n/translations';

interface RiskBadgeProps {
  level: RiskLevel;
  count?: number;
  compact?: boolean;
  t?: Translations;
}

const STYLES: Record<RiskLevel, { bg: string; text: string; icon: string; fallback: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴', fallback: 'High risk' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡', fallback: 'Medium risk' },
  low: { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢', fallback: 'Low risk' },
};

export default function RiskBadge({ level, count, compact = false, t }: RiskBadgeProps) {
  const style = STYLES[level];
  const label = t ? (t.riskLabels as Record<string, string>)[level] : style.fallback;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${style.bg} ${style.text}`}>
        {style.icon} {count ?? ''}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.icon} {label} {count !== undefined && `(${count})`}
    </span>
  );
}
