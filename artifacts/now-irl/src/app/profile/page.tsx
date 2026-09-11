'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

export default function ProfilePage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) {
          router.push('/welcome');
          return;
        }
        const data = await res.json();
        setProfileData(data);
      } catch {
        router.push('/welcome');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('now_mode');
      router.push('/welcome');
    } catch {
      router.push('/welcome');
    }
  };

  const handleResetAvatar = async () => {
    setIsResettingAvatar(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileData((prev: any) => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatarRef: data.avatarRef,
          },
        }));
        setMessage('Аватар сброшен на базовый силуэт.');
      }
    } catch {
      setMessage('Не удалось сбросить аватар.');
    } finally {
      setIsResettingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Загрузка профиля...</p>
      </div>
    );
  }

  const profile = profileData?.profile;
  const interests = profileData?.interests || [];
  const hasCustomAvatar = profile?.avatarRef?.startsWith('/uploads/');

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
          ← К карте Огоньков
        </Link>
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          🟢 LOCAL TEST MODE
        </span>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Avatar & Header */}
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarRef={profile?.avatarRef}
            displayName={profile?.displayName}
            size="xl"
            className="ring-2 ring-orange-500/30"
          />
          <div className="space-y-1.5 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {profile?.displayName || 'Пользователь'}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {profile?.showAgeBandAndInterests && profile?.ageBand && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {profile.ageBand} лет
                </span>
              )}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Индекс {profile?.reliabilityScore ?? 100}%
              </span>
            </div>
          </div>
        </div>

        {/* Reliability Explanation Disclaimer */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">О рейтинге:</span> Индекс надёжности отражает пунктуальность и соблюдение правил платформы, но не является официальной гарантией безопасности. Всегда встречайтесь только в открытых публичных местах.
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">О себе</div>
            <p className="text-xs text-slate-200 italic">«{profile.bio}»</p>
          </div>
        )}

        {/* Interests */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Интересы ({interests.length} из 5)
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((int: any) => (
              <span
                key={int.id}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
              >
                <span>{int.icon}</span>
                <span>{int.labelRu}</span>
              </span>
            ))}
            {interests.length === 0 && (
              <p className="text-xs text-slate-500 italic">Интересы не указаны</p>
            )}
          </div>
        </div>

        {message && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <Link
            href="/onboarding/profile"
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
          >
            ✏️ Редактировать профиль и интересы
          </Link>

          {hasCustomAvatar && (
            <button
              type="button"
              onClick={handleResetAvatar}
              disabled={isResettingAvatar}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-all disabled:opacity-50"
            >
              {isResettingAvatar ? 'Сброс...' : 'Вернуть анонимный силуэт'}
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-all disabled:opacity-50"
          >
            {isLoggingOut ? 'Выход из сессии...' : 'Выйти из аккаунта'}
          </button>
        </div>
      </div>
    </div>
  );
}
