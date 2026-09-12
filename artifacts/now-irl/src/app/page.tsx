import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "@/lib/next-compat";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Coffee,
  Dices,
  Dumbbell,
  Footprints,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@workspace/now-design-system/components/ui/badge";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { Input } from "@workspace/now-design-system/components/ui/input";
import { cn } from "@workspace/now-design-system/lib/utils";

type Meetup = {
  id: string;
  activityTypeId: string;
  activityTitle: string;
  activityIcon: string;
  zoneName: string;
  publicPlaceName: string;
  distanceBand: string;
  safeDescription: string;
  capacity: number;
  occupiedSlots: number;
  startsAt: string;
  status: string;
  participantSilhouettes: string[];
};

const filters = [
  { id: "all", label: "Все активности", icon: Sparkles },
  { id: "walking", label: "Прогулка", icon: Footprints },
  { id: "coffee", label: "Кофе", icon: Coffee },
  { id: "sports", label: "Спорт", icon: Trophy },
  { id: "board_games", label: "Игры", icon: Dices },
  { id: "study", label: "Учёба", icon: CalendarClock },
];

const activityStyles: Record<string, string> = {
  walking: "activity-walk",
  coffee: "activity-coffee",
  football: "activity-sport",
  sports_viewing: "activity-sport",
  workout: "activity-sport",
  board_games: "activity-games",
  study: "activity-study",
};

const activityIcons: Record<string, typeof Sparkles> = {
  walking: Footprints,
  walk: Footprints,
  coffee: Coffee,
  football: Trophy,
  sports_viewing: Trophy,
  workout: Dumbbell,
  board_games: Dices,
  study: CalendarClock,
};

const formatStart = (date: string) => {
  const minutes = Math.max(0, Math.round((new Date(date).getTime() - Date.now()) / 60000));
  return minutes <= 1 ? "уже начинается" : `через ${minutes} мин`;
};

function AvatarStack({ count }: { count: number }) {
  return (
    <div className="flex items-center">
      {Array.from({ length: Math.min(count, 4) }, (_, index) => (
        <span
          key={index}
          className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-muted-foreground first:ml-0"
        >
          {String.fromCharCode(65 + index)}
        </span>
      ))}
    </div>
  );
}

