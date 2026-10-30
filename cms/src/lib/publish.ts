// Publishing: the CMS keeps its data in this browser; "Publiko" writes the PUBLIC part of it to the live site.
//
// The snapshot becomes js/cms-data.js (window.ITCOM_PUBLISHED = {...}), which every visitor's shop loads before
// js/cms-bridge.js. It is committed straight to the repository through the GitHub REST API with a fine-grained
// token that stays in this browser only (localStorage "itcom-publish", never in the CMS data or the snapshot).
// GitHub Pages rebuilds the site after the commit; visitors see the change within a few minutes.
//
// Private data never leaves the browser: orders, customers, messages, bookings, quotes, staff, costs, stock
// movements, purchase orders, the audit log and anything in draft.
import type { Db, Product, Settings } from './types';

export const PUBLISH_KEY = 'itcom-publish';
export const SNAPSHOT_PATH = 'js/cms-data.js';
const UPLOAD_DIR = 'assets/uploads';

export interface PublishConfig {
  owner: string;
  repo: string;
  /** Branch GitHub Pages serves (live site) */
  branch: string;
  /** Optional second branch kept in sync (the source branch), so the next code deploy keeps the content */
  mirrorBranch: string;
  token: string;
  /** Secret for reading orders back from the order channel (Google Apps Script) */
  channelKey: string;
  last?: { at: string; by: string; url: string; bytes: number; images: number };
}

export const DEFAULT_CONFIG: PublishConfig = { owner: 'ariongj', repo: 'ITCOM', branch: 'gh-pages', mirrorBranch: '', token: '', channelKey: '' };

export function readConfig(): PublishConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
export function saveConfig(cfg: PublishConfig) {
  try {
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(cfg));
  } catch {
    /* storage full or blocked: the form still works for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */
const PUBLIC_SETTINGS = [
  'companyName', 'tagline', 'about', 'email', 'phone', 'phone2', 'whatsapp', 'address', 'city', 'mapUrl', 'hours', 'instagram', 'facebook',
  'currency', 'vatRate', 'freeShippingThreshold', 'shippingZones', 'pickupAddress', 'payments', 'languages', 'announcements', 'brandColor',
  'seo', 'orderPrefix', 'locations', 'markets', 'checkout', 'orderEndpoint',
] as const satisfies readonly (keyof Settings)[];

export type PublicSettings = Pick<Settings, (typeof PUBLIC_SETTINGS)[number]>;

export interface PublicState {
  settings: PublicSettings;
  categories: Db['categories'];
  products: Omit<Product, 'cost' | 'barcode' | 'incoming'>[];
  pages: Db['pages'];
  posts: Db['posts'];
  collections: Db['collections'];
  discounts: Db['discounts'];
  offers: Db['offers'];
  placements: Db['placements'];
  menus: Db['menus'];
  services: Db['services'];
}

export interface Snapshot {
  format: 1;
  publishedAt: string;
  by: string;
  state: PublicState;
}

export function buildSnapshot(db: Db, by: string, now = new Date()): Snapshot {
  const settings = Object.fromEntries(PUBLIC_SETTINGS.filter((k) => db.settings[k] !== undefined).map((k) => [k, db.settings[k]])) as PublicSettings;
  return {
    format: 1,
    publishedAt: now.toISOString(),
    by,
    state: {
      settings,
      categories: db.categories,
      products: db.products
        .filter((p) => p.status === 'active')
        .map(({ cost: _cost, barcode: _barcode, incoming: _incoming, ...p }) => p),
      pages: db.pages.filter((p) => p.published),
      posts: db.posts.filter((p) => p.published),
      collections: db.collections.filter((c) => c.published),
      discounts: db.discounts.filter((d) => d.status === 'active'),
      offers: db.offers.filter((o) => o.status === 'active').map((o) => ({ ...o, owner: '', metrics: { visits: 0, ctaClicks: 0, codeUses: 0, orders: 0, revenue: 0, discountTotal: 0 } })),
      placements: db.placements.filter((p) => p.status === 'active'),
      menus: db.menus,
      services: db.services.map((s) => ({ ...s, staffIds: [] })),
    },
  };
}

export function snapshotScript(snap: Snapshot): string {
  const json = JSON.stringify(snap).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `/* Versioni i publikuar nga CMS-i i ITCOM (${snap.publishedAt}, ${snap.by}). Mos e ndryshoni me dorë: publikoni nga /admin. */\nwindow.ITCOM_PUBLISHED = ${json};\n`;
}

/** What the snapshot contains, for the summary before publishing. */
export function summarize(state: PublicState) {
  return {
    products: state.products.length,
    collections: state.collections.length,
    discounts: state.discounts.length,
    codes: state.discounts.filter((d) => d.method === 'code').map((d) => d.code ?? ''),
    offers: state.offers.length,
    posts: state.posts.length,
    pages: state.pages.length,
    placements: state.placements.length,
    services: state.services.length,
  };
}

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */
export class PublishError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const utf8Base64 = (text: string) => toBase64(new TextEncoder().encode(text));

async function gh(cfg: PublishConfig, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${cfg.token.trim()}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 404 && (!init.method || init.method === 'GET')) return null;
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { message?: string }).message || msg;
    } catch {
      /* not JSON */
    }
    throw new PublishError(msg, res.status);
  }
  return res.json();
}

/** Checks the token can write to the repository; returns the default branch. */
export async function checkAccess(cfg: PublishConfig): Promise<{ defaultBranch: string }> {
  const repo = (await gh(cfg, '')) as { permissions?: { push?: boolean }; default_branch: string } | null;
  if (!repo) throw new PublishError('not-found', 404);
  if (repo.permissions && !repo.permissions.push) throw new PublishError('no-push', 403);
  return { defaultBranch: repo.default_branch };
}

async function fileSha(cfg: PublishConfig, branch: string, path: string): Promise<string | null> {
  const f = (await gh(cfg, `/contents/${path}?ref=${encodeURIComponent(branch)}`)) as { sha: string } | null;
  return f?.sha ?? null;
}

async function putFile(cfg: PublishConfig, branch: string, path: string, base64: string, message: string, sha: string | null) {
  const out = (await gh(cfg, `/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: base64, branch, ...(sha ? { sha } : {}) }),
  })) as { commit: { sha: string; html_url: string } };
  return out.commit;
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/gif': 'gif', 'image/avif': 'avif' };

async function shortHash(text: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Replace every uploaded image (data: URL) in the snapshot with a file under assets/uploads/. */
async function extractImages(snap: Snapshot, base: string) {
  const files = new Map<string, { path: string; base64: string }>();
  const walk = async (v: unknown): Promise<unknown> => {
    if (typeof v === 'string') {
      const m = v.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
      if (!m || !EXT[m[1]]) return v;
      const path = `${UPLOAD_DIR}/${await shortHash(m[2])}.${EXT[m[1]]}`;
      files.set(path, { path, base64: m[2] });
      return base + path;
    }
    if (Array.isArray(v)) return Promise.all(v.map(walk));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = await walk(x);
      return out;
    }
    return v;
  };
  const state = (await walk(snap.state)) as PublicState;
  return { snap: { ...snap, state }, files: [...files.values()] };
}

export type PublishStep = { kind: 'image'; done: number; total: number } | { kind: 'data'; branch: string } | { kind: 'done' };

/**
 * Publish to the live branch (and the mirror branch, when set). Images are content-addressed, so an image that is
 * already in the repository is not uploaded again. Returns the commit of the live branch.
 */
export async function publish(snapshot: Snapshot, cfg: PublishConfig, base: string, onStep: (s: PublishStep) => void = () => {}) {
  const { snap, files } = await extractImages(snapshot, base);
  const script = snapshotScript(snap);
  const branches = [cfg.branch, cfg.mirrorBranch].map((b) => b.trim()).filter((b, i, a) => b && a.indexOf(b) === i);
  let done = 0;
  for (const f of files) {
    onStep({ kind: 'image', done, total: files.length });
    for (const branch of branches) {
      if (await fileSha(cfg, branch, f.path)) continue;
      await putFile(cfg, branch, f.path, f.base64, `CMS: ngarko foton ${f.path.split('/').pop()}`, null);
    }
    done++;
  }
  let liveCommit: { sha: string; html_url: string } | null = null;
  for (const branch of branches) {
    onStep({ kind: 'data', branch });
    const sha = await fileSha(cfg, branch, SNAPSHOT_PATH);
    const commit = await putFile(cfg, branch, SNAPSHOT_PATH, utf8Base64(script), `CMS: publiko përmbajtjen (${snap.by})`, sha);
    if (!liveCommit) liveCommit = commit;
  }
  onStep({ kind: 'done' });
  return { commit: liveCommit!, bytes: new TextEncoder().encode(script).length, images: files.length, script };
}

/** Reads the snapshot currently served by the live site (to compare, or to load it into this browser). */
export async function fetchLiveSnapshot(siteBase: string): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${siteBase}${SNAPSHOT_PATH}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/window\.ITCOM_PUBLISHED\s*=\s*([\s\S]*?);\s*$/);
    if (!m || m[1].trim() === 'null') return null;
    return JSON.parse(m[1]) as Snapshot;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Order channel: records the shop sent to the webhook                 */
/* ------------------------------------------------------------------ */
export interface ChannelRecord {
  kind: 'order' | 'inquiry' | 'booking';
  record: unknown;
}

/** GET <endpoint>?key=… → { records: [{ kind, record }] } (see docs/order-channel.gs). */
export async function fetchChannel(endpoint: string, key: string): Promise<ChannelRecord[]> {
  const url = new URL(endpoint);
  if (key) url.searchParams.set('key', key);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new PublishError(res.statusText, res.status);
  const body = (await res.json()) as { records?: ChannelRecord[]; error?: string } | ChannelRecord[];
  if (!Array.isArray(body) && body.error) throw new PublishError(body.error, 403);
  return Array.isArray(body) ? body : (body.records ?? []);
}
