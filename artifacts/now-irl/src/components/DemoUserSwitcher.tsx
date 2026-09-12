'use client';

import React, { useState } from 'react';
import { DEMO_USERS, DemoUser } from '@/lib/demo-data';


interface DemoUserSwitcherProps {
  currentUser: DemoUser;
  onSelectUser: (user: DemoUser) => void;
}

export const DemoUserSwitcher: React.FC<DemoUserSwitcherProps> = ({
  currentUser,
  onSelectUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 hover:border-orange-500/60 transition-colors text-xs"
        title="Сменить DEMO-пользователя"
      >
        <div className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-[10px]">
          👤
        </div>
        <span className="font-bold text-slate-200 text-[11px] truncate max-w-[100px]">
          {currentUser.displayName}
        </span>
        <span className="text-[9px] text-orange-400">▼</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-8 z-50 w-56 rounded-2xl bg-[#0F172A] border border-slate-700 p-2 shadow-2xl space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
              Войти как DEMO-пользователь
            </div>
            {DEMO_USERS.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300 font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">👤</span>
                    <span>{u.displayName}</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">
                    ★{u.reliabilityScore}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
