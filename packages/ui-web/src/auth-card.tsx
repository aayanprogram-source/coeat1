import type { ReactNode } from 'react';

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-accent/25 blur-3xl" />
      <div className="page-enter relative flex w-full max-w-md flex-col gap-6">
        <div className="rounded-[28px] border border-white/10 bg-surface p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <h1 className="mb-6 font-heading text-[28px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
          {children}
        </div>
        {footer ? <p className="text-center text-caption text-white/60">{footer}</p> : null}
      </div>
    </main>
  );
}
