import { Navigate, useLocation } from 'react-router';

/**
 * The v1 "Kuponi" screen is replaced by Zbritjet (/admin/popusti, CMS proposal pp.20–27): codes are discount rules
 * with method "Me kod". Kept as a redirect so old links/bookmarks keep working (query + hash preserved).
 */
export default function Coupons() {
  const { search, hash } = useLocation();
  return <Navigate to={`/admin/popusti${search}${hash}`} replace />;
}
