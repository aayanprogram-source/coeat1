import { QRCodeSVG } from 'qrcode.react';
import { formatCountdown, formatPaise } from '@datapal/core';
import { ProgressBar } from './progress-bar';

export interface CodeCardProps {
  restaurantName: string;
  logoUrl: string | null;
  offerLine: string;
  minBillPaise: number;
  code: string;
  qrValue: string;
  remaining: number | null;
  total: number;
  msRemaining: number;
  labels: { minBill: string; codesLeft: string; firstTimeOnly: string; qr: string };
}

/** The ticket-style code card with notched sides, shown in previews on the dashboards. */
export function CodeCard({ restaurantName, logoUrl, offerLine, minBillPaise, code, qrValue, remaining, total, msRemaining, labels }: CodeCardProps) {
  return (
    <article className="relative mx-auto w-full max-w-sm rounded-card border border-line bg-surface p-5 shadow-mid">
      <span aria-hidden className="absolute -left-3 top-[58%] h-6 w-6 rounded-chip border border-line bg-background" />
      <span aria-hidden className="absolute -right-3 top-[58%] h-6 w-6 rounded-chip border border-line bg-background" />
      <header className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-input object-cover" loading="lazy" />
        ) : (
          <span aria-hidden className="h-10 w-10 rounded-input bg-mint-100" />
        )}
        <div>
          <p className="font-heading text-h2 font-semibold text-ink">{restaurantName}</p>
          <p className="text-caption text-muted">{offerLine}</p>
        </div>
      </header>
      <p className="mt-2 text-caption text-muted tabular-nums">{labels.minBill.replace('{amount}', formatPaise(minBillPaise))}</p>
      <div className="my-5 border-t border-dashed border-line" />
      <div className="flex items-center justify-between gap-4">
        <p className="font-heading text-[40px] font-semibold leading-none tracking-[0.3em] tabular-nums text-green-900" aria-label={code.split('').join(' ')}>
          {code}
        </p>
        <QRCodeSVG value={qrValue} size={88} aria-label={labels.qr} role="img" />
      </div>
      {remaining !== null ? (
        <div className="mt-5 flex flex-col gap-1">
          <ProgressBar value={remaining} max={total} label={labels.codesLeft.replace('{count}', String(remaining))} />
          <p className="text-caption text-muted tabular-nums">{labels.codesLeft.replace('{count}', String(remaining))}</p>
        </div>
      ) : null}
      <footer className="mt-4 flex items-center justify-between text-caption">
        <span className="text-muted">{labels.firstTimeOnly}</span>
        <span className="font-medium text-ink tabular-nums">{formatCountdown(msRemaining)}</span>
      </footer>
    </article>
  );
}
