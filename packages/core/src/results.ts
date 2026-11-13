export interface OfferCard {
  id: string;
  title: string;
  discount_percent: number;
  discount_cap_paise: number;
  min_bill_paise: number;
  ends_at: string;
  drop_at: string | null;
  total_codes: number;
  remaining: number | null;
  low_stock: boolean;
}

export interface RestaurantRef {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  cover_path?: string | null;
}

export interface FeedStory {
  kind: 'story';
  id: string;
  created_at: string;
  caption: string;
  photo_path: string;
  verified: boolean;
  has_reward: boolean;
  author: { id: string; name: string | null; handle: string | null; avatar_path: string | null };
  restaurant: RestaurantRef;
  dishes: { name: string; rating: number }[];
  offer: OfferCard | null;
  my_code: { id: string; status: string; short_code: string; expires_at: string } | null;
}

export interface SponsoredCard {
  kind: 'sponsored';
  placement_id: string;
  label: string;
  restaurant: RestaurantRef;
  offer: OfferCard;
}

export type FeedItem = FeedStory | SponsoredCard;
export interface FeedPage {
  items: FeedItem[];
  next_cursor: string | null;
}

export interface ExploreRestaurant {
  kind: 'restaurant';
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  cover_path: string | null;
  address: string;
  lat: number;
  lng: number;
  cuisine_ids: string[];
  avg_rating: number | null;
  distance_m: number | null;
  offer: OfferCard | null;
}
export interface ExplorePage {
  items: ExploreRestaurant[];
  sponsored: SponsoredCard[];
}

export interface IssuedCode {
  id: string;
  short_code: string;
  offer_id: string;
  restaurant_id: string;
  expires_at: string;
}
export type IssueCodeResult =
  | { ok: true; code: IssuedCode; remaining: number }
  | { ok: false; reason: string; offer_id?: string };

export interface RedemptionAmounts {
  bill_paise: number;
  below_minimum: boolean;
  discount_paise: number;
  fee_paise: number;
  customer_pays_paise: number;
  restaurant_keeps_paise: number;
}

export type RedeemResult =
  | ({ ok: true; replayed: boolean; redemption_id: string; status: string; undo_until?: string } & Partial<RedemptionAmounts>)
  | { ok: false; reason: string };

export type LookupResult =
  | {
      ok: true;
      code_id: string;
      customer_name: string | null;
      visit_id: string | null;
      expires_at: string;
      offer: { id: string; title: string; discount_percent: number; discount_cap_paise: number; min_bill_paise: number };
    }
  | { ok: false; reason: string };

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string | null;
  hides: string;
}

export interface BoostQuote {
  days: number;
  per_day_paise: number;
  price_paise: number;
}

export interface PendingLegal {
  kind: string;
  version: number;
  title: string;
}
