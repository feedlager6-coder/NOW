import type { Metadata, Viewport } from 'next';
import './globals.css';
import React from 'react';

export const metadata: Metadata = {
  title: 'NOW / IRL — Спонтанные встречи в реальном времени [DEMO]',
  description:
    'Координатор спонтанных офлайн-активностей для взрослых 18+ в проверенных публичных зонах. Без профилей, без свиданий, без оплаты. Живые Огоньки.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="flex flex-col min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-orange-500 selection:text-white font-sans">
        {/* Persistent prominent DEMO badge across all views */}
        <aside
          role="region"
          aria-label="Demo notice"
          className="sticky top-0 z-50 w-full bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-lg flex items-center justify-center gap-2"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
          <span>DEMO PROTOTYPE — SPONTANEOUS GROUP MEETUP — NOT FOR REAL EMERGENCIES</span>
        </aside>

        <header className="border-b border-slate-800/80 bg-[#0F172A]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-[30px] z-40">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <span className="text-orange-500 font-black text-lg">🔥</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-wider text-white">NOW</span>
                <span className="text-orange-500 font-black">/</span>
                <span className="font-black text-lg tracking-wider text-slate-300">IRL</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">DEMO CITY • 5 зон</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#safety"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 border border-rose-700/50 text-rose-300 hover:bg-rose-900/60 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>SOS / 112</span>
            </a>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="border-t border-slate-900 bg-[#080C14] py-6 px-4 text-center text-xs text-slate-500">
          <p className="mb-2 font-medium text-slate-400">
            NOW / IRL — Спонтанный координатор офлайн-активностей в публичных зонах.
          </p>
          <p className="text-[11px] text-slate-600 max-w-md mx-auto">
            Строго 18+. Сервис полностью бесплатен. Никаких свиданий, платного эскорта или закрытых приватных комнат.
          </p>
        </footer>
      </body>
    </html>
  );
}
