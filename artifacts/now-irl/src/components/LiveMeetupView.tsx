import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, CircleAlert, Clock3, MapPin, MessageCircle, Send, ShieldCheck, Users, X } from "lucide-react";
import { Badge } from "@workspace/now-design-system/components/ui/badge";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { cn } from "@workspace/now-design-system/lib/utils";

type Meetup = {
  id: string;
  activityTitle: string;
  activityTypeId: string;
  zoneName: string;
  publicPlaceName: string;
  safeDescription?: string;
  capacity: number;
  occupiedSlots: number;
  startsAt: string;
  status: string;
  participantSilhouettes?: string[];
  isUserJoined?: boolean;
};

type Message = { id: string; displayName: string; body: string; createdAt: string };

const activityClass: Record<string, string> = { walking: "activity-walk", coffee: "activity-coffee", football: "activity-sport", workout: "activity-sport", board_games: "activity-games", study: "activity-study" };
const formatTime = (date: string) => { const minutes = Math.max(0, Math.round((new Date(date).getTime() - Date.now()) / 60000)); return minutes <= 0 ? "сейчас" : `через ${minutes} мин`; };

export function LiveMeetupView({ meetupId, currentUserId, onClose }: { meetupId: string; currentUserId: string; onClose: () => void }) {
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareCard, setShareCard] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [meetupResponse, messagesResponse] = await Promise.all([fetch(`/api/meetups/${meetupId}`), fetch(`/api/meetups/${meetupId}/messages`)]);
    if (!meetupResponse.ok) { setError("Активность не найдена."); return; }
    const meetupData = await meetupResponse.json();
    const messagesData = await messagesResponse.json();
    setMeetup(meetupData.meetup);
    setMessages(messagesData.messages ?? []);
  }, [meetupId]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);

  const action = async (path: string, body: object) => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/meetups/${meetupId}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!response.ok) { setError("Действие не выполнилось. Попробуйте ещё раз."); return; }
    await load();
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    await fetch(`/api/meetups/${meetupId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUserId, body: message.trim() }) });
    setMessage("");
    await load();
  };

  const openShareCard = async () => {
    const response = await fetch(`/api/meetups/${meetupId}/share-card`);
    const data = await response.json();
    if (response.ok) setShareCard(data.card?.title ?? "Встреча завершена — спасибо, что вышли в город.");
  };

  if (!meetup) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background text-muted-foreground"><div className="text-center"><div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm">{error || "Открываем активность…"}</p><Button variant="ghost" className="mt-4" onClick={onClose}>Вернуться назад</Button></div></div>;
  const remaining = Math.max(0, meetup.capacity - meetup.occupiedSlots);
  const joined = Boolean(meetup.isUserJoined);
  const live = meetup.status === "live" || meetup.status === "active";

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-8 sm:px-6">
        <div className="flex items-center justify-between border-b border-border/80 py-4">
          <Button variant="ghost" className="gap-2 px-2 text-muted-foreground" onClick={onClose}><ArrowLeft className="size-4" />К карте</Button>
          <Badge className={cn("rounded-full bg-primary/10 text-primary", activityClass[meetup.activityTypeId] ?? "activity-walk")}>{live ? "идёт сейчас" : meetup.status === "completed" ? "завершено" : "сбор группы"}</Badge>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть"><X /></Button>
        </div>
        <div className="pt-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Live activity</p><h1 className="mt-2 text-3xl font-black tracking-tight">{meetup.activityTitle}</h1><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{meetup.publicPlaceName} · {meetup.zoneName}</p></div><div className={cn("flex size-14 items-center justify-center rounded-2xl bg-current/10 text-current", activityClass[meetup.activityTypeId] ?? "activity-walk")}><Users className="size-6" /></div></div>
          <Card className={cn("mt-6 border-border/80 bg-card p-5", activityClass[meetup.activityTypeId] ?? "activity-walk")}>
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4" />{meetup.status === "completed" ? "Встреча завершена" : formatTime(meetup.startsAt)}</span><span className="font-semibold text-foreground">{meetup.occupiedSlots}/{meetup.capacity} участников</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-current transition-all" style={{ width: `${Math.min(100, (meetup.occupiedSlots / meetup.capacity) * 100)}%` }} /></div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{meetup.safeDescription || "Открытая активность в одобренном публичном месте."}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-chart-3" />Безопасная публичная зона · точные координаты не показываем</div>
          </Card>
          {error && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><CircleAlert className="size-4" />{error}</div>}
          <div className="mt-4 flex gap-2">
            {!joined && meetup.status !== "completed" ? <Button className="h-11 flex-1 rounded-2xl" disabled={busy || !remaining} onClick={() => void action("join", { userId: currentUserId })}>Присоединиться{remaining ? ` · ${remaining} мест` : ""}</Button> : joined && !live && meetup.status !== "completed" ? <Button className="h-11 flex-1 rounded-2xl" disabled={busy} onClick={() => void action("check-in", { userId: currentUserId })}><Check className="size-4" />Я на месте</Button> : meetup.status === "completed" ? <Button className="h-11 flex-1 rounded-2xl" onClick={() => void openShareCard()}><CheckCircle2 className="size-4" />Карточка встречи</Button> : <Button variant="secondary" className="h-11 flex-1 rounded-2xl" disabled>Активность идёт</Button>}
            {joined && meetup.status !== "completed" && <Button variant="outline" className="h-11 rounded-2xl" disabled={busy} onClick={() => void action("leave", { userId: currentUserId })}>Выйти</Button>}
          </div>
          {joined && live && <Button variant="outline" className="mt-2 h-11 w-full rounded-2xl" disabled={busy} onClick={() => void action("complete", { actorId: currentUserId })}>Завершить активность</Button>}
          <section className="mt-8">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><MessageCircle className="size-4 text-primary" />Чат активности</h2><span className="text-xs text-muted-foreground">Удалится автоматически</span></div>
            <Card className="mt-3 border-border/80 bg-card p-4">
              <div className="max-h-56 space-y-3 overflow-y-auto">{messages.length ? messages.map((item) => <div key={item.id} className="rounded-2xl bg-secondary/60 px-3 py-2"><p className="text-[11px] font-semibold text-primary">{item.displayName}</p><p className="mt-1 text-sm text-foreground">{item.body}</p></div>) : <p className="py-6 text-center text-sm text-muted-foreground">Напишите первое сообщение группе.</p>}</div>
              <form onSubmit={sendMessage} className="mt-4 flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={joined ? "Написать группе…" : "Вступите, чтобы писать"} disabled={!joined} className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button size="icon" className="size-11 rounded-2xl" disabled={!joined || !message.trim()} aria-label="Отправить сообщение"><Send className="size-4" /></Button></form>
            </Card>
          </section>
        </div>
        {shareCard && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setShareCard(null)}><Card className="w-full max-w-sm border-primary/30 bg-card p-6 text-center" onClick={(event) => event.stopPropagation()}><CheckCircle2 className="mx-auto size-10 text-chart-3" /><h2 className="mt-4 text-xl font-bold">{shareCard}</h2><p className="mt-2 text-sm text-muted-foreground">Спасибо, что выбрали живую встречу.</p><Button className="mt-6 w-full rounded-2xl" onClick={() => setShareCard(null)}>Готово</Button></Card></div>}
      </div>
    </div>
  );
}