'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '+79990000001';

  const [phone, setPhone] = useState(phoneParam);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phoneParam) {
      setPhone(phoneParam);
    }
  }, [phoneParam]);

  const handlePasteDevCode = () => {
    setCode('000000');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Неверный код подтверждения');
        setIsLoading(false);
        return;
      }

      // Route based on onboarding status
      if (data.onboarding?.needsAgeGate) {
        router.push('/onboarding/age-gate');
      } else if (data.onboarding?.needsProfile) {
        router.push('/onboarding/profile');
      } else {
        router.push('/');
      }
    } catch {
      setError('Ошибка соединения с сервером');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <span className="text-2xl">🔐</span>
        </div>
        <h1 className="text-xl font-bold text-white">Введите код</h1>
        <p className="text-xs text-slate-400">
          Код отправлен на номер <span className="font-mono text-slate-200">{phone}</span>
        </p>
      </div>

      {process.env.NEXT_PUBLIC_STAGING_MODE === 'true' ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
            🛠️ Код закрытого тестирования
          </span>
          <p className="text-[11px] text-slate-300">
            Введите 6-значный проверочный код стенда, полученный от организатора тестирования.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
              Dev Код: 000000
            </span>
            <button
              type="button"
              onClick={handlePasteDevCode}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline"
            >
              Вставить 000000
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Для безопасного локального тестирования используется единый фиксированный dev-код.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="code" className="text-xs font-semibold text-slate-300">
            6-значный код
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            required
            autoFocus
            className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center text-xl tracking-[0.3em] focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <span>Проверка кода...</span> : <span>Подтвердить и продолжить</span>}
        </button>
      </form>

      <div className="pt-2 text-center">
        <Link
          href="/auth/login"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Изменить номер
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center text-slate-400 text-sm">Загрузка...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
