import { lazy, type ReactNode } from 'react';
import { useUi } from '@/store/ui';
import { can, type Action, type Module } from '@/lib/permissions';

// Kept tiny on purpose: App.tsx imports this eagerly; the "no permission" screen loads with the CMS chunk.
const NoAccess = lazy(() => import('./NoAccess'));

/**
 * Route guard for CMS screens (roles & permissions, PDF p.42). Renders the page only when the current demo
 * role may `action` (default 'view') in `module`; otherwise a friendly "Nuk keni leje" screen.
 *
 *   { path: 'popusti', element: <RequirePerm module="discounts"><Discounts /></RequirePerm> }
 */
export function RequirePerm({ module, action = 'view', children }: { module: Module; action?: Action; children: ReactNode }) {
  const role = useUi((s) => s.adminRole);
  if (can(role, module, action)) return <>{children}</>;
  return <NoAccess module={module} />;
}
