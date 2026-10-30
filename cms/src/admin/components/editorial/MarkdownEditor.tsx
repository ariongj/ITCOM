import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bold, ChevronDown, CircleHelp, Columns2, Copy, Eye, Heading2, Heading3, Info, Italic, Link2, List, ListOrdered, PenLine, TextQuote } from 'lucide-react';
import { Markdown } from '@/components/ui/Markdown';
import { useDict, useLang } from '@/i18n';
import type { L10n, Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ed } from './i18n';
import { countWords, readMinutesFor } from './hooks';

// Albanian is the source language; `me` holds the Serbian copy.
const LANGS: Lang[] = ['sq', 'en', 'me'];
type Mode = 'write' | 'split' | 'preview';
type BlockKind = 'h2' | 'h3' | 'ul' | 'ol' | 'quote';

const BLOCK_RE: Record<BlockKind, RegExp> = { h2: /^## /, h3: /^### /, ul: /^[-*] /, ol: /^\d+[.)] /, quote: /^> / };
const BLOCK_PREFIX: Record<Exclude<BlockKind, 'ol'>, string> = { h2: '## ', h3: '### ', ul: '- ', quote: '> ' };
const ANY_PREFIX = /^(#{2,3} |[-*] |\d+[.)] |> )/;

/**
 * Three-language markdown editor with a formatting toolbar, live preview
 * (side by side on desktop, stacked on mobile) and a syntax cheat-sheet.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
  title,
  description,
  previewHeader,
  className,
}: {
  value: L10n;
  onChange: (v: L10n) => void;
  rows?: number;
  title?: ReactNode;
  description?: ReactNode;
  /** Rendered above the markdown in the preview pane (e.g. the page title) */
  previewHeader?: (lang: Lang) => ReactNode;
  className?: string;
}) {
  const t = useDict(ed, 'admin');
  const adminLang = useLang('admin');
  const [lang, setLang] = useState<Lang>(adminLang);
  const [mode, setMode] = useState<Mode>('split');
  const [help, setHelp] = useState(true);
  const ta = useRef<HTMLTextAreaElement>(null);

  const v = value ?? { me: '', sq: '', en: '' };
  const text = v[lang] ?? '';
  const usingFallback = lang !== 'sq' && !text.trim() && !!v.sq.trim();
  const previewSource = usingFallback ? v.sq : text;
  const words = countWords(previewSource);

  const commit = (next: string, selStart?: number, selEnd?: number) => {
    onChange({ ...v, [lang]: next });
    if (selStart === undefined) return;
    requestAnimationFrame(() => {
      const el = ta.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd ?? selStart);
    });
  };

  const selection = () => {
    const el = ta.current;
    return el ? { s: el.selectionStart, e: el.selectionEnd } : { s: text.length, e: text.length };
  };

  const wrap = (mark: string, placeholder: string) => {
    if (mode === 'preview') setMode('split');
    const { s, e } = selection();
    const sel = text.slice(s, e);
    // Toggle off when the selection is already wrapped
    if (sel && text.slice(s - mark.length, s) === mark && text.slice(e, e + mark.length) === mark) {
      commit(text.slice(0, s - mark.length) + sel + text.slice(e + mark.length), s - mark.length, e - mark.length);
      return;
    }
    const inner = sel || placeholder;
    commit(text.slice(0, s) + mark + inner + mark + text.slice(e), s + mark.length, s + mark.length + inner.length);
  };

  const link = () => {
    if (mode === 'preview') setMode('split');
    const { s, e } = selection();
    const sel = text.slice(s, e);
    const inner = sel || t('ph_link');
    const url = '/kontakt';
    const md = `[${inner}](${url})`;
    const next = text.slice(0, s) + md + text.slice(e);
    // With a selection, jump to the URL; otherwise select the placeholder text.
    if (sel) commit(next, s + inner.length + 3, s + inner.length + 3 + url.length);
    else commit(next, s + 1, s + 1 + inner.length);
  };

  const block = (kind: BlockKind) => {
    if (mode === 'preview') setMode('split');
    const { s, e } = selection();
    const ls = text.lastIndexOf('\n', s - 1) + 1;
    let le = text.indexOf('\n', e > s && text[e - 1] === '\n' ? e - 1 : e);
    if (le < 0) le = text.length;
    const lines = text.slice(ls, le).split('\n');
    const allHave = lines.every((l) => BLOCK_RE[kind].test(l));
    const ph = kind === 'h2' || kind === 'h3' ? t('ph_heading') : kind === 'quote' ? t('ph_quote') : t('ph_item');
    const out = allHave
      ? lines.map((l) => l.replace(BLOCK_RE[kind], ''))
      : lines.map((l, i) => (kind === 'ol' ? `${i + 1}. ` : BLOCK_PREFIX[kind]) + (l.replace(ANY_PREFIX, '') || ph));
    const before = text.slice(0, ls);
    const after = text.slice(le);
    let lead = '';
    let trail = '';
    if (!allHave) {
      // The renderer splits blocks on blank lines — keep the new block separate.
      const prevLine = before.replace(/\n$/, '').split('\n').pop() ?? '';
      const nextLine = after.replace(/^\n/, '').split('\n')[0] ?? '';
      const listy = kind === 'ul' || kind === 'ol' || kind === 'quote';
      if (before && prevLine.trim() && !(listy && BLOCK_RE[kind].test(prevLine))) lead = '\n';
      if (after && nextLine.trim() && !(listy && BLOCK_RE[kind].test(nextLine))) trail = '\n';
    }
    const body = out.join('\n');
    const start = ls + lead.length;
    if (lines.length === 1 && !allHave) {
      const prefixLen = out[0].length - (lines[0].replace(ANY_PREFIX, '') || ph).length;
      commit(before + lead + body + trail + after, start + prefixLen, start + body.length);
    } else {
      commit(before + lead + body + trail + after, start, start + body.length);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        wrap('**', t('ph_bold'));
        return;
      }
      if (k === 'i') {
        e.preventDefault();
        wrap('*', t('ph_italic'));
        return;
      }
      if (k === 'k') {
        e.preventDefault();
        link();
        return;
      }
    }
    // Continue lists / quotes on Enter; an empty item ends the list.
    if (e.key === 'Enter' && !mod && !e.shiftKey) {
      const el = e.currentTarget;
      const s = el.selectionStart;
      if (s !== el.selectionEnd) return;
      const ls = text.lastIndexOf('\n', s - 1) + 1;
      const line = text.slice(ls, s);
      const m = line.match(/^([-*] |(\d+)([.)]) |> )/);
      if (!m) return;
      e.preventDefault();
      if (line.trim() === m[0].trim()) {
        commit(text.slice(0, ls) + '\n' + text.slice(s), ls + 1);
      } else {
        const prefix = m[2] ? `${Number(m[2]) + 1}${m[3]} ` : m[1];
        commit(text.slice(0, s) + '\n' + prefix + text.slice(s), s + 1 + prefix.length);
      }
    }
  };

  const tools: { icon: ReactNode; label: string; run: () => void; sep?: boolean }[] = [
    { icon: <Bold className="h-4 w-4" />, label: t('bold'), run: () => wrap('**', t('ph_bold')) },
    { icon: <Italic className="h-4 w-4" />, label: t('italic'), run: () => wrap('*', t('ph_italic')) },
    { icon: <Heading2 className="h-4 w-4" />, label: t('h2'), run: () => block('h2'), sep: true },
    { icon: <Heading3 className="h-4 w-4" />, label: t('h3'), run: () => block('h3') },
    { icon: <List className="h-4 w-4" />, label: t('ul'), run: () => block('ul'), sep: true },
    { icon: <ListOrdered className="h-4 w-4" />, label: t('ol'), run: () => block('ol') },
    { icon: <TextQuote className="h-4 w-4" />, label: t('quote'), run: () => block('quote') },
    { icon: <Link2 className="h-4 w-4" />, label: t('link'), run: link, sep: true },
  ];

  const modes: { id: Mode; label: string; icon: ReactNode }[] = [
    { id: 'write', label: t('write'), icon: <PenLine className="h-3.5 w-3.5" /> },
    { id: 'split', label: t('split'), icon: <Columns2 className="h-3.5 w-3.5" /> },
    { id: 'preview', label: t('preview'), icon: <Eye className="h-3.5 w-3.5" /> },
  ];

  const cheats: [string, string][] = [
    [`## ${t('cs_example_h2')}`, t('cs_h2')],
    ['### …', t('cs_h3')],
    ['**…**', t('cs_bold')],
    ['*…*', t('cs_italic')],
    [`- ${t('cs_example_item')}`, t('cs_ul')],
    [`1. ${t('cs_example_item')}`, t('cs_ol')],
    [`> ${t('cs_example_quote')}`, t('cs_quote')],
    [`[${t('cs_example_link')}](/kontakt)`, t('cs_link')],
    ['↵ ↵', t('cs_para')],
  ];

  return (
    <section className={cn('overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(28_26_23/0.04)]', className)}>
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">{title ?? t('content')}</h2>
          <p className="mt-0.5 text-[13px] text-muted">{description ?? t('contentHint')}</p>
        </div>
        <div className="flex rounded-lg bg-canvas p-0.5" role="tablist" aria-label={t('preview')}>
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              title={m.label}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors',
                mode === m.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/70 bg-canvas/40 px-3 py-2 sm:px-4">
        <div className="flex rounded-lg bg-canvas p-0.5">
          {LANGS.map((code) => {
            const missing = !v[code]?.trim();
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                title={missing ? t('fallbackNote') : t(`lang_${code}`)}
                className={cn(
                  'relative rounded-md px-2.5 py-1 text-[11.5px] font-bold tracking-wide transition-colors',
                  lang === code ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {(code === 'me' ? 'SR' : code.toUpperCase())}
                {missing && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </button>
            );
          })}
        </div>
        <div className={cn('flex flex-wrap items-center gap-0.5', mode === 'preview' && 'pointer-events-none opacity-40')} aria-label={t('toolbar')}>
          {tools.map((tool, i) => (
            <span key={i} className="flex items-center">
              {tool.sep && <span className="mx-1 h-5 w-px bg-line" aria-hidden />}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={tool.run}
                title={tool.label}
                aria-label={tool.label}
                className="grid h-8 w-8 place-items-center rounded-md text-ink-soft transition-colors hover:bg-white hover:text-ink hover:shadow-sm"
              >
                {tool.icon}
              </button>
            </span>
          ))}
        </div>
        {lang !== 'sq' && !text.trim() && v.sq.trim() && (
          <button
            type="button"
            onClick={() => commit(v.sq)}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold text-muted transition-colors hover:bg-white hover:text-ink"
          >
            <Copy className="h-3.5 w-3.5" /> {t('copyFromMe')}
          </button>
        )}
      </div>

      {/* Editor + preview */}
      <div className={cn('grid', mode === 'split' && 'lg:h-[560px] lg:grid-cols-2')}>
        {mode !== 'preview' && (
          <div className={cn('relative min-h-0', mode === 'split' && 'lg:border-r lg:border-line/70')}>
            <textarea
              ref={ta}
              value={text}
              rows={rows}
              onChange={(e) => commit(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={lang !== 'sq'}
              placeholder={usingFallback ? v.sq.slice(0, 220) + '…' : '## …'}
              className={cn(
                'block w-full resize-y bg-white px-5 py-4 font-mono text-[13px] leading-[1.75] text-ink-soft outline-none placeholder:text-muted/45',
                mode === 'split' && 'lg:h-full lg:resize-none',
                mode === 'write' && 'min-h-[480px]',
              )}
            />
          </div>
        )}
        {mode !== 'write' && (
          <div className={cn('min-h-0 overflow-y-auto bg-paper', mode === 'split' ? 'max-h-[560px] border-t border-line/70 lg:max-h-none lg:border-t-0' : 'min-h-[480px]')}>
            <div className={cn('px-5 py-5 sm:px-8 sm:py-7', mode === 'preview' && 'mx-auto max-w-3xl')}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t('livePreview')} · {(lang === 'me' ? 'SR' : lang.toUpperCase())}
                </span>
                {usingFallback && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-600/20">
                    <Info className="h-3 w-3" /> {t('fallbackNote')}
                  </span>
                )}
              </div>
              {previewHeader?.(lang)}
              {previewSource.trim() ? (
                <Markdown source={previewSource} className="text-[15px] [&>*:first-child]:mt-0" />
              ) : (
                <p className="py-10 text-center text-sm text-muted">{t('emptyPreview')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: stats + cheat-sheet */}
      <footer className="border-t border-line/70 bg-canvas/40">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-muted tabular-nums">
            <span>{t('words', { n: words })}</span>
            <span className="text-ink/20">•</span>
            <span>{t('readTime', { n: readMinutesFor(previewSource) })}</span>
          </div>
          <button
            type="button"
            onClick={() => setHelp((h) => !h)}
            aria-expanded={help}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-white hover:text-ink"
          >
            <CircleHelp className="h-3.5 w-3.5" />
            {t('syntax')}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', help && 'rotate-180')} />
          </button>
        </div>
        {help && (
          <ul className="grid gap-x-6 gap-y-1 border-t border-line/60 px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
            {cheats.map(([code, label]) => (
              <li key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-md py-1 text-[12px]">
                <code className="truncate rounded bg-white px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-brand-700 ring-1 ring-line/70">{code}</code>
                <span className="shrink-0 text-muted">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </footer>
    </section>
  );
}
