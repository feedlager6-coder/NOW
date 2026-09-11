'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AgeGatePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [birthYear, setBirthYear] = useState<number>(2000);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [consentAge, setConsentAge] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAge || !consentRules) {
      setError('Необходимо отметить оба согласия для продолжения');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/onboarding/age-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear,
          birthMonth,
          consentAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Возраст не подтверждён');
        setIsLoading(false);
        return;
      }

      router.push('/onboarding/profile');
    } catch {
      setError('Ошибка связи с сервером');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <span className="text-2xl">🔞</span>
          </div>
          <h1 className="text-xl font-bold text-white">Возрастной ценз 18+</h1>
          <p className="text-xs text-slate-400">
            NOW создан строго для совершеннолетних пользователей
          </p>
        </div>

        {/* Privacy badge */}
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
            🔒 Политика конфиденциальности возраста
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Мы <strong>не храним</strong> вашу точную дату рождения. Сервис вычисляет только возрастную группу (например, <code className="text-orange-400 font-mono">18-21</code>, <code className="text-orange-400 font-mono">22-25</code>, <code className="text-orange-400 font-mono">26-30</code> или <code className="text-orange-400 font-mono">31+</code>).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label htmlFor="birthMonth" className="text-xs font-semibold text-slate-300">
                Месяц рождения
              </label>
              <select
                id="birthMonth"
                value={birthMonth}
                onChange={(e) => setBirthMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="birthYear" className="text-xs font-semibold text-slate-300">
                Год рождения
              </label>
              <select
                id="birthYear"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors font-mono"
              >
                {Array.from({ length: 65 }, (_, i) => currentYear - 14 - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={consentAge}
                onChange={(e) => setConsentAge(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-0"
              />
              <span>
                Подтверждаю, что мне исполнилось <strong>18 лет</strong>, и указанные данные верны.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={consentRules}
                onChange={(e) => setConsentRules(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-0"
              />
              <span>
                Обязуюсь встречаться исключительно в <strong>безопасных открытых общественных местах</strong> и соблюдать правила сервиса.
              </span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !consentAge || !consentRules}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all"
          >
            {isLoading ? <span>Проверка совершеннолетия...</span> : <span>Подтвердить и продолжить</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
