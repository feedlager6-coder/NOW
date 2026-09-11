'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch {
        // ignore
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCurrentSession();
  }, []);

  const handleEnterDemo = () => {
    localStorage.setItem('now_mode', 'demo');
    router.push('/');
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-between max-w-md mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Brand & Hero */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 shadow-lg shadow-orange-500/5">
            <span className="text-4xl animate-bounce">🔥</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            NOW <span className="text-orange-500">/</span> IRL
          </h1>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">
            Спонтанные оффлайн-встречи в безопасных публичных местах.
            <br />
            <span className="text-slate-400">Здесь и сейчас. Без анкет и свайпов.</span>
          </p>
        </div>

        {/* 4 Core Pillars of NOW */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-xl p-1 bg-slate-800 rounded-lg">🛡️</span>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Только открытые общественные места</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Парки, набережные, открытые кофейни и спортплощадки. Приватные локации запрещены алгоритмом.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-xl p-1 bg-slate-800 rounded-lg">🔞</span>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Строго 18+</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Сервис предназначен исключительно для совершеннолетних пользователей с верификацией возрастной группы.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-xl p-1 bg-slate-800 rounded-lg">⚡</span>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Спонтанность «Прямо сейчас»</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Огоньки зажигаются на 15–60 минут. Чат активности автоматически стирается через 12 часов.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-xl p-1 bg-slate-800 rounded-lg">🔒</span>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Zero-PII & Никаких свиданий</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Мы не храним точные координаты, телефон в открытом виде, фото лица и контакты. Сервис — для живого общения по интересам.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-6">
        {!checkingAuth && isAuthenticated ? (
          <div className="space-y-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <p className="text-xs font-semibold text-emerald-400">
                🟢 Вы уже авторизованы в Local Test Mode
              </p>
            </div>
            <Link
              href="/"
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all"
            >
              Открыть карту Огоньков
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 transition-all"
            >
              <span>Войти по номеру (Dev OTP)</span>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">18+</span>
            </Link>

            <button
              type="button"
              onClick={handleEnterDemo}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
            >
              <span>🟡 Войти в DEMO-режим (Без регистрации)</span>
            </button>
          </div>
        )}

        <p className="text-[11px] text-center text-slate-500 leading-tight">
          Продолжая, вы соглашаетесь с правилами сервиса, безопасностью встреч и подтверждаете совершеннолетие.
        </p>
      </div>
    </div>
  );
}
