'use client';

import React, { useState } from 'react';

interface SafetyHelpModalProps {
  isOpen: boolean;
  meetupId: string;
  currentUserId: string;
  targetUser?: { id: string; name: string } | null;
  onClose: () => void;
  onReportSubmitted?: () => void;
  onUserBlocked?: () => void;
}

export function SafetyHelpModal({
  isOpen,
  meetupId,
  currentUserId,
  targetUser,
  onClose,
  onReportSubmitted,
  onUserBlocked,
}: SafetyHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'report' | 'block'>('info');
  const [reportCategory, setReportCategory] = useState('commercial_solicitation');
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCall112 = async () => {
    try {
      await fetch(`/api/meetups/${meetupId}/safety-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUserId,
          eventType: 'emergency_call_initiated',
          details: { initiatedAt: new Date().toISOString() },
        }),
      });
    } catch {
      // ignore
    }
    window.location.href = 'tel:112';
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/meetups/${meetupId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUserId,
          targetId: targetUser?.id,
          category: reportCategory,
          description: reportText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage('Жалоба зарегистрирована и передана на проверку.');
        setReportText('');
        if (onReportSubmitted) onReportSubmitted();
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 2000);
      } else {
        setStatusMessage(data.message || 'Ошибка отправки жалобы');
      }
    } catch {
      setStatusMessage('Ошибка сети при отправке жалобы');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!targetUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/meetups/${meetupId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockerId: currentUserId,
          blockedId: targetUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(`Пользователь ${targetUser.name} заблокирован.`);
        if (onUserBlocked) onUserBlocked();
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1800);
      } else {
        setStatusMessage(data.message || 'Ошибка блокировки');
      }
    } catch {
      setStatusMessage('Ошибка сети при блокировке');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-rose-400">🛡️</span>
            <div>
              <h2 id="safety-modal-title" className="text-base font-bold text-white">
                Безопасность и Помощь
              </h2>
              <p className="text-[11px] text-slate-400">Стандарты защиты участников NOW</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs text-center font-medium">
            {statusMessage}
          </div>
        )}

        {/* Tab selection */}
        <div className="flex gap-1 mt-4 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'info' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Памятка и SOS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'report' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Пожаловаться
          </button>
          {targetUser && (
            <button
              type="button"
              onClick={() => setActiveTab('block')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'block' ? 'bg-slate-800 text-rose-300 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Блок
            </button>
          )}
        </div>

        {/* Tab Content: Info & SOS */}
        {activeTab === 'info' && (
          <div className="mt-4 space-y-4 text-left">
            {/* Direct Emergency Call Button */}
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Экстренная помощь
                </span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono">
                  Единая служба 112
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Если возникла угроза вашей безопасности или здоровью, немедленно отойдите в людное место и звоните в службу экстренной помощи.
              </p>
              <button
                type="button"
                onClick={handleCall112}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-colors"
              >
                <span>📞</span>
                <span>Вызвать экстренную службу (112)</span>
              </button>
            </div>

            {/* Safety Rules */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-slate-200 mb-1">Основные правила безопасности:</div>
              <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-amber-400">1.</span>
                <span>Встречи разрешены <b>только в публичных открытых местах</b>. Не уходите в безлюдные места или частные помещения.</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-amber-400">2.</span>
                <span><b>Никаких денег:</b> коммерческие предложения, предоплаты и платные услуги строго запрещены политикой платформы.</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-amber-400">3.</span>
                <span>Вы в любой момент можете прервать встречу и нажать «Покинуть активность». Никаких обязательств нет.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Report */}
        {activeTab === 'report' && (
          <form onSubmit={handleSendReport} className="mt-4 space-y-3 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Категория нарушения
              </label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="commercial_solicitation">Коммерческое предложение / требование денег</option>
                <option value="harassment">Неприемлемое поведение / домогательства</option>
                <option value="unsafe_behavior">Опасное поведение / увод в непубличное место</option>
                <option value="inappropriate_content">Неподобающий контент в чате</option>
                <option value="no_show">Неявка на подтверждённую встречу</option>
                <option value="other">Другое</option>
              </select>
            </div>

            {targetUser && (
              <div className="text-xs text-slate-400 bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                Жалоба на пользователя: <span className="font-semibold text-white">{targetUser.name}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Описание инцидента
              </label>
              <textarea
                required
                rows={3}
                placeholder="Что произошло? Опишите ситуацию кратко и точно..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                maxLength={500}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !reportText.trim()}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
            </button>
          </form>
        )}

        {/* Tab Content: Block */}
        {activeTab === 'block' && targetUser && (
          <div className="mt-4 space-y-3 text-left">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-rose-400">
                Заблокировать {targetUser.name}?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Вы больше не увидите активности этого пользователя на карте, а он не сможет вступить в созданные вами Огоньки.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBlock}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors"
            >
              {isSubmitting ? 'Блокируем...' : `Заблокировать ${targetUser.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
