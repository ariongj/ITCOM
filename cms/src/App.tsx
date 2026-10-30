import { Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration, useLocation, type RouteObject } from 'react-router';
import { BASENAME } from '@/lib/paths';
import { Toaster, toast } from 'sonner';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { applyBrand, setAdminTheme } from '@/lib/color';
import { startCrossTabSync } from '@/store/sync';
import { importShopOutbox } from '@/store/outbox';
import { defineDict } from '@/i18n';
import { RequirePerm } from '@/admin/layout/RequirePerm';
import type { Action, Module } from '@/lib/permissions';

// ITCOM: this app is only the CMS (/ITCOM/admin). The shop itself is the static site one level up; both share
// the browser's localStorage, so the shop shows CMS edits and orders from the shop appear here.
import RouteError from '@/admin/shell/RouteError';
import { lazyRetry } from '@/admin/shell/lazy';

// CMS (lazy — separate bundle)
const AdminLayout = lazyRetry(() => import('@/admin/layout/AdminLayout'));
const Login = lazyRetry(() => import('@/admin/pages/Login'));
const Invoice = lazyRetry(() => import('@/admin/pages/Invoice'));
// Overview, orders
const Dashboard = lazyRetry(() => import('@/admin/pages/Dashboard'));
const Orders = lazyRetry(() => import('@/admin/pages/Orders'));
const OrderDetail = lazyRetry(() => import('@/admin/pages/OrderDetail'));
const DraftOrders = lazyRetry(() => import('@/admin/pages/DraftOrders'));
const DraftOrderEdit = lazyRetry(() => import('@/admin/pages/DraftOrderEdit'));
const Returns = lazyRetry(() => import('@/admin/pages/Returns'));
// Products
const Products = lazyRetry(() => import('@/admin/pages/Products'));
const ProductEdit = lazyRetry(() => import('@/admin/pages/ProductEdit'));
const Categories = lazyRetry(() => import('@/admin/pages/Categories'));
const Inventory = lazyRetry(() => import('@/admin/pages/Inventory'));
const PurchaseOrders = lazyRetry(() => import('@/admin/pages/PurchaseOrders'));
// Customers, growth, discounts
const Customers = lazyRetry(() => import('@/admin/pages/Customers'));
const Segments = lazyRetry(() => import('@/admin/pages/Segments'));
// Content
const Pages = lazyRetry(() => import('@/admin/pages/Pages'));
const PageEdit = lazyRetry(() => import('@/admin/pages/PageEdit'));
const Media = lazyRetry(() => import('@/admin/pages/Media'));
// Markets, analytics, contacts, appointments
const Analytics = lazyRetry(() => import('@/admin/pages/Analytics'));
const Inquiries = lazyRetry(() => import('@/admin/pages/Inquiries'));
// Sales channels, settings
const Slides = lazyRetry(() => import('@/admin/pages/Slides'));
const SlideEdit = lazyRetry(() => import('@/admin/pages/SlideEdit'));
const Integrations = lazyRetry(() => import('@/admin/pages/Integrations'));
const SettingsPage = lazyRetry(() => import('@/admin/pages/SettingsPage'));

function Loader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-brand-600" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useUi((s) => s.adminAuthed);
  if (!authed) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

const STORAGE_FULL = defineDict({
  me: { full: 'Prostor za demo podatke je pun — obrišite neke otpremljene slike ili resetujte demo.' },
  sq: { full: 'Hapësira për të dhënat e demos është plot — fshini disa imazhe të ngarkuara ose rivendosni demon.' },
  en: { full: 'Demo data storage is full — delete some uploaded images or reset the demo.' },
});

/** Old v1 CMS URLs → v2 screens, keeping ?query (e.g. /admin/upiti?id=inq_120 → /admin/kontakti?id=inq_120). */
function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

