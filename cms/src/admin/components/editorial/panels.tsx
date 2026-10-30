// Side panels shared by the page and post editors (PDF p.36): publishing, SEO, organisation.
import { useId, type ReactNode } from 'react';
import { CalendarClock, CircleCheck, CircleDashed, EyeOff, Lock } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { useDict, useLang } from '@/i18n';
import type { L10n, Lang } from '@/lib/types';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import { cx } from './dict';
import { SearchPreview, TextField } from './fields';
import { emptySeo, fromLocalInput, toLocalInput, type SeoMeta, type Visibility } from './meta';
import { ChipsInput, Notice, SelectField } from './ui';

/* ------------------------------------------------------------------ */
/* Publishing: draft / hidden / published + publish date               */
/* ------------------------------------------------------------------ */
const VIS: { id: Visibility; icon: typeof CircleCheck }[] = [
  { id: 'published', icon: CircleCheck },
  { id: 'hidden', icon: EyeOff },
  { id: 'draft', icon: CircleDashed },
];

export function PublishCard({
  title,
  visibility,
  onVisibility,
  publishedAt,
  onPublishedAt,
  canPublish,
  readOnly,
  children,
}: {
  title: ReactNode;
  visibility: Visibility;
  onVisibility: (v: Visibility) => void;
  publishedAt?: string;
  onPublishedAt: (iso: string) => void;
  canPublish: boolean;
  readOnly?: boolean;
  children?: ReactNode;
}) {
  const t = useDict(cx, 'admin');
  const lang = useLang('admin');
  const name = useId();
  const locked = readOnly || !canPublish;
  const future = visibility === 'published' && publishedAt && new Date(publishedAt).getTime() > Date.now();
  return (
    <Card title={title} bodyClassName="space-y-4">
      <fieldset disabled={locked}>
        <legend className="sr-only">{t('visibility')}</legend>
        <div className="overflow-hidden rounded-lg border border-line">
          {VIS.map(({ id, icon: Icon }, i) => {
            const on = visibility === id;
            return (
              <label
                key={id}
                title={locked && !readOnly ? t('noPublishPerm') : undefined}
                className={cn(
                  'flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors',
                  i > 0 && 'border-t border-line',
                  on ? 'bg-ink/[0.035]' : 'hover:bg-canvas/70',
                  locked && 'cursor-not-allowed',
                )}
              >
                <input type="radio" name={name} className="peer sr-only" checked={on} onChange={() => onVisibility(id)} />
                <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-ink/10', on ? 'border-ink bg-ink' : 'border-ink/30 bg-white')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full bg-white transition-transform', on ? 'scale-100' : 'scale-0')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                    <Icon className="h-3.5 w-3.5 text-ink-soft" />
                    {t(`vis_${id}`)}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t(`vis_${id}Hint`)}</span>
                </span>
                {locked && on && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />}
              </label>
            );
          })}
        </div>
      </fieldset>
      {!canPublish && !readOnly && <Notice icon={Lock}>{t('noPublishPerm')}</Notice>}
      <TextField
        label={t('publishDate')}
        type="datetime-local"
        value={toLocalInput(publishedAt)}
        disabled={readOnly}
        leading={<CalendarClock className="h-4 w-4" />}
        onChange={(e) => {
          const iso = fromLocalInput(e.target.value);
          if (iso) onPublishedAt(iso);
        }}
        hint={
          future ? (
            <span className="font-semibold text-ink">{t('scheduledFor', { date: date(publishedAt!, lang, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</span>
          ) : (
            t('publishDateHint')
          )
        }
      />
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SEO: Google preview + SEO title / description per language + slug   */
/* ------------------------------------------------------------------ */
const LANGS: Lang[] = ['sq', 'en', 'me'];

function CountHint({ value, limit }: { value: L10n; limit: number }) {
  const t = useDict(cx, 'admin');
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      <span>{t('seoLimit', { n: limit })}</span>
      <span className="flex gap-2 tabular-nums">
        {LANGS.map((l) => {
          const n = value[l]?.trim().length ?? 0;
          return (
            <span key={l} className={cn(n > limit ? 'font-semibold text-red-600' : n ? 'text-ink-soft' : 'text-muted/70')}>
              {(l === 'me' ? 'SR' : l.toUpperCase())} {n}
            </span>
          );
        })}
      </span>
    </span>
  );
}

export function SeoCard({
  seo,
  onChange,
  fallbackTitle,
  fallbackDescription,
  path,
  domain,
  slugField,
  readOnly,
}: {
  seo?: SeoMeta;
  onChange: (seo: SeoMeta) => void;
  fallbackTitle: string;
  fallbackDescription: string;
  path: string[];
  domain: string;
  slugField?: ReactNode;
  readOnly?: boolean;
}) {
  const t = useDict(cx, 'admin');
  const lang = useLang('admin');
  const s = seo ?? emptySeo();
  const title = s.title[lang]?.trim() || s.title.sq.trim() || fallbackTitle;
  const description = s.description[lang]?.trim() || s.description.sq.trim() || fallbackDescription;
  return (
    <Card title={t('seo')} description={`${t('seoHint')} ${t('seoFallback')}`} bodyClassName="space-y-5">
      <SearchPreview domain={domain} path={path} title={`${title} | ITCOM`} description={description} />
      <fieldset disabled={readOnly} className="space-y-5">
        <L10nInput label={t('seoTitle')} value={s.title} onChange={(title) => onChange({ ...s, title })} placeholder={fallbackTitle} hint={<CountHint value={s.title} limit={60} />} />
        <L10nInput label={t('seoDesc')} value={s.description} onChange={(description) => onChange({ ...s, description })} multiline rows={3} placeholder={fallbackDescription} hint={<CountHint value={s.description} limit={160} />} />
        {slugField}
      </fieldset>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Organisation: template, author, tags                                 */
/* ------------------------------------------------------------------ */
export function OrganizationCard<T extends string>({
  template,
  templates,
  onTemplate,
  author,
  authors,
  onAuthor,
  tags,
  tagSuggestions,
  onTags,
  readOnly,
  children,
}: {
  template: T;
  templates: { id: T; label: string }[];
  onTemplate: (v: T) => void;
  author: string;
  authors: string[];
  onAuthor: (v: string) => void;
  tags: string[];
  tagSuggestions: string[];
  onTags: (v: string[]) => void;
  readOnly?: boolean;
  children?: ReactNode;
}) {
  const t = useDict(cx, 'admin');
  const listId = useId();
  return (
    <Card title={t('organization')} bodyClassName="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4">
        {children}
        <SelectField label={t('template')} hint={t('templateHint')} value={template} onChange={(e) => onTemplate(e.target.value as T)}>
          {templates.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div>
          <TextField label={t('author')} value={author} list={listId} onChange={(e) => onAuthor(e.target.value)} />
          <datalist id={listId}>
            {authors.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <ChipsInput label={t('tags')} value={tags} onChange={onTags} suggestions={tagSuggestions} placeholder={t('tagsPh')} hint={t('tagsHint')} disabled={readOnly} />
      </fieldset>
    </Card>
  );
}

/** Labelled read-only row used in side cards. */
export function MetaRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-ink">{children}</span>
    </div>
  );
}
