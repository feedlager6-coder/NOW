'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const isStagingMode = process.env.NEXT_PUBLIC_STAGING_MODE === 'true';
  const [phone, setPhone] = useState('+79990000001');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staging gate state
  const [accessCode, setAccessCode] = useState('');
  const [gateRequired, setGateRequired] = useState(isStagingMode);
  const [gateUnlocked, setGateUnlocked] = useState(!isStagingMode);
  const [gateError, setGateError] = useState<string | null>(null);
  const [isGateSubmitting, setIsGateSubmitting] = useState(false);

  const presetNumbers = [
    { label: 'Алекс (Dev)', phone: '+79990000001' },
    { label: 'Мира (Dev)', phone: '+79990000002' },
    { label: 'Тимур (Dev)', phone: '+79990000003' },
  ];

  const handleStagingGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    setIsGateSubmitting(true);

    try {
      const res = await fetch('/api/auth/staging-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setGateError(data.message || 'Неверный код доступа');
        setIsGateSubmitting(false);
        return;
      }

      setAccessCode('');
      setGateUnlocked(true);
      setGateRequired(false);
      setError(null);
    } catch {
      setGateError('Не удалось связаться с сервером');
    } finally {
      setIsGateSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === 'STAGING_GATE_REQUIRED') {
          setGateRequired(true);
          setGateUnlocked(false);
          setError(data.message || 'Требуется инвайт-код доступа стенда');
        } else {
          setError(data.message || data.error || 'Ошибка отправки кода');
        }
        setIsLoading(false);
        return;
      }

      // Route to verify
      router.push(`/auth/verify?phone=${encodeURIComponent(phone)}`);
    } catch {
      setError('Не удалось связаться с сервером');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <span className="text-2xl">{gateRequired && !gateUnlocked ? '🔐' : '📱'}</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            {gateRequired && !gateUnlocked ? 'Закрытое тестирование' : 'Вход по номеру'}
          </h1>
          <p className="text-xs text-slate-400">
            {gateRequired && !gateUnlocked
              ? 'Введите инвайт-код доступа стенда'
              : 'Введите синтетический номер для тестирования Local Mode'}
          </p>
        </div>

        {/* Staging Gate Form */}
        {gateRequired && !gateUnlocked ? (
          <form onSubmit={handleStagingGateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="access-code" className="text-xs font-semibold text-slate-300">
                Код доступа стенда (Staging Access Code)
              </label>
              <input
                id="access-code"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Введите полученный инвайт-код"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {gateError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {gateError}
              </div>
            )}

            <button
              type="submit"
              disabled={isGateSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isGateSubmitting ? <span>Проверяю доступ...</span> : <span>Разблокировать стенд</span>}
            </button>
          </form>
        ) : (
          <>
            {/* Dev hint badge */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                {isStagingMode ? '🛠️ Staging Sandbox' : '🛠️ Dev OTP Sandbox'}
              </p>
              <p className="text-[11px] text-slate-300">
                Разрешены тестовые номера вида <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">+799900000XX</code>.
                {isStagingMode ? ' Код подтверждения отправлен в закрытый чат.' : ' Код подтверждения: '}
                {!isStagingMode && <strong className="text-white font-mono">000000</strong>}
              </p>
              {isStagingMode && (
                <p className="text-[10px] text-amber-300/90 pt-0.5">
                  ⚠️ Не указывайте реальные адреса, телефоны, документы и другую чувствительную информацию.
                </p>
              )}
            </div>

        {/* Preset quick buttons */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400">Быстрый выбор тестового профиля:</label>
          <div className="flex flex-wrap gap-1.5">
            {presetNumbers.map((p) => (
              <button
                key={p.phone}
                type="button"
                onClick={() => setPhone(p.phone)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  phone === p.phone
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-semibold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-semibold text-slate-300">
              Номер телефона
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+79990000001"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Отправляю код...</span>
            ) : (
              <span>Получить код подтверждения</span>
            )}
          </button>
        </form>
        </>
        )}

        <div className="pt-2 text-center">
          <Link
            href="/welcome"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Назад к описанию
          </Link>
        </div>
      </div>
    </div>
  );
}
