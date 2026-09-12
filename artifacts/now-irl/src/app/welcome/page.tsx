import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, LockKeyhole, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { Link, useRouter } from "@/lib/next-compat";
import { Badge } from "@workspace/now-design-system/components/ui/badge";
import { Button } from "@workspace/now-design-system/components/ui/button";
import { Card } from "@workspace/now-design-system/components/ui/card";

const principles = [
  { icon: MapPin, title: "Только публичные места", description: "Парки, набережные, открытые кофейни и спортплощадки — без приватных адресов." },
  { icon: ShieldCheck, title: "Безопасность прежде всего", description: "Группы небольшие, контекст встречи понятен, а в каждой активности есть safety-flow." },
  { icon: CalendarClock, title: "Планы на ближайший час", description: "Активности живут здесь и сейчас, поэтому не нужно собирать длинную анкету." },
  { icon: LockKeyhole, title: "Без свайпов и лишних данных", description: "NOW — не дейтинг. Только общий интерес и желание выйти в город." },
];

export default function WelcomePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { void fetch("/api/auth/me").then((response) => response.json()).then((data) => setAuthenticated(Boolean(data.authenticated))).catch(() => undefined); }, []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 pb-28 sm:px-6 lg:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <Badge className="gap-2 rounded-full border border-primary/30 bg-primary/10 text-primary"><span className="size-1.5 rounded-full bg-primary" />NOW / IRL</Badge>
          <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">Живой город начинается с одного плана.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Найдите людей рядом для прогулки, кофе, спорта или игры. Без свайпов и долгих переписок — только место, время и общий интерес.</p>
          <div className="mt-7 flex flex-wrap gap-3">{authenticated ? <Button className="h-12 rounded-2xl px-5" onClick={() => router.push("/")}>Открыть город<ArrowRight className="size-4" /></Button> : <><Link href="/auth/login" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_0_26px_hsl(var(--primary)/.25)]">Войти по номеру<ArrowRight className="size-4" /></Link><Button variant="outline" className="h-12 rounded-2xl" onClick={() => router.push("/")}>Посмотреть demo</Button></>}</div>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="size-4 text-primary" />18+ · открытые встречи · Demo City</div>
        </div>
        <Card className="relative overflow-hidden border-primary/20 bg-card p-6 shadow-2xl">
          <div className="absolute -right-20 -top-20 size-48 rounded-full bg-primary/10 blur-3xl" />
          <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Как это работает</p>
          <div className="relative mt-6 space-y-4">{["Выберите настроение", "Посмотрите, кто рядом", "Встретьтесь в публичном месте"].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-black text-primary">0{index + 1}</span><span className="text-sm font-semibold">{item}</span></div>)}</div>
        </Card>
      </section>
      <section className="mt-14 grid gap-3 sm:grid-cols-2">{principles.map(({ icon: Icon, title, description }) => <Card key={title} className="border-border/80 bg-card p-5"><Icon className="size-5 text-primary" /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></Card>)}</section>
    </div>
  );
}