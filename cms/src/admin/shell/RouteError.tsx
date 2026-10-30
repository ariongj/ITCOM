import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Home, RotateCw } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { defineDict, useDict } from '@/i18n';
import { href } from '@/lib/paths';

const T = defineDict({
  me: {
    title: 'Stranica se nije učitala do kraja',
    text: 'Verovatno je veza na trenutak prekinuta ili smo upravo objavili novu verziju sajta. Osvežite stranicu — trebalo bi da radi.',
    reload: 'Osveži stranicu',
    home: 'Početna',
    call: 'Ili nas pozovite',
  },
  sq: {
    title: 'Faqja nuk u ngarkua plotësisht',
    text: 'Ndoshta lidhja u ndërpre për një çast ose sapo publikuam një version të ri të faqes. Rifreskoni faqen — duhet të funksionojë.',
    reload: 'Rifresko faqen',
    home: 'Ballina',
    call: 'Ose na telefononi',
  },
  en: {
    title: 'This page didn’t finish loading',
    text: 'The connection probably dropped for a moment, or we have just published a new version of the site. Refresh the page — it should work.',
    reload: 'Refresh the page',
    home: 'Home',
    call: 'Or give us a call',
  },
});

/**
 * Router error screen (storefront and CMS). Shown instead of React Router's developer screen — most often a
 * code-split file that failed to download on a weak connection (retries and one automatic reload come first).
 * Self-contained: it renders outside the site layout.
 */
export default function RouteError() {
  const error = useRouteError();
  const t = useDict(T);
  if (import.meta.env.DEV) console.error(error);
  const status = isRouteErrorResponse(error) ? error.status : null;
  return (
    <main className="grid min-h-svh place-items-center bg-paper px-5 py-16 text-ink">
      <div className="w-full max-w-md text-center">
        <a href={href('/')} className="inline-block" aria-label={t('home')}>
          <Logo className="mx-auto h-12" />
        </a>
        <h1 className="display mt-10 text-[34px] leading-tight sm:text-[42px]">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-sm text-[15.5px] leading-relaxed text-muted">{t('text')}</p>
        {status && <p className="mt-2 font-mono text-[12px] text-muted/70">HTTP {status}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => location.reload()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <RotateCw className="h-4 w-4" /> {t('reload')}
          </button>
          <a href={href('/')} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white px-6 text-[15px] font-semibold transition-colors hover:border-ink/30">
            <Home className="h-4 w-4" /> {t('home')}
          </a>
        </div>
        <p className="mt-8 text-[13.5px] text-muted">
          {t('call')}:{' '}
          <a href="tel:+38343777667" className="font-semibold text-ink underline-offset-4 hover:underline">
            +383 43 777 667
          </a>
        </p>
      </div>
    </main>
  );
}
