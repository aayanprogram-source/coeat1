import { settingNumber, type AppConfig, type OfferBounds } from '@datapal/core';
import { useRpc } from '@datapal/ui-web';

export interface OfferLimits extends OfferBounds {
  groupCreditCapDefault: number;
}

/** The platform's current limits, read live so a change in superadmin applies to the next form that opens. */
export function useOfferBounds(): OfferLimits | null {
  const config = useRpc<AppConfig>('app_config', {});
  const c = config.data;
  if (!c) return null;
  return {
    maxDiscountPercent: settingNumber(c, 'max_discount_percent'),
    maxDiscountCapPaise: settingNumber(c, 'max_discount_cap_paise'),
    minBillFloorPaise: settingNumber(c, 'min_bill_floor_paise'),
    maxCodesPerOffer: settingNumber(c, 'max_codes_per_offer'),
    groupCreditCapMax: settingNumber(c, 'group_credit_cap_max'),
    groupCreditCapDefault: settingNumber(c, 'group_credit_cap_default'),
  };
}
