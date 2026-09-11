'use client';

import React from 'react';
import { AnonymousDiscoveryCard } from '@/domain/safety-guard';
import { UserAvatar } from '@/components/UserAvatar';

interface MeetupBottomSheetProps {
  meetup: AnonymousDiscoveryCard;
  onClose: () => void;
  onOpenLive: (meetupId: string) => void;
  isUserJoined: boolean;
}

export const MeetupBottomSheet: React.FC<MeetupBottomSheetProps> = ({
  meetup,
  onClose,
  onOpenLive,
  isUserJoined,
}) => {
  const remaining = meetup.capacity - meetup.occupiedSlots;
  const isFull = remaining <= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0F172A] border-t border-slate-700/80 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Swipe Handle Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto -mt-1 cursor-pointer" onClick={onClose} />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-xl">
              {meetup.activityIcon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  {meetup.zoneName}
                </span>
                <span className="text-slate-600 text-[10px]">•</span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  DEMO ONLY
                </span>
              </div>
              <h3 id="sheet-title" className="text-base font-black text-white leading-tight">
                {meetup.activityTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Закрыть карточку"
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          {meetup.safeDescription}
        </p>

        {/* Status & Participants Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium">Старт активности</span>
            <span className="font-bold text-amber-400 text-sm">
              ⏱ {meetup.startsInMinutes > 0 ? `через ${meetup.startsInMinutes} мин` : 'Прямо сейчас'}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium">Заполненность</span>
            <span className={`font-bold text-sm ${isFull && !isUserJoined ? 'text-rose-400' : 'text-emerald-400'}`}>
              {meetup.occupiedSlots} из {meetup.capacity} мест
            </span>
          </div>
        </div>

        {/* Anonymous Silhouettes */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] text-slate-500 mr-1">Участники:</span>
          {meetup.participantSilhouettes.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px]"
            >
              <UserAvatar avatarRef={p.avatarRef} size="xs" showBorder={false} />
              <span className="text-slate-200 font-medium">{p.ageBand}</span>
              <span className="text-amber-400 text-[9px] font-mono">★{p.reliabilityScore}</span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, remaining) }).map((_, emptyIdx) => (
            <div
              key={`empty-${emptyIdx}`}
              className="w-6 h-6 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-600 font-bold"
            >
              +
            </div>
          ))}
        </div>

        {/* Primary Call to Action */}
        <button
          onClick={() => {
            onClose();
            onOpenLive(meetup.id);
          }}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 ${
            isUserJoined
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : isFull
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-slate-950 hover:brightness-110 shadow-orange-500/25 active:scale-[0.98]'
          }`}
        >
          <span>🔥</span>
          <span>{isUserJoined ? 'Вы в Огоньке • Открыть экран' : isFull ? 'Все места заняты' : 'Войти в Огонёк / Детали'}</span>
        </button>
      </div>
    </div>
  );
};
