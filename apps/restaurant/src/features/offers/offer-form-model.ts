import { offerSchemaWithin, rupeesToPaise, paiseToRupees, type OfferBounds } from '@datapal/core';
import type { FieldErrors, Resolver } from 'react-hook-form';

export interface OfferFormValues {
  title: string;
  discountPercent: number;
  capInr: number;
  minBillInr: number;
  totalCodes: number;
  startsAt: string;
  endsAt: string;
  dropAt: string;
  activeHours: { day: number; from: string; to: string }[];
  groupCreditCap: number;
}

const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toIso = (local: string): string => (local ? new Date(local).toISOString() : '');

export function emptyOffer(groupCreditCapDefault: number, now = new Date()): OfferFormValues {
  const end = new Date(now.getTime() + 7 * 86_400_000);
  return {
    title: '',
    discountPercent: 10,
    capInr: 100,
    minBillInr: 300,
    totalCodes: 50,
    startsAt: toLocalInput(now.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    dropAt: '',
    activeHours: [],
    groupCreditCap: groupCreditCapDefault,
  };
}

export function fromOffer(o: {
  title: string;
  discount_percent: number;
  discount_cap_paise: number;
  min_bill_paise: number;
  total_codes: number;
  starts_at: string;
  ends_at: string;
  drop_at: string | null;
  active_hours: { day: number; from: string; to: string }[];
  group_credit_cap: number;
}): OfferFormValues {
  return {
    title: o.title,
    discountPercent: o.discount_percent,
    capInr: paiseToRupees(o.discount_cap_paise),
    minBillInr: paiseToRupees(o.min_bill_paise),
    totalCodes: o.total_codes,
    startsAt: toLocalInput(o.starts_at),
    endsAt: toLocalInput(o.ends_at),
    dropAt: toLocalInput(o.drop_at),
    activeHours: o.active_hours,
    groupCreditCap: o.group_credit_cap,
  };
}

export function toPayload(v: OfferFormValues) {
  return {
    title: v.title,
    discount_percent: v.discountPercent,
    discount_cap_paise: rupeesToPaise(v.capInr),
    min_bill_paise: rupeesToPaise(v.minBillInr),
    total_codes: v.totalCodes,
    starts_at: toIso(v.startsAt),
    ends_at: toIso(v.endsAt),
    drop_at: v.dropAt ? toIso(v.dropAt) : null,
    active_hours: v.activeHours,
    group_credit_cap: v.groupCreditCap,
  };
}

const fieldOf: Record<string, keyof OfferFormValues> = {
  title: 'title',
  discount_percent: 'discountPercent',
  discount_cap_paise: 'capInr',
  min_bill_paise: 'minBillInr',
  total_codes: 'totalCodes',
  starts_at: 'startsAt',
  ends_at: 'endsAt',
  drop_at: 'dropAt',
  active_hours: 'activeHours',
  group_credit_cap: 'groupCreditCap',
};

/** Validates against the platform bounds, so values outside them are rejected before they leave the form. */
export function offerResolver(bounds: OfferBounds): Resolver<OfferFormValues> {
  const schema = offerSchemaWithin(bounds);
  return (values) => {
    const parsed = schema.safeParse(toPayload(values));
    if (parsed.success) return { values, errors: {} };
    const errors: FieldErrors<OfferFormValues> = {};
    for (const issue of parsed.error.issues) {
      const name = fieldOf[String(issue.path[0])];
      if (name && !errors[name]) errors[name] = { type: 'validate', message: issue.message };
    }
    return { values: {}, errors };
  };
}
