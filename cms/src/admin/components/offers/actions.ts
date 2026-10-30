import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useDb } from '@/store/db';
import { useL } from '@/i18n';
import { confirmDialog } from '@/admin/components/kit';
import type { L10n, Offer, OfferStatus } from '@/lib/types';
import { slugify, uid } from '@/lib/utils';
import { OF } from './i18n';
import { useOT } from './ui';

const ZERO = { visits: 0, ctaClicks: 0, codeUses: 0, orders: 0, revenue: 0, discountTotal: 0 };

/** Lifecycle actions shared by the list and the editor: status, end, duplicate, delete. */
export function useOfferActions() {
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const logAudit = useDb((s) => s.logAudit);
  const t = useOT();
  const l = useL('admin');

  const setStatus = useCallback(
    (o: Offer, status: OfferStatus) => {
      upsert('offers', { ...o, status });
      logAudit({ action: status === 'active' ? 'publish' : status === 'draft' ? 'unpublish' : 'status', object: 'offer', objectId: o.id, detail: `${o.name.sq || o.name.me} → ${status}` });
      toast.success(status === 'paused' ? t('toast_paused') : status === 'draft' ? t('toast_draft') : t('toast_resumed'), { description: l(o.name) });
    },
    [upsert, logAudit, t, l],
  );

  /** Ending deactivates the offer (endsAt = now → expired) and, by default, its linked content (p.29). */
  const end = useCallback(
    (o: Offer, opts: { content?: boolean; rule?: boolean } = {}) => {
      const { content = true, rule = false } = opts;
      const s = useDb.getState();
      upsert('offers', { ...o, status: 'active', endsAt: new Date().toISOString() });
      if (content) for (const p of s.placements) if (p.offerId === o.id && p.status === 'active') upsert('placements', { ...p, status: 'draft' });
      if (rule && o.discountId) {
        const d = s.discounts.find((x) => x.id === o.discountId);
        if (d && d.status === 'active') upsert('discounts', { ...d, status: 'paused' });
      }
      logAudit({ action: 'archive', object: 'offer', objectId: o.id, detail: o.name.sq || o.name.me });
      toast.success(t('ended'), { description: l(o.name) });
    },
    [upsert, logAudit, t, l],
  );

  const duplicate = useCallback(
    (o: Offer): string => {
      const s = useDb.getState();
      const base = slugify(`${o.slug}-${OF.sq.copySuffix}`) || 'oferta';
      let slug = base;
      for (let i = 2; s.offers.some((x) => x.slug === slug); i++) slug = `${base}-${i}`;
      const name: L10n = {
        me: o.name.me ? `${o.name.me} ${OF.me.copySuffix}` : '',
        sq: o.name.sq ? `${o.name.sq} ${OF.sq.copySuffix}` : '',
        en: o.name.en ? `${o.name.en} ${OF.en.copySuffix}` : '',
      };
      const id = uid('of');
      upsert('offers', { ...structuredClone(o), id, slug, name, status: 'draft', metrics: { ...ZERO }, createdAt: new Date().toISOString(), placements: o.placements.filter((x) => x === 'home-block') });
      toast.success(t('toast_duplicated'), { description: l(name) });
      return id;
    },
    [upsert, t, l],
  );

  /** Delete after confirmation; linked slides/banners stay but are unlinked. Resolves true when deleted. */
  const del = useCallback(
    async (o: Offer) => {
      const ok = await confirmDialog({ title: t('deleteTitle', { name: l(o.name) }), text: t('deleteText'), danger: true });
      if (!ok) return false;
      const s = useDb.getState();
      for (const p of s.placements) {
        if (p.offerId !== o.id) continue;
        const copy = { ...p };
        delete copy.offerId;
        upsert('placements', copy);
      }
      remove('offers', o.id);
      toast.success(t('toast_deleted'), { description: l(o.name) });
      return true;
    },
    [upsert, remove, t, l],
  );

  return useMemo(() => ({ setStatus, end, duplicate, del }), [setStatus, end, duplicate, del]);
}

