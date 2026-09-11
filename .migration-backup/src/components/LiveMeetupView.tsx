'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DemoChat } from './DemoChat';
import { SafetyHelpModal } from './SafetyHelpModal';
import { ShareCardModal, ShareCardData } from './ShareCardModal';
import { UserAvatar } from './UserAvatar';

interface Participant {
  userId: string;
  displayName: string;
  ageBand: string;
  avatarRef: string;
  reliabilityScore: number;
  isCreator: boolean;
  isCheckedIn: boolean;
}

interface MeetupDetails {
  id: string;
  creatorId: string;
  activityTypeId: string;
  activityTitle: string;
  activityIcon: string;
  zoneId: string;
  zoneName: string;
  publicPlaceName: string;
  startsAt: string;
  startsInMinutes: number;
  durationMinutes: number;
  capacity: number;
  status: 'gathering' | 'active' | 'completed' | 'cancelled_by_creator' | 'cancelled_by_system';
  safeDescription?: string;
  participants: Participant[];
  occupiedSlots: number;
  freeSlots: number;
}

interface LiveMeetupViewProps {
  meetupId: string;
  currentUserId: string;
  onClose: () => void;
  onMeetupChanged?: () => void;
}

export function LiveMeetupView({
  meetupId,
  currentUserId,
  onClose,
  onMeetupChanged,
}: LiveMeetupViewProps) {
  const [meetup, setMeetup] = useState<MeetupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'details'>('chat');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [safetyTargetUser, setSafetyTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null);

  // Time remaining state
  const [timeLeftFormatted, setTimeLeftFormatted] = useState('00:00');

  const fetchMeetup = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetups/${meetupId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.meetup) {
          setMeetup(data.meetup);
        }
      }
    } catch {
      // Background poll failure handled gracefully
    } finally {
      setLoading(false);
    }
  }, [meetupId]);

  useEffect(() => {
    fetchMeetup();
    const interval = setInterval(fetchMeetup, 3000);
    return () => clearInterval(interval);
  }, [fetchMeetup]);

  // Countdown timer calculation
  useEffect(() => {
    if (!meetup) return;
    const calculateTime = () => {
      const startMs = new Date(meetup.startsAt).getTime();
      const diffSec = Math.floor((startMs - Date.now()) / 1000);

      if (diffSec <= 0) {
        setTimeLeftFormatted('00:00');
        return;
      }
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setTimeLeftFormatted(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [meetup]);

  const isParticipant = !!meetup?.participants.some((p) => p.userId === currentUserId);
  const isCreator = meetup?.creatorId === currentUserId;
  const isCheckedIn = !!meetup?.participants.some((p) => p.userId === currentUserId && p.isCheckedIn);

  // Handlers
  const handleJoin = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/meetups/${meetupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMeetup();
        if (onMeetupChanged) onMeetupChanged();
      } else {
        setErrorMessage(data.message || 'Не удалось присоединиться');
      }
    } catch {
      setErrorMessage('Сетевая ошибка при вступлении');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Вы уверены, что хотите покинуть активность?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/meetups/${meetupId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (res.ok) {
        await fetchMeetup();
        if (onMeetupChanged) onMeetupChanged();
      }
    } catch {
      setErrorMessage('Сетевая ошибка при выходе');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/meetups/${meetupId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMeetup();
        if (onMeetupChanged) onMeetupChanged();
      } else {
        setErrorMessage(data.message || 'Ошибка отметки на месте');
      }
    } catch {
      setErrorMessage('Сетевая ошибка при отметке');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/meetups/${meetupId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMeetup();
        if (onMeetupChanged) onMeetupChanged();
        handleOpenShareCard();
      } else {
        setErrorMessage(data.message || 'Ошибка завершения активности');
      }
    } catch {
      setErrorMessage('Сетевая ошибка при завершении');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccelerateDemo = async () => {
    setActionLoading(true);
    try {
      const nextStatus = meetup?.status === 'gathering' ? 'active' : 'completed';
      const res = await fetch(`/api/meetups/${meetupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchMeetup();
        if (onMeetupChanged) onMeetupChanged();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenShareCard = async () => {
    try {
      const res = await fetch(`/api/meetups/${meetupId}/share-card`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.card) {
          setShareCardData(data.card);
          setIsShareOpen(true);
        }
      }
    } catch {
      setErrorMessage('Не удалось загрузить карточку');
    }
  };

  if (loading || !meetup) {
    return (
      <div className="fixed inset-0 z-40 bg-[#0A0E17] flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4">
        <span className="text-4xl animate-bounce">🔥</span>
        <div className="text-sm font-semibold">Загружаем Live-экран активности...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0E17] flex flex-col overflow-hidden text-slate-100">
      {/* Top Navigation Bar */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700"
        >
          <span>←</span>
          <span>Карта</span>
        </button>

        <div className="flex flex-col items-center max-w-[200px] truncate">
          <div className="flex items-center gap-1 text-sm font-black text-white truncate">
            <span>{meetup.activityIcon}</span>
            <span className="truncate">{meetup.activityTitle}</span>
          </div>
          <div className="text-[10px] text-amber-400 font-medium truncate">
            {meetup.zoneName}
          </div>
        </div>

        {/* Safety SOS button */}
        <button
          onClick={() => {
            setSafetyTargetUser(null);
            setIsSafetyOpen(true);
          }}
          className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)]"
        >
          <span>🛡️</span>
          <span>112</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Dynamic Lifecycle Status Banner */}
        {meetup.status === 'gathering' && (
          <div className="p-4 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Сбор группы (Gathering)
              </span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                Старт через {timeLeftFormatted}
              </span>
            </div>

            <h3 className="text-base font-black text-white mb-1">
              Встречаемся: {meetup.publicPlaceName}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {meetup.safeDescription || 'Спонтанная группа без оплаты и приватных встреч.'}
            </p>

            {/* Slots bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Занято мест: {meetup.occupiedSlots} из {meetup.capacity}</span>
                <span>Свободно: {meetup.freeSlots}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(meetup.occupiedSlots / meetup.capacity) * 100}%` }}
                />
              </div>
            </div>

            {/* Demo accelerator button */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">DEMO SHORTCUT:</span>
              <button
                type="button"
                onClick={handleAccelerateDemo}
                disabled={actionLoading}
                className="text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors font-medium"
              >
                ⏩ Начать активность сейчас (DEMO)
              </button>
            </div>
          </div>
        )}

        {meetup.status === 'active' && (
          <div className="p-4 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Активность в процессе (Active)
              </span>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                {meetup.durationMinutes} мин
              </span>
            </div>
            <h3 className="text-base font-black text-white">
              Группа в сборе: {meetup.publicPlaceName}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Отметьтесь на месте для подтверждения присутствия.
            </p>

            {/* Accelerator to complete */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">DEMO SHORTCUT:</span>
              <button
                type="button"
                onClick={handleAccelerateDemo}
                disabled={actionLoading}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-medium"
              >
                ⏩ Завершить досрочно (DEMO)
              </button>
            </div>
          </div>
        )}

        {meetup.status === 'completed' && (
          <div className="p-4 bg-gradient-to-br from-sky-500/15 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl shadow-lg text-center space-y-3">
            <div className="text-3xl animate-bounce">🎉</div>
            <h3 className="text-base font-black text-white">Встреча успешно завершена!</h3>
            <p className="text-xs text-slate-300">
              Чат будет автоматически удалён через 24 часа. Сохраните карточку на память!
            </p>
            <button
              type="button"
              onClick={handleOpenShareCard}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>✨</span>
              <span>Открыть карточку встречи (Share-Card)</span>
            </button>
          </div>
        )}

        {/* Meeting Point & Navigation Guidance */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0">📍</span>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {meetup.publicPlaceName || 'Точка сбора скрыта до вступления'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{meetup.zoneName}</div>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 text-amber-400 font-medium px-2 py-0.5 rounded-full border border-slate-700">
              Одобренное место
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                className="flex-1 py-2 px-2 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-500 font-medium cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                title="Маршрут станет доступен после подключения карты и одобренных точек"
              >
                <span>🗺️</span>
                <span>Яндекс Карты</span>
              </button>
              <button
                type="button"
                disabled
                className="flex-1 py-2 px-2 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-500 font-medium cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                title="Маршрут станет доступен после подключения карты и одобренных точек"
              >
                <span>🧭</span>
                <span>2ГИС</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic">
              Маршрут станет доступен после подключения карты и одобренных точек
            </p>
          </div>
        </div>

        {/* Tab switcher: Chat vs Info & Participants */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-amber-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💬</span>
            <span>Чат активности</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-slate-800 text-amber-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👥</span>
            <span>Участники ({meetup.participants.length})</span>
          </button>
        </div>

        {/* Tab 1: Chat */}
        {activeTab === 'chat' && (
          <DemoChat
            meetupId={meetup.id}
            currentUserId={currentUserId}
            isParticipant={isParticipant}
            onReportUser={(targetId, targetName) => {
              setSafetyTargetUser({ id: targetId, name: targetName });
              setIsSafetyOpen(true);
            }}
            onBlockUser={(targetId, targetName) => {
              setSafetyTargetUser({ id: targetId, name: targetName });
              setIsSafetyOpen(true);
            }}
          />
        )}

        {/* Tab 2: Participants & Details */}
        {activeTab === 'details' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Участники группы
              </div>
              <div className="divide-y divide-slate-800">
                {meetup.participants.map((p) => {
                  const isMe = p.userId === currentUserId;
                  return (
                    <div key={p.userId} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          avatarRef={p.avatarRef}
                          displayName={p.displayName}
                          size="md"
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{p.displayName}</span>
                            {isMe && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal">
                                Вы
                              </span>
                            )}
                            {p.isCreator && (
                              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.2 rounded font-normal">
                                Создатель
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Возраст: {p.ageBand} • Надёжность: {p.reliabilityScore}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.isCheckedIn ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            На месте ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            В пути
                          </span>
                        )}

                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              setSafetyTargetUser({ id: p.userId, name: p.displayName });
                              setIsSafetyOpen(true);
                            }}
                            className="text-slate-500 hover:text-rose-400 text-xs p-1"
                            title="Безопасность / Жалоба"
                          >
                            🛡️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location Specs */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Информация о локации
              </div>
              <div className="text-slate-200">
                <b>Зона:</b> {meetup.zoneName}
              </div>
              <div className="text-slate-200">
                <b>Точка:</b> {meetup.publicPlaceName}
              </div>
              <div className="text-slate-400 text-[11px] pt-1">
                Все активности модерируются в рамках открытых общественных пространств.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="bg-[#0F172A] border-t border-slate-800 p-3 shrink-0">
        <div className="max-w-lg mx-auto flex gap-2">
          {!isParticipant ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={actionLoading || meetup.freeSlots <= 0 || meetup.status === 'completed'}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔥</span>
              <span>Присоединиться к активности ({meetup.freeSlots} мест)</span>
            </button>
          ) : (
            <>
              {/* Check-in button */}
              {meetup.status !== 'completed' && !isCheckedIn && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="flex-[2] py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>📍</span>
                  <span>Я на месте (Check-in)</span>
                </button>
              )}

              {/* Creator complete action */}
              {isCreator && meetup.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="flex-[2] py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🏁</span>
                  <span>Завершить</span>
                </button>
              )}

              {/* Share button if completed */}
              {meetup.status === 'completed' && (
                <button
                  type="button"
                  onClick={handleOpenShareCard}
                  className="flex-[2] py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <span>✨</span>
                  <span>Share-Card</span>
                </button>
              )}

              {/* Leave button */}
              {meetup.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Покинуть
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Safety Help Modal */}
      <SafetyHelpModal
        isOpen={isSafetyOpen}
        meetupId={meetup.id}
        currentUserId={currentUserId}
        targetUser={safetyTargetUser}
        onClose={() => setIsSafetyOpen(false)}
        onReportSubmitted={() => {
          fetchMeetup();
        }}
        onUserBlocked={() => {
          fetchMeetup();
          onClose();
        }}
      />

      {/* Share Card Modal */}
      <ShareCardModal
        isOpen={isShareOpen}
        cardData={shareCardData}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
