'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WHITELIST_INTERESTS, InterestItem, ProfileValidator } from '@/domain/profile/interest-catalog';
import { UserAvatar } from '@/components/UserAvatar';

const SILHOUETTES = [
  { id: '/avatars/silhouette-1.svg', label: 'Классик' },
  { id: '/avatars/silhouette-2.svg', label: 'Бегун' },
  { id: '/avatars/silhouette-3.svg', label: 'Ходок' },
  { id: '/avatars/silhouette-4.svg', label: 'Энергия' },
  { id: '/avatars/silhouette-5.svg', label: 'Учёный' },
  { id: '/avatars/silhouette-6.svg', label: 'Уют' },
  { id: '/avatars/silhouette-7.svg', label: 'Геймер' },
  { id: '/avatars/silhouette-8.svg', label: 'Исследователь' },
];

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['walk', 'coffee']);
  const [interestSearch, setInterestSearch] = useState('');
  const [avatarRef, setAvatarRef] = useState<string>('/avatars/silhouette-1.svg');
  const [showAgeBandAndInterests, setShowAgeBandAndInterests] = useState(true);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.displayName && data.profile.displayName !== 'Новый участник') {
            setDisplayName(data.profile.displayName);
          }
          if (data.profile?.bio) {
            setBio(data.profile.bio);
          }
          if (data.profile?.avatarRef) {
            setAvatarRef(data.profile.avatarRef);
          }
          if (data.profile?.showAgeBandAndInterests !== undefined) {
            setShowAgeBandAndInterests(data.profile.showAgeBandAndInterests);
          }
          if (data.interests && data.interests.length > 0) {
            setSelectedInterests(data.interests.map((i: any) => i.id));
          }
        }
      } catch {
        // ignore
      }
    }
    loadProfile();
  }, []);

  // Filtered interests by search query
  const filteredInterests = useMemo(() => {
    const q = interestSearch.trim().toLowerCase();
    if (!q) return WHITELIST_INTERESTS;
    return WHITELIST_INTERESTS.filter(
      (i) => i.labelRu.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
    );
  }, [interestSearch]);

  const toggleInterest = (id: string) => {
    setError(null);
    if (selectedInterests.includes(id)) {
      if (selectedInterests.length <= 1) {
        setError('Выберите хотя бы один интерес.');
        return;
      }
      setSelectedInterests(selectedInterests.filter((i) => i !== id));
    } else {
      if (selectedInterests.length >= ProfileValidator.MAX_INTERESTS) {
        setError(`Можно выбрать не более ${ProfileValidator.MAX_INTERESTS} интересов.`);
        return;
      }
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    // Client-side quick check
    if (file.size > 3 * 1024 * 1024) {
      setError('Файл превышает лимит 3 МБ.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Поддерживаются только форматы JPG, PNG и WebP.');
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAvatarRef(data.avatarRef);
        setSuccessMsg('Аватар успешно обновлён (Local Test).');
      } else {
        setError(data.message || data.error || 'Ошибка загрузки аватара.');
      }
    } catch {
      setError('Ошибка соединения с сервером при загрузке.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = async () => {
    setError(null);
    setIsUploadingAvatar(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setAvatarRef(data.avatarRef);
        setSuccessMsg('Аватар сброшен к базовому силуэту.');
      }
    } catch {
      setAvatarRef('/avatars/silhouette-1.svg');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validation = ProfileValidator.validateProfile({
      displayName,
      bio: bio || undefined,
      interestIds: selectedInterests,
    });

    if (!validation.valid) {
      setError(validation.error || 'Пожалуйста, проверьте введённые данные.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: validation.sanitizedName,
          bio: validation.sanitizedBio,
          interestIds: selectedInterests,
          avatarRef,
          showAgeBandAndInterests,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Ошибка сохранения профиля.');
        setIsLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Ошибка соединения с сервером при сохранении.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-md mx-auto px-4 py-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-xl font-bold text-white">Профиль участника</h1>
          <p className="text-xs text-slate-400">
            Безопасный профиль: без персональных данных, контактов и обязательного фото
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Avatar Preview & Preset Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Аватар профиля
              </label>
              {avatarRef.startsWith('/uploads/') && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  disabled={isUploadingAvatar}
                  className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Вернуть силуэт
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <UserAvatar avatarRef={avatarRef} displayName={displayName || 'Вы'} size="lg" />
              <div className="space-y-1">
                <div className="text-xs font-medium text-white">
                  {avatarRef.startsWith('/uploads/') ? 'Пользовательское фото' : 'Анонимный силуэт'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {avatarRef.startsWith('/uploads/')
                    ? 'Тестовая загрузка (Local Test Mode)'
                    : 'Защищает вашу приватность до реальной встречи'}
                </div>
              </div>
            </div>

            {/* Silhouette Presets Grid */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Выберите готовый силуэт:</span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {SILHOUETTES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAvatarRef(s.id)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      avatarRef === s.id
                        ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <UserAvatar avatarRef={s.id} size="sm" showBorder={false} />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Local Test Avatar Upload Button */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>📷</span>
                <span>
                  {isUploadingAvatar ? 'Загрузка...' : 'Загрузить своё фото (Local Test)'}
                </span>
              </button>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                JPG, PNG, WebP до 3 МБ. В production потребуется внешнее хранилище.
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-xs font-semibold text-slate-300">
              Имя или никнейм
            </label>
            <input
              id="displayName"
              type="text"
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Например: Алекс"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
            <p className="text-[10px] text-slate-500">От 2 до 30 символов. Ссылки и контакты запрещены.</p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-xs font-semibold text-slate-300">
              О себе <span className="text-slate-500 font-normal">(опционально)</span>
            </label>
            <textarea
              id="bio"
              rows={2}
              maxLength={150}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Люблю прогулки, спорт и настольные игры..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
            <div className="flex justify-end text-[10px] text-slate-500">
              {bio.length} / 150
            </div>
          </div>

          {/* Interest Chips (1 to 5) with search filter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300">
                Интересы (выберите от 1 до 5)
              </label>
              <span
                className={`text-[11px] font-mono ${
                  selectedInterests.length === 5
                    ? 'text-amber-400 font-bold'
                    : selectedInterests.length === 0
                    ? 'text-rose-400 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {selectedInterests.length} / 5
              </span>
            </div>

            {/* Filter Search Input */}
            <input
              type="text"
              value={interestSearch}
              onChange={(e) => setInterestSearch(e.target.value)}
              placeholder="🔍 Найти интерес..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
            />

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 py-1">
              {filteredInterests.map((int: InterestItem) => {
                const isSelected = selectedInterests.includes(int.id);
                return (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => toggleInterest(int.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{int.icon}</span>
                    <span>{int.labelRu}</span>
                  </button>
                );
              })}
              {filteredInterests.length === 0 && (
                <div className="w-full py-3 text-center text-xs text-slate-500">
                  Интерес не найден
                </div>
              )}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300 pr-2">
                Показывать возрастную группу и интересы в карточке встречи
              </span>
              <input
                type="checkbox"
                checked={showAgeBandAndInterests}
                onChange={(e) => setShowAgeBandAndInterests(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-orange-500 focus:ring-0 w-4 h-4"
              />
            </label>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <span>Сохранение...</span> : <span>Завершить настройку</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
