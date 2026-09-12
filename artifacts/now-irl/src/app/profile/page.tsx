import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, ShieldCheck, Star, UserRound } from "lucide-react";
import { Link, useRouter } from "@/lib/next-compat";
import { Badge } from "@workspace/now-design-system/components/ui/badge";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { Input } from "@workspace/now-design-system/components/ui/input";

type Profile = { displayName: string; bio: string; reliabilityScore: number; ageBand?: string; interestIds?: string[]; avatarRef?: string };
const labels: Record<string, string> = { walking: "Прогулки", coffee: "Кофе", football: "Футбол", board_games: "Настольные игры", study: "Учёба", workout: "Воркаут" };

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { void fetch("/api/profile").then((response) => response.json()).then((data) => { setProfile(data.profile); setName(data.profile?.displayName ?? ""); }).catch(() => undefined); }, []);
  const save = async () => { const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, bio: profile?.bio ?? "", interestIds: profile?.interestIds ?? [] }) }); if (response.ok) { setSaved(true); setProfile((current) => current ? { ...current, displayName: name } : current); } };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/welcome"); };
  if (!profile) return <div className="mx-auto max-w-md px-4 py-16"><div className="h-48 animate-pulse rounded-3xl bg-secondary" /></div>;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-28 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />К активностям</Link>
      <div className="mt-8 flex items-end justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10 text-primary"><UserRound className="size-7" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Ваш профиль</p><h1 className="mt-1 text-3xl font-black">{profile.displayName}</h1></div></div><Badge className="gap-1 rounded-full bg-chart-3/10 text-chart-3"><ShieldCheck className="size-3" />{profile.reliabilityScore}%</Badge></div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 bg-card p-5"><div className="flex items-center gap-2"><UserRound className="size-4 text-primary" /><h2 className="font-bold">О вас</h2></div><Input className="mt-4 h-11 rounded-2xl" value={name} onChange={(event) => setName(event.target.value)} /><Button className="mt-3 w-full rounded-2xl" onClick={() => void save()}>{saved ? "Сохранено" : "Сохранить изменения"}</Button></Card>
        <Card className="border-border/80 bg-card p-5"><div className="flex items-center gap-2"><Star className="size-4 text-chart-1" /><h2 className="font-bold">О вашей надёжности</h2></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Индекс отражает соблюдение правил и пунктуальность. Это не гарантия безопасности — встречайтесь только в открытых местах.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-chart-3" style={{ width: `${profile.reliabilityScore}%` }} /></div></Card>
        <Card className="border-border/80 bg-card p-5 md:col-span-2"><h2 className="font-bold">Ваши интересы</h2><div className="mt-4 flex flex-wrap gap-2">{(profile.interestIds ?? []).map((id) => <Badge key={id} variant="secondary" className="rounded-full px-3 py-1.5">{labels[id] ?? id}</Badge>)}</div></Card>
      </div>
      <Button variant="outline" className="mt-6 h-11 w-full rounded-2xl text-destructive hover:text-destructive" onClick={() => void logout()}><LogOut className="size-4" />Выйти из demo</Button>
    </div>
  );
}