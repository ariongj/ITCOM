// Launch switches: what the live shop offers while parts of it are still being connected.

/**
 * Card payments: the checkout's card step is a simulation (no payment provider is connected), so the option is
 * hidden from shoppers — cash on delivery and bank transfer only. Turn on once a real provider is integrated.
 */
export const CARD_PAYMENTS = false;

/**
 * Offer statistics (visits and CTA clicks in the CMS offers centre) are counted in the visitor's own browser storage.
 * That is optional statistics, so it stays off while the site has no consent choice for it: the CMS shows the
 * seeded numbers. Turn on only together with an opt-in (Accept / Reject) — and say so in the privacy notice.
 */
export const OFFER_STATS = false;
