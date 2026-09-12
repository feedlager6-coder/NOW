'use client';

import React, { useState } from 'react';
import { DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES } from '@/lib/demo-data';

interface CreateMeetupModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreated: (meetupId: string) => void;
}

export function CreateMeetupModal({
  isOpen,
  currentUserId,
  onClose,
  onCreated,
}: CreateMeetupModalProps) {
  const [activityTypeId, setActivityTypeId] = useState(DEMO_ACTIVITY_TYPES[0].id);
  const [zoneId, setZoneId] = useState(DEMO_PUBLIC_ZONES[0].id);
  const [publicPlaceName, setPublicPlaceName] = useState('');
  const [startsInMinutes, setStartsInMinutes] = useState(30);
  const [capacity, setCapacity] = useState(4);
  const [safeDescription, setSafeDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Guarantee state reset whenever modal opens or reopens
  React.useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setErrorMsg(null);
      setPublicPlaceName('');
      setSafeDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedActivity = DEMO_ACTIVITY_TYPES.find((a) => a.id === activityTypeId) || DEMO_ACTIVITY_TYPES[0];
  const selectedZone = DEMO_PUBLIC_ZONES.find((z) => z.id === zoneId) || DEMO_PUBLIC_ZONES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    const trimmedPlace = publicPlaceName.trim();
    if (trimmedPlace.length < 2) {
      setErrorMsg('Укажите конкретную публичную точку (минимум 2 символа, например: у фонтана / у главного входа)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: currentUserId,
          activityTypeId,
          zoneId,
          publicPlaceName: trimmedPlace,
          startsInMinutes,
          capacity,
          safeDescription: safeDescription.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.message || 'Ошибка создания активности. Пожалуйста, попробуйте снова.');
        return;
      }

      // Reset form on success
      setPublicPlaceName('');
      setSafeDescription('');
      onCreated(data.meetup.id);
      onClose();
    } catch {
      setErrorMsg('Сетевая ошибка при создании активности. Проверьте соединение.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg bg-[#0F172A] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">🔥</span>
            <div>
              <h2 id="create-modal-title" className="text-lg font-bold text-white tracking-wide">
                Зажечь огонёк активности
              </h2>
              <p className="text-xs text-slate-400">Спонтанная группа в публичной зоне</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-left">
          {/* Activity Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Тип активности
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {DEMO_ACTIVITY_TYPES.map((act) => {
                const isSelected = act.id === activityTypeId;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setActivityTypeId(act.id);
                      setCapacity(act.defaultCapacity);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{act.icon}</span>
                    <span className="text-xs font-medium truncate w-full">{act.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public Zone Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Безопасная зона (Whitelisted)
            </label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {DEMO_PUBLIC_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {z.description}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Public Spot from Safe Catalog */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Точка сбора внутри зоны <span className="text-amber-400">*</span>
            </label>
            
            {/* Quick selection chips from Safe Catalog */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Главный вход', 'У фонтана', 'Центральная площадка', 'У спортивной зоны', 'Возле инфостенда'].map((spot) => (
                <button
                  key={spot}
                  type="button"
                  onClick={() => setPublicPlaceName(spot)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    publicPlaceName === spot
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  📍 {spot}
                </button>
              ))}
            </div>

            <input
              id="public-place-input"
              type="text"
              required
              placeholder="Выберите из каталога выше или уточните публичную точку"
              value={publicPlaceName}
              onChange={(e) => setPublicPlaceName(e.target.value)}
              maxLength={80}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Безопасный открытый ориентир. Приватные и домашние адреса строго запрещены.
            </p>
          </div>

          {/* Timing & Capacity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Старт через
              </label>
              <div className="flex gap-1.5">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setStartsInMinutes(mins)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                      startsInMinutes === mins
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mins}м
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Мест (всего)
              </label>
              <div className="flex gap-1.5">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCapacity(num)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                      capacity === num
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Safe Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Комментарий для группы (опционально)
            </label>
            <input
              type="text"
              placeholder="Например: идём в спокойном темпе, берём кофе с собой"
              value={safeDescription}
              onChange={(e) => setSafeDescription(e.target.value)}
              maxLength={120}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
              <span>ПРЕДПРОСМОТР КАРТОЧКИ</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
                старт через ~{startsInMinutes} мин
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedActivity.icon}</span>
              <div>
                <div className="text-sm font-bold text-white">{selectedActivity.title}</div>
                <div className="text-xs text-slate-300">
                  {selectedZone.name} • {publicPlaceName || 'Точка сбора'} (мест: 1/{capacity})
                </div>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
            <span className="text-emerald-400 text-sm">🛡️</span>
            <div>
              <span className="font-semibold text-slate-300">Стандарт безопасности NOW:</span>{' '}
              Только публичные места. Запрещены коммерческие сделки, сборы денег и приватные встречи 1-на-1.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Создаём...</span>
                </>
              ) : (
                <>
                  <span>🔥</span>
                  <span>Зажечь огонёк</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
