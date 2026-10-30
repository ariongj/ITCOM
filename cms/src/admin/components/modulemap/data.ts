// Harta e moduleve — content from the CMS proposal: p.47 (other modules), p.49 (phases), p.50 (acceptance criteria),
// p.51 (decisions). Each module/criterion says honestly what THIS demo already shows and links to that screen.
import type { L10n } from '@/lib/types';

const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });

/* ------------------------------------------------------------------ */
/* Modules by phase (p.49 + p.47)                                      */
/* ------------------------------------------------------------------ */
export type PhaseId = 'base' | 'second' | 'business';
/** demo = working screen in this demo · phase2 = planned for the second extension · need = only when the business needs it */
export type ModStatus = 'demo' | 'phase2' | 'need';

export interface Phase {
  id: PhaseId;
  title: L10n;
  text: L10n;
}

export const PHASES: Phase[] = [
  {
    id: 'base',
    title: T('Zajednička osnova', 'Baza e përbashkët', 'Shared core'),
    text: T('Ono što svaki projekat dobija u prvom izdanju.', 'Ajo që çdo projekt merr në lëshimin e parë.', 'What every project gets in the first release.'),
  },
  {
    id: 'second',
    title: T('Drugo proširenje', 'Zgjerimi i dytë', 'Second extension'),
    text: T('Dolazi kada osnova radi u produkciji.', 'Vjen pasi baza funksionon në prodhim.', 'Comes once the core runs in production.'),
  },
  {
    id: 'business',
    title: T('Po potrebi biznisa', 'Sipas biznesit', 'Per business need'),
    text: T('Svaka integracija ima specifikaciju, granice i testove.', 'Çdo integrim ka specifikim, kufij dhe prova.', 'Every integration has a specification, limits and tests.'),
  },
];

export interface ModuleItem {
  id: string;
  phase: PhaseId;
  status: ModStatus;
  name: L10n;
  text: L10n;
  /** Screen that shows it in this demo (admin route, or a storefront route when `site`) */
  to?: string;
  site?: boolean;
  /** A related (simulated) screen for modules that are not in the demo yet */
  related?: string;
}

