// Copies the built CMS into the shop: dist/index.html → ../admin/index.html, dist/cms-assets → ../cms-assets,
// dist/fonts → ../fonts. Run after `vite build` with BASE_PATH=/ITCOM/ (see the "site" script in package.json).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const site = fileURLToPath(new URL('../../', import.meta.url));

mkdirSync(site + 'admin', { recursive: true });
cpSync(dist + 'index.html', site + 'admin/index.html');
rmSync(site + 'cms-assets', { recursive: true, force: true });
cpSync(dist + 'cms-assets', site + 'cms-assets', { recursive: true });
rmSync(site + 'fonts', { recursive: true, force: true });
cpSync(dist + 'fonts', site + 'fonts', { recursive: true });
console.log('CMS copied to admin/, cms-assets/ and fonts/');
