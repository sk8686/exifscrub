import type { Translations } from '../i18n/translations';

export type PrivacyGrade = 'A' | 'B' | 'C';

export function computePrivacyGrade(highCount: number, mediumCount: number): PrivacyGrade {
  if (highCount > 0) return 'C';
  if (mediumCount > 0) return 'B';
  return 'A';
}

const GRADE_STYLES: Record<PrivacyGrade, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-300' },
  B: { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-300' },
  C: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
};

interface PrivacyScoreProps {
  grade: PrivacyGrade;
  t: Translations;
  compact?: boolean;
}

export default function PrivacyScore({ grade, t, compact = false }: PrivacyScoreProps) {
  const style = GRADE_STYLES[grade];
  const label = grade === 'A' ? t.tool.scoreA : grade === 'B' ? t.tool.scoreB : t.tool.scoreC;
  const desc = grade === 'A' ? t.tool.scoreADesc : grade === 'B' ? t.tool.scoreBDesc : t.tool.scoreCDesc;

  if (compact) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${style.bg} ${style.text} ring-1 ${style.ring}`}>
        {grade}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ${style.bg} ring-1 ${style.ring}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-full text-xl font-black ${style.text} bg-white/60`}>
        {grade}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${style.text}`}>{t.tool.privacyScore}</span>
          <span className={`text-sm font-bold ${style.text}`}>{label}</span>
        </div>
        <p className={`text-xs ${style.text} opacity-80`}>{desc}</p>
      </div>
    </div>
  );
}
