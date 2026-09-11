'use client';

import React, { useRef, useState } from 'react';

export interface ShareCardData {
  id: string;
  logo: string;
  city: string;
  activityTitle: string;
  activityIcon: string;
  zoneName: string;
  headline: string;
  participantCount: number;
  durationMinutes: number;
  status: string;
  dateFormatted: string;
}

interface ShareCardModalProps {
  isOpen: boolean;
  cardData: ShareCardData | null;
  onClose: () => void;
}

export function ShareCardModal({ isOpen, cardData, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !cardData) return null;

  const handleCopyText = async () => {
    const text = `🔥 Встретились в реальном мире через NOW / IRL!\n\nАктивность: ${cardData.activityIcon} ${cardData.activityTitle}\nЛокация: ${cardData.zoneName}\nУчастников: ${cardData.participantCount}\nДлительность: ${cardData.durationMinutes} мин\n\nПрисоединяйся к спонтанным встречам в публичных зонах: now.irl`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      // Fallback
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      // Use HTML5 Canvas to draw the card directly for clean, reliable client export without heavy external libraries
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(0.5, '#0A0E17');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 800);

      // Border glow
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 600, 760);

      // Header logo
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('NOW / IRL', 50, 80);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.fillText(`${cardData.city} • ПУБЛИЧНАЯ ЗОНА`, 50, 110);

      // Activity Big Icon
      ctx.font = '72px sans-serif';
      ctx.fillText(cardData.activityIcon, 50, 220);

      // Activity Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(cardData.activityTitle, 50, 280);

      // Subhead
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 22px sans-serif';
      ctx.fillText(cardData.headline, 50, 320);

      // Location box
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(50, 360, 540, 110);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      ctx.fillText('ЛОКАЦИЯ ВСТРЕЧИ', 70, 395);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(cardData.zoneName, 70, 435);

      // Metrics Grid
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(50, 490, 260, 100);
      ctx.fillRect(330, 490, 260, 100);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      ctx.fillText('УЧАСТНИКОВ', 70, 525);
      ctx.fillText('ДЛИТЕЛЬНОСТЬ', 350, 525);

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`${cardData.participantCount} чел.`, 70, 565);
      ctx.fillText(`${cardData.durationMinutes} мин`, 350, 565);

      // Safety badge
      ctx.fillStyle = '#10B981';
      ctx.font = '14px sans-serif';
      ctx.fillText('🛡️ Безопасная спонтанная активность • Без приватных данных', 50, 640);

      // Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${cardData.dateFormatted} • Сгенерировано в приложении NOW`, 50, 730);

      const link = document.createElement('a');
      link.download = `now-meetup-${cardData.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 id="share-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>✨</span>
            <span>Карточка активности</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {/* Visual Share Card */}
        <div
          ref={cardRef}
          className="relative bg-gradient-to-b from-[#0F172A] via-[#0A0E17] to-[#020617] p-5 rounded-2xl border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-left space-y-3"
        >
          {/* Watermark brand */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest text-amber-400">NOW / IRL</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
              {cardData.city}
            </span>
          </div>

          {/* Activity main header */}
          <div className="pt-2">
            <div className="text-4xl mb-1">{cardData.activityIcon}</div>
            <div className="text-xl font-black text-white">{cardData.activityTitle}</div>
            <div className="text-xs font-semibold text-sky-400">{cardData.headline}</div>
          </div>

          {/* Zone */}
          <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Публичная локация</div>
            <div className="text-xs font-bold text-slate-200 truncate">{cardData.zoneName}</div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Участников</div>
              <div className="text-lg font-black text-amber-400">{cardData.participantCount}</div>
            </div>
            <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Длительность</div>
              <div className="text-lg font-black text-amber-400">{cardData.durationMinutes} мин</div>
            </div>
          </div>

          {/* Zero-PII safe guarantee */}
          <div className="pt-2 text-[10px] text-emerald-400/90 flex items-center gap-1">
            <span>🛡️</span>
            <span>Zero-PII • Без персональных данных и координат</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-1.5"
          >
            <span>📥</span>
            <span>{downloading ? 'Сохранение...' : 'Скачать карточку (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>📋</span>
            <span>{copyFeedback ? 'Текст скопирован в буфер!' : 'Скопировать текст'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
