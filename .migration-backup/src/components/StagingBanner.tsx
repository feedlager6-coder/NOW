'use client';

import React from 'react';

export function StagingBanner() {
  const isStaging = process.env.NEXT_PUBLIC_STAGING_MODE === 'true';

  if (!isStaging) return null;

  return (
    <aside
      role="note"
      aria-label="Staging Disclaimer"
      className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 text-center text-[11px] text-amber-300 font-medium tracking-wide z-50 sticky top-0 backdrop-blur-md"
    >
      <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 leading-tight flex-wrap">
        <span className="font-bold text-amber-400">🛠️ STAGING MODE:</span>
        <span>Закрытое тестирование. Не используйте для реальных встреч. Не указывайте реальные адреса, телефоны, документы и другую чувствительную информацию.</span>
      </div>
    </aside>
  );
}