function CityLights({ meetups, selectedId, onSelect }: { meetups: Meetup[]; selectedId?: string; onSelect: (meetup: Meetup) => void }) {
  return (
    <Card className="city-lights relative min-h-[285px] overflow-hidden border-primary/20 bg-card p-0">
      <div className="absolute inset-0 city-grid opacity-70" />
      <div className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex min-h-[285px] flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="gap-2 rounded-full border border-primary/30 bg-primary/10 text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              CITY LIGHTS
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">Город просыпается вокруг вас</p>
          </div>
          <span className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Demo City
          </span>
        </div>
        <div className="relative mx-auto h-32 w-full max-w-md">
          <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/20 shadow-[0_0_70px_hsl(var(--primary)/.5)]">
            <div className="absolute inset-2 rounded-full bg-primary shadow-[0_0_30px_hsl(var(--primary))]" />
          </div>
          {meetups.map((meetup, index) => {
            const left = [17, 74, 33, 82, 51][index % 5];
            const top = [58, 26, 13, 70, 46][index % 5];
            const active = selectedId === meetup.id;
            return (
              <button
                key={meetup.id}
                type="button"
                aria-label={`Открыть активность ${meetup.activityTitle}`}
                onClick={() => onSelect(meetup)}
                className={cn("city-pin absolute", activityStyles[meetup.activityTypeId] ?? "activity-walk", active && "is-selected")}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className="city-pin-core">{index + 1}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-border/70 pt-4 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-3.5 text-primary" /> 5 безопасных зон рядом</span>
          <span className="font-semibold text-foreground">{meetups.length} активностей сейчас</span>
        </div>
      </div>
    </Card>
  );
}

function MeetupCard({ meetup, onSelect }: { meetup: Meetup; onSelect: (meetup: Meetup) => void }) {
  const Icon = activityIcons[meetup.activityTypeId] ?? Sparkles;
  const remaining = Math.max(0, meetup.capacity - meetup.occupiedSlots);
  return (
    <button type="button" className="w-full text-left" onClick={() => onSelect(meetup)} data-testid={`card-meetup-${meetup.id}`}>
      <Card className={cn("meetup-card group border-border/80 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50", activityStyles[meetup.activityTypeId] ?? "activity-walk")}>
        <div className="flex gap-4">
          <div className="activity-icon mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-current/10 text-current">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-current/80">{meetup.activityTitle}</p>
                <h3 className="mt-1 truncate text-base font-bold text-foreground">{meetup.publicPlaceName || meetup.zoneName}</h3>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{meetup.distanceBand}</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{meetup.safeDescription}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {meetup.occupiedSlots}/{meetup.capacity}</span>
              <span className="flex items-center gap-1.5"><CalendarClock className="size-3.5" /> {formatStart(meetup.startsAt)}</span>
              <span className={cn("ml-auto font-semibold", remaining === 1 ? "text-destructive" : "text-chart-3")}>{remaining ? `${remaining} мест` : "заполнено"}</span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}

function MeetupSheet({ meetup, onClose, onJoined }: { meetup: Meetup; onClose: () => void; onJoined: (id: string) => void }) {
  const remaining = Math.max(0, meetup.capacity - meetup.occupiedSlots);
  const Icon = activityIcons[meetup.activityTypeId] ?? Sparkles;
  const join = async () => {
    const response = await fetch(`/api/meetups/${meetup.id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo-user-alex" }) });
    if (response.ok) onJoined(meetup.id);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <Card className="w-full max-w-lg rounded-b-none rounded-t-[28px] border-border bg-card p-5 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className={cn("flex size-12 items-center justify-center rounded-2xl bg-current/10 text-current", activityStyles[meetup.activityTypeId] ?? "activity-walk")}><Icon /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Открытая активность</p><h2 className="mt-1 text-xl font-bold">{meetup.activityTitle}</h2></div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-secondary/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Где</p><p className="mt-1 text-sm font-semibold">{meetup.publicPlaceName}</p></div>
          <div className="rounded-2xl bg-secondary/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Когда</p><p className="mt-1 text-sm font-semibold">{formatStart(meetup.startsAt)}</p></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{meetup.safeDescription || "Встреча в открытом публичном месте. Без приватных адресов и оплаты."}</p>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/80 p-3">
          <div className="flex items-center gap-3"><AvatarStack count={meetup.occupiedSlots} /><span className="text-xs text-muted-foreground">{meetup.occupiedSlots} уже идут</span></div>
          <Badge variant={remaining === 1 ? "destructive" : "secondary"}>{remaining ? `${remaining} мест осталось` : "Мест нет"}</Badge>
        </div>
        <Button className="mt-5 h-12 w-full gap-2 rounded-2xl" disabled={!remaining} onClick={join}><Check className="size-4" />{remaining ? "Присоединиться" : "Активность заполнена"}</Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-chart-3" /> только публичные зоны · безопасность прежде всего</p>
      </Card>
    </div>
  );
}

function CreateMeetup({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [activity, setActivity] = useState("walking");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!place.trim()) return;
    setPending(true);
    const response = await fetch("/api/meetups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityTypeId: activity, zoneId: "DEMO_ZONE_CENTER", publicPlaceName: place, startsInMinutes: 15, capacity: 4, safeDescription: note }) });
    setPending(false);
    if (response.ok) onCreated();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <Card className="w-full max-w-lg rounded-b-none rounded-t-[28px] border-border bg-card p-5 sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Новая активность</p><h2 className="mt-1 text-xl font-bold">Зажечь огонёк</h2></div><Button size="icon" variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button></div>
        <form className="mt-5 space-y-4" onSubmit={create}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{filters.slice(1, 5).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActivity(id)} className={cn("rounded-2xl border p-3 text-left transition-colors", activity === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground")}><Icon className="size-4" /><span className="mt-2 block text-xs font-semibold">{label}</span></button>)}</div>
          <div><label htmlFor="meetup-place" className="mb-2 block text-xs font-semibold text-muted-foreground">Публичная точка сбора</label><Input id="meetup-place" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Например, у главного входа" className="h-12 rounded-2xl" required /></div>
          <div><label htmlFor="meetup-note" className="mb-2 block text-xs font-semibold text-muted-foreground">Комментарий для группы <span className="font-normal">(необязательно)</span></label><Input id="meetup-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Что важно знать участникам?" className="h-12 rounded-2xl" /></div>
          <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />Только открытые общественные места. Не указывайте домашние адреса или личные контакты.</div>
          <Button className="h-12 w-full rounded-2xl" disabled={pending || !place.trim()}>{pending ? "Создаём…" : "Создать активность"}</Button>
        </form>
      </Card>
    </div>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState("all");
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selected, setSelected] = useState<Meetup | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const query = filter === "all" ? "" : `&category=${filter}`;
      const response = await fetch(`/api/meetups?mode=demo${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("meetups");
      const data = await response.json();
      setMeetups(data.meetups ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); void load(); }, [filter]);
  const liveCount = meetups.length;
  const headline = useMemo(() => (liveCount ? `${liveCount} огонька уже активны` : "Город ждёт первый план"), [liveCount]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><span className="size-2 animate-pulse rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))]" />Город живёт сейчас</div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl">Планы не нужно откладывать на потом.</h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">Откройте живые активности рядом, выберите своё настроение и присоединитесь к людям в безопасном публичном месте.</p>
          <div className="flex flex-wrap items-center gap-3"><Button className="h-12 gap-2 rounded-2xl px-5" onClick={() => setCreateOpen(true)}><Plus className="size-5" />Собрать компанию</Button><Link href="/welcome" className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground">Как это работает</Link></div>
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-chart-3" />публичные места</span><span className="flex items-center gap-1.5"><Users className="size-4 text-primary" />18+ и без свайпов</span></div>
        </div>
        <CityLights meetups={meetups} selectedId={selected?.id} onSelect={setSelected} />
      </section>
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Вокруг вас</p><h2 className="mt-1 text-2xl font-bold">{headline}</h2></div><span className="hidden text-xs text-muted-foreground sm:block">Обновляется автоматически</span></div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{filters.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant={filter === id ? "default" : "outline"} className="h-10 shrink-0 gap-2 rounded-full px-4" onClick={() => setFilter(id)}><Icon className="size-4" />{label}</Button>)}</div>
        {loading ? <div className="mt-4 grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-secondary/70" />)}</div> : error ? <Card className="mt-4 border-destructive/30 p-8 text-center"><p className="font-semibold text-destructive">Не удалось обновить активности</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => void load()}>Повторить</Button></Card> : meetups.length === 0 ? <Card className="mt-4 p-10 text-center"><Sparkles className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">Пока тихо</p><p className="mt-1 text-sm text-muted-foreground">Зажгите первый огонёк в городе.</p></Card> : <div className="mt-4 grid gap-3 md:grid-cols-2">{meetups.map((meetup) => <MeetupCard key={meetup.id} meetup={meetup} onSelect={setSelected} />)}</div>}
      </section>
      {selected && <MeetupSheet meetup={selected} onClose={() => setSelected(null)} onJoined={(id) => navigate(`/meetups/${id}`)} />}
      {createOpen && <CreateMeetup onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); void load(); }} />}
    </div>
  );
}