function Root() {
  const brand = useDb((s) => s.settings.brandColor);
  const { pathname } = useLocation();
  const admin = pathname === '/admin' || pathname.startsWith('/admin/');
  // Neutral CMS theme under /admin (PDF p.07); the storefront (and the builder's preview iframe) keeps the ITCOM gold.
  useLayoutEffect(() => setAdminTheme(admin), [admin]);
  useEffect(() => applyBrand(brand), [brand]);
  useEffect(() => startCrossTabSync(), []);
  // ITCOM: orders and requests sent from the shop before this browser opened the CMS
  useEffect(() => importShopOutbox(), []);
  useEffect(() => {
    const fn = () => {
      const ui = useUi.getState();
      const lang = document.documentElement.hasAttribute('data-admin') ? ui.adminLang : ui.lang;
      toast.error(STORAGE_FULL[lang].full);
    };
    window.addEventListener('optika:storage-full', fn);
    return () => window.removeEventListener('optika:storage-full', fn);
  }, []);
  return (
    <>
      {/* Every full page load starts as history key "default", so keying by it restored the previous page's scroll
          position onto a different page opened in the same tab. Fresh loads are keyed by their path instead (a
          reload still comes back to where you were); in-app navigations keep their unique keys (back/forward). */}
      <ScrollRestoration getKey={(location) => (location.key === 'default' ? location.pathname : location.key)} />
      <Suspense fallback={<Loader />}>
        <Outlet />
      </Suspense>
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </>
  );
}

/** CMS screen guarded by roles & permissions (PDF p.42): `module` + optional `action` (default view). */
const screen = (path: string, module: Module | null, element: ReactNode, action?: Action): RouteObject => ({
  path,
  element: module ? (
    <RequirePerm module={module} action={action}>
      {element}
    </RequirePerm>
  ) : (
    element
  ),
});

// Route map — keep in sync with src/admin/layout/nav.ts (sidebar) and AGENT_BRIEF.md ("CMS v2 route map").
const adminRoutes: RouteObject[] = [
  { index: true, element: <RequirePerm module="overview"><Dashboard /></RequirePerm> },
  // Porositë
  screen('narudzbe', 'orders', <Orders />),
  screen('narudzbe/:id', 'orders', <OrderDetail />),
  screen('nacrti', 'drafts', <DraftOrders />),
  screen('nacrti/:id', 'drafts', <DraftOrderEdit />), // 'novi' = new draft
  screen('povrati', 'returns', <Returns />),
  // Produktet
  screen('proizvodi', 'products', <Products />),
  screen('proizvodi/novi', 'products', <ProductEdit />),
  screen('proizvodi/:id', 'products', <ProductEdit />),
  screen('kategorije', 'products', <Categories />),
  screen('inventar', 'inventory', <Inventory />),
  screen('nabavke', 'purchasing', <PurchaseOrders />),
  // Klientët
  screen('kupci', 'customers', <Customers />),
  screen('segmenti', 'segments', <Segments />),
  // Përmbajtja
  screen('stranice', 'content', <Pages />),
  screen('stranice/:id', 'content', <PageEdit />),
  screen('mediji', 'content', <Media />),
  // Analitika
  screen('analitika', 'analytics', <Analytics />),
  // Kontaktet
  screen('kontakti', 'contacts', <Inquiries />),
  // Kanale shitjeje
  { path: 'prodavnica', element: <Navigate to="/admin/prodavnica/slajdovi" replace /> },
  screen('prodavnica/slajdovi', 'onlineStore', <Slides />),
  screen('prodavnica/slajdovi/:id', 'onlineStore', <SlideEdit />),
  screen('integracije', 'integrations', <Integrations />),
  // Konfigurimet
  screen('konfiguracija', 'settings', <SettingsPage />),
  screen('konfiguracija/:section', 'settings', <SettingsPage />),
  // v1 URLs
  { path: 'upiti', element: <Redirect to="/admin/kontakti" /> },
  { path: 'postavke', element: <Redirect to="/admin/konfiguracija" /> },
  { path: '*', element: <Navigate to="/admin" replace /> },
];

// Created on first render (not at import), so main.tsx can restore a deep link from 404.html before the router reads the URL.
const makeRouter = () => createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },
      { path: 'admin/login', element: <Login /> },
      {
        // Printable invoice — outside the CMS shell
        path: 'admin/faktura/:id',
        element: (
          <RequireAuth>
            <Invoice />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        ),
        children: adminRoutes,
      },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
], { basename: BASENAME });

export default function App() {
  const [router] = useState(makeRouter);
  return <RouterProvider router={router} />;
}
