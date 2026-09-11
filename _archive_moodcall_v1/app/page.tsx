import React from 'react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full">
      {/* Hero section */}
      <section className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs font-semibold">
          <span>Безопасные встречи по интересам</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
          Найди собеседника для разговора, прогулки или кофе в публичном месте
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Платформа платного социального сопровождения и интеллектуального общения.
          Выберите компаньона по стилю и увлечениям: Alt, Goth, Gamer, Anime, Metal, Coffee, Books.
        </p>
      </section>

      {/* Safety & Anti-Goals Grid */}
      <section className="grid sm:grid-cols-3 gap-4 w-full mb-12">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-purple-400 font-bold text-sm">🔒 Строго 18+</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Вход доступен исключительно для совершеннолетних пользователей после подтверждения возраста.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-emerald-400 font-bold text-sm">🏛 Только публичные зоны</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Встречи разрешены только в открытых верифицированных локациях (набережные, парки, открытые фудкорты).
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-amber-400 font-bold text-sm">🛡 Никакого интима</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Платформа категорически запрещает интимные и эскорт-услуги. Прикосновения не являются частью тарифа.
          </p>
        </div>
      </section>

      {/* Demo status alert */}
      <section className="w-full p-6 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs sm:text-sm space-y-2">
        <h2 className="font-bold uppercase tracking-wider flex items-center gap-2 text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Режим демонстрации (MVP Prototype)
        </h2>
        <p className="text-amber-200/80 leading-relaxed">
          Текущая версия является демонстрационным стендом функционала (Срез 1: Базовый каркас).
          База данных содержит исключительно демонстрационные вымышленные зоны (`DEMO_PUBLIC_ZONE_1..3`) и синтетические профили `[DEMO]`.
          Реальные списания денег, настоящие бронирования и отправка SMS отключены.
        </p>
      </section>
    </div>
  );
}