export const MODULES_MAP: ModuleItem[] = [
  /* ---------------- 01 Baza e përbashkët ---------------- */
  { id: 'access', phase: 'base', status: 'demo', to: '/admin/konfiguracija/stafi', name: T('Prijava, uloge i istorija', 'Hyrja, rolet dhe auditi', 'Sign-in, roles and audit'), text: T('Dozvole po radnji; meni i dugmad se kriju po ulozi.', 'Leje sipas veprimit; menytë dhe butonat fshihen sipas rolit.', 'Permissions per action; menus and buttons hide per role.') },
  { id: 'catalog', phase: 'base', status: 'demo', to: '/admin/proizvodi', name: T('Katalog sa varijantama', 'Katalog me variante', 'Catalogue with variants'), text: T('Okviri, naočare za sunce i sočiva — opcije (boja, sočiva), cene, status i SEO.', 'Korniza, syze dielli dhe lente — opsione (ngjyra, lentet), çmime, status dhe SEO.', 'Frames, sunglasses and lenses — options (colour, lenses), prices, status and SEO.') },
  { id: 'collections', phase: 'base', status: 'demo', to: '/admin/kolekcije', name: T('Kolekcije', 'Koleksionet', 'Collections'), text: T('Ručne i pametne kolekcije sa uslovima.', 'Koleksione manuale dhe smart me kushte.', 'Manual and smart collections with conditions.') },
  { id: 'inventory', phase: 'base', status: 'demo', to: '/admin/inventar', name: T('Inventar — jedna lokacija', 'Inventari — një lokacion', 'Inventory — one location'), text: T('Kretanja zaliha sa razlogom; dostupno = na stanju − rezervisano.', 'Lëvizje stoku me arsye; e disponueshme = në dorë − e angazhuar.', 'Stock movements with a reason; available = on hand − committed.') },
  { id: 'orders', phase: 'base', status: 'demo', to: '/admin/narudzbe', name: T('Narudžbe i nacrti', 'Porositë dhe draftet', 'Orders and drafts'), text: T('Plaćanje, isporuka i povrat novca odvojeno; nacrt narudžbe.', 'Pagesa, përmbushja dhe rimbursimi veç e veç; porosi draft.', 'Payment, fulfilment and refunds kept apart; draft orders.') },
  { id: 'customers', phase: 'base', status: 'demo', to: '/admin/kupci', name: T('Kupci i segmenti', 'Klientët dhe segmentet', 'Customers and segments'), text: T('Profil kupca, istorija narudžbi i segmenti.', 'Profili i klientit, historia e porosive dhe segmentet.', 'Customer profile, order history and segments.') },
  { id: 'payship', phase: 'base', status: 'demo', to: '/admin/konfiguracija/pagesat', name: T('Plaćanje i dostava', 'Pagesa dhe dërgesa', 'Payment and shipping'), text: T('Izabrani načini plaćanja, zone dostave i checkout.', 'Mënyrat e zgjedhura të pagesës, zonat e dërgesës dhe checkout.', 'Chosen payment methods, shipping zones and checkout.') },
  { id: 'discounts', phase: 'base', status: 'demo', to: '/admin/popusti', name: T('Četiri vrste popusta', 'Katër llojet e zbritjeve', 'Four discount types'), text: T('Kod ili automatski, kombinovanje, pragovi i limiti.', 'Me kod ose automatike, kombinime, pragje dhe kufij.', 'Code or automatic, combinations, thresholds and limits.') },
  { id: 'content', phase: 'base', status: 'demo', to: '/admin/stranice', name: T('Stranice, meniji i fajlovi', 'Faqet, menytë dhe skedarët', 'Pages, menus and files'), text: T('Sadržaj na tri jezika, sa nacrtom i objavom.', 'Përmbajtje në tre gjuhë, me draft dhe publikim.', 'Content in three languages, with draft and publish.') },
  { id: 'offers', phase: 'base', status: 'demo', to: '/admin/ponude', name: T('Centar ponuda', 'Qendra e ofertave', 'Offers centre'), text: T('Ponuda povezuje pravilo popusta, landing stranicu i banere.', 'Oferta lidh rregullin e zbritjes, landing page dhe bannerët.', 'An offer ties the discount rule, landing page and banners.') },
  { id: 'slides', phase: 'base', status: 'demo', to: '/admin/prodavnica/slajdovi', name: T('Slajder i baneri', 'Slideshow dhe bannerë', 'Slideshow and banners'), text: T('Slike za desktop i mobilni, CTA, raspored i traka obavještenja.', 'Imazhe desktop/mobile, CTA, orar dhe announcement bar.', 'Desktop/mobile images, CTA, schedule and announcement bar.') },
  { id: 'editor', phase: 'base', status: 'demo', to: '/admin/prodavnica/editor', name: T('Online prodavnica i editor', 'Online Store dhe editori', 'Online Store and editor'), text: T('Sekcije početne, nacrt, objava i vraćanje verzije.', 'Seksionet e ballinës, draft, publikim dhe rikthim versioni.', 'Homepage sections, draft, publish and version rollback.') },
  { id: 'contacts', phase: 'base', status: 'demo', to: '/admin/kontakti', name: T('Kontakti', 'Kontaktet', 'Contacts'), text: T('Upiti sa sajta, zaduženi, status i rok za odgovor.', 'Kërkesat nga faqja, përgjegjësi, statusi dhe afati.', 'Website enquiries, assignee, status and follow-up.') },
  { id: 'settings', phase: 'base', status: 'demo', to: '/admin/konfiguracija', name: T('Konfiguracija i obavještenja', 'Konfigurimet dhe njoftimet', 'Settings and notifications'), text: T('Prodavnica, osoblje, jezici, e-mail šabloni i privatnost.', 'Dyqani, stafi, gjuhët, shabllonet email dhe privatësia.', 'Store, staff, languages, email templates and privacy.') },
  { id: 'reports', phase: 'base', status: 'demo', to: '/admin/analitika', name: T('Osnovni izvještaji', 'Raporte bazë', 'Basic reports'), text: T('Prodaja, operacije i kampanje, sa izvozom CSV.', 'Shitje, operacione dhe fushata, me eksport CSV.', 'Sales, operations and campaigns, with CSV export.') },

  /* ---------------- 02 Zgjerimi i dytë ---------------- */
  { id: 'purchasing', phase: 'second', status: 'demo', to: '/admin/nabavke', name: T('Nabavke od dobavljača', 'Furnizimet', 'Purchase orders'), text: T('Prijem robe je idempotentan — isti prijem dva puta ne dodaje zalihe.', 'Pranimi i mallit është idempotent — i njëjti pranim dy herë nuk shton stok.', 'Receiving is idempotent — the same receipt twice adds no stock.') },
  { id: 'transfers', phase: 'second', status: 'phase2', related: '/admin/inventar', name: T('Transferi i više lokacija', 'Transferimet dhe multi-location', 'Transfers and multi-location'), text: T('Za sada jedna lokacija i korekcije sa razlogom.', 'Për tani një lokacion dhe korrigjime me arsye.', 'One location and reasoned adjustments for now.') },
  { id: 'models', phase: 'second', status: 'demo', to: '/admin/modeli', name: T('Blog i modeli sadržaja', 'Blogu dhe modelet e përmbajtjes', 'Blog and content models'), text: T('Strukturisani sadržaj: lookbook, FAQ, usluge, lokacije.', 'Përmbajtje e strukturuar: lookbook, FAQ, shërbime, lokacione.', 'Structured content: lookbook, FAQ, services, locations.') },
  { id: 'markets', phase: 'second', status: 'demo', to: '/admin/trzista', name: T('Tržišta i više valuta', 'Tregjet dhe shumë valuta', 'Markets and currencies'), text: T('Države, jezici, valuta i politika zaokruživanja.', 'Shtete, gjuhë, valutë dhe politikë rrumbullakimi.', 'Countries, languages, currency and rounding policy.') },
  { id: 'returns', phase: 'second', status: 'demo', to: '/admin/povrati', name: T('Povrati', 'Kthimet', 'Returns'), text: T('Djelimični povrat sa tačnim iznosom i vraćanjem na stanje.', 'Kthim i pjesshëm me shumë të saktë dhe rikthim në stok.', 'Partial returns with the exact amount and restocking.') },
  { id: 'selfservice', phase: 'second', status: 'phase2', name: T('Samousluga za kupce', 'Vetëshërbim për klientët', 'Customer self-service'), text: T('Kupac sam prijavljuje povrat i prati status.', 'Klienti e kërkon vetë kthimin dhe ndjek statusin.', 'Customers request returns and track the status themselves.') },
  { id: 'appointments', phase: 'second', status: 'demo', to: '/admin/termini', name: T('Termini i kalendar', 'Terminet dhe kalendari', 'Appointments and calendar'), text: T('Pregledi vida, prilagođavanja i Klinika Miftari bez preklapanja termina.', 'Kontrolle të syve, përshtatje dhe Klinika Miftari pa mbivendosje terminesh.', 'Eye exams, fittings and Klinika Miftari without overlapping slots.') },
  { id: 'b2b', phase: 'second', status: 'demo', to: '/admin/kontakti/ponude', name: T('Optical Lab — B2B ponude', 'Optical Lab — oferta B2B', 'Optical Lab — B2B quotes'), text: T('Ponuda sočiva za druge optike: iz upita, stavke, rok važenja i status.', 'Oferta lentesh për optika të tjera: nga kërkesa, artikuj, afat vlefshmërie dhe status.', 'Lens quotes for other opticians: from an enquiry, lines, validity and status.') },
  { id: 'campaigns', phase: 'second', status: 'demo', to: '/admin/analitika?tab=campaigns', name: T('Izvještaji kampanja', 'Raportet e fushatave', 'Campaign reports'), text: T('Posjete, klikovi, korišćenja koda, narudžbe i popust u eurima.', 'Vizita, klikime, përdorime kodi, porosi dhe ulje monetare.', 'Visits, clicks, code uses, orders and money off.') },
  { id: 'fiscal', phase: 'second', status: 'phase2', related: '/admin/integracije', name: T('Fiskalizacija (ATK)', 'Fiskalizimi (ATK)', 'Fiscalisation (ATK)'), text: T('Registracija računa u fiskalnom sistemu ATK — kroz integraciju.', 'Regjistrimi i faturave në sistemin fiskal të ATK-së — përmes integrimit.', 'Invoices registered with the ATK fiscal system — via an integration.') },
  { id: 'automations', phase: 'second', status: 'phase2', name: T('Automatizacije', 'Automatizimet', 'Automations'), text: T('Okidač → uslov → radnja, sa logom, ponovnim pokušajem i zaštitom od petlji.', 'Trigger → kusht → veprim, me log, riprovim dhe parandalim ciklesh.', 'Trigger → condition → action, with log, retry and loop protection.') },
  { id: 'import', phase: 'second', status: 'phase2', related: '/admin/proizvodi', name: T('Napredni uvoz', 'Import i avancuar', 'Advanced import'), text: T('Osnovni CSV uvoz sa provjerom duplikata SKU već radi u demo verziji.', 'Importi bazë CSV me kontroll dublikatash SKU funksionon tashmë në demo.', 'Basic CSV import with a duplicate-SKU check already works in the demo.') },

  /* ---------------- 03 Sipas biznesit ---------------- */
  { id: 'wishlist', phase: 'business', status: 'demo', to: '/te-preferuarat', site: true, name: T('Lista želja, pretraga i filteri', 'Wishlist, kërkim dhe filtra', 'Wishlist, search and filters'), text: T('Na javnom sajtu već rade lista želja, pretraga i filteri.', 'Në faqen publike funksionojnë tashmë wishlist, kërkimi dhe filtrat.', 'Wishlist, search and filters already work on the public site.') },
  { id: 'pos', phase: 'business', status: 'need', name: T('POS sa sinhronizacijom', 'POS me sinkronizim', 'POS with sync'), text: T('Jedan izvor istine za zalihe i narudžbe.', 'Një burim i qartë për stokun dhe porositë.', 'One source of truth for stock and orders.') },
  { id: 'marketplace', phase: 'business', status: 'need', name: T('Marketplace i društvene mreže', 'Marketplace dhe rrjete sociale', 'Marketplaces and social'), text: T('Mapiranje proizvoda, red čekanja i greške sinhronizacije.', 'Mapim produktesh, queue dhe gabime sinkronizimi.', 'Product mapping, queue and sync errors.') },
  { id: 'erp', phase: 'business', status: 'need', related: '/admin/integracije', name: T('ERP / knjigovodstvo', 'ERP / kontabilitet', 'ERP / accounting'), text: T('Artikli, zalihe, narudžbe i računi sa knjigovodstvom.', 'Artikuj, stok, porosi dhe fatura me kontabilitetin.', 'Items, stock, orders and invoices with accounting.') },
  { id: 'courier', phase: 'business', status: 'need', related: '/admin/integracije', name: T('API kurira', 'API i korrierit', 'Courier API'), text: T('Nalepnice i praćenje pošiljke u narudžbi.', 'Etiketa dhe gjurmim i dërgesës në porosi.', 'Labels and shipment tracking on the order.') },
  { id: 'giftcards', phase: 'business', status: 'need', name: T('Poklon kartice i kredit', 'Gift cards dhe store credit', 'Gift cards and store credit'), text: T('Balans i registar korišćenja.', 'Balancë dhe regjistër përdorimi.', 'Balance and usage ledger.') },
  { id: 'b2bprices', phase: 'business', status: 'need', name: T('B2B optike i cenovnici', 'Optika B2B dhe çmime sipas klientit', 'B2B opticians and price lists'), text: T('Cenovnik sočiva Optical Lab po optici-partneru.', 'Çmimore e lenteve të Optical Lab sipas optikës partnere.', 'Optical Lab lens price lists per partner optician.') },
  { id: 'bundles', phase: 'business', status: 'need', name: T('Paketi (okvir + sočiva)', 'Paketa (kornizë + lente)', 'Bundles (frame + lenses)'), text: T('Zalihe komponenti se umanjuju zajedno.', 'Stoku i komponentëve zbritet bashkë.', 'Component stock is reduced together.') },
  { id: 'subscriptions', phase: 'business', status: 'need', name: T('Pretplata na kontaktna sočiva', 'Abonim për lente kontakti', 'Contact lens subscriptions'), text: T('Periodična isporuka; obnova i otkazivanje preko provajdera periodičnih plaćanja.', 'Dërgesë periodike; rinovim dhe anulim përmes ofruesit të pagesave periodike.', 'Periodic delivery; renewal and cancellation via a recurring-payments provider.') },
  { id: 'loyalty', phase: 'business', status: 'need', name: T('Program lojalnosti', 'Program besnikërie', 'Loyalty programme'), text: T('Bodovi ili kuponi, uz registar i vraćanje bodova.', 'Pikë ose kupona, me regjistër dhe kthim pikësh.', 'Points or coupons, with a ledger and reversals.') },
  { id: 'reviews', phase: 'business', status: 'need', name: T('Recenzije', 'Reviews', 'Reviews'), text: T('Moderacija i potvrda kupovine.', 'Moderim dhe verifikim blerjeje.', 'Moderation and verified purchase.') },
  { id: 'abandoned', phase: 'business', status: 'need', name: T('Napuštene korpe', 'Shporta të braktisura', 'Abandoned carts'), text: T('Podsjetnik samo uz saglasnost kupca.', 'Kujtesë vetëm me pëlqimin e klientit.', 'Reminders only with the customer’s consent.') },
  { id: 'ai', phase: 'business', status: 'need', name: T('AI prijedlozi sadržaja', 'AI për sugjerime përmbajtjeje', 'AI content suggestions'), text: T('Uvijek uz pregled prije objave; sam ne mijenja cijene ni popuste.', 'Gjithmonë me shqyrtim para publikimit; nuk ndryshon vetë çmime apo zbritje.', 'Always reviewed before publishing; never changes prices or discounts on its own.') },
  { id: 'multistore', phase: 'business', status: 'need', name: T('Panel za više prodavnica', 'Panel për shumë dyqane', 'Multi-store dashboard'), text: T('Poseban projekat platforme, sa izolacijom podataka.', 'Projekt platforme më vete, me izolim të dhënash.', 'A separate platform project, with data isolation.') },
];

