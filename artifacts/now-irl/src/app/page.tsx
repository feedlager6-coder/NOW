'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DemoMap } from '@/components/DemoMap';
import { DemoUserSwitcher } from '@/components/DemoUserSwitcher';
import { MeetupBottomSheet } from '@/components/MeetupBottomSheet';
import { CreateMeetupModal } from '@/components/CreateMeetupModal';
import { LiveMeetupView } from '@/components/LiveMeetupView';
import { DEMO_USERS, DemoUser } from '@/lib/demo-data';
import { AnonymousDiscoveryCard } from '@/domain/safety-guard';
import { UserAvatar } from '@/components/UserAvatar';

const FILTER_ITEMS = [
  { id: 'all', label: 'Все' },
  { id: 'walking', label: '🚶 Прогулка' },
  { id: 'coffee', label: '☕ Кофе' },
  { id: 'sports', label: '⚽ Спорт' },
  { id: 'board_games', label: '🎲 Игры' },
  { id: 'study', label: '📚 Учёба' },
];

export default function HomePage() {
  const [authSession, setAuthSession] = useState<any>(null);
  const [appMode, setAppMode] = useState<'LOCAL' | 'DEMO'>('DEMO');
  const [currentUser, setCurrentUser] = useState<DemoUser>(DEMO_USERS[0]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [meetups, setMeetups] = useState<AnonymousDiscoveryCard[]>([]);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Navigation Views
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeLiveMeetupId, setActiveLiveMeetupId] = useState<string | null>(null);
  const [sheetMeetup, setSheetMeetup] = useState<AnonymousDiscoveryCard | null>(null);

  // Check current session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setAuthSession(data);
            setAppMode('LOCAL');
            if (data.profile?.displayName) {
              setCurrentUser({
                id: data.user.id,
                phone: '+79990000000',
                displayName: data.profile.displayName,
                bio: data.profile.bio || '',
                ageBand: data.profile.ageBand || '22-25',
                reliabilityScore: data.profile.reliabilityScore || 100,
                avatarRef: data.profile.avatarRef || '/avatars/silhouette-1.svg',
              });
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      // If not authenticated, check localStorage preference
      const savedMode = localStorage.getItem('now_mode');
      if (savedMode === 'demo') {
        setAppMode('DEMO');
      }
    }
    checkAuth();
  }, []);

  // Fetch meetups from API
  const loadMeetups = useCallback(async () => {
    try {
      const modeParam = appMode === 'LOCAL' ? 'mode=local' : 'mode=demo';
      const res = await fetch(`/api/meetups?${modeParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.meetups)) {
          setMeetups(data.meetups);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load meetups from API', err);
    } finally {
      setIsLoading(false);
    }
  }, [appMode]);

  useEffect(() => {
    loadMeetups();
    const interval = setInterval(loadMeetups, 5000);
    return () => clearInterval(interval);
  }, [loadMeetups]);

  // Filter meetups according to the selected category tab
  const filteredMeetups = meetups.filter((m) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'sports') {
      return (
        m.activityTypeId === 'football' ||
        m.activityTypeId === 'sports_viewing' ||
        m.activityTypeId === 'workout'
      );
    }
    if (selectedFilter === 'walking') {
      return m.activityTypeId === 'walking' || m.activityTypeId === 'walk';
    }
    return m.activityTypeId === selectedFilter;
  });

  const handleSelectMeetup = (id: string) => {
    setSelectedMeetupId(id);
    const target = meetups.find((m) => m.id === id);
    if (target) {
      setSheetMeetup(target);
    }
  };

  const handleOpenLiveScreen = (id: string) => {
    setSheetMeetup(null);
    setActiveLiveMeetupId(id);
  };

  const toggleMode = () => {
    if (appMode === 'DEMO') {
      setAppMode('LOCAL');
      localStorage.setItem('now_mode', 'local');
    } else {
      setAppMode('DEMO');
      localStorage.setItem('now_mode', 'demo');
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pb-28 pt-3">
      {/* Top Controls & Mode Bar */}
      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-[#0F172A]/90 border border-slate-800 mb-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
            <span className="text-xs font-bold text-slate-200">DEMO CITY</span>
          </div>

          <div className="flex items-center gap-2">
            {appMode === 'LOCAL' ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LOCAL TEST (PostgreSQL)</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>DEMO MODE (In-Memory)</span>
              </span>
            )}

            <button
              type="button"
              onClick={toggleMode}
              title="Переключить режим данных"
              className="text-[10px] text-slate-400 hover:text-slate-200 underline"
            >
              Сменить
            </button>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
          {authSession?.authenticated ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">👤</span>
                <span className="font-semibold text-white">
                  {authSession.profile?.displayName || 'Участник'}
                </span>
                {authSession.profile?.ageBand && (
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {authSession.profile.ageBand}
                  </span>
                )}
              </div>
              <Link
                href="/profile"
                className="text-[11px] font-medium text-orange-400 hover:text-orange-300"
              >
                Мой профиль →
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <DemoUserSwitcher
                currentUser={currentUser}
                onSelectUser={(u) => setCurrentUser(u)}
              />
              <Link
                href="/welcome"
                className="text-[11px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-lg"
              >
                Войти (Dev) 18+
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Hero Headings */}
      <div className="mb-4 text-center sm:text-left space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center justify-center sm:justify-start gap-1.5">
          <span>🔥</span>
          <span>Что происходит рядом?</span>
        </span>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          Собери компанию рядом за несколько минут
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
          Прогулки, кофе, футбол, настолки и другие активности прямо сейчас в безопасных публичных зонах.
        </p>
      </div>

      {/* Interactive Map with glowing fire markers */}
      <DemoMap
        meetups={filteredMeetups}
        selectedMeetupId={selectedMeetupId}
        onSelectMeetup={handleSelectMeetup}
      />

      {/* Primary Action Button: "Собрать компанию" */}
      <div className="mb-5">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-orange-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-orange-400/40"
        >
          <span className="text-lg">🔥</span>
          <span>Собрать компанию</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4 -mx-1 px-1">
        {FILTER_ITEMS.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section: "Сейчас рядом" */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-300">
            Сейчас рядом ({filteredMeetups.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Нажмите на карточку для просмотра
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-xs text-slate-500">
            Загрузка активных огоньков...
          </div>
        ) : filteredMeetups.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
            В этой категории сейчас нет активностей
          </div>
        ) : (
          filteredMeetups.map((m) => {
            const isSelected = selectedMeetupId === m.id;
            const remaining = m.capacity - m.occupiedSlots;
            const progress = Math.round((m.occupiedSlots / m.capacity) * 100);

            return (
              <article
                id={`card-${m.id}`}
                key={m.id}
                data-testid="meetup-card"
                onClick={() => handleSelectMeetup(m.id)}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#182032] to-[#0F172A] border-orange-500/80 shadow-lg shadow-orange-500/10'
                    : 'bg-gradient-to-b from-[#111827] to-[#0D131F] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Info Bar */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{m.activityIcon}</span>
                    <span className="font-bold text-white text-xs">{m.activityTitle}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {m.zoneName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-orange-400">
                      {m.distanceBand}
                    </span>
                  </div>
                </div>

                {/* Specific Public Location */}
                <div className="flex items-center gap-1.5 mb-1.5 text-xs text-slate-300">
                  <span className="text-slate-500">📍</span>
                  <span className="font-medium truncate">{(m as any).publicPlaceName || m.zoneName}</span>
                </div>

                {/* Safe Description */}
                {m.safeDescription && (
                  <p className="text-xs text-slate-400 mb-2.5 italic truncate">
                    {m.safeDescription}
                  </p>
                )}

                {/* Occupancy and Participant Silhouettes */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {m.participantSilhouettes.map((s, idx) => {
                        const avatarRef = typeof s === 'string' ? s : s.avatarRef;
                        return (
                          <UserAvatar
                            key={idx}
                            avatarRef={avatarRef}
                            size="sm"
                            className="ring-1 ring-slate-900"
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-slate-400 ml-1">
                      {m.occupiedSlots} из {m.capacity} мест
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {remaining === 1 ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/50 animate-pulse">
                        Осталось 1 место!
                      </span>
                    ) : remaining > 0 ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        Идёт сбор
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        Заполнено
                      </span>
                    )}

                    <span className="text-xs text-orange-400 font-bold">→</span>
                  </div>
                </div>

                {/* Mini capacity progress bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progress >= 100
                        ? 'bg-rose-500'
                        : progress >= 60
                        ? 'bg-amber-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Meetup Details Bottom Sheet */}
      {sheetMeetup && (
        <MeetupBottomSheet
          meetup={sheetMeetup}
          isUserJoined={Boolean((sheetMeetup as any).isUserJoined)}
          onClose={() => setSheetMeetup(null)}
          onOpenLive={handleOpenLiveScreen}
        />
      )}

      {/* Create Activity Modal */}
      <CreateMeetupModal
        isOpen={isCreateModalOpen}
        currentUserId={currentUser.id}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newMeetupId) => {
          setIsCreateModalOpen(false);
          loadMeetups();
          handleOpenLiveScreen(newMeetupId);
        }}
      />

      {/* Fullscreen Live Meetup View */}
      {activeLiveMeetupId && (
        <LiveMeetupView
          meetupId={activeLiveMeetupId}
          currentUserId={currentUser.id}
          onClose={() => {
            setActiveLiveMeetupId(null);
            loadMeetups();
          }}
        />
      )}
    </div>
  );
}
