import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, CircleUserRound, Sparkles } from "lucide-react";
import { useRouter } from "@/lib/next-compat";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { Input } from "@workspace/now-design-system/components/ui/input";

const options = [
  ["walking", "Прогулки"],
  ["coffee", "Кофе"],
  ["football", "Футбол"],
  ["board_games", "Настольные игры"],
  ["study", "Учёба"],
  ["workout", "Воркаут"],
];

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["walking"]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/profile").then((response) => response.json()).then((data) => {
      if (data.profile?.displayName) setName(data.profile.displayName);
      if (Array.isArray(data.profile?.interestIds)) setSelected(data.profile.interestIds);
    }).catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, bio: "", interestIds: selected }) });
    setPending(false);
    if (response.ok) router.push("/");
    else setError("Не удалось сохранить профиль.");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-border/80 bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><CircleUserRound className="size-5" /></div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Шаг 2 из 2 · ваш ритм</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Как к вам обращаться?</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Выберите имя и несколько интересов. В NOW нет публичных профилей — эти данные помогают встречам быть понятнее.</p>
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <div><label htmlFor="display-name" className="mb-2 block text-xs font-semibold text-muted-foreground">Имя или ник</label><Input id="display-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Алекс" maxLength={30} className="h-12 rounded-2xl" required /></div>
          <div><p className="mb-2 text-xs font-semibold text-muted-foreground">Что вам интересно?</p><div className="flex flex-wrap gap-2">{options.map(([id, label]) => { const active = selected.includes(id); return <button key={id} type="button" onClick={() => setSelected((items) => active ? items.filter((item) => item !== id) : [...items, id].slice(0, 5))} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground"}`}>{active && <Check className="mr-1 inline size-3" />}{label}</button>; })}</div></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="h-12 w-full rounded-2xl" disabled={pending || name.trim().length < 2}>Открыть город<Sparkles className="size-4" /><ArrowRight className="size-4" /></Button>
        </form>
      </Card>
    </div>
  );
}