/* ------------------------------------------------------------------ */
/* Acceptance criteria (p.50)                                          */
/* ------------------------------------------------------------------ */
/** demo = demonstrated here · partial = visible in the demo, completed in the implementation · impl = verified during implementation */
export type CritState = 'demo' | 'partial' | 'impl';

export interface Criterion {
  id: string;
  state: CritState;
  text: L10n;
  how: L10n;
  to?: string;
  site?: boolean;
}

export interface CriteriaGroup {
  id: string;
  title: L10n;
  items: Criterion[];
}

export const CRITERIA: CriteriaGroup[] = [
  {
    id: 'catalog',
    title: T('Katalog, narudžbe i dozvole', 'Katalog, porosi dhe leje', 'Catalogue, orders and permissions'),
    items: [
      { id: 'variant', state: 'partial', to: '/admin/narudzbe/o_1001', text: T('Tačna varijanta', 'Variant i saktë', 'Correct variant'), how: T('Opcije (boja okvira, sočiva) i njihova cena čuvaju se u korpi i narudžbi; zalihe po varijanti proveravaju se u implementaciji.', 'Opsionet (ngjyra e kornizës, lentet) dhe çmimi i tyre ruhen në shportë dhe porosi; stoku për variant verifikohet në implementim.', 'Options (frame colour, lenses) and their price are kept in the cart and order; per-variant stock is verified in the implementation.') },
      { id: 'import', state: 'demo', to: '/admin/proizvodi', text: T('Uvoz bez duplikata', 'Import pa duplikate', 'Import without duplicates'), how: T('CSV uvoz prijavljuje dupli SKU i nudi ažuriranje postojećeg proizvoda.', 'Importi CSV raporton SKU të dyfishtë dhe ofron përditësimin e produktit ekzistues.', 'The CSV import reports duplicate SKUs and offers to update the existing product.') },
      { id: 'archive', state: 'demo', to: '/admin/proizvodi', text: T('Arhiviranje bez gubitka istorije', 'Arkivim pa humbje historie', 'Archiving without losing history'), how: T('Arhivirani proizvod nestaje sa sajta, ali ostaje u starim narudžbama i izvještajima.', 'Produkti i arkivuar largohet nga faqja, por mbetet në porositë dhe raportet e vjetra.', 'An archived product leaves the site but stays in past orders and reports.') },
      { id: 'oversell', state: 'partial', to: '/admin/inventar', text: T('Prodaja posljednjeg komada bez overselling-a', 'Shitja e njësisë së fundit pa overselling', 'Selling the last unit without overselling'), how: T('Demo prikazuje dostupno = na stanju − rezervisano; transakcija na serveru za istovremene kupovine provjerava se u implementaciji.', 'Demo tregon të disponueshmen = në dorë − e angazhuar; transaksioni në server për blerje të njëkohshme verifikohet në implementim.', 'The demo shows available = on hand − committed; the server transaction for simultaneous purchases is verified in the implementation.') },
      { id: 'payment', state: 'partial', to: '/admin/nabavke', text: T('Ponovljeno plaćanje ne pravi dupli plaćanje ni narudžbu', 'Pagesë e përsëritur nuk krijon pagesë/porosi të dyfishtë', 'A repeated payment never creates a duplicate payment or order'), how: T('Princip idempotencije vidi se kod prijema nabavke: isti prijem dva puta ne dodaje zalihe. Plaćanja se provjeravaju sa provajderom.', 'Parimi i idempotencës shihet te pranimi i furnizimit: i njëjti pranim dy herë nuk shton stok. Pagesat verifikohen me ofruesin.', 'Idempotency shows when receiving a purchase order: the same receipt twice adds no stock. Payments are verified with the provider.') },
      { id: 'return', state: 'demo', to: '/admin/povrati', text: T('Djelimični povrat sa tačnom količinom i popustom', 'Kthim i pjesshëm me sasi dhe ulje të saktë', 'Partial return with exact quantity and discount'), how: T('Povrat se računa iz neto plaćenog iznosa stavki — popust raspoređen na stavke uzima se u obzir.', 'Rimbursimi llogaritet nga shuma neto e paguar e artikujve — ulja e shpërndarë në artikuj merret parasysh.', 'The refund is the net paid amount of the lines — the discount allocated to them is taken into account.') },
      { id: 'perm', state: 'partial', to: '/admin/konfiguracija/stafi', text: T('Bez dozvole nema objave, brisanja ni povrata novca', 'API refuzon publikimin/fshirjen/rimbursimin pa leje', 'The API refuses publish/delete/refund without permission'), how: T('Promijenite ulogu u meniju naloga: meni i dugmad se kriju (Marketing priprema, ali ne objavljuje). Odbijanje na API-ju provjerava se u implementaciji.', 'Ndërroni rolin te menuja e llogarisë: menytë dhe butonat fshihen (Marketingu përgatit, por nuk publikon). Refuzimi në API verifikohet në implementim.', 'Switch the role in the account menu: menus and buttons hide (Marketing prepares but cannot publish). The API refusal is verified in the implementation.') },
    ],
  },
  {
    id: 'promo',
    title: T('Popusti i ponude', 'Zbritje dhe oferta', 'Discounts and offers'),
    items: [
      { id: 'four', state: 'demo', to: '/admin/popusti', text: T('Sve četiri vrste, sa kodom ili automatski', 'Të katër llojet me kod ose automatike', 'All four types, by code or automatic'), how: T('Proizvodi, narudžba, Kupi X dobij Y i dostava — svaka sa kodom ili automatski.', 'Produkte, porosi, Blej X merr Y dhe dërgesë — secila me kod ose automatike.', 'Products, order, Buy X get Y and shipping — each by code or automatic.') },
      { id: 'threshold', state: 'demo', to: '/admin/popusti', text: T('Prag prije/poslije popusta je definisan', 'Prag para/pas uljeve i specifikuar', 'Threshold before/after discounts is specified'), how: T('MIFTARI10 važi od 100 € posle popusta na proizvode — vidi se u testu korpe.', 'MIFTARI10 vlen nga 100 € pas zbritjeve të produkteve — shihet në testin e shportës.', 'MIFTARI10 applies from €100 after product discounts — visible in the cart tester.') },
      { id: 'combine', state: 'demo', to: '/admin/popusti', text: T('Uzajamno kombinovanje i najbolja vrijednost', 'Kombinim i ndërsjellë dhe best value', 'Mutual combination and best value'), how: T('Oba pravila moraju dozvoliti kombinaciju; motor bira najveću uštedu u eurima, ne najveći procenat.', 'Të dy rregullat duhet ta lejojnë kombinimin; motori zgjedh kursimin më të madh në euro, jo përqindjen më të lartë.', 'Both rules must allow combining; the engine picks the largest saving in euros, not the highest percentage.') },
      { id: 'cents', state: 'demo', to: '/admin/popusti', text: T('Bez negativnog totala, tačni centi', 'Pa total negativ dhe centë të saktë', 'No negative total, exact cents'), how: T('Numerički primjeri sa str. 26 prolaze u testu motora popusta; raspodjela po stavkama ide u centima.', 'Shembujt numerikë të fq. 26 kalojnë në testin e motorit të zbritjeve; shpërndarja në artikuj bëhet në centë.', 'The numeric examples from p.26 pass the discount-engine test; allocation per line is done in cents.') },
      { id: 'usage', state: 'partial', to: '/admin/popusti', text: T('Atomski limit korišćenja', 'Kufi përdorimi atomik', 'Atomic usage limit'), how: T('Limit i brojač korišćenja postoje (npr. VJESHTA25); atomičnost pod opterećenjem proverava se na serveru.', 'Kufiri dhe numëruesi i përdorimeve ekzistojnë (p.sh. VJESHTA25); atomiciteti nën ngarkesë verifikohet në server.', 'The limit and usage counter exist (e.g. VJESHTA25); atomicity under load is verified on the server.') },
      { id: 'expiry', state: 'demo', to: '/admin/ponude', text: T('Ponuda ističe u pravo vrijeme', 'Oferta skadon në kohën e duhur', 'An offer expires on time'), how: T('Stanje se računa iz datuma: istekla ponuda nestaje sa banera i trake, a njeni slajdovi se gase.', 'Gjendja llogaritet nga datat: oferta e skaduar largohet nga bannerët dhe shiriti, dhe slide-t e saj fiken.', 'State derives from dates: an expired offer leaves the banners and bar, and its slides switch off.') },
      { id: 'fallback', state: 'demo', to: '/oferta/muaji-i-kontrollit', site: true, text: T('Proizvod bez zaliha i neaktivna landing stranica', 'Produkt pa stok dhe landing page joaktive trajtohen', 'Out-of-stock product and inactive landing page are handled'), how: T('Nacrt ili istekla ponuda prikazuje „Ponuda je završena“ sa aktivnim ponudama; provjere ponude upozoravaju na proizvode bez zaliha.', 'Oferta draft ose e skaduar shfaq „Oferta ka përfunduar“ me ofertat aktive; kontrollet e ofertës paralajmërojnë për produktet pa stok.', 'A draft or expired offer shows “This offer has ended” with the live offers; offer checks warn about out-of-stock products.') },
    ],
  },
  {
    id: 'ops',
    title: T('Sadržaj i rad', 'Përmbajtje dhe operim', 'Content and operations'),
    items: [
      { id: 'slides', state: 'demo', to: '/admin/prodavnica/slajdovi', text: T('Slajd sa mobilnom/desktop slikom, ispravnim CTA i alt tekstom', 'Slide me media mobile/desktop, CTA e vlefshme dhe tekst alternativ', 'Slide with mobile/desktop media, a valid CTA and alt text'), how: T('Editor slajda provjerava link, traži alt tekst i prikazuje oba formata.', 'Editori i slide-it kontrollon linkun, kërkon tekst alternativ dhe shfaq të dy formatet.', 'The slide editor checks the link, requires alt text and previews both formats.') },
      { id: 'drafts', state: 'demo', to: '/admin/prodavnica/editor', text: T('Nacrti nijesu javni; kontrolisana objava i vraćanje', 'Draftet jo publike; publish/rollback i kontrolluar', 'Drafts are not public; controlled publish/rollback'), how: T('Početna se uređuje kao nacrt, objavljuje jednim klikom i vraća iz istorije verzija.', 'Ballina redaktohet si draft, publikohet me një klik dhe rikthehet nga historia e versioneve.', 'The homepage is edited as a draft, published in one click and restored from version history.') },
      { id: 'forms', state: 'impl', text: T('Formulari bez duplikata i spama', 'Formular pa duplikim/spam', 'Forms without duplicates or spam'), how: T('Zaštita od spama (honeypot, ograničenje učestalosti) i duplikata radi na serveru.', 'Mbrojtja nga spami (honeypot, kufizim frekuence) dhe dublikatat funksionon në server.', 'Spam (honeypot, rate limit) and duplicate protection run on the server.') },
      { id: 'bookings', state: 'demo', to: '/admin/termini', text: T('Termini bez preklapanja', 'Termine pa mbivendosje', 'Appointments without overlap'), how: T('Kalendar odbija termin kada je optometrista zauzet ili je kapacitet usluge popunjen.', 'Kalendari refuzon terminin kur optometristi është i zënë ose kapaciteti i shërbimit është plot.', 'The calendar rejects a booking when the optometrist is busy or the service is at capacity.') },
      { id: 'notify', state: 'impl', text: T('Obavještenja se ne ponavljaju poslije ponovnog pokušaja', 'Njoftimet nuk përsëriten pas retry', 'Notifications are not repeated after a retry'), how: T('Red čekanja sa ključem idempotencije na serveru.', 'Queue me çelës idempotence në server.', 'A server queue with an idempotency key.') },
      { id: 'backup', state: 'partial', to: '/admin/konfiguracija/demo', text: T('Backup se može vratiti', 'Backup rikthehet', 'A backup can be restored'), how: T('Demo podaci se izvoze i uvoze u Konfiguraciji; pravi backup sa probom vraćanja radi na serveru.', 'Të dhënat demo eksportohen dhe importohen te Konfigurimet; backup-i real me provë rikthimi funksionon në server.', 'Demo data is exported and imported in Settings; a real backup with a restore test runs on the server.') },
      { id: 'second', state: 'impl', text: T('Drugi projekat bez kopiranja logike', 'Projekti i dytë instalohet pa kopjim logjike', 'A second project installs without copying logic'), how: T('Isti core sa drugom konfiguracijom (marka, jezici, moduli) — provjerava se na pilot projektu.', 'I njëjti core me konfigurim tjetër (marka, gjuhët, modulet) — verifikohet në projektin pilot.', 'The same core with another configuration (brand, languages, modules) — verified on the pilot project.') },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Decisions for the client (p.51)                                     */
/* ------------------------------------------------------------------ */
export interface Decision {
  id: string;
  q: L10n;
  /** What the demo currently assumes — may contain {staff} {roles} {langs} {tz} {products} {connected} {test} */
  hint?: L10n;
}

export interface DecisionGroup {
  id: string;
  title: L10n;
  items: Decision[];
}

export const DECISIONS: DecisionGroup[] = [
  {
    id: 'identity',
    title: T('Identitet i pilot projekat', 'Identitet dhe projekti pilot', 'Identity and pilot project'),
    items: [
      { id: 'brand', q: T('Naziv i marka CMS-a?', 'Emri dhe marka e CMS-it?', 'The CMS name and brand?'), hint: T('U demo: „CMS“ sa znakom ITCOM', 'Në demo: „CMS“ me shenjën e ITCOM', 'In the demo: “CMS” with the ITCOM mark') },
      { id: 'pilot', q: T('Prvi sajt (pilot), vrsta proizvoda i postojeći kod?', 'Website-i i parë (pilot), tipi i produkteve dhe kodi ekzistues?', 'The first website (pilot), product types and existing code?'), hint: T('Predlog: ITCOM — okviri, naočare za sunce, sočiva po receptu i termini za pregled vida', 'Propozim: ITCOM — korniza, syze dielli, lente me recetë dhe termine për kontroll të syve', 'Proposal: ITCOM — frames, sunglasses, prescription lenses and eye-exam appointments') },
      { id: 'staff', q: T('Ko će koristiti CMS i sa kojim ulogama?', 'Stafi që do ta përdorë dhe rolet?', 'Who will use it, and with which roles?'), hint: T('U demo: {staff} osoba, {roles} uloga', 'Në demo: {staff} persona, {roles} role', 'In the demo: {staff} people, {roles} roles') },
      { id: 'locale', q: T('Jezici, valuta, domen i vremenska zona?', 'Gjuhët, valuta, domeni dhe zona kohore?', 'Languages, currency, domain and time zone?'), hint: T('U demo: {langs} · EUR · {tz}', 'Në demo: {langs} · EUR · {tz}', 'In the demo: {langs} · EUR · {tz}') },
      { id: 'catalog', q: T('Obim kataloga i podaci za migraciju?', 'Vëllimi i katalogut dhe të dhënat për migrim?', 'Catalogue size and data to migrate?'), hint: T('U demo: {products} proizvoda; uvoz preko CSV-a', 'Në demo: {products} produkte; import me CSV', 'In the demo: {products} products; CSV import') },
    ],
  },
  {
    id: 'promo',
    title: T('Promocije', 'Promocionet', 'Promotions'),
    items: [
      { id: 'pricing', q: T('Akcijska cijena u katalogu ili popust u korpi?', 'Çmimi në katalog apo ulje në checkout?', 'Sale price in the catalogue or a discount at checkout?'), hint: T('U demo: oboje — akcijska cijena na proizvodu i automatski popusti u korpi', 'Në demo: të dyja — çmim promocional te produkti dhe zbritje automatike në shportë', 'In the demo: both — a sale price on the product and automatic discounts in the cart') },
      { id: 'combos', q: T('Koje kombinacije su dozvoljene; pragovi i limiti?', 'Cilat kombinime lejohen; pragjet dhe kufijtë?', 'Which combinations are allowed; thresholds and limits?'), hint: T('U demo: MIFTARI10 se ne kombinuje sa drugim popustom na narudžbu', 'Në demo: MIFTARI10 nuk kombinohet me zbritje tjetër porosie', 'In the demo: MIFTARI10 does not combine with another order discount') },
      { id: 'offers', q: T('Za ponude: landing stranica, slajder, baneri i raspored?', 'Për ofertat: landing page, slideshow, bannerë dhe orar?', 'For offers: landing page, slideshow, banners and schedule?'), hint: T('U demo: sve četiri, povezane sa istom ponudom', 'Në demo: të katërta, të lidhura me të njëjtën ofertë', 'In the demo: all four, linked to the same offer') },
      { id: 'bxgy', q: T('Poklon kod „Kupi X, dobij Y“ ručno ili automatski?', 'Dhurata te „Blej X, merr Y“ manuale apo automatike?', 'Is the “Buy X get Y” gift manual or automatic?'), hint: T('U demo: automatski (okvir → jednožižna sočiva −50 %)', 'Në demo: automatike (kornizë → lente njëvizore −50 %)', 'In the demo: automatic (frame → single-vision lenses −50%)') },
      { id: 'approval', q: T('Da li menadžer odobrava prije aktivacije?', 'Miratim nga menaxheri para aktivizimit?', 'Manager approval before activation?'), hint: T('U demo: Marketing priprema, menadžer ili vlasnik objavljuje', 'Në demo: Marketingu përgatit, menaxheri ose pronari publikon', 'In the demo: Marketing prepares, a manager or the owner publishes') },
    ],
  },
  {
    id: 'integrations',
    title: T('Integracije i moduli', 'Integrimet dhe modulet', 'Integrations and modules'),
    items: [
      { id: 'providers', q: T('Plaćanje, kurir, fiskalizacija/knjigovodstvo i kanali — koji provajderi?', 'Pagesa, korrieri, fiskalizimi/kontabiliteti dhe kanalet — cilët ofrues?', 'Payments, courier, fiscalisation/accounting and channels — which providers?'), hint: T('Stanje u demo: {connected} povezano, {test} u testu', 'Gjendja në demo: {connected} e lidhur, {test} në prove', 'Demo status: {connected} connected, {test} in test') },
      { id: 'bookings', q: T('Termini: rezervacije ili zahtjevi za sastanak; plaćanje ili depozit?', 'Terminet: rezervime apo kërkesa takimesh; pagesë/depozitë?', 'Appointments: bookings or meeting requests; payment or deposit?'), hint: T('U demo: rezervacije koje osoblje potvrđuje, bez depozita', 'Në demo: rezervime që stafi i konfirmon, pa depozitë', 'In the demo: bookings confirmed by staff, no deposit') },
      { id: 'scope', q: T('Da li u prvom izdanju trebaju Optical Lab B2B portal, POS, više lokacija ili pretplate na sočiva?', 'A duhen portali B2B i Optical Lab, POS, multi-location ose abonimet për lente në lëshimin e parë?', 'Are an Optical Lab B2B portal, POS, multi-location or lens subscriptions needed in the first release?') },
    ],
  },
];
