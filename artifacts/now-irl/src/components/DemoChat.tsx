'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  meetupId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface DemoChatProps {
  meetupId: string;
  currentUserId: string;
  isParticipant: boolean;
  onReportUser?: (targetUserId: string, targetName: string) => void;
  onBlockUser?: (targetUserId: string, targetName: string) => void;
}

export function DemoChat({
  meetupId,
  currentUserId,
  isParticipant,
  onReportUser,
  onBlockUser,
}: DemoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!isParticipant) return;
    try {
      const res = await fetch(`/api/meetups/${meetupId}/messages?userId=${encodeURIComponent(currentUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Background poll silently fails
    }
  }, [meetupId, currentUserId, isParticipant]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isSending || !isParticipant) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/meetups/${meetupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Ошибка отправки сообщения');
        setIsSending(false);
        return;
      }

      setInput('');
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      setErrorMsg('Сетевая ошибка при отправке');
    } finally {
      setIsSending(false);
    }
  };

  const quickTemplates = [
    'Я уже на месте!',
    'Буду через 5 минут',
    'В чём вы одеты? Я возле входа',
    'Отличная встреча!',
  ];

  if (!isParticipant) {
    return (
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
        <span className="text-3xl">🔒</span>
        <h4 className="text-sm font-semibold text-slate-300">Чат доступен только подтверждённым участникам</h4>
        <p className="text-xs text-slate-500">Присоединитесь к Огоньку, чтобы координировать встречу с группой.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[420px] bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Ephemeral banner */}
      <div className="bg-slate-950/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400">⚡</span>
          <span>Чат активности (автоочистка через 24 ч, Zero-PII)</span>
        </div>
        <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
          LIVE
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-12">
            Сообщений пока нет. Напишите первым или используйте быстрый шаблон!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isMe ? 'Вы' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isMe && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {onReportUser && (
                        <button
                          type="button"
                          onClick={() => onReportUser(msg.senderId, msg.senderName)}
                          title="Пожаловаться"
                          className="text-slate-500 hover:text-amber-400 px-1"
                        >
                          🚩
                        </button>
                      )}
                      {onBlockUser && (
                        <button
                          type="button"
                          onClick={() => onBlockUser(msg.senderId, msg.senderName)}
                          title="Заблокировать"
                          className="text-slate-500 hover:text-rose-400 px-1"
                        >
                          🚫
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs break-words shadow-sm ${
                    isMe
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="px-3 py-1.5 bg-rose-500/20 border-t border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Quick templates chips */}
      <div className="px-3 py-2 bg-slate-950/50 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickTemplates.map((template, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(template)}
            disabled={isSending}
            className="whitespace-nowrap text-[11px] bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition-colors shrink-0"
          >
            {template}
          </button>
        ))}
      </div>

      {/* Message input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Сообщение координации (макс. 200 симв.)..."
          maxLength={200}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1"
        >
          {isSending ? '...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
