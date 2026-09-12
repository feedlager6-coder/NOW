import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/lib/next-compat";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { Input } from "@workspace/now-design-system/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Не удалось отправить код.");
      router.push(`/auth/verify?phone=${encodeURIComponent(phone)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка связи с сервером.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-border/80 bg-card p-6 shadow-2xl sm:p-8">
        <Link href="/welcome" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Назад</Link>
        <div className="mt-8">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Вход в NOW</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Вернитесь в живой город.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Введите номер телефона. В demo-режиме код подтверждения — 000000.</p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <div><label htmlFor="phone" className="mb-2 block text-xs font-semibold text-muted-foreground">Номер телефона</label><Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 900 000-00-00" className="h-12 rounded-2xl" required /></div>
          {error && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          <Button className="h-12 w-full gap-2 rounded-2xl" disabled={pending || phone.trim().length < 5}>{pending ? "Отправляем…" : "Получить код"}<ArrowRight className="size-4" /></Button>
        </form>
        <div className="mt-6 flex gap-3 rounded-2xl border border-border/80 bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-chart-3" /><span>Мы используем синтетический demo-режим: реальные SMS и личные данные не нужны.</span></div>
      </Card>
    </div>
  );
}