// Offers centre + slideshow/banners/announcement bar — CMS proposal pp.28–35.
// States are derived from stored status + dates; a placement inherits its offer's validity
// ("Bannerët trashëgojnë vlefshmërinë e ofertës dhe largohen kur ajo pezullohet", p.25).
import type { Offer, OfferState, Placement, PlacementPosition, PlacementState } from './types';

const time = (v?: Date | string | number) => (v === undefined ? Date.now() : v instanceof Date ? v.getTime() : typeof v === 'number' ? v : new Date(v).getTime());

function windowState(start: string | undefined, end: string | undefined, now: number): 'scheduled' | 'expired' | 'active' {
  if (start && new Date(start).getTime() > now) return 'scheduled';
  if (end && new Date(end).getTime() <= now) return 'expired';
  return 'active';
}

/** draft / paused (stored) · scheduled / expired / active (from dates). */
export function offerState(o: Pick<Offer, 'status' | 'startsAt' | 'endsAt'>, now?: Date | string | number): OfferState {
  if (o.status === 'draft' || o.status === 'paused') return o.status;
  return windowState(o.startsAt, o.endsAt, time(now));
}

/**
 * Placement state. A draft placement is 'draft'. When linked to an offer, the placement is shown only
 * inside the offer's window (intersection with its own dates) and is 'paused' while the offer is
 * draft/paused.
 */
export function placementState(p: Pick<Placement, 'status' | 'startsAt' | 'endsAt' | 'offerId'>, now?: Date | string | number, offer?: Pick<Offer, 'status' | 'startsAt' | 'endsAt'> | null): PlacementState {
  if (p.status === 'draft') return 'draft';
  const t = time(now);
  if (offer) {
    if (offer.status === 'draft' || offer.status === 'paused') return 'paused';
    const os = windowState(offer.startsAt, offer.endsAt, t);
    if (os !== 'active') return os;
  }
  return windowState(p.startsAt, p.endsAt, t);
}

/** Live placements for a storefront position, in display order. */
export function activePlacements(placements: Placement[], position: PlacementPosition, offers: Offer[], now?: Date | string | number): Placement[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  return placements
    .filter((p) => p.position === position && placementState(p, now, p.offerId ? byId.get(p.offerId) ?? null : null) === 'active')
    .sort((a, b) => a.order - b.order);
}

/** Conversion helpers for the offers table. */
export function offerRates(o: Pick<Offer, 'metrics'>) {
  const m = o.metrics;
  return {
    ctr: m.visits ? m.ctaClicks / m.visits : 0,
    conversion: m.visits ? m.orders / m.visits : 0,
    avgOrder: m.orders ? m.revenue / m.orders : 0,
  };
}
