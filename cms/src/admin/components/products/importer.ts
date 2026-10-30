// CSV product import (PDF p.09): field mapping, validation, duplicate-SKU report, then create/update.
import type { Category, Product, ProductStatus, Unit } from '@/lib/types';
import { fold } from '@/lib/search';
import { slugify, uid } from '@/lib/utils';
import { parseNumber } from './csv';
import { applyPricing, missingForPublish, skusOf, uniqueSlug, MAX_TRACKED, type ProductX } from './model';

// Albanian is the source language: a plain "Name / Emri" column is the SQ name; the `me` slot holds the Serbian name.
export const IMPORT_FIELDS = ['name_sq', 'name_en', 'name_me', 'sku', 'barcode', 'price', 'compareAt', 'cost', 'category', 'vendor', 'tags', 'stock', 'status', 'unit', 'description', 'image'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type MappedField = ImportField | 'ignore';

/** Header synonyms in SQ / EN / SR and Shopify's export names (folded, lower-case). */
const SYNONYMS: Record<ImportField, string[]> = {
  name_sq: ['name', 'title', 'titulli', 'emri', 'product', 'produkti', 'name sq', 'naziv sq', 'emri sq', 'titulli sq', 'title sq', 'emri shqip'],
  name_en: ['name en', 'naziv en', 'emri en', 'title en', 'english name'],
  name_me: ['naziv', 'proizvod', 'name sr', 'naziv sr', 'emri sr', 'title sr', 'name me', 'naziv me', 'emri me', 'title me', 'srpski naziv'],
  sku: ['sku', 'sifra', 'kodi', 'code', 'variant sku', 'artikal', 'kod'],
  barcode: ['barcode', 'barkod', 'barkodi', 'ean', 'gtin', 'variant barcode'],
  price: ['price', 'cijena', 'cmimi', 'variant price', 'prodajna cijena', 'cmimi i shitjes'],
  compareAt: ['compare at', 'compare at price', 'compareat', 'variant compare at price', 'cmimi referues', 'referentna cijena', 'redovna cijena', 'stara cijena', 'cmimi i vjeter'],
  cost: ['cost', 'kosto', 'kosto cope', 'cost per item', 'trosak', 'trosak kom', 'nabavna cijena', 'nabavna'],
  category: ['category', 'kategorija', 'kategoria', 'product type', 'type', 'grupa'],
  vendor: ['vendor', 'furnitori', 'dobavljac', 'brand', 'marka', 'proizvodjac', 'prodhuesi'],
  tags: ['tags', 'etiketat', 'etiketa', 'oznake', 'tagovi'],
  stock: ['stock', 'zalihe', 'stoku', 'sasia', 'qty', 'quantity', 'inventory', 'variant inventory qty', 'kolicina', 'na stanju'],
  status: ['status', 'statusi'],
  unit: ['unit', 'jedinica', 'njesia', 'jedinica mere', 'jedinica mjere'],
  description: ['description', 'opis', 'pershkrimi', 'body', 'body html'],
  image: ['image', 'images', 'slika', 'slike', 'imazhi', 'imazhet', 'image src', 'foto'],
};

const norm = (h: string) =>
  fold(h)
    .replace(/[()[\]_/\-–—:.,*#€]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Best guess for each CSV column; a field is used once (first column wins). */
export function autoMap(headers: string[]): MappedField[] {
  const taken = new Set<ImportField>();
  return headers.map((h) => {
    const n = norm(h);
    let hit = IMPORT_FIELDS.find((f) => !taken.has(f) && SYNONYMS[f].includes(n));
    if (!hit) {
      const lang = /\b(sq|al|shqip)\b/.test(n) ? 'sq' : /\b(en|eng|english)\b/.test(n) ? 'en' : /\b(sr|me|srpski)\b/.test(n) ? 'me' : null;
      const bare = n.replace(/\b(me|sr|srpski|sq|al|en|eng|shqip|english)\b/g, '').trim();
      if (lang && (SYNONYMS.name_sq.includes(bare) || SYNONYMS.name_me.includes(bare))) hit = lang === 'sq' ? 'name_sq' : lang === 'en' ? 'name_en' : 'name_me';
      else hit = IMPORT_FIELDS.find((f) => !taken.has(f) && SYNONYMS[f].some((s) => s.length > 3 && (bare === s || bare.startsWith(`${s} `))));
    }
    if (hit && !taken.has(hit)) {
      taken.add(hit);
      return hit;
    }
    return 'ignore';
  });
}

export type IssueCode = 'noName' | 'noPrice' | 'badNumber' | 'negative' | 'dupFile' | 'exists' | 'noCategory' | 'unknownCategory' | 'compareLow' | 'badStatus' | 'notPublishable' | 'nameFromOther';
export interface Issue {
  code: IssueCode;
  field?: ImportField;
  value?: string;
}

export interface ImportRow {
  /** CSV line number (header = line 1) */
  line: number;
  values: Partial<Record<ImportField, string>>;
  name: string;
  sku: string;
  price: number | null;
  categoryId: string;
  errors: Issue[];
  warnings: Issue[];
  /** catalogue product with the same SKU */
  existing?: Product;
  /** line of the first row with the same SKU */
  dupOfLine?: number;
  action: 'create' | 'update' | 'skip';
}

export interface ImportOptions {
  /** what to do when the SKU already exists in the catalogue */
  onExisting: 'update' | 'skip';
  /** new products: always draft (recommended) or use the status column */
  newStatus: 'draft' | 'column';
}

const STATUS: Record<string, ProductStatus> = {
  active: 'active', aktiv: 'active', aktivan: 'active', aktivno: 'active', published: 'active', publikuar: 'active', objavljen: 'active',
  draft: 'draft', nacrt: 'draft', skica: 'draft',
  archived: 'archived', arkivuar: 'archived', arhiviran: 'archived', arhivirano: 'archived',
};
const UNITS: Record<string, Unit> = { kom: 'kom', pc: 'kom', pcs: 'kom', cope: 'kom', piece: 'kom', m2: 'm2', 'm²': 'm2', m: 'm', set: 'set', komplet: 'set', pair: 'set', pale: 'set', par: 'set' };

export function matchCategory(raw: string, categories: Category[]): string | null {
  const v = fold(raw.trim());
  if (!v) return null;
  const c = categories.find((x) => x.id === raw.trim() || x.slug === slugify(raw) || [x.name.me, x.name.sq, x.name.en].some((n) => fold(n) === v));
  return c?.id ?? null;
}

function read(row: string[], mapping: MappedField[]) {
  const values: Partial<Record<ImportField, string>> = {};
  mapping.forEach((f, i) => {
    if (f !== 'ignore' && row[i] != null && row[i] !== '' && values[f] == null) values[f] = row[i];
  });
  return values;
}

export function validateRows(rows: string[][], mapping: MappedField[], products: ProductX[], categories: Category[], opts: ImportOptions): ImportRow[] {
  const bySku = new Map<string, Product>();
  for (const p of products) for (const s of skusOf(p)) bySku.set(s.toUpperCase(), p);
  const firstLine = new Map<string, number>();

  return rows.map((row, i): ImportRow => {
    const line = i + 2;
    const values = read(row, mapping);
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    let name = values.name_sq?.trim() ?? '';
    if (!name && (values.name_en || values.name_me)) {
      name = (values.name_en || values.name_me || '').trim();
      warnings.push({ code: 'nameFromOther' });
    }
    const sku = (values.sku ?? '').trim().toUpperCase();
    const existing = sku ? bySku.get(sku) : undefined;
    if (!name && !existing) errors.push({ code: 'noName' });

    const num = (f: ImportField) => {
      const raw = values[f];
      if (raw == null || raw === '') return null;
      const n = parseNumber(raw);
      if (n == null) errors.push({ code: 'badNumber', field: f, value: raw });
      else if (n < 0) errors.push({ code: 'negative', field: f, value: raw });
      return n;
    };
    const price = num('price');
    const compareAt = num('compareAt');
    num('cost');
    num('stock');
    if (values.price == null && !existing) errors.push({ code: 'noPrice' });
    else if (price === 0 && !existing) errors.push({ code: 'noPrice' });
    if (compareAt != null && price != null && compareAt <= price) warnings.push({ code: 'compareLow', value: values.compareAt });

    let categoryId = existing?.categoryId ?? '';
    if (values.category) {
      const hit = matchCategory(values.category, categories);
      if (hit) categoryId = hit;
      else warnings.push({ code: 'unknownCategory', value: values.category });
    } else if (!existing) warnings.push({ code: 'noCategory' });

    if (values.status && !STATUS[fold(values.status.trim())]) warnings.push({ code: 'badStatus', value: values.status });

    let dupOfLine: number | undefined;
    if (sku) {
      const first = firstLine.get(sku);
      if (first) {
        dupOfLine = first;
        errors.push({ code: 'dupFile', value: sku });
      } else firstLine.set(sku, line);
    }
    if (existing && !dupOfLine) warnings.push({ code: 'exists', value: sku });

    const action: ImportRow['action'] = errors.length ? 'skip' : existing ? (opts.onExisting === 'update' ? 'update' : 'skip') : 'create';
    if (action === 'create') {
      const wantActive = opts.newStatus === 'column' && STATUS[fold(values.status?.trim() ?? '')] === 'active';
      if (wantActive && missingForPublish({ name: { me: '', sq: name, en: '' }, categoryId, price: price ?? 0, images: values.image ? ['x'] : [] }, categories).length) {
        warnings.push({ code: 'notPublishable' });
      }
    }
    return { line, values, name: name || existing?.name.sq || '', sku, price, categoryId, errors, warnings, existing, dupOfLine, action };
  });
}

const splitList = (raw?: string) =>
  (raw ?? '')
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Build the product to store for a validated row (create or update). */
export function buildProduct(row: ImportRow, opts: ImportOptions, categories: Category[], all: Pick<Product, 'id' | 'slug'>[]): ProductX {
  const v = row.values;
  const n = (f: ImportField) => (v[f] != null && v[f] !== '' ? parseNumber(v[f]) : null);
  const now = new Date().toISOString();
  const statusCol = v.status ? STATUS[fold(v.status.trim())] : undefined;
  const images = v.image ? v.image.split(/[|\s]+/).map((s) => s.trim()).filter(Boolean) : null;
  const stock = n('stock');
  const unit = v.unit ? UNITS[fold(v.unit.trim())] : undefined;

  if (row.action === 'update' && row.existing) {
    const p = row.existing as ProductX;
    const price = n('price') ?? (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);
    const compare = v.compareAt != null ? n('compareAt') : p.salePrice && p.salePrice < p.price ? p.price : null;
    const next: ProductX = {
      ...p,
      ...applyPricing(price, compare),
      name: v.name_sq ? { ...p.name, sq: v.name_sq.trim() } : p.name,
      categoryId: row.categoryId || p.categoryId,
      updatedAt: now,
    };
    if (v.name_en) next.name = { ...next.name, en: v.name_en.trim() };
    if (v.name_me) next.name = { ...next.name, me: v.name_me.trim() };
    if (v.description) next.description = { ...p.description, sq: v.description.trim() };
    if (v.barcode) next.barcode = v.barcode.trim();
    if (n('cost') != null) next.cost = n('cost') as number;
    if (v.vendor) next.vendor = v.vendor.trim();
    if (v.tags) next.tags = splitList(v.tags);
    if (stock != null) next.stock = Math.min(MAX_TRACKED, Math.round(stock));
    if (unit) next.unit = unit;
    if (images?.length) next.images = images;
    if (statusCol && opts.newStatus === 'column') {
      next.status = statusCol === 'active' && missingForPublish(next, categories).length ? p.status : statusCol;
    }
    return next;
  }

  const id = uid('p');
  const name = { me: v.name_me?.trim() ?? '', sq: row.name, en: v.name_en?.trim() ?? '' };
  const base: ProductX = {
    id,
    slug: uniqueSlug(slugify(row.name) || id, id, all),
    sku: row.sku,
    categoryId: row.categoryId,
    name,
    short: { me: '', sq: '', en: '' },
    description: { me: '', sq: v.description?.trim() ?? '', en: '' },
    ...applyPricing(n('price'), n('compareAt')),
    unit: unit ?? 'kom',
    ...(unit === 'm2' ? { packSize: 1 } : {}),
    stock: stock != null ? Math.min(MAX_TRACKED, Math.round(stock)) : 0,
    images: images ?? [],
    options: [],
    specs: [],
    installation: null,
    badges: ['new'],
    featured: false,
    status: 'draft',
    quoteOnly: false,
    leadDays: 7,
    createdAt: now,
    sold: 0,
    vendor: v.vendor?.trim() || undefined,
    tags: splitList(v.tags),
    barcode: v.barcode?.trim() || undefined,
    cost: n('cost') ?? undefined,
    incoming: 0,
    unavailable: 0,
    template: 'standard',
    channels: ['online', 'pos'],
  };
  if (opts.newStatus === 'column' && statusCol) base.status = statusCol === 'active' && missingForPublish(base, categories).length ? 'draft' : statusCol;
  return base;
}

/** A ready-made sample (realistic ITCOM data incl. one existing SKU, one duplicate and one error). */
export const SAMPLE_CSV = [
  'Emri (SQ);Naziv (SR);SKU;Barkodi;Kategoria;Çmimi;Çmimi referues;Kosto;Stoku;Furnitori;Etiketat',
  'Kornizë optike Aria A03 — havana;Okvir Aria A03 — havana;OM-ARI-A03;2000000770011;Syze optike;149,00;;62,00;8;Miftari Atelier;acetat|havana|e-re',
  'Syze dielli Costa C14 — polarizuese;Naočare za sunce Costa C14 — polarizovane;OM-CST-C14;2000000770028;Syze dielli;129,00;159,00;54,00;12;Miftari Atelier;polarizuese|oferte',
  'Lente progresive Comfort 1.60;Progresivna sočiva Comfort 1.60;OM-LAB-PC16;2000000770035;Lente me recetë;290,00;;118,00;;Optical Lab;progresive|laborator',
  'Prism M2;Prism M2;OM-PRM-M2;;Syze optike;320,00;360,00;;14;Miftari Atelier;titan|bestseller',
  'Syze sporti Arc V3 — blu;Sportske naočare Arc V3 — plave;OM-ARC-V3B;2000000770042;Syze dielli;149,00;;61,00;6;Miftari Atelier;sport|polarizuese',
  'Syze sporti Arc V3 — portokalli;Sportske naočare Arc V3 — narandžaste;OM-ARC-V3B;2000000770059;Syze dielli;149,00;;61,00;4;Miftari Atelier;sport',
  'Kornizë për fëmijë Mini K2;Dečji okvir Mini K2;OM-MIN-K2;2000000770066;Syze optike;;;;5;Miftari Atelier;femije',
].join('\n');
