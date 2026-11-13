import type { ReactNode } from 'react';

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="rounded-card border border-line bg-surface p-6 shadow-mid">
        <h1 className="mb-6 font-heading text-h1 font-semibold text-ink">{title}</h1>
        {children}
      </div>
      {footer ? <p className="text-center text-caption text-muted">{footer}</p> : null}
    </main>
  );
}
