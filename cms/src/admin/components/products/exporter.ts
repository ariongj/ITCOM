// CSV export of the current filter / selection (PDF p.09 "Eksport sipas filtrit dhe lejes").
// Headers follow the admin language and are understood by the importer, so an export can be re-imported.
import type { Category, L10n, Lang } from '@/lib/types';
import { download } from '@/lib/utils';
import { toCsv } from './csv';
import type { PdKey } from './dict';
import { isTracked, pricingOf, variantCount, type ProductX } from './model';

type T = (key: PdKey, vars?: Record<string, string | number>) => string;

export function exportProducts(products: ProductX[], opts: { t: T; l: (v: L10n) => string; lang: Lang; categories: Category[]; withCost: boolean }) {
  const { t, l, lang, categories, withCost } = opts;
  // SQ / SR Excel expects ";" and decimal commas; EN gets the classic comma CSV.
  const delimiter = lang === 'en' ? ',' : ';';
  const dec = (v: number | null | undefined) => (v == null ? '' : lang === 'en' ? v.toFixed(2) : v.toFixed(2).replace('.', ','));
  const cat = new Map(categories.map((c) => [c.id, c]));
  const status = { active: t('st_active'), draft: t('st_draft'), archived: t('st_archived') };

  const head = [
    t('exp_handle'), t('fld_sku'), t('fld_barcode'), t('fld_name_sq'), t('fld_name_en'), t('fld_name_me'), t('fld_category'), t('fld_vendor'), t('fld_tags'),
    t('fld_status'), t('fld_price'), t('fld_compareAt'), ...(withCost ? [t('fld_cost')] : []), t('fld_unit'), t('fld_stock'), t('exp_variants'),
    t('col_channels'), t('c_template'), t('fld_image'),
  ];
  const rows = products.map((p) => {
    const { price, compareAt } = pricingOf(p);
    const c = cat.get(p.categoryId);
    return [
      p.slug, p.sku, p.barcode ?? '', p.name.sq, p.name.en, p.name.me, c ? l(c.name) : '', p.vendor ?? '', (p.tags ?? []).join(', '),
      status[p.status], dec(price), dec(compareAt), ...(withCost ? [dec(p.cost)] : []), p.unit,
      isTracked(p) ? p.stock : '', variantCount(p) || '', (p.channels ?? ['online']).join(' + '), p.template === 'quote' || p.quoteOnly ? t('tpl_quote') : t('tpl_standard'),
      p.images.join(' | '),
    ];
  });
  const stamp = new Date().toISOString().slice(0, 10);
  download(`optika-produktet-${stamp}.csv`, `﻿${toCsv([head, ...rows], delimiter)}`, 'text/csv;charset=utf-8');
  return rows.length;
}

/** Empty template with the importer's column names (admin language). */
export function downloadTemplate(t: T, lang: Lang) {
  const delimiter = lang === 'en' ? ',' : ';';
  const head = [t('fld_name_sq'), t('fld_name_en'), t('fld_name_me'), t('fld_sku'), t('fld_barcode'), t('fld_category'), t('fld_price'), t('fld_compareAt'), t('fld_cost'), t('fld_stock'), t('fld_vendor'), t('fld_tags'), t('fld_description'), t('fld_image')];
  download('optika-shabllon-produktet.csv', `﻿${toCsv([head], delimiter)}`, 'text/csv;charset=utf-8');
}
