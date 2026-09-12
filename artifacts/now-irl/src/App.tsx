import React, { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import HomePage from "@/app/page";
import WelcomePage from "@/app/welcome/page";
import LoginPage from "@/app/auth/login/page";
import VerifyPage from "@/app/auth/verify/page";
import AgeGatePage from "@/app/onboarding/age-gate/page";
import ProfileOnboardingPage from "@/app/onboarding/profile/page";
import ProfilePage from "@/app/profile/page";
import { LiveMeetupView } from "@/components/LiveMeetupView";
import { StagingBanner } from "@/components/StagingBanner";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProductFrame({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isHome = location === "/";

  useEffect(() => {
    document.title = "NOW / IRL — Живой город рядом";
    document.documentElement.lang = "ru";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StagingBanner />
      <aside
        role="region"
        aria-label="Уведомление о демо-режиме"
        className="border-b border-amber-300/20 bg-amber-400 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-950"
      >
        Demo prototype · только публичные встречи · не для экстренных ситуаций
      </aside>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="NOW / IRL — на главную">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/.32)]">N</span>
            <span className="text-lg font-black tracking-[-0.08em]">NOW <span className="text-primary">/</span> IRL</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:inline">Demo City · 5 зон</span>
            <Link href="/profile" className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
              Профиль
            </Link>
          </div>
        </div>
      </header>
      <main className={isHome ? "" : "mx-auto w-full max-w-5xl"}>{children}</main>
      <footer className="border-t border-border/70 bg-card/50 px-4 py-7 text-center text-xs text-muted-foreground">
        <p className="font-semibold text-foreground/80">NOW / IRL — живой координатор офлайн-активностей.</p>
        <p className="mx-auto mt-1 max-w-md text-[11px]">18+ · бесплатный демо-сервис · только открытые публичные зоны.</p>
      </footer>
      <nav className="fixed bottom-3 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-sm -translate-x-1/2 items-center justify-around rounded-2xl border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-xl sm:hidden">
        <Link href="/" className={`rounded-xl px-4 py-2 text-xs font-semibold ${isHome ? "bg-secondary text-primary" : "text-muted-foreground"}`}>Рядом</Link>
        <Link href="/welcome" className={`rounded-xl px-4 py-2 text-xs font-semibold ${location === "/welcome" ? "bg-secondary text-primary" : "text-muted-foreground"}`}>О NOW</Link>
        <Link href="/profile" className={`rounded-xl px-4 py-2 text-xs font-semibold ${location === "/profile" ? "bg-secondary text-primary" : "text-muted-foreground"}`}>Профиль</Link>
      </nav>
    </div>
  );
}

function MeetupRoute() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  return (
    <LiveMeetupView
      meetupId={id}
      currentUserId="demo-user-alex"
      onClose={() => navigate("/")}
    />
  );
}

function Routes() {
  return (
    <ProductFrame>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/welcome" component={WelcomePage} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/verify" component={VerifyPage} />
        <Route path="/onboarding/age-gate" component={AgeGatePage} />
        <Route path="/onboarding/profile" component={ProfileOnboardingPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/meetups/:id" component={MeetupRoute} />
        <Route component={NotFound} />
      </Switch>
    </ProductFrame>
  );
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <WouterRouter base={base}>
          <Routes />
        </WouterRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}