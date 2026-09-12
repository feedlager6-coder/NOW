import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Link, useRouter, useSearchParams } from "@/lib/next-compat";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";
import { Input } from "@workspace/now-design-system/components/ui/input";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Проверьте код.");
      router.push(data.needsAgeGate ? "/onboarding/age-gate" : "/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка связи с сервером.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-border/80 bg-card p-6 shadow-2xl sm:p-8">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Изменить номер</Link>
        <div className="mt-8 flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Проверка доступа</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Введите код.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Код отправлен на <span className="font-semibold text-foreground">{phone || "ваш номер"}</span>. Для demo используйте 000000.</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <Input aria-label="Код подтверждения" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" className="h-16 rounded-2xl text-center text-2xl font-bold tracking-[0.35em]" required />
          {error && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          <Button className="h-12 w-full rounded-2xl" disabled={pending || code.length !== 6}>{pending ? "Проверяем…" : "Продолжить"}<CheckCircle2 className="size-4" /></Button>
        </form>
      </Card>
    </div>
  );
}