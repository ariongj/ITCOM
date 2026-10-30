import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/**
 * Tiny, safe markdown renderer for CMS content (no raw HTML).
 * Supports: ## / ### headings, paragraphs, - lists, 1. lists, > quotes, **bold**, *italic*, [links](url).
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('[')) {
      const label = tok.slice(1, tok.indexOf(']'));
      const href = tok.slice(tok.indexOf('(') + 1, -1);
      out.push(
        href.startsWith('/') ? (
          <Link key={k} to={href}>
            {label}
          </Link>
        ) : (
          <a key={k} href={href} target="_blank" rel="noreferrer">
            {label}
          </a>
        ),
      );
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className={cn('prose-cms', className)}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        if (!lines.length) return null;
        const first = lines[0];
        if (first.startsWith('### ')) return <h3 key={bi}>{inline(first.slice(4), `h${bi}`)}</h3>;
        if (first.startsWith('## ')) {
          const rest = lines.slice(1).join('\n');
          return (
            <Fragment key={bi}>
              <h2>{inline(first.slice(3), `h${bi}`)}</h2>
              {rest && <Markdown source={rest} />}
            </Fragment>
          );
        }
        if (lines.every((l) => /^[-*] /.test(l)))
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.slice(2), `u${bi}${li}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+[.)] /.test(l)))
          return (
            <ol key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\d+[.)] /, ''), `o${bi}${li}`)}</li>
              ))}
            </ol>
          );
        if (lines.every((l) => l.startsWith('> '))) return <blockquote key={bi}>{inline(lines.map((l) => l.slice(2)).join(' '), `q${bi}`)}</blockquote>;
        return <p key={bi}>{inline(lines.join(' '), `p${bi}`)}</p>;
      })}
    </div>
  );
}
