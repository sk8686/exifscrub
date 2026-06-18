import { useState } from 'react';
import type { Translations } from '../i18n/translations';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQProps {
  items?: FAQItem[];
  t: Translations;
}

function getDefaultFAQs(t: Translations): FAQItem[] {
  return [
    { q: t.faq.q1, a: t.faq.a1 },
    { q: t.faq.q2, a: t.faq.a2 },
    { q: t.faq.q3, a: t.faq.a3 },
    { q: t.faq.q4, a: t.faq.a4 },
    { q: t.faq.q5, a: t.faq.a5 },
  ];
}

export default function FAQ({ items, t }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = items ?? getDefaultFAQs(t);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white hover:border-blue-200 transition-colors overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full text-left min-h-[44px]"
            aria-expanded={openIndex === i}
            aria-controls={`faq-answer-${i}`}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 gap-4">
              <span className="text-sm sm:text-base font-medium text-[var(--color-text)]">{faq.q}</span>
              <svg
                className={`w-5 h-5 text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>
          {openIndex === i && (
            <div id={`faq-answer-${i}`} role="region" className="px-4 sm:px-5 pb-4">
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
