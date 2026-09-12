import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { useRouter } from "@/lib/next-compat";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";

export default function AgeGatePage() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("2000");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const age = new Date().getFullYear() - Number(birthYear);
    if (age < 18) { setError("NOW доступен только совершеннолетним пользователям."); return; }
    setPending(true);
    const response = await fetch("/api/onboarding/age-gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthYear: Number(birthYear), birthMonth: 1, consentAccepted: true }) });
    setPending(false);
    if (response.ok) router.push("/onboarding/profile");
    else setError("Не удалось сохранить подтверждение.");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-border/80 bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-chart-5/25 bg-chart-5/10 text-chart-5"><ShieldCheck className="size-5" /></div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Шаг 1 из 2 · доверие</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Сначала безопасность.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">NOW — для встреч взрослых людей в открытых публичных местах. Мы сохраняем только возрастную группу, не точную дату рождения.</p>
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label htmlFor="birth-year" className="block text-xs font-semibold text-muted-foreground">Год рождения</label>
          <div className="relative"><CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="birth-year" type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className="h-12 w-full rounded-2xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <label className="flex gap-3 rounded-2xl border border-border bg-secondary/50 p-4 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4 accent-primary" />Мне есть 18 лет, я принимаю правила безопасности и буду встречаться только в публичных местах.</label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button className="h-12 w-full rounded-2xl" disabled={!accepted || pending}>Продолжить<ArrowRight className="size-4" /></Button>
        </form>
      </Card>
    </div>
  );
}