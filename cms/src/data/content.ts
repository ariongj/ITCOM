import type { CmsPage, Coupon, HomeSection, L10n, Post, Project, Settings } from '@/lib/types';
import { autumnSaleEnd } from './cms';

// L10n order is (me, sq, en): `me` holds the Serbian (Latin) copy — switched off on the storefront by default.
const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });

/* ------------------------------------------------------------------ */
/* Settings (placeholders marked "Shembull" in Admin → Konfigurimet)   */
/* ------------------------------------------------------------------ */
export const DEFAULT_SETTINGS: Settings = {
  companyName: 'ITCOM',
  legalName: 'ITCOM Group',
  tagline: T('Vidite drugačije. Budite svoji.', 'Shihni ndryshe. Jini vetvetja.', 'See differently. Be yourself.'),
  about: T(
    'ITCOM je porodična optika iz Mitrovice sa 30 godina iskustva. Biramo okvire sa ukusom, sočiva izrađujemo u sopstvenoj laboratoriji i svakom paru posvećujemo lično prilagođavanje — jer dobar vid počinje stručnim pregledom.',
    'ITCOM është optikë familjare nga Mitrovica me 30 vjet përvojë. Kornizat i zgjedhim me shije, lentet i punojmë në laboratorin tonë dhe çdo palë e përshtatim personalisht — sepse shikimi i mirë fillon me një kontroll profesional.',
    'ITCOM is a family optician from Mitrovica with 30 years of experience. We choose frames with taste, make lenses in our own lab and fit every pair personally — because good vision starts with a professional eye exam.',
  ),
  email: 'info@itcom.example',
  phone: '+383 43 777 667',
  phone2: '',
  whatsapp: '+383 43 777 667',
  address: 'Mbretëresha Teutë 182',
  city: 'Mitrovicë',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Optika+Miftari+Mbret%C3%ABresha+Teut%C3%AB+182+Mitrovic%C3%AB',
  hours: T('Pon–Sub 10:00–19:30 · Ned zatvoreno', 'Hën–Sht 10:00–19:30 · E diel mbyllur', 'Mon–Sat 10:00–19:30 · Sun closed'),
  pib: '81XXXXXXX',
  pdv: '330XXXXXX',
  bankName: 'ProCredit Bank Kosovo',
  bankAccount: 'XK05 XXXX XXXX XXXX XXXX',
  instagram: 'optikamiftari',
  facebook: '',
  currency: 'EUR',
  vatRate: 18,
  freeShippingThreshold: 150,
  shippingZones: [
    { id: 'z1', name: 'Mitrovicë dhe rrethina', cities: ['Mitrovicë', 'Vushtrri', 'Skenderaj', 'Zveçan'], fee: 2, days: '1' },
    { id: 'z2', name: 'Prishtinë dhe qendra', cities: ['Prishtinë', 'Fushë Kosovë', 'Obiliq', 'Lipjan', 'Podujevë', 'Drenas'], fee: 3, days: '1–2' },
    {
      id: 'z3',
      name: 'Gjithë Kosova',
      cities: ['Pejë', 'Prizren', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Deçan', 'Istog', 'Klinë', 'Rahovec', 'Suharekë', 'Malishevë', 'Kamenicë', 'Viti', 'Shtime', 'Dragash', 'Kaçanik'],
      fee: 4,
      days: '1–3',
    },
  ],
  pickupAddress: 'Mbretëresha Teutë 182, Mitrovicë',
  payments: { cod: true, bank: true, card: true },
  languages: { me: false, sq: true, en: true },
  announcements: [
    T('Pregled vida po terminu — zakažite online', 'Kontroll i syve me termin — rezervoni online', 'Eye exams by appointment — book online'),
    T('Besplatna dostava širom Kosova za narudžbe preko 150 €', 'Transport falas në gjithë Kosovën për porosi mbi 150 €', 'Free delivery across Kosovo on orders over €150'),
    T('Kraj sezone: do −20% na naočare za sunce', 'Fund sezoni: deri −20% në syze dielli', 'End of season: up to −20% on sunglasses'),
  ],
  brandColor: '#776440',
  demoBanner: true,
  seo: {
    title: 'ITCOM — Syze optike, dielli dhe lente me recetë',
    description: 'Optikë familjare në Mitrovicë prej 30 vjetësh: syze optike dhe dielli, lente me recetë nga laboratori ynë dhe kontroll profesional i syve.',
  },
  adminEmail: 'admin@itcom.example',

  /* ---- CMS v2 ---- */
  timezone: 'Europe/Belgrade',
  orderPrefix: 'OM-',
  locations: [
    { id: 'loc-mitrovice', name: 'ITCOM', address: 'Mbretëresha Teutë 182', city: 'Mitrovicë', pickup: true, isDefault: true },
    { id: 'loc-lab', name: 'Optical Lab', address: 'Laboratori optik', city: 'Mitrovicë', pickup: false, isDefault: false },
    { id: 'loc-klinika', name: 'Klinika Miftari', address: 'Klinika e syve', city: 'Mitrovicë', pickup: false, isDefault: false },
  ],
  notifications: [
    { id: 'nt-order', event: 'order_placed', enabled: true, recipients: 'customer', subject: T('Primili smo vašu narudžbu {number}', 'E morëm porosinë tuaj {number}', 'We received your order {number}') },
    { id: 'nt-confirm', event: 'order_confirmed', enabled: true, recipients: 'customer', subject: T('Narudžba {number} je potvrđena', 'Porosia {number} u konfirmua', 'Order {number} is confirmed') },
    { id: 'nt-payment', event: 'payment_received', enabled: true, recipients: 'customer', subject: T('Uplata za narudžbu {number} je evidentirana', 'Pagesa për porosinë {number} u regjistrua', 'Payment for order {number} received') },
    { id: 'nt-shipped', event: 'order_shipped', enabled: true, recipients: 'customer', subject: T('Narudžba {number} je na putu', 'Porosia {number} është në rrugë', 'Order {number} is on its way') },
    { id: 'nt-return', event: 'return_requested', enabled: true, recipients: 'staff', subject: T('Novi zahtev za povrat {number}', 'Kërkesë e re për kthim {number}', 'New return request {number}') },
    { id: 'nt-refund', event: 'return_refunded', enabled: true, recipients: 'customer', subject: T('Povrat novca za {number}', 'Rimbursimi për {number}', 'Refund for {number}') },
    { id: 'nt-contact', event: 'contact_received', enabled: true, recipients: 'customer', subject: T('Hvala — javićemo vam se danas', 'Faleminderit — do t’ju kontaktojmë sot', 'Thank you — we’ll get back to you today') },
    { id: 'nt-booking', event: 'booking_confirmed', enabled: true, recipients: 'customer', subject: T('Termin {date} je potvrđen', 'Termini {date} u konfirmua', 'Your appointment on {date} is confirmed') },
    { id: 'nt-reminder', event: 'booking_reminder', enabled: true, recipients: 'customer', subject: T('Podsetnik: pregled sutra u {time}', 'Kujtesë: kontrolli nesër në {time}', 'Reminder: your eye exam tomorrow at {time}') },
    { id: 'nt-staff-order', event: 'staff_new_order', enabled: true, recipients: 'staff', subject: T('Nova narudžba {number} — {total}', 'Porosi e re {number} — {total}', 'New order {number} — {total}') },
    { id: 'nt-staff-inquiry', event: 'staff_new_inquiry', enabled: true, recipients: 'staff', subject: T('Novi upit: {name}', 'Kërkesë e re: {name}', 'New enquiry: {name}') },
  ],
  integrations: [
    { id: 'int-payment', kind: 'payment', name: 'Pagesa me kartelë (e-commerce i bankës)', status: 'test', note: 'Mënyra test — kartelat nuk ngarkohen. Çelësat e prodhimit pas kontratës me bankën.' },
    { id: 'int-courier', kind: 'courier', name: 'Shërbimi i kurierit', status: 'disconnected', note: 'Për momentin dërgesat në Mitrovicë me automjetin tonë; API e kurierit sipas partnerit të zgjedhur.' },
    { id: 'int-email', kind: 'email', name: 'E-mail transaksional (SMTP)', status: 'connected', note: 'Konfirmimet e porosive dhe termineve dërgohen nga info@itcom.example.' },
    { id: 'int-fiscal', kind: 'fiscal', name: 'Fiskalizimi (ATK)', status: 'disconnected', note: 'Lidhja me sistemin e fiskalizimit të ATK-së — e planifikuar për fazën 2.' },
    { id: 'int-analytics', kind: 'analytics', name: 'Google Analytics 4', status: 'test', note: 'Matja e vizitave dhe konvertimeve në property test.' },
  ],
  markets: [
    { id: 'mk-xk', name: T('Kosovo', 'Kosova', 'Kosovo'), countries: ['XK'], currency: 'EUR', languages: ['sq', 'en', 'me'], status: 'active' },
    { id: 'mk-al', name: T('Albanija', 'Shqipëria', 'Albania'), countries: ['AL'], currency: 'ALL', languages: ['sq', 'en'], status: 'draft' },
    { id: 'mk-eu', name: T('EU — laboratorija B2B', 'BE — Optical Lab B2B', 'EU — Optical Lab B2B'), countries: ['DE', 'AT', 'CH'], currency: 'EUR', languages: ['en'], status: 'draft' },
  ],
  checkout: { guest: true, phoneRequired: true, companyField: 'optional', marketingOptIn: false },
  privacy: { cookieBanner: true },
};

/* ------------------------------------------------------------------ */
/* Homepage sections                                                   */
/* ------------------------------------------------------------------ */
/** Eye-exam booking: opens the booking modal / scrolls to the homepage CTA (id="rezervo"). */
const BOOK = '/#rezervo';

export function buildHome(now = new Date()): HomeSection[] {
  // Same end date as the sunglasses discount + MIFTARI10 offer in cms.ts.
  const endsAt = autumnSaleEnd(now);
  return [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      data: {
        autoplay: true,
        slides: [
          {
            id: 's1',
            image: '/images/hero/optical.webp',
            eyebrow: T('Dioptrijske naočare', 'Syze optike', 'Optical frames'),
            title: T('Vidite *drugačije*. Budite svoji.', 'Shihni *ndryshe*. Jini vetvetja.', 'See *differently*. Be yourself.'),
            subtitle: T(
              'Okviri birani sa ukusom, sočiva pripremljena s pažnjom i lično prilagođavanje iz naše laboratorije.',
              'Korniza të zgjedhura me shije, lente të përgatitura me kujdes dhe përshtatje personale nga laboratori ynë.',
              'Frames chosen with taste, lenses prepared with care and a personal fitting from our own lab.',
            ),
            primary: { label: T('Pogledajte okvire', 'Shikoni syzet optike', 'Shop optical frames'), href: '/produktet/syze-optike' },
            secondary: { label: T('Probajte virtuelno', 'Provoni virtualisht', 'Try them on virtually'), href: '/provo-virtualisht' },
          },
          {
            id: 's2',
            image: '/images/hero/sun.webp',
            eyebrow: T('Naočare za sunce · UV400', 'Syze dielli · UV400', 'Sunglasses · UV400'),
            title: T('Sunce, sa *stilom*.', 'Dielli, me *stil*.', 'Sunshine, in *style*.'),
            subtitle: T(
              'Polarizovana i UV400 sočiva — većinu modela izrađujemo i sa dioptrijom. Kraj sezone: do −20%.',
              'Lente të polarizuara dhe UV400 — shumicën e modeleve i punojmë edhe me dioptri. Fund sezoni: deri −20%.',
              'Polarised and UV400 lenses — most styles can also be made to your prescription. End of season: up to −20%.',
            ),
            primary: { label: T('Naočare za sunce', 'Shikoni syzet e diellit', 'Shop sunglasses'), href: '/produktet/syze-dielli' },
            secondary: { label: T('Sve akcije', 'Të gjitha ofertat', 'All offers'), href: '/produktet?akcija=1' },
          },
          {
            id: 's3',
            image: '/images/hero/exam.webp',
            eyebrow: T('Pregled vida', 'Kontroll i syve', 'Eye exams'),
            title: T('Pregled vida, sa *pažnjom*.', 'Kontroll i syve, me *kujdes*.', 'Eye exams, with *care*.'),
            subtitle: T(
              'Stručan pregled po terminu, precizno merenje PD-a i iskren savet — pre nego što izaberete okvir.',
              'Kontroll profesional me termin, matje e saktë e PD-së dhe këshillë e sinqertë — para se të zgjidhni kornizën.',
              'A professional exam by appointment, precise PD measurement and honest advice — before you choose a frame.',
            ),
            primary: { label: T('Zakažite pregled', 'Rezervo kontrollin', 'Book an eye exam'), href: BOOK },
            secondary: { label: T('Naše usluge', 'Shërbimet tona', 'Our services'), href: '/sherbimet' },
          },
          {
            id: 's4',
            image: '/images/hero/family.webp',
            eyebrow: T('30 godina porodične tradicije', '30 vjet traditë familjare', '30 years of family tradition'),
            title: T('Jasnoća, *s kolena na koleno*.', 'Qartësi, *brez pas brezi*.', 'Clarity, *generation after generation*.'),
            subtitle: T(
              'Porodična optika iz Mitrovice — sa sopstvenom optičkom laboratorijom i Klinikom Miftari, za svaku generaciju vaše porodice.',
              'Optikë familjare nga Mitrovica — me laboratorin tonë optik dhe Klinikën Miftari, për çdo brez të familjes suaj.',
              'A family optician from Mitrovica — with our own optical lab and Klinika Miftari, for every generation of your family.',
            ),
            primary: { label: T('Naša priča', 'Historia jonë', 'Our story'), href: '/rreth-nesh' },
            secondary: { label: T('Zakažite pregled', 'Rezervo kontrollin', 'Book an eye exam'), href: BOOK },
          },
        ],
      },
    },
    {
      id: 'trust',
      type: 'trust',
      enabled: true,
      data: {
        items: [
          { icon: 'Eye', title: T('Stručan pregled vida', 'Kontroll profesional i syve', 'Professional eye exams'), text: T('Po terminu, u optici ili u Klinici Miftari', 'Me termin, në optikë ose në Klinikën Miftari', 'By appointment, in store or at Klinika Miftari') },
          { icon: 'FlaskConical', title: T('Sopstvena optička laboratorija', 'Laboratori ynë optik', 'Our own optical lab'), text: T('Sočiva centriramo i montiramo u Mitrovici', 'Lentet i centrojmë dhe i montojmë në Mitrovicë', 'Lenses centred and fitted in Mitrovica') },
          { icon: 'ShieldCheck', title: T('2 godine garancije na okvire', '2 vjet garanci për kornizat', '2-year frame warranty'), text: T('Uz Negu+ i zaštitu od loma', 'Plus Kujdes+ për mbrojtje nga thyerja', 'Plus Care+ breakage cover') },
          { icon: 'Truck', title: T('Dostava širom Kosova', 'Dërgesë në gjithë Kosovën', 'Delivery across Kosovo'), text: T('Besplatno za narudžbe preko 150 €', 'Falas për porosi mbi 150 €', 'Free on orders over €150') },
        ],
      },
    },
    {
      id: 'categories',
      type: 'categories',
      enabled: true,
      data: {
        eyebrow: T('Kolekcije', 'Koleksionet', 'Collections'),
        title: T('Pronađite *svoj* par.', 'Gjeni palën *tuaj*.', 'Find *your* pair.'),
        subtitle: T(
          'Dioptrijski okviri, pametne naočare, naočare za sunce i sočiva po receptu — birani sa ukusom, prilagođeni lično vama.',
          'Syze optike, inteligjente dhe dielli, lente me recetë — të zgjedhura me shije, të përshtatura personalisht për ju.',
          'Optical frames, smart glasses, sunglasses and prescription lenses — chosen with taste, fitted personally for you.',
        ),
      },
    },
    {
      id: 'featured',
      type: 'featured',
      enabled: true,
      data: {
        eyebrow: T('Izdvajamo', 'Të veçuara', 'Featured'),
        title: T('Najprodavanije ove *sezone*', 'Më të shiturat e *sezonit*', 'This season’s *bestsellers*'),
        mode: 'bestsellers',
        productIds: [],
      },
    },
    {
      id: 'spotlight-smart',
      type: 'spotlight',
      enabled: true,
      data: {
        eyebrow: T('Novo u ITCOM', 'E re te ITCOM', 'New at ITCOM'),
        title: T('*Pametne* naočare — sada u ITCOM', 'Syze *inteligjente* — tani te ITCOM', '*Smart* glasses — now at ITCOM'),
        text: T(
          'Ray-Ban Meta, Oakley Meta i Meta Ray-Ban Display: naočare sa kamerom, otvorenim zvučnicima i glasovnim asistentom. Probajte ih u optici — kada model to dozvoljava, izrađujemo ih i sa dioptrijom.',
          'Ray-Ban Meta, Oakley Meta dhe Meta Ray-Ban Display: syze me kamerë, altoparlantë të hapur dhe asistent zanor. Provojini në optikë — kur modeli e lejon, ua punojmë edhe me dioptri.',
          'Ray-Ban Meta, Oakley Meta and Meta Ray-Ban Display: glasses with a camera, open-ear speakers and a voice assistant. Try them in store — where the model allows, we make them to your prescription too.',
        ),
        image: '/images/smart/hero.webp',
        points: [
          { text: T('Fotografije i video bez ruku', 'Foto dhe video pa duar', 'Hands-free photos and video') },
          { text: T('Muzika, pozivi i asistent', 'Muzikë, thirrje dhe asistent', 'Music, calls and an assistant') },
          { text: T('Dioptrija iz naše laboratorije — prema modelu', 'Dioptri nga laboratori ynë — sipas modelit', 'Prescription from our lab — model permitting') },
        ],
        primary: { label: T('Upoznajte pametne naočare', 'Njihuni me syzet inteligjente', 'Discover smart glasses'), href: '/syze-inteligjente' },
        secondary: { label: T('Zakažite probu', 'Rezervo një provë', 'Book a try-on'), href: '/rezervo?sherbimi=sv-smart' },
      },
    },
    {
      id: 'promo',
      type: 'promo',
      enabled: true,
      data: {
        eyebrow: T('Kraj sezone', 'Fund sezoni', 'End of season'),
        title: T('Naočare za sunce do *−20%*', 'Syze dielli deri *−20%*', 'Sunglasses up to *−20%*'),
        text: T(
          'Letnji modeli po cenama za kraj sezone — popust se automatski obračunava u korpi. Sa kodom MIFTARI10 ostvarujete dodatnih 10%.',
          'Modelet e verës me çmime fundsezoni — zbritja llogaritet automatikisht në shportë. Me kodin MIFTARI10 përfitoni edhe 10% shtesë.',
          'Summer styles at end-of-season prices — the discount is applied automatically in the cart. Use code MIFTARI10 for an extra 10% off.',
        ),
        image: '/images/misc/promo.webp',
        cta: { label: T('Pogledajte naočare za sunce', 'Shikoni syzet e diellit', 'Shop sunglasses'), href: '/produktet/syze-dielli' },
        endsAt,
        code: 'MIFTARI10',
      },
    },
    {
      id: 'process',
      type: 'process',
      enabled: true,
      data: {
        eyebrow: T('Kako radimo', 'Si punojmë', 'How we work'),
        title: T('Od pregleda do *savršenog para* — u četiri koraka', 'Nga kontrolli te pala *e përsosur* — në katër hapa', 'From eye exam to *the perfect pair* — in four steps'),
        steps: [
          {
            title: T('Pregled vida', 'Kontrolli i syve', 'Eye exam'),
            text: T(
              'Počinjemo stručnim pregledom i razgovorom o tome kako koristite naočare — za posao, ekran, vožnju ili čitanje.',
              'Fillojmë me një kontroll profesional dhe një bisedë për mënyrën si i përdorni syzet — për punë, ekran, vozitje apo lexim.',
              'We start with a professional exam and a chat about how you use your glasses — for work, screens, driving or reading.',
            ),
          },
          {
            title: T('Izbor okvira', 'Zgjedhja e kornizës', 'Choosing the frame'),
            text: T(
              'Probajte modele u optici ili virtuelno na sajtu. Pomažemo oko oblika, veličine i udobnosti, a zatim merimo PD sa izabranim okvirom.',
              'Provoni modelet në optikë ose virtualisht në faqe. Ju ndihmojmë me formën, madhësinë dhe rehatinë, pastaj masim PD-në me kornizën e zgjedhur.',
              'Try styles in store or virtually on our site. We help with shape, size and comfort, then measure your PD with the chosen frame.',
            ),
          },
          {
            title: T('Sočiva iz naše laboratorije', 'Lentet në laboratorin tonë', 'Lenses from our lab'),
            text: T(
              'Sočiva se centriraju, bruse po obliku okvira i montiraju u našoj laboratoriji u Mitrovici — obično za 2–7 radnih dana.',
              'Lentet centrohen, priten sipas kornizës dhe montohen në laboratorin tonë në Mitrovicë — zakonisht për 2–7 ditë pune.',
              'Lenses are centred, edged to your frame and fitted in our lab in Mitrovica — usually within 2–7 working days.',
            ),
          },
          {
            title: T('Prilagođavanje i garancija', 'Përshtatja dhe garancia', 'Fitting & warranty'),
            text: T(
              'Pri preuzimanju naočare podešavamo prema vašem licu. Okvir ima 2 godine garancije, a u prvih 30 dana podešavanja su besplatna.',
              'Në dorëzim i rregullojmë syzet sipas fytyrës suaj. Korniza ka 2 vjet garanci, ndërsa brenda 30 ditëve rregullimet janë falas.',
              'When you collect them, we adjust the glasses to your face. Frames carry a 2-year warranty, and adjustments are free for the first 30 days.',
            ),
          },
        ],
      },
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      data: {
        eyebrow: T('Usluge', 'Shërbimet', 'Services'),
        title: T('Ne prodajemo samo naočare — *izrađujemo ih za vas*', 'Nuk shesim vetëm syze — *i përgatisim për ju*', 'We don’t just sell glasses — *we make them for you*'),
        subtitle: T(
          'Pregled vida, optička laboratorija i očna klinika — jedna porodica, jedan standard brige.',
          'Kontroll i syve, laborator optik dhe klinikë e syve — një familje, një standard kujdesi.',
          'Eye exams, an optical lab and an eye clinic — one family, one standard of care.',
        ),
        items: [
          {
            image: '/images/s/kontrolli.webp',
            title: T('Pregled vida', 'Kontrolli i syve', 'Eye exam'),
            text: T(
              'Pregled po terminu za decu i odrasle, sa jasnim savetom o receptu i upotrebi naočara.',
              'Kontroll me termin për fëmijë dhe të rritur, me këshillë të qartë për recetën dhe përdorimin e syzeve.',
              'Exams by appointment for children and adults, with clear advice on your prescription and how to use it.',
            ),
          },
          {
            image: '/images/s/pershtatja.webp',
            title: T('Prilagođavanje i merenje PD', 'Përshtatja dhe matja e PD-së', 'Fitting & PD measurement'),
            text: T(
              'Merimo zenični razmak i visinu montaže na vašem okviru, a zatim ga podešavamo da udobno stoji.',
              'Masim distancën pupilare dhe lartësinë e montimit në kornizën tuaj, pastaj e rregullojmë që t’ju rrijë rehat.',
              'We measure your pupillary distance and fitting height on your frame, then adjust it to sit comfortably.',
            ),
          },
          {
            image: '/images/s/laboratori.webp',
            title: T('Sočiva iz naše laboratorije', 'Lente nga laboratori ynë', 'Lenses from our lab'),
            text: T(
              'Jednožižna, progresivna, sočiva za ekran i fotohromatska — centrirana i proverena u Mitrovici.',
              'Lente njëvizore, progresive, për ekran dhe fotokromatike — të centruara dhe të kontrolluara në Mitrovicë.',
              'Single-vision, progressive, screen and photochromic lenses — centred and verified in Mitrovica.',
            ),
          },
          {
            image: '/images/s/riparime.webp',
            title: T('Popravke i podešavanja', 'Riparime dhe rregullime', 'Repairs & adjustments'),
            text: T(
              'Zamena šrafova i jastučića za nos, ispravljanje drški i podešavanje okvira — često dok čekate.',
              'Ndërrim vidash dhe jastëkësh të hundës, drejtim i bishtave dhe rregullim i kornizës — shpesh ndërsa prisni.',
              'New screws and nose pads, straightened temples and frame adjustments — often while you wait.',
            ),
          },
          {
            image: '/images/s/klinika.webp',
            title: T('Klinika Miftari', 'Klinika Miftari', 'Klinika Miftari'),
            text: T(
              'Kada je potrebna medicinska procena, upućujemo vas u Kliniku Miftari — očnu kliniku naše grupe.',
              'Kur nevojitet vlerësim mjekësor, ju udhëzojmë te Klinika Miftari — klinika e syve e grupit tonë.',
              'When a medical assessment is needed, we refer you to Klinika Miftari — the eye clinic within our group.',
            ),
          },
          {
            image: '/images/s/b2b.webp',
            title: T('Optical Lab za optike (B2B)', 'Optical Lab për optikat (B2B)', 'Optical Lab for opticians (B2B)'),
            text: T(
              'Sočiva po receptu, centriranje i montaža za optike na Kosovu i u EU — po vašoj porudžbini.',
              'Lente me recetë, të centruara dhe të montuara sipas porosisë suaj — për optikat në Kosovë dhe në BE.',
              'Prescription lenses, centring and fitting for opticians in Kosovo and the EU — made to your order.',
            ),
          },
        ],
      },
    },
    {
      id: 'projects',
      type: 'projects',
      enabled: true,
      data: {
        eyebrow: T('Lookbook', 'Lookbook', 'Lookbook'),
        title: T('Lica, svetlo i *stil*', 'Fytyra, dritë dhe *stil*', 'Faces, light and *style*'),
        subtitle: T(
          'Naše kampanje i editorijali — od Mitrovice do Rugove.',
          'Fushatat dhe fotografitë tona editoriale — nga Mitrovica deri në Rugovë.',
          'Our campaigns and editorial shoots — from Mitrovica to Rugova.',
        ),
      },
    },
    {
      id: 'stats',
      type: 'stats',
      enabled: true,
      data: {
        image: '/images/lookbook/generations-craft.webp',
        quote: T(
          'Jasnoća, s kolena na koleno. Svaki par koji izađe iz naših ruku nosi ime naše porodice.',
          'Qartësi, brez pas brezi. Çdo palë që del nga duart tona mban emrin e familjes sonë.',
          'Clarity, generation after generation. Every pair that leaves our hands carries our family’s name.',
        ),
        items: [
          { value: '30', label: T('godina porodične tradicije', 'vjet traditë familjare', 'years of family tradition') },
          { value: '2', label: T('optike porodice Miftari', 'optika të familjes Miftari', 'Miftari family stores') },
          { value: '1', label: T('sopstvena optička laboratorija', 'laborator optik privat', 'private optical lab') },
          { value: '6', label: T('dana u nedelji, pon–sub', 'ditë në javë, hën–sht', 'days a week, Mon–Sat') },
        ],
      },
    },
    {
      id: 'blog',
      type: 'blog',
      enabled: true,
      data: {
        eyebrow: T('Saveti', 'Këshilla', 'Advice'),
        title: T('Saveti naših *optičara*', 'Këshilla nga *optikët* tanë', 'Advice from our *opticians*'),
      },
    },
    {
      id: 'faq',
      type: 'faq',
      enabled: true,
      data: {
        eyebrow: T('Pitanja', 'Pyetje', 'FAQ'),
        title: T('Česta pitanja', 'Pyetje të shpeshta', 'Frequently asked questions'),
        items: [
          {
            q: T('Koliko dugo važi recept za naočare?', 'Sa kohë vlen receta e syzeve?', 'How long is a glasses prescription valid?'),
            a: T(
              'Kao opšta smernica, kod odraslih se recept proverava na svakih jednu do dve godine, a kod dece češće — ili kad god primetite promenu vida. Ako je vaš recept stariji od dve godine, preporučujemo pregled pre izrade novih sočiva.',
              'Si orientim i përgjithshëm, te të rriturit receta rishikohet çdo një deri në dy vjet, te fëmijët më shpesh — ose sa herë që vini re ndryshim në shikim. Nëse receta juaj është më e vjetër se dy vjet, ju rekomandojmë një kontroll para se të punojmë lente të reja.',
              'As a general guide, adults should have their prescription checked every one to two years and children more often — or whenever you notice a change in your vision. If your prescription is more than two years old, we recommend an exam before we make new lenses.',
            ),
          },
          {
            q: T('Šta je PD i da li ga vi merite?', 'Çfarë është PD dhe a e matni ju?', 'What is PD and do you measure it?'),
            a: T(
              'PD (zenični razmak) je razmak između centara zenica u milimetrima — on obezbeđuje da optički centar sočiva bude tačno ispred oka. Merimo ga besplatno u optici, sa okvirom koji ste izabrali. Ako naručite online bez PD-a, javićemo vam se pre izrade.',
              'PD (distanca pupilare) është largësia mes qendrave të bebëzave në milimetra — ajo siguron që qendra optike e lentes të bjerë pikërisht para syrit. E masim falas në optikë, me kornizën që keni zgjedhur. Nëse porositni online pa PD, ju kontaktojmë para punimit.',
              'PD (pupillary distance) is the distance between the centres of your pupils in millimetres — it makes sure the optical centre of each lens sits right in front of your eye. We measure it free of charge in store, with the frame you have chosen. If you order online without a PD, we contact you before production.',
            ),
          },
          {
            q: T('Mogu li da kupim okvir online i dodam sočiva?', 'A mund ta blej kornizën online dhe të shtoj lentet?', 'Can I buy a frame online and add lenses?'),
            a: T(
              'Da. Kod svakog dioptrijskog okvira izaberite vrstu sočiva — jednožižna, za ekran ili progresivna. Posle narudžbe javljamo se zbog recepta: pošaljite ga na WhatsApp ili dođite na pregled kod nas. Laboratorija počinje izradu tek kada je recept potvrđen.',
              'Po. Te çdo kornizë optike zgjidhni llojin e lenteve — njëvizore, për ekran ose progresive. Pas porosisë ju kontaktojmë për recetën: na e dërgoni në WhatsApp ose ejani për kontroll te ne. Laboratori fillon punën vetëm pasi receta të jetë konfirmuar.',
              'Yes. On every optical frame, choose the lens type — single vision, screen or progressive. After you order we get in touch about your prescription: send it to us on WhatsApp or come in for an eye exam. The lab only starts once the prescription is confirmed.',
            ),
          },
          {
            q: T('Koliko traje izrada sočiva?', 'Sa kohë duhet për lentet?', 'How long do lenses take?'),
            a: T(
              'Jednožižna sočiva i sočiva za ekran obično su gotova za 2–4 radna dana, fotohromatska za 3–5, progresivna i sunčana sa dioptrijom za 4–6, a ultra tanka 1.74 do 7 radnih dana. Tačan rok piše kod svakog proizvoda i u potvrdi narudžbe.',
              'Lentet njëvizore dhe për ekran zakonisht janë gati për 2–4 ditë pune, fotokromatiket për 3–5, progresivet dhe lentet e diellit me dioptri për 4–6, ndërsa lentet ultra të holla 1.74 deri në 7 ditë pune. Afati i saktë shfaqet te çdo produkt dhe në konfirmimin e porosisë.',
              'Single-vision and screen lenses are usually ready in 2–4 working days, photochromic in 3–5, progressive and prescription sun lenses in 4–6, and ultra-thin 1.74 lenses in up to 7 working days. The exact lead time is shown on each product and in your order confirmation.',
            ),
          },
          {
            q: T('Šta je Nega+?', 'Çfarë është Kujdes+?', 'What is Care+?'),
            a: T(
              'Nega+ je opciona zaštita okvira: 12 meseci pokrića za slučajni lom i besplatna podešavanja — šrafovi, jastučići za nos, drške. Košta 25 € za dioptrijske naočare i 19 € za naočare za sunce, a dodajete je direktno u korpi.',
              'Kujdes+ është mbrojtje opsionale për kornizën: 12 muaj mbulim nga thyerja aksidentale dhe rregullime falas — vida, jastëkë të hundës, bishta. Kushton 25 € për syze optike dhe 19 € për syze dielli dhe e shtoni direkt në shportë.',
              'Care+ is optional cover for your frame: 12 months of accidental breakage cover plus free adjustments — screws, nose pads, temples. It costs €25 for optical frames and €19 for sunglasses, and you add it right in the cart.',
            ),
          },
          {
            q: T('Šta ako mi naočare ne stoje dobro?', 'Po nëse syzet nuk më rrinë mirë?', 'What if my glasses don’t fit well?'),
            a: T(
              'U roku od 30 dana od preuzimanja besplatno ih podešavamo u optici, obično dok čekate. Okviri imaju 2 godine garancije na greške u izradi. Dioptrijska sočiva se izrađuju po porudžbini, pa zamenu procenjujemo pojedinačno.',
              'Brenda 30 ditëve nga dorëzimi i rregullojmë falas në optikë, zakonisht ndërsa prisni. Kornizat kanë 2 vjet garanci për defekte prodhimi. Lentet me recetë punohen me porosi, prandaj ndërrimin e tyre e vlerësojmë rast pas rasti.',
              'Within 30 days of collection we adjust them free of charge in store, usually while you wait. Frames carry a 2-year warranty against manufacturing defects. Prescription lenses are made to order, so exchanges are assessed case by case.',
            ),
          },
          {
            q: T('Da li se čuvaju fotografije iz virtuelne probe?', 'A ruhen fotot nga prova virtuale?', 'Are photos from the virtual try-on stored?'),
            a: T(
              'Ne. Virtuelna proba obrađuje kameru ili fotografiju isključivo u vašem pregledaču, na vašem uređaju. Ništa se ne otprema i ništa ne čuvamo na našim serverima.',
              'Jo. Prova virtuale e përpunon kamerën ose fotografinë vetëm në shfletuesin tuaj, në pajisjen tuaj. Asgjë nuk ngarkohet dhe asgjë nuk ruhet në serverët tanë.',
              'No. The virtual try-on processes your camera or photo only in your browser, on your own device. Nothing is uploaded and nothing is stored on our servers.',
            ),
          },
          {
            q: T('Kako da zakažem pregled vida i koliko košta?', 'Si e rezervoj kontrollin e syve dhe sa kushton?', 'How do I book an eye exam, and what does it cost?'),
            a: T(
              'Pregledi se rade po terminu. Zakažite preko forme na ovoj stranici ili pozovite +383 43 777 667 (i WhatsApp). Potvrđujemo termin istog dana, zajedno sa cenom izabrane usluge.',
              'Kontrollet bëhen me termin. Rezervoni përmes formularit në këtë faqe ose telefononi në +383 43 777 667 (edhe WhatsApp). Terminin jua konfirmojmë të njëjtën ditë, bashkë me çmimin e shërbimit të zgjedhur.',
              'Eye exams are by appointment. Book through the form on this page or call +383 43 777 667 (WhatsApp too). We confirm your slot the same day, together with the price of the service you chose.',
            ),
          },
        ],
      },
    },
    {
      id: 'instagram',
      type: 'instagram',
      enabled: true,
      data: {
        title: T('Pratite nas na Instagramu', 'Na ndiqni në Instagram', 'Follow us on Instagram'),
        images: [
          '/images/lookbook/riviera.webp',
          '/images/p/vortex-x1-2.webp',
          '/images/lookbook/still-life.webp',
          '/images/lookbook/editorial.webp',
          '/images/misc/sun-collection.webp',
          '/images/lookbook/sun-terrace.webp',
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      data: {
        eyebrow: T('Pregled vida', 'Kontroll i syve', 'Eye exam'),
        title: T('Zakažite *pregled vida*', 'Rezervoni kontrollin e *syve*', 'Book your *eye exam*'),
        text: T(
          'Ostavite ime i broj telefona i izaberite dan koji vam odgovara. Javljamo se istog dana da potvrdimo termin.',
          'Lini emrin dhe numrin e telefonit dhe zgjidhni ditën që ju përshtatet. Ju telefonojmë të njëjtën ditë për ta konfirmuar terminin.',
          'Leave your name and phone number and pick a day that suits you. We’ll call the same day to confirm your appointment.',
        ),
        image: '/images/s/klinika.webp',
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Lookbook — editorial campaign stories (stored as `projects`)        */
/* ------------------------------------------------------------------ */
const TAG = {
  sun: T('Naočare za sunce', 'Syze dielli', 'Sunglasses'),
  optical: T('Dioptrijski okviri', 'Syze optike', 'Optical frames'),
  acetate: T('Acetat', 'Acetat', 'Acetate'),
  studio: T('Studijska fotografija', 'Fotografi studio', 'Studio photography'),
  location: T('Na lokaciji', 'Në terren', 'On location'),
  craft: T('Zanat', 'Mjeshtëri', 'Craft'),
  family: T('Porodica', 'Familje', 'Family'),
};

export const PROJECTS: Project[] = [
  {
    id: 'pr-1',
    title: T('Riviera — leto u Mitrovici', 'Riviera — verë në Mitrovicë', 'Riviera — summer in Mitrovica'),
    location: 'Mitrovicë',
    year: 2026,
    tags: [TAG.sun, TAG.location],
    summary: T(
      'Par, kamena ulica i popodnevno sunce — letnja kapsula sa polarizovanim sočivima i acetatnim okvirima u toplim tonovima.',
      'Një çift, rrugë guri dhe dielli i pasdites — kapsula e verës me lente të polarizuara dhe korniza acetati në tone të ngrohta.',
      'A couple, a stone street and the afternoon sun — our summer capsule of polarised lenses and warm-toned acetate frames.',
    ),
    image: '/images/lookbook/riviera.webp',
    featured: true,
  },
  {
    id: 'pr-2',
    title: T('Atelje sunca', 'Atelier i diellit', 'The sun atelier'),
    location: 'Prishtinë',
    year: 2026,
    tags: [TAG.sun, TAG.acetate],
    summary: T(
      'Portreti na podnevnom suncu za kolekciju naočara za sunce: čiste forme, crni acetat, tamna sočiva i ništa suvišno.',
      'Portrete nën diellin e mesditës për koleksionin e syzeve të diellit: forma të pastra, acetat i zi, lente të errëta dhe asgjë tepër.',
      'Portraits in the midday sun for the sunglasses collection: clean shapes, black acetate, dark lenses and nothing superfluous.',
    ),
    image: '/images/lookbook/atelier-sun.webp',
    featured: true,
  },
  {
    id: 'pr-3',
    title: T('S kolena na koleno', 'Brez pas brezi', 'Generation after generation'),
    location: 'Mitrovicë',
    year: 2025,
    tags: [TAG.family, TAG.optical],
    summary: T(
      'Majka i ćerka, dva okvira u boji kornjačevine i isti osmeh — kampanja posvećena 30 godina naše porodične optike.',
      'Nënë dhe bijë, dy korniza breshke dhe e njëjta buzëqeshje — fushata që u kushtohet 30 vjetëve të optikës sonë familjare.',
      'Mother and daughter, two tortoiseshell frames and the same smile — a campaign dedicated to 30 years of our family optician.',
    ),
    image: '/images/lookbook/generations.webp',
    featured: true,
  },
  {
    id: 'pr-4',
    title: T('Majstorstvo acetata', 'Mjeshtëria e acetatit', 'The craft of acetate'),
    location: 'Mitrovicë',
    year: 2025,
    tags: [TAG.craft, TAG.acetate],
    summary: T(
      'Iza scene u našoj radionici: merenje šublerom, ručno poliranje i podešavanje do milimetra.',
      'Prapa skenës në punëtorinë tonë: matje me kaliper, lustrim me dorë dhe përshtatje deri në milimetër.',
      'Behind the scenes in our workshop: caliper measurements, hand polishing and fitting to the millimetre.',
    ),
    image: '/images/lookbook/craft.webp',
    featured: true,
  },
  {
    id: 'pr-5',
    title: T('Kafa na terasi', 'Kafe në tarracë', 'Coffee on the terrace'),
    location: 'Prizren',
    year: 2025,
    tags: [TAG.sun, TAG.location],
    summary: T(
      'Lagano jutro u starom gradu — naočare za sunce sa UV400 sočivima za duge dane napolju.',
      'Mëngjes i ngadaltë në qytetin e vjetër — syze dielli me lente UV400 për ditë të gjata jashtë.',
      'A slow morning in the old town — UV400 sunglasses for long days outdoors.',
    ),
    image: '/images/lookbook/sun-terrace.webp',
    featured: false,
  },
  {
    id: 'pr-6',
    title: T('Lan i svetlo', 'Liri dhe dritë', 'Linen and light'),
    location: 'Prishtinë',
    year: 2025,
    tags: [TAG.optical, TAG.studio],
    summary: T(
      'Lagan okvir u boji meda, lanena košulja i meko dnevno svetlo — naočare za svaki dan, bez napora.',
      'Kornizë e lehtë në ngjyrë mjalti, këmishë liri dhe dritë e butë natyrale — syzet e përditshme, pa përpjekje.',
      'A light honey-toned frame, a linen shirt and soft daylight — everyday glasses, effortlessly.',
    ),
    image: '/images/lookbook/editorial.webp',
    featured: false,
  },
  {
    id: 'pr-7',
    title: T('Portret u boji kornjačevine', 'Portret në tone breshke', 'Portrait in tortoiseshell'),
    location: 'Prishtinë',
    year: 2024,
    tags: [TAG.optical, TAG.acetate, TAG.studio],
    summary: T(
      'Tamna pozadina, acetatni okvir u boji kornjačevine i siguran pogled — jesenja kampanja dioptrijskih naočara.',
      'Sfond i errët, kornizë acetati breshke dhe vështrim i sigurt — fushata e vjeshtës për syzet optike.',
      'A dark backdrop, a tortoiseshell acetate frame and a confident gaze — our autumn campaign for optical frames.',
    ),
    image: '/images/lookbook/atelier-optical.webp',
    featured: false,
  },
  {
    id: 'pr-8',
    title: T('Senka masline', 'Hije ulliri', 'Olive shade'),
    location: 'Prizren',
    year: 2024,
    tags: [TAG.sun, TAG.location],
    summary: T(
      'Kameni zid, senka masline i par naočara za sunce u boji kornjačevine — leto, jednostavno rečeno.',
      'Mur guri, hije ulliri dhe një palë syze dielli në ngjyrë breshke — vera, e thënë thjesht.',
      'A stone wall, olive shade and a pair of tortoiseshell sunglasses — summer, simply put.',
    ),
    image: '/images/lookbook/sun-portrait.webp',
    featured: false,
  },
  {
    id: 'pr-9',
    title: T('Zima u Rugovi', 'Dimër në Rugovë', 'Winter in Rugova'),
    location: 'Rugovë',
    year: 2024,
    tags: [TAG.optical, TAG.acetate],
    summary: T(
      'Vuneni džemper, meko svetlo i providni sivi okvir — naočare koje nosite od jutra do večeri, i u planini.',
      'Pulovër leshi, dritë e butë dhe kornizë transparente gri — syzet që i mbani nga mëngjesi deri në mbrëmje, edhe në mal.',
      'A wool jumper, soft light and a clear grey frame — glasses you wear from morning to night, even in the mountains.',
    ),
    image: '/images/lookbook/optical-portrait.webp',
    featured: false,
  },
  {
    id: 'pr-10',
    title: T('Ruke koje prilagođavaju', 'Duart që përshtatin', 'Hands that fit'),
    location: 'Mitrovicë',
    year: 2026,
    tags: [TAG.craft, TAG.family],
    summary: T(
      'Dve generacije optičara, jedan okvir — lično prilagođavanje koje par naočara čini zaista vašim.',
      'Dy breza optikësh, një kornizë — përshtatja personale që e bën një palë syze vërtet tuajën.',
      'Two generations of opticians, one frame — the personal fitting that makes a pair truly yours.',
    ),
    image: '/images/lookbook/generations-craft.webp',
    featured: false,
  },
];

/* ------------------------------------------------------------------ */
/* CMS pages (ids are referenced by menus, footer and Settings)        */
/* ------------------------------------------------------------------ */
export function buildPages(now = new Date()): CmsPage[] {
  const at = now.toISOString();
  return [
    {
      id: 'pg-dostava',
      slug: 'dergesa-dhe-pagesa',
      title: T('Dostava i plaćanje', 'Dërgesa & pagesa', 'Delivery & payment'),
      body: T(
        `Dostavljamo širom Kosova, a narudžbu možete preuzeti i lično u našoj optici u Mitrovici.

## Zone i cene dostave
- **Mitrovica i okolina** (Vučitrn, Srbica, Zvečan): 2 € · 1 radni dan
- **Priština i centralni region** (Kosovo Polje, Obilić, Lipljan, Podujevo, Glogovac): 3 € · 1–2 radna dana
- **Ostatak Kosova**: 4 € · 1–3 radna dana

Dostava je **besplatna** za narudžbe preko 150 €.

## Preuzimanje u optici
Narudžbu možete besplatno preuzeti u ulici **Mbretëresha Teutë 182, Mitrovica**, od ponedeljka do subote 10:00–19:30. Javljamo vam se SMS-om ili telefonom kada su naočare gotove — a pri preuzimanju ih podešavamo prema vašem licu.

## Rokovi
- Okviri i naočare za sunce sa stanja: šaljemo u roku od 1 radnog dana
- Naočare sa dioptrijskim sočivima: 2–7 radnih dana nakon potvrde recepta, zavisno od vrste sočiva
- Tačan rok piše kod svakog proizvoda i u potvrdi narudžbe

## Načini plaćanja
- **Pouzećem** — plaćate kuriru ili u optici
- **Uplatom na račun** — prema predračunu koji vam šaljemo e-mailom (ProCredit Bank Kosovo)
- **Platnom karticom** — uskoro

Sve cene su u eurima i uključuju PDV od 18%.`,
        `Dërgojmë në gjithë Kosovën, ndërsa porosinë mund ta merrni edhe vetë në optikën tonë në Mitrovicë.

## Zonat dhe çmimet e dërgesës
- **Mitrovicë dhe rrethina** (Vushtrri, Skenderaj, Zveçan): 2 € · 1 ditë pune
- **Prishtinë dhe qendra** (Fushë Kosovë, Obiliq, Lipjan, Podujevë, Drenas): 3 € · 1–2 ditë pune
- **Gjithë Kosova**: 4 € · 1–3 ditë pune

Dërgesa është **falas** për porosi mbi 150 €.

## Marrje në optikë
Porosinë mund ta merrni falas në **Mbretëresha Teutë 182, Mitrovicë**, nga e hëna deri të shtunën 10:00–19:30. Ju njoftojmë me SMS ose në telefon kur syzet janë gati — dhe në dorëzim i rregullojmë sipas fytyrës suaj.

## Afatet
- Kornizat dhe syzet e diellit në stok: nisen brenda 1 dite pune
- Syzet me lente me recetë: 2–7 ditë pune pasi të konfirmohet receta, varësisht nga lloji i lenteve
- Afati i saktë shfaqet te çdo produkt dhe në konfirmimin e porosisë

## Mënyrat e pagesës
- **Para në dorëzim** — paguani korrierit ose në optikë
- **Transfertë bankare** — sipas parafaturës që ju dërgojmë me e-mail (ProCredit Bank Kosovo)
- **Kartelë pagese** — së shpejti

Të gjitha çmimet janë në euro dhe përfshijnë TVSH-në 18%.`,
        `We deliver across Kosovo, and you can also collect your order in person from our store in Mitrovica.

## Delivery zones and prices
- **Mitrovica area** (Vushtrri, Skenderaj, Zveçan): €2 · 1 working day
- **Prishtina & central region** (Fushë Kosovë, Obiliq, Lipjan, Podujevë, Drenas): €3 · 1–2 working days
- **Rest of Kosovo**: €4 · 1–3 working days

Delivery is **free** on orders over €150.

## Pickup in store
Collect your order free of charge at **Mbretëresha Teutë 182, Mitrovica**, Monday to Saturday 10:00–19:30. We’ll let you know by text or phone when your glasses are ready — and adjust them to your face when you pick them up.

## Lead times
- Frames and sunglasses in stock: dispatched within 1 working day
- Glasses with prescription lenses: 2–7 working days after your prescription is confirmed, depending on the lens type
- The exact lead time is shown on each product and in your order confirmation

## Payment methods
- **Cash on delivery** — pay the courier or in store
- **Bank transfer** — against the pro-forma invoice we e-mail you (ProCredit Bank Kosovo)
- **Card** — coming soon

All prices are in euros and include 18% VAT.`,
      ),
      published: true,
      showInFooter: true,
      updatedAt: at,
    },
    {
      id: 'pg-reklamacije',
      slug: 'kthimet-dhe-garancia',
      title: T('Povraćaj i garancija', 'Kthimet & garancia', 'Returns & warranty'),
      body: T(
        `Želimo da vam naočare dobro stoje i dugo traju. Ako nešto nije u redu, javite nam se — rešavamo to brzo i bez komplikacija.

## 2 godine garancije na okvire
Svi okviri imaju **2 godine garancije** na greške u izradi: pucanje spojeva, kvar šarki ili materijala. Garancija ne pokriva oštećenja od udaraca, toplote ili nepažljivog korišćenja — za to postoji [Nega+](/faqe/kujdes-plus).

## 30 dana za prilagođavanje
U roku od **30 dana** od preuzimanja besplatno podešavamo naočare kad god vam zatreba: most, drške, jastučiće za nos i položaj okvira. Ako vam nova sočiva deluju neobično, proveravamo i merenja montaže.

## Povraćaj proizvoda bez dioptrije
Okvire bez dioptrijskih sočiva i naočare za sunce sa originalnim sočivima možete vratiti u roku od **14 dana** od prijema, nekorišćene i u originalnom pakovanju. Novac vraćamo istim načinom plaćanja u roku od 14 dana nakon provere proizvoda.

## Dioptrijska sočiva
Dioptrijska sočiva izrađujemo po porudžbini u našoj laboratoriji, prema vašem receptu i merenjima, pa se ne vraćaju kao standardni proizvod. Ako nešto nije u redu, svaki slučaj procenjujemo pojedinačno: proveravamo recept, merenja i montažu, a ako je greška naša, sočiva izrađujemo ponovo bez naknade.

## Kako da nam se obratite
1. Pišite nam e-mailom ili na WhatsApp sa brojem narudžbe (OM-…) i fotografijom
2. Odgovaramo istog radnog dana
3. Dođite u optiku u ulici Mbretëresha Teutë 182 ili nam pošaljite naočare kurirom`,
        `Duam që syzet t’ju rrinë mirë dhe të zgjasin. Nëse diçka nuk shkon, na kontaktoni — e zgjidhim shpejt dhe pa komplikime.

## 2 vjet garanci për kornizat
Të gjitha kornizat kanë **2 vjet garanci** për defekte prodhimi: këputje të saldimeve, defekte të menteshave ose të materialit. Garancia nuk mbulon dëmtimet nga goditjet, nxehtësia ose përdorimi i pakujdesshëm — për këto ekziston [Kujdes+](/faqe/kujdes-plus).

## 30 ditë për përshtatje
Brenda **30 ditëve** nga dorëzimi i rregullojmë syzet falas sa herë që ju nevojitet: urën, bishtat, jastëkët e hundës dhe pozicionin e kornizës. Nëse lentet e reja ju duken të pazakonta, kontrollojmë edhe matjet e montimit.

## Kthimi i produkteve pa recetë
Kornizat pa lente me recetë dhe syzet e diellit me lente origjinale mund t’i ktheni brenda **14 ditëve** nga marrja, të papërdorura dhe në paketimin origjinal. Paratë i kthejmë me të njëjtën mënyrë pagese brenda 14 ditëve pas kontrollit të produktit.

## Lentet me recetë
Lentet me recetë i punojmë me porosi në laboratorin tonë, sipas recetës dhe matjeve tuaja, prandaj nuk kthehen si produkt standard. Nëse diçka nuk është në rregull, çdo rast e vlerësojmë individualisht: kontrollojmë recetën, matjet dhe montimin, dhe nëse gabimi është yni, i punojmë lentet sërish pa pagesë.

## Si të na kontaktoni
1. Na shkruani me e-mail ose në WhatsApp me numrin e porosisë (OM-…) dhe një foto
2. Ju përgjigjemi të njëjtën ditë pune
3. Ejani në optikë në Mbretëresha Teutë 182 ose na i dërgoni syzet me korrier`,
        `We want your glasses to fit well and last. If something isn’t right, get in touch — we’ll sort it out quickly and without fuss.

## 2-year frame warranty
Every frame carries a **2-year warranty** against manufacturing defects: broken solder joints, faulty hinges or material flaws. The warranty doesn’t cover damage from knocks, heat or careless use — that’s what [Care+](/faqe/kujdes-plus) is for.

## 30 days to get the fit right
For **30 days** after collection we adjust your glasses free of charge whenever you need: bridge, temples, nose pads and frame position. If your new lenses feel unusual, we also recheck the fitting measurements.

## Returning non-prescription items
Frames without prescription lenses and sunglasses with their original lenses can be returned within **14 days** of receipt, unworn and in their original packaging. We refund to the original payment method within 14 days of inspecting the item.

## Prescription lenses
Prescription lenses are made to order in our lab to your prescription and measurements, so they can’t be returned like standard items. If something isn’t right, we assess every case individually: we check the prescription, the measurements and the fitting — and if the mistake was ours, we remake the lenses free of charge.

## How to reach us
1. E-mail or WhatsApp us with your order number (OM-…) and a photo
2. We reply the same working day
3. Visit us at Mbretëresha Teutë 182 or send the glasses back by courier`,
      ),
      published: true,
      showInFooter: true,
      updatedAt: at,
    },
    {
      id: 'pg-kujdes',
      slug: 'kujdes-plus',
      title: T('Nega+', 'Kujdes+', 'Care+'),
      body: T(
        `Nega+ je naša opciona zaštita za naočare koje nosite svaki dan. Dodajete je uz svaki okvir direktno u korpi.

## Šta pokriva
- **12 meseci zaštite od slučajnog loma** okvira — popravljamo ga ili menjamo istim ili sličnim modelom
- **Besplatna podešavanja** tokom cele godine: most, drške, jastučići za nos, šrafovi
- **Profesionalno čišćenje** u optici kad god navratite
- **Ponovna montaža sočiva** u novi okvir, ako sočiva nisu oštećena

## Cena
- **25 €** za dioptrijske naočare
- **19 €** za naočare za sunce

Nega+ važi za jedan okvir i počinje od dana preuzimanja.

## Šta ne pokriva
- Gubitak ili krađu
- Ogrebotine na sočivima od uobičajenog korišćenja
- Namerno oštećenje
- Izradu novih sočiva zbog promene recepta

## Kako je koristite
Donesite naočare u optiku zajedno sa brojem narudžbe. Većinu podešavanja radimo dok čekate, a kada je potrebna zamena okvira, javljamo vam se čim je novi par spreman.`,
        `Kujdes+ është mbrojtja jonë opsionale për syzet që i mbani çdo ditë. E shtoni për çdo kornizë direkt në shportë.

## Çfarë mbulon
- **12 muaj mbrojtje nga thyerja aksidentale** e kornizës — e riparojmë ose e zëvendësojmë me të njëjtin model ose me një model të ngjashëm
- **Rregullime falas** gjatë gjithë vitit: ura, bishtat, jastëkët e hundës, vidat
- **Pastrim profesional** në optikë sa herë që kaloni
- **Rimontim i lenteve** në kornizën e re, nëse lentet nuk janë dëmtuar

## Çmimi
- **25 €** për syze optike
- **19 €** për syze dielli

Kujdes+ vlen për një kornizë dhe fillon nga dita e dorëzimit.

## Çfarë nuk mbulon
- Humbjen ose vjedhjen
- Gërvishtjet e lenteve nga përdorimi i zakonshëm
- Dëmtimin e qëllimshëm
- Punimin e lenteve të reja për shkak të ndryshimit të recetës

## Si e përdorni
Sillni syzet në optikë bashkë me numrin e porosisë. Shumicën e rregullimeve i bëjmë ndërsa prisni, ndërsa kur duhet zëvendësuar korniza, ju njoftojmë sapo pala e re të jetë gati.`,
        `Care+ is our optional cover for the glasses you wear every day. Add it to any frame right in the cart.

## What it covers
- **12 months of accidental breakage cover** for the frame — we repair it or replace it with the same or a similar model
- **Free adjustments** all year: bridge, temples, nose pads, screws
- **Professional cleaning** in store whenever you drop by
- **Refitting your lenses** into the new frame, as long as they aren’t damaged

## Price
- **€25** for optical frames
- **€19** for sunglasses

Care+ covers one frame and starts on the day you collect it.

## What it doesn’t cover
- Loss or theft
- Lens scratches from everyday wear
- Intentional damage
- New lenses because your prescription has changed

## How to use it
Bring your glasses to the store with your order number. Most adjustments are done while you wait; if the frame needs replacing, we’ll let you know as soon as the new pair is ready.`,
      ),
      published: true,
      showInFooter: true,
      updatedAt: at,
    },
    {
      id: 'pg-receta',
      slug: 'receta-dhe-pd',
      title: T('Recept i PD', 'Receta & PD', 'Prescription & PD'),
      body: T(
        `Da biste naručili dioptrijske naočare, potreban nam je važeći recept i nekoliko merenja. Evo kratkog vodiča kroz vrednosti na receptu i kroz to kako merimo PD.

## Kako se čita recept
- **OD / OS** — desno i levo oko; svaki red pripada jednom oku
- **SPH** — sferna jačina u dioptrijama; minus obično označava kratkovidost, plus dalekovidost
- **CYL** — cilindrična jačina za astigmatizam
- **AXIS** — orijentacija cilindra, od 0 do 180°; uvek ide uz CYL
- **ADD** — dodatna jačina za blizinu, za progresivna sočiva i naočare za čitanje
- **PD** — zenični razmak u milimetrima

## Kako da nam pošaljete recept
- Fotografišite ga i pošaljite na WhatsApp +383 43 777 667
- Pošaljite ga e-mailom uz broj narudžbe
- Ili zakažite pregled vida kod nas — tada recept dobijate na licu mesta

Laboratorija počinje izradu tek kada potvrdimo recept sa vama.

## Kako merimo PD
PD merimo pupilometrom u optici, za svako oko posebno, i proveravamo ga na okviru koji ste izabrali. Za progresivna sočiva merimo i visinu montaže — položaj zenice unutar okvira. Merenje je besplatno i traje nekoliko minuta.

## Virtuelna proba i PD
Virtuelna proba na sajtu pomaže da izaberete oblik i veličinu okvira, ali nije merenje za montažu. Ako PD nije upisan u recept, javićemo vam se pre izrade.

## Koliko dugo važi recept
Kao opšta smernica, recept za odrasle se proverava na svakih jednu do dve godine, a kod dece češće. Ako vam se vid promenio, ne čekajte — [zakažite pregled](/#rezervo).

> Ovi podaci služe kao informacija i ne zamenjuju pregled kod stručnjaka.`,
        `Për të porositur syze me recetë, na duhet një recetë e vlefshme dhe disa matje. Ja një udhëzues i shkurtër për vlerat në recetë dhe për mënyrën si e masim PD-në.

## Si lexohet receta
- **OD / OS** — syri i djathtë dhe i majtë; çdo rresht i përket një syri
- **SPH** — fuqia sferike në dioptri; minus zakonisht do të thotë miopi, plus hipermetropi
- **CYL** — fuqia cilindrike për astigmatizmin
- **AXIS** — orientimi i cilindrit, nga 0 deri në 180°; shkon gjithmonë bashkë me CYL
- **ADD** — fuqia shtesë për afër, për lente progresive dhe syze leximi
- **PD** — distanca pupilare në milimetra

## Si na e dërgoni recetën
- Fotografojeni dhe na e dërgoni në WhatsApp +383 43 777 667
- Na e dërgoni me e-mail bashkë me numrin e porosisë
- Ose rezervoni kontrollin e syve te ne — receta ju jepet në vend

Laboratori fillon punën vetëm pasi ta konfirmojmë recetën me ju.

## Si e masim PD-në
PD-në e masim me pupilometër në optikë, veç e veç për secilin sy, dhe e verifikojmë në kornizën që keni zgjedhur. Për lentet progresive masim edhe lartësinë e montimit — pozicionin e bebëzës brenda kornizës. Matja është falas dhe zgjat pak minuta.

## Prova virtuale dhe PD
Prova virtuale në faqe ju ndihmon të zgjidhni formën dhe madhësinë e kornizës, por nuk është matje për punimin e lenteve. Nëse PD-ja nuk është në recetë, ju kontaktojmë para punimit.

## Sa kohë vlen receta
Si orientim i përgjithshëm, receta e të rriturve rishikohet çdo një deri në dy vjet, ndërsa te fëmijët më shpesh. Nëse shikimi ju ka ndryshuar, mos prisni — [rezervoni një kontroll](/#rezervo).

> Këto informacione janë orientuese dhe nuk e zëvendësojnë kontrollin te profesionisti.`,
        `To order prescription glasses we need a valid prescription and a few measurements. Here is a short guide to the values on your prescription and to how we measure PD.

## How to read a prescription
- **OD / OS** — right and left eye; each row belongs to one eye
- **SPH** — spherical power in dioptres; minus usually means short-sighted, plus long-sighted
- **CYL** — cylindrical power for astigmatism
- **AXIS** — the orientation of the cylinder, from 0 to 180°; always goes with CYL
- **ADD** — extra near power, for progressive lenses and reading glasses
- **PD** — pupillary distance in millimetres

## How to send us your prescription
- Take a photo and send it on WhatsApp to +383 43 777 667
- E-mail it to us with your order number
- Or book an eye exam with us — you’ll get your prescription on the spot

The lab only starts work once we have confirmed the prescription with you.

## How we measure PD
We measure PD in store with a pupillometer, separately for each eye, and verify it on the frame you have chosen. For progressive lenses we also measure the fitting height — where your pupil sits within the frame. It’s free and takes a few minutes.

## Virtual try-on and PD
The virtual try-on on our site helps you choose a frame shape and size, but it isn’t a fitting measurement. If your PD isn’t on the prescription, we’ll contact you before production.

## How long a prescription lasts
As a general guide, adults should have their prescription checked every one to two years, and children more often. If your vision has changed, don’t wait — [book an eye exam](/#rezervo).

> This information is for guidance only and doesn’t replace an examination by a professional.`,
      ),
      published: true,
      showInFooter: false,
      updatedAt: at,
    },
    {
      id: 'pg-privatnost',
      slug: 'privatesia',
      title: T('Politika privatnosti', 'Politika e privatësisë', 'Privacy policy'),
      body: T(
        `Ovo obaveštenje objašnjava šta se dešava sa vašim podacima kada koristite ovaj sajt ITCOM (ITCOM Group), Mbretëresha Teutë 182, 40000 Mitrovica. Opisuje kako sajt radi danas; ako se to promeni, ažuriraćemo ovu stranicu.

## Bez analitike i reklamnih kolačića
Sajt **ne postavlja kolačiće** i **ne koristi alate za analitiku, reklame ili praćenje**. Dok pregledate sajt, ništa se ne učitava od drugih kompanija: stranice, slike, fontovi i virtuelna proba dolaze sa samog sajta.

## Hosting
Sajt je hostovan na GitHub Pages (GitHub, Inc.) i isporučuje se preko njihove mreže za isporuku sadržaja. Kao kod svakog sajta, IP adresa vašeg uređaja i tražena stranica stižu do njihovih servera; GitHub navodi da IP adrese posetilaca beleži iz bezbednosnih razloga. Pogledajte [GitHub izjavu o privatnosti](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Šta nam šaljete putem obrazaca
Narudžbe, zahtevi za termin, kontakt i partnerski upiti i prijave na newsletter sadrže ono što unesete — na primer ime, broj telefona, e-mail, adresu dostave i, za dioptrijska sočiva, recept i merenja (PD, visina montaže). Koristimo ih samo da obradimo vaš zahtev.

Sajt nema bazu podataka na serveru: kopija onoga što pošaljete čuva se u vašem pregledaču, kako bi sajt mogao da prikaže potvrdu i status narudžbe. Da bi stigli do nas, podaci iz obrasca šalju nam se e-mailom preko Web3Forms, servisa za dostavu obrazaca. Web3Forms prima sadržaj obrasca da bi ga isporučio nama; pogledajte [Web3Forms politiku privatnosti](https://web3forms.com/privacy). Da li je slanje trenutno uključeno, piše na kraju ove stranice.

## Recept je osetljiv podatak
Vrednosti sa recepta odnose se na vaše zdravlje. Koristimo ih isključivo za izradu sočiva; pristup imaju samo naši optičari i laboratorija i nikada ih ne koristimo za marketing.

## Virtuelna proba
Virtuelna proba naočara radi **u potpunosti u vašem pregledaču**. Slika sa kamere ili fotografija koju izaberete obrađuje se na vašem uređaju i **ne otprema se, ne čuva i ne šalje** nama niti trećim licima. Kada zatvorite probu, kamera se isključuje. Softver za praćenje lica (Google MediaPipe) učitava se sa ovog sajta.

## Šta se čuva u vašem pregledaču
Da bi radio, sajt čuva nekoliko stvari u lokalnoj memoriji vašeg pregledača — nikada u kolačićima. Ništa od toga ne napušta vaš uređaj, osim podataka iz obrasca koji pošaljete:

- jezik, korpu, listu želja, kodove za popust i nedavno pregledane proizvode;
- odgovore iz vodiča za izbor okvira i izabrani prikaz prodavnice;
- kopije narudžbi i zahteva koje ste poslali i nacrt narudžbe (samo za trenutnu karticu pregledača), da ne izgubite uneto;
- obrasce koji čekaju slanje ako ste bili bez interneta;
- poziciju na stranicama koje ste posetili i tehničke oznake (samo za trenutnu karticu pregledača);
- keš fajlova i fotografija sajta, da ponovne posete budu brže.

Sve to možete u svakom trenutku obrisati brisanjem podataka ovog sajta u podešavanjima pregledača.

## Linkovi ka drugim servisima
Dugmad za WhatsApp, Instagram i Google Maps su obični linkovi: ovim servisima se ništa ne šalje dok ne kliknete. Nakon toga važe njihove politike privatnosti.

## Koliko dugo čuvamo podatke
Račune i dokumentaciju narudžbi čuvamo onoliko koliko propisuje poreski zakon. Upite i marketinške saglasnosti brišemo čim to zatražite.

## Vaša prava
U svakom trenutku možete zatražiti uvid, ispravku, izvoz ili brisanje podataka koje ste nam poslali — pišite nam na info@itcom.example ili dođite u optiku.`,
        `Ky njoftim shpjegon çfarë ndodh me të dhënat tuaja kur përdorni këtë faqe të ITCOM (ITCOM Group), Mbretëresha Teutë 182, 40000 Mitrovicë. Ai përshkruan si funksionon faqja sot; nëse kjo ndryshon, do ta përditësojmë këtë faqe.

## Pa analitikë dhe pa cookies reklamuese
Faqja **nuk vendos cookies** dhe **nuk përdor mjete analitike, reklamash apo gjurmimi**. Gjatë shfletimit nuk ngarkohet asgjë nga kompani të tjera: faqet, fotot, fontet dhe prova virtuale vijnë nga vetë faqja.

## Hostimi
Faqja hostohet në GitHub Pages (GitHub, Inc.) dhe shpërndahet përmes rrjetit të tyre për shpërndarjen e përmbajtjes. Si në çdo faqe interneti, adresa IP e pajisjes suaj dhe faqja që kërkoni arrijnë te serverët e tyre; GitHub deklaron se adresat IP të vizitorëve i regjistron për qëllime sigurie. Shihni [Deklaratën e privatësisë së GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Çfarë na dërgoni përmes formularëve
Porositë, kërkesat për termin, mesazhet e kontaktit, kërkesat për bashkëpunim dhe regjistrimet në newsletter përmbajnë atë që shkruani — p.sh. emrin, numrin e telefonit, e-mailin, adresën e dërgesës dhe, për lente me recetë, recetën dhe matjet (PD, lartësia e montimit). I përdorim vetëm për të trajtuar kërkesën tuaj.

Faqja nuk ka bazë të dhënash në server: një kopje e asaj që dërgoni ruhet në shfletuesin tuaj, që faqja t’ju tregojë konfirmimin dhe statusin e porosisë. Që të na arrijnë, të dhënat e formularit na dërgohen me e-mail përmes Web3Forms, një shërbim për dërgimin e formularëve. Web3Forms e merr përmbajtjen e formularit për ta dorëzuar te ne; shihni [politikën e privatësisë së Web3Forms](https://web3forms.com/privacy). Nëse dërgimi është aktiv tani, e shihni në fund të kësaj faqeje.

## Receta është e dhënë e ndjeshme
Vlerat e recetës kanë të bëjnë me shëndetin tuaj. I përdorim vetëm për punimin e lenteve; qasje kanë vetëm optikët dhe laboratori ynë, dhe nuk i përdorim kurrë për marketing.

## Prova virtuale
Prova virtuale e syzeve funksionon **tërësisht në shfletuesin tuaj**. Imazhi i kamerës ose fotografia që zgjidhni përpunohen në pajisjen tuaj dhe **nuk ngarkohen, nuk ruhen dhe nuk u dërgohen** as neve, as palëve të treta. Kur e mbyllni provën, kamera fiket. Softueri për ndjekjen e fytyrës (Google MediaPipe) ngarkohet nga vetë kjo faqe.

## Çfarë ruhet në shfletuesin tuaj
Që të funksionojë, faqja ruan disa gjëra në hapësirën lokale të shfletuesit tuaj — asnjëherë në cookies. Asgjë prej tyre nuk largohet nga pajisja juaj, përveç të dhënave të formularit që dërgoni:

- gjuhën, shportën, listën e dëshirave, kodet e zbritjes dhe produktet e shikuara së fundi;
- përgjigjet në udhëzuesin për zgjedhjen e kornizës dhe pamjen e dyqanit që keni zgjedhur;
- kopjet e porosive dhe kërkesave që keni dërguar dhe draftin e porosisë (vetëm për skedën aktuale), që të mos humbni atë që keni shkruar;
- formularët që presin të dërgohen, nëse keni qenë pa internet;
- pozicionin në faqet që keni vizituar dhe shenja teknike (vetëm për skedën aktuale);
- një kopje (cache) të skedarëve dhe fotove të faqes, që vizitat e radhës të jenë më të shpejta.

Të gjitha këto mund t’i fshini në çdo kohë, duke fshirë të dhënat e kësaj faqeje te cilësimet e shfletuesit.

## Lidhjet me shërbime të tjera
Butonat për WhatsApp, Instagram dhe Google Maps janë lidhje të thjeshta: këtyre shërbimeve nuk u dërgohet asgjë derisa të klikoni. Pas kësaj vlejnë politikat e tyre të privatësisë.

## Sa kohë i ruajmë
Faturat dhe dokumentet e porosive i ruajmë aq sa kërkon ligji tatimor. Kërkesat e kontaktit dhe pëlqimet për marketing i fshijmë sapo të na e kërkoni.

## Të drejtat tuaja
Në çdo kohë mund të kërkoni qasje, korrigjim, eksport ose fshirje të të dhënave që na keni dërguar — na shkruani në info@itcom.example ose ejani në optikë.`,
        `This notice explains what happens to your data when you use this website of ITCOM (ITCOM Group), Mbretëresha Teutë 182, 40000 Mitrovica. It describes how the site works today; if that changes, we will update this page.

## No analytics, no advertising cookies
The site sets **no cookies** and uses **no analytics, advertising or tracking tools**. Nothing is loaded from other companies while you browse: pages, images, fonts and the virtual try-on all come from the site itself.

## Hosting
The website is hosted on GitHub Pages (GitHub, Inc.) and delivered through its content delivery network. As with any website, your device’s IP address and the page you request reach their servers; GitHub states that it logs visitors’ IP addresses for security purposes. See the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## What you send us through forms
Orders, appointment requests, contact and partner enquiries and newsletter sign-ups contain what you enter — for example your name, phone number, e-mail, delivery address and, for prescription lenses, your prescription and measurements (PD, fitting height). We use them only to handle your request.

The site has no server-side database: a copy of what you send is kept in your browser so the site can show your confirmation and order status. To reach us, form entries are e-mailed to us through Web3Forms, a form-delivery service. Web3Forms receives the form content in order to deliver it to us; see the [Web3Forms privacy policy](https://web3forms.com/privacy). Whether sending is switched on right now is shown at the end of this page.

## Your prescription is sensitive data
Prescription values relate to your health. We use them only to make your lenses; only our opticians and our lab have access, and we never use them for marketing.

## Virtual try-on
The virtual try-on runs **entirely in your browser**. Your camera feed or the photo you choose is processed on your own device and is **never uploaded, stored or sent** to us or to any third party. When you close the try-on, the camera switches off. The face-tracking software (Google MediaPipe) is served from this site.

## Stored in your browser
To work, the site keeps a few things in your browser’s local storage — never in cookies. None of it leaves your device, except the form entries you send:

- your language, cart, wishlist, discount codes and recently viewed products;
- your answers in the frame finder and the shop layout you picked;
- copies of the orders and requests you sent, and a checkout draft (current browser tab only) so you don’t lose what you typed;
- forms waiting to be sent if you were offline;
- your position on pages you visited and technical markers (current browser tab only);
- a cache of the site’s files and photos so repeat visits are faster.

You can remove all of it at any time by clearing this site’s data in your browser settings.

## Links to other services
The WhatsApp, Instagram and Google Maps buttons are plain links: nothing is sent to these services until you click one. After that, their own privacy policies apply.

## How long we keep data
Invoices and order records are kept for as long as tax law requires. Enquiries and marketing consents are deleted as soon as you ask.

## Your rights
You can ask to access, correct, export or delete the data you sent us at any time — write to info@itcom.example or visit us in store.`,
      ),
      published: true,
      showInFooter: true,
      updatedAt: at,
    },
    {
      id: 'pg-uslovi',
      slug: 'kushtet-e-perdorimit',
      title: T('Uslovi korišćenja', 'Kushtet e përdorimit', 'Terms of use'),
      body: T(
        `Ovi uslovi uređuju korišćenje sajta i kupovinu u online prodavnici ITCOM, deo ITCOM Group, Mbretëresha Teutë 182, 40000 Mitrovica.

## Narudžba
Narudžba je prihvaćena kada vam pošaljemo potvrdu e-mailom ili SMS-om. Za naočare sa dioptrijskim sočivima laboratorija počinje izradu tek kada su recept i merenja potvrđeni.

## Cene
Sve cene su u eurima i uključuju PDV od 18%. Za potvrđene narudžbe važi cena u trenutku naručivanja.

## Plaćanje i dostava
Plaćanje je moguće pouzećem ili uplatom na račun; plaćanje karticom uskoro. Uslove dostave pronaći ćete na stranici [Dostava i plaćanje](/faqe/dergesa-dhe-pagesa).

## Povraćaj i garancija
Pravo na povraćaj i garancija na okvire opisani su na stranici [Povraćaj i garancija](/faqe/kthimet-dhe-garancia).

## Virtuelna proba i saveti
Virtuelna proba prikazuje okvir okvirno i ne zamenjuje probu u optici niti merenja za montažu. Tekstovi u rubrici Saveti su informativni i nisu medicinski savet — za svaku tegobu sa vidom zakažite pregled.

## Merodavno pravo
Na ove uslove primenjuje se pravo Republike Kosovo. Svaki eventualni spor nastojimo najpre da rešimo dogovorom.`,
        `Këto kushte rregullojnë përdorimin e faqes dhe blerjet në dyqanin online të ITCOM, pjesë e ITCOM Group, Mbretëresha Teutë 182, 40000 Mitrovicë.

## Porosia
Porosia pranohet kur ju dërgojmë konfirmimin me e-mail ose SMS. Për syzet me lente me recetë, laboratori fillon punën vetëm pasi receta dhe matjet të jenë konfirmuar.

## Çmimet
Të gjitha çmimet janë në euro dhe përfshijnë TVSH-në 18%. Për porositë e konfirmuara vlen çmimi në momentin e porosisë.

## Pagesa dhe dërgesa
Mund të paguani me para në dorëzim ose me transfertë bankare; pagesa me kartelë së shpejti. Kushtet e dërgesës i gjeni te [Dërgesa & pagesa](/faqe/dergesa-dhe-pagesa).

## Kthimet dhe garancia
E drejta e kthimit dhe garancia për kornizat përshkruhen te [Kthimet & garancia](/faqe/kthimet-dhe-garancia).

## Prova virtuale dhe këshillat
Prova virtuale tregon një pamje orientuese të kornizës dhe nuk e zëvendëson provën në optikë apo matjet për punimin e lenteve. Artikujt te Këshilla janë informues dhe nuk janë këshillë mjekësore — për çdo shqetësim me shikimin rezervoni një kontroll.

## Ligji i zbatueshëm
Për këto kushte zbatohet ligji i Republikës së Kosovës. Çdo mosmarrëveshje të mundshme përpiqemi ta zgjidhim fillimisht me marrëveshje.`,
        `These terms govern the use of this website and purchases from the ITCOM online store, part of ITCOM Group, Mbretëresha Teutë 182, 40000 Mitrovica.

## Orders
An order is accepted once we send you a confirmation by e-mail or text. For glasses with prescription lenses, the lab starts work only after your prescription and measurements have been confirmed.

## Prices
All prices are in euros and include 18% VAT. Confirmed orders keep the price at the time of ordering.

## Payment and delivery
You can pay cash on delivery or by bank transfer; card payment is coming soon. Delivery terms are on the [Delivery & payment](/faqe/dergesa-dhe-pagesa) page.

## Returns and warranty
Your right of return and the frame warranty are described on the [Returns & warranty](/faqe/kthimet-dhe-garancia) page.

## Virtual try-on and advice
The virtual try-on gives an approximate preview of a frame and doesn’t replace trying it on in store or a fitting measurement. Articles in our Advice section are for information only and are not medical advice — for any concern about your vision, book an eye exam.

## Governing law
These terms are governed by the law of the Republic of Kosovo. We always try to resolve any dispute amicably first.`,
      ),
      published: true,
      showInFooter: true,
      updatedAt: at,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Advice — "Këshilla" (informative, never a diagnosis)                */
/* ------------------------------------------------------------------ */
/** In-house author — PostCard shows the brand monogram for it. */
const TEAM = 'ITCOM';

export function buildPosts(now = new Date()): Post[] {
  const d = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  return [
    {
      id: 'post-receta',
      slug: 'si-ta-lexoni-receten',
      title: T(
        'Kako da pročitate recept za naočare: SPH, CYL, AXIS i ADD',
        'Si ta lexoni recetën e syzeve: SPH, CYL, AXIS dhe ADD',
        'How to read your glasses prescription: SPH, CYL, AXIS and ADD',
      ),
      excerpt: T(
        'Skraćenice na receptu deluju tehnički, ali svaka ima jednostavno značenje. Evo kako da ih pročitate — i šta nikada ne treba da menjate sami.',
        'Shkurtesat në recetë duken teknike, por secila ka një kuptim të thjeshtë. Ja si t’i lexoni — dhe çfarë të mos e ndryshoni kurrë vetë.',
        'The abbreviations on a prescription look technical, but each has a simple meaning. Here’s how to read them — and what never to change yourself.',
      ),
      body: T(
        `Recept za naočare je mala tabela sa mnogo informacija. Ne morate sami da ga tumačite da biste naručili naočare — to je naš posao — ali je dobro da razumete šta naručujete.

## Desno i levo: OD i OS
Svaki red pripada jednom oku. **OD** (ili D) je desno oko, **OS** (ili L) levo. Kada prepisujete recept u formular, proverite da vrednosti ostanu u redu pravog oka.

## SPH — sferna jačina
SPH je osnovna jačina sočiva u dioptrijama. Znak **minus** (−) obično označava kratkovidost (loše vidite na daljinu), a znak **plus** (+) dalekovidost. Vrednost 0.00 ili „plano“ znači da nema sferne jačine.

## CYL i AXIS — astigmatizam
CYL je cilindrična jačina koja koriguje astigmatizam, a AXIS (0–180°) pokazuje njenu orijentaciju. Ove dve vrednosti uvek idu zajedno: AXIS bez CYL nema smisla, a i mala promena ose može uticati na oštrinu.

## ADD — adicija za blizinu
ADD je dodatna jačina za čitanje i rad na blizinu, obično od +0.75 do +3.50. Koristi se kod progresivnih i bifokalnih sočiva i naočara za čitanje — i vezana je za stvarnu udaljenost na kojoj čitate.

## PD — zenični razmak
PD je razmak između centara zenica, u milimetrima. Nije uvek upisan u recept; mi ga besplatno merimo u optici, sa okvirom koji izaberete. Više o tome na stranici [Recept i PD](/faqe/receta-dhe-pd).

## Datum i namena
Proverite datum recepta i za šta je namenjen — za daljinu, za čitanje ili za celodnevno nošenje. Stari recept ne zamenjuje novi pregled vida.

> Savet: nikada sami ne menjajte jačinu „malo više“ ili „malo manje“. Ako vam nešto nije jasno, pošaljite nam fotografiju recepta na WhatsApp i proverićemo ga zajedno.`,
        `Receta e syzeve është një tabelë e vogël me shumë informacion. Nuk keni nevojë ta interpretoni vetë për të porositur syze — atë e bëjmë ne — por është mirë ta kuptoni çfarë po porositni.

## Djathtas dhe majtas: OD dhe OS
Çdo rresht i përket një syri. **OD** (ose D) është syri i djathtë, **OS** (ose M) syri i majtë. Kur e kopjoni recetën në një formular, kontrolloni që vlerat të mbeten në rreshtin e syrit të duhur.

## SPH — fuqia sferike
SPH është fuqia bazë e lentes në dioptri. Shenja **minus** (−) lidhet zakonisht me miopinë (nuk shihni qartë larg), shenja **plus** (+) me hipermetropinë. Vlera 0.00 ose “plano” do të thotë se nuk ka fuqi sferike.

## CYL dhe AXIS — astigmatizmi
CYL është fuqia cilindrike që korrigjon astigmatizmin, ndërsa AXIS (0–180°) tregon orientimin e saj. Këto dy vlera shkojnë gjithmonë bashkë: një AXIS pa CYL nuk ka kuptim, dhe edhe një ndryshim i vogël i aksit mund të ndikojë në qartësi.

## ADD — shtesa për afër
ADD është fuqia shtesë për lexim dhe punë nga afër, zakonisht nga +0.75 deri në +3.50. Përdoret te lentet progresive, bifokale dhe syzet e leximit — dhe lidhet me distancën ku lexoni realisht.

## PD — distanca pupilare
PD është largësia mes qendrave të bebëzave, në milimetra. Nuk shënohet gjithmonë në recetë; ne e masim falas në optikë, me kornizën që zgjidhni. Më shumë te faqja [Receta & PD](/faqe/receta-dhe-pd).

## Data dhe qëllimi
Kontrolloni datën e recetës dhe për çfarë është menduar — për larg, për lexim apo për mbajtje gjithë ditën. Një recetë e vjetër nuk e zëvendëson një kontroll të ri të syve.

> Këshillë: mos e ndryshoni kurrë vetë fuqinë “pak më shumë” ose “pak më pak”. Nëse diçka nuk ju duket e qartë, na dërgoni foton e recetës në WhatsApp dhe e kontrollojmë bashkë.`,
        `A glasses prescription is a small table with a lot of information. You don’t need to interpret it yourself to order glasses — that’s our job — but it helps to understand what you’re ordering.

## Right and left: OD and OS
Each row belongs to one eye. **OD** (or R) is the right eye, **OS** (or L) the left. When you copy a prescription into a form, check that the values stay on the right eye’s row.

## SPH — sphere
SPH is the basic lens power in dioptres. A **minus** sign (−) usually means short-sightedness (distance looks blurry), a **plus** sign (+) long-sightedness. A value of 0.00 or “plano” means no spherical power.

## CYL and AXIS — astigmatism
CYL is the cylindrical power that corrects astigmatism, and AXIS (0–180°) gives its orientation. The two always go together: an AXIS without a CYL means nothing, and even a small change of axis can affect clarity.

## ADD — near addition
ADD is the extra power for reading and close work, usually between +0.75 and +3.50. It’s used in progressive, bifocal and reading lenses — and relates to the distance at which you actually read.

## PD — pupillary distance
PD is the distance between the centres of your pupils, in millimetres. It isn’t always written on the prescription; we measure it free of charge in store, with the frame you choose. More on the [Prescription & PD](/faqe/receta-dhe-pd) page.

## Date and purpose
Check when the prescription was written and what it is for — distance, reading or all-day wear. An old prescription is no substitute for a new eye exam.

> Tip: never adjust the power “a little up” or “a little down” yourself. If anything is unclear, send us a photo of the prescription on WhatsApp and we’ll go through it together.`,
      ),
      cover: '/images/lookbook/editorial.webp',
      tag: T('Recept i merenja', 'Receta & matjet', 'Prescription & fitting'),
      author: TEAM,
      readMinutes: 5,
      publishedAt: d(6),
      published: true,
    },
    {
      id: 'post-pd',
      slug: 'cfare-eshte-pd',
      title: T('PD: zašto je zenični razmak važan', 'PD: pse ka rëndësi distanca pupilare', 'PD: why pupillary distance matters'),
      excerpt: T(
        'Dva milimetra greške u PD-u mogu dobar par učiniti zamornim. Šta je PD, kako se meri i zašto ga merimo sa vašim okvirom.',
        'Dy milimetra gabim në PD mund ta bëjnë një palë të mirë të lodhshme. Çfarë është PD, si matet dhe pse e masim me kornizën tuaj.',
        'Two millimetres off on your PD can make a good pair tiring to wear. What PD is, how it’s measured and why we measure it with your frame.',
      ),
      body: T(
        `Svako sočivo ima optički centar — tačku u kojoj je vid najoštriji. PD obezbeđuje da ta tačka bude tačno ispred vaše zenice.

## Šta je PD
PD (zenični razmak) je razmak između centara zenica, u milimetrima. Kod odraslih je obično između 54 i 74 mm. Za čitanje je PD za blizinu nešto manji, jer se oči pri gledanju izbliza približavaju.

## Binokularni ili monokularni
Binokularni PD je jedan broj (npr. 63 mm). Monokularni PD meri svako oko posebno od sredine nosa (npr. 31,5 / 31,5), jer lice retko kada je potpuno simetrično. Za progresivna sočiva i jače dioptrije monokularno merenje je standard.

## Zašto je važan
Kada se centri sočiva ne poklapaju sa očima, sočivo stvara neželjeni prizmatični efekat. Možda ga nećete odmah primetiti, ali se često oseća kao umor, glavobolja ili utisak da „nešto nije u redu“ sa novim naočarima.

## Visina montaže
Kod progresivnih sočiva nije dovoljan samo PD: merimo i visinu montaže — gde se zenica nalazi unutar okvira. To se može izmeriti samo sa izabranim okvirom, nakon što je podešen prema vašem licu.

## Kako ga merimo
U optici PD merimo pupilometrom i proveravamo ga na vašem okviru. Merenje je besplatno i traje svega nekoliko minuta. Virtuelna proba na sajtu pomaže pri izboru veličine, ali ne zamenjuje merenje za montažu.

> Naručujete online i ne znate svoj PD? Bez brige: javićemo vam se pre nego što laboratorija počne sa radom.`,
        `Çdo lente ka një qendër optike — pikën ku shikimi është më i qartë. PD-ja siguron që kjo pikë të bjerë pikërisht përpara bebëzës suaj.

## Çfarë është PD
PD (distanca pupilare) është largësia mes qendrave të dy bebëzave, në milimetra. Te të rriturit zakonisht është mes 54 dhe 74 mm. Për lexim, PD-ja për afër është pak më e vogël, sepse kur shohim nga afër sytë afrohen drejt njëri-tjetrit.

## Binokulare apo monokulare
PD binokulare është një numër i vetëm (p.sh. 63 mm). PD monokulare mat secilin sy veç e veç nga mesi i hundës (p.sh. 31,5 / 31,5), sepse fytyra rrallë është krejtësisht simetrike. Për lentet progresive dhe recetat më të forta, matja monokulare është standard.

## Pse ka rëndësi
Kur qendrat e lenteve nuk përputhen me sytë, lentja krijon një efekt prizmatik të padëshiruar. Mund të mos e vini re menjëherë, por shpesh ndihet si lodhje, dhimbje koke ose ndjesi se “diçka nuk shkon” me syzet e reja.

## Lartësia e montimit
Te progresivet nuk mjafton vetëm PD-ja: masim edhe lartësinë e montimit — ku bie bebëza brenda kornizës. Kjo matje bëhet vetëm me kornizën e zgjedhur, pasi të jetë rregulluar në fytyrën tuaj.

## Si e masim ne
Në optikë e masim PD-në me pupilometër dhe e verifikojmë në kornizën tuaj. Matja është falas dhe zgjat vetëm pak minuta. Prova virtuale në faqe ndihmon për zgjedhjen e madhësisë, por nuk e zëvendëson matjen për punimin e lenteve.

> Po porositni online dhe nuk e dini PD-në? Mos u shqetësoni: ju kontaktojmë para se laboratori të fillojë punën.`,
        `Every lens has an optical centre — the point where vision is sharpest. Your PD makes sure that point sits exactly in front of your pupil.

## What PD is
PD (pupillary distance) is the distance between the centres of your two pupils, in millimetres. In adults it is usually between 54 and 74 mm. For reading, the near PD is slightly smaller, because your eyes turn inwards when you look at something close.

## Binocular or monocular
A binocular PD is a single number (e.g. 63 mm). A monocular PD measures each eye separately from the middle of the nose (e.g. 31.5 / 31.5), because faces are rarely perfectly symmetrical. For progressive lenses and stronger prescriptions, monocular PD is the standard.

## Why it matters
When the lens centres don’t line up with your eyes, the lens creates an unwanted prismatic effect. You may not notice it straight away, but it often shows up as tiredness, headaches or a feeling that “something is off” with new glasses.

## Fitting height
For progressives PD alone isn’t enough: we also measure the fitting height — where your pupil sits inside the frame. That can only be measured with your chosen frame, once it has been adjusted to your face.

## How we measure it
In store we measure PD with a pupillometer and verify it on your frame. It’s free and takes just a few minutes. The virtual try-on on our site helps you choose a size, but it isn’t a fitting measurement.

> Ordering online and don’t know your PD? Don’t worry: we’ll contact you before the lab starts work.`,
      ),
      cover: '/images/misc/craft.webp',
      tag: T('Recept i merenja', 'Receta & matjet', 'Prescription & fitting'),
      author: TEAM,
      readMinutes: 4,
      publishedAt: d(19),
      published: true,
    },
    {
      id: 'post-progresive',
      slug: 'lentet-progresive',
      title: T('Progresivna sočiva, jednostavno objašnjena', 'Lentet progresive, të shpjeguara thjesht', 'Progressive lenses, simply explained'),
      excerpt: T(
        'Jedan par za daljinu, ekran i čitanje. Kako rade tri zone, koliko traje navikavanje i kako se bira pravi okvir.',
        'Një palë për larg, për ekran dhe për lexim. Si funksionojnë tri zonat, sa zgjat mësimi dhe si zgjidhet korniza e duhur.',
        'One pair for distance, screens and reading. How the three zones work, how long it takes to adapt and how to choose the right frame.',
      ),
      body: T(
        `Negde oko 40–45. godine većina ljudi primeti da sitna slova postaju teža za čitanje. Progresivna sočiva to rešavaju bez menjanja naočara tokom dana.

## Tri zone u jednom sočivu
- **Gore** — zona za daljinu: put, televizor, lica
- **U sredini** — srednji koridor: ekran, instrument tabla, polica u prodavnici
- **Dole** — zona za blizinu: knjiga, telefon, sitan rad

Prelaz između zona je postepen, bez vidljive linije kao kod bifokalnih sočiva.

## Koliko traje navikavanje
Većina se navikne za nekoliko dana do dve nedelje. Nosite ih redovno od prvog dana, a ne samo povremeno. Okrenite glavu ka onome što želite da vidite, a ne samo oči, a na stepenicama gledajte kroz gornji deo sočiva.

## Okvir je važan
Progresivnim sočivima je potreban okvir dovoljne visine da sve tri zone imaju mesta. Most mora stabilno da stoji — ako okvir klizi, zone se pomeraju sa njim.

## Merenja prave razliku
Monokularni PD, visina montaže i položaj okvira na licu mere se nakon što je okvir podešen. Upravo ta merenja čine progresivni par udobnim.

## Nivoi sočiva
Progresivna sočiva se razlikuju po širini zona i mekoći prelaza. Napredniji dizajni nude šire polje za ekran i čitanje — savetujemo vas prema načinu na koji radite, a ne prema ceni.

> Ako se ni posle dve nedelje ne osećate udobno, dođite u optiku: besplatno proveravamo merenja i podešenost okvira.`,
        `Diku rreth moshës 40–45 vjeç, shumica e njerëzve vërejnë se shkronjat e vogla lexohen më me vështirësi. Lentet progresive e zgjidhin këtë pa pasur nevojë të ndërroni syzet gjatë ditës.

## Tri zona në një lente
- **Sipër** — zona për larg: rruga, televizori, fytyrat
- **Në mes** — korridori i ndërmjetëm: ekrani, paneli i veturës, rafti në dyqan
- **Poshtë** — zona për afër: libri, telefoni, puna e imët

Kalimi mes zonave është gradual, pa vijë të dukshme si te lentet bifokale.

## Sa zgjat përshtatja
Shumica mësohen brenda disa ditëve deri në dy javë. Mbajini rregullisht që nga dita e parë, jo vetëm herë pas here. Kthejeni kokën drejt asaj që doni të shihni, jo vetëm sytë, dhe në shkallë shikoni përmes pjesës së sipërme të lentes.

## Korniza ka rëndësi
Progresivet kanë nevojë për një kornizë me lartësi të mjaftueshme, që të tri zonat të kenë vend. Ura duhet të rrijë e qëndrueshme — nëse korniza rrëshqet, zonat lëvizin bashkë me të.

## Matjet bëjnë diferencën
PD monokulare, lartësia e montimit dhe pozicioni i kornizës në fytyrë maten pasi korniza të jetë rregulluar. Pikërisht këto matje e bëjnë një palë progresive të rehatshme.

## Nivelet e lenteve
Lentet progresive dallojnë në gjerësinë e zonave dhe butësinë e kalimeve. Dizajnet më të avancuara ofrojnë fushë më të gjerë për ekran dhe lexim — ju këshillojmë sipas mënyrës si punoni, jo sipas çmimit.

> Nëse pas dy javësh ende nuk ndiheni rehat, ejani në optikë: i kontrollojmë falas matjet dhe përshtatjen e kornizës.`,
        `Somewhere around 40 to 45, most people notice that small print is getting harder to read. Progressive lenses solve this without swapping glasses throughout the day.

## Three zones in one lens
- **Top** — the distance zone: the road, the TV, faces
- **Middle** — the intermediate corridor: your screen, the dashboard, a shop shelf
- **Bottom** — the near zone: a book, your phone, fine work

The transition between zones is gradual, with no visible line as on bifocals.

## How long it takes to adapt
Most people adjust within a few days to two weeks. Wear them consistently from day one, not just now and then. Turn your head towards what you want to see rather than only your eyes, and on stairs look through the upper part of the lens.

## The frame matters
Progressives need a frame with enough height for all three zones. The bridge must sit steadily — if the frame slips, the zones move with it.

## Measurements make the difference
Monocular PD, fitting height and the frame’s position on your face are measured once the frame has been adjusted. These measurements are what make a progressive pair comfortable.

## Lens levels
Progressive lenses differ in the width of their zones and the softness of their transitions. More advanced designs give a wider field for screens and reading — we advise you based on how you work, not on price.

> Still not comfortable after two weeks? Come back to the store: we’ll recheck the measurements and the frame fit free of charge.`,
      ),
      cover: '/images/lookbook/optical-portrait.webp',
      tag: T('Sočiva', 'Lentet', 'Lenses'),
      author: TEAM,
      readMinutes: 6,
      publishedAt: d(33),
      published: true,
    },
    {
      id: 'post-drita-blu',
      slug: 'lentet-per-ekran-drita-blu',
      title: T(
        'Sočiva za ekran: šta filter plavog svetla radi — a šta ne',
        'Lentet për ekran: çfarë bën filtri i dritës blu — dhe çfarë jo',
        'Screen lenses: what a blue-light filter does — and doesn’t do',
      ),
      excerpt: T(
        'Filteri plavog svetla su svuda, ali obećanja često idu dalje od onoga što mogu da urade. Evo iskrenog pogleda.',
        'Filtrat e dritës blu janë kudo, por premtimet shpesh shkojnë përtej asaj që mund të bëjnë. Ja një vështrim i sinqertë.',
        'Blue-light filters are everywhere, but the promises often go beyond what they can do. Here’s an honest look.',
      ),
      body: T(
        `Mnogi od nas provode osam i više sati ispred ekrana, pa ne čudi što su „sočiva za plavo svetlo“ jedno od najčešćih pitanja u optici. Evo našeg iskrenog odgovora.

## Šta filter radi
Filter plavog svetla reflektuje ili upija deo plavo-ljubičastog svetla. Uz antirefleksni sloj može da smanji odsjaje sa ekrana i rasvete, a nekim ljudima slika deluje nešto mekše. Sočivo može imati blagi plavi odsjaj ili blago topao ton.

## Šta ne radi
Nema čvrstih dokaza da filter plavog svetla sprečava digitalni zamor očiju ili štiti od očnih bolesti. Zamor ispred ekrana uglavnom dolazi od dugog fokusiranja na istu udaljenost i ređeg treptanja — a ne od plavog svetla ekrana.

## Šta zaista pomaže
- Tačan recept za udaljenost ekrana — često upravo to nedostaje
- Kvalitetan antirefleksni sloj za manje odsjaja
- Pravilo 20-20-20: svakih 20 minuta pogledajte nešto udaljeno 6 metara, 20 sekundi
- Ekran malo ispod nivoa očiju, na udaljenosti ispružene ruke
- Dobro osvetljenje prostorije, bez jakog svetla iza ekrana

## Kada se sočivo za ekran isplati
Ako dugo radite za računarom, sočivo optimizovano za srednju udaljenost — sa filterom ili bez njega — može učiniti dan udobnijim. Savetovaćemo vas kada znamo koliko vam je ekran udaljen i kako radite.

> Ako su vam oči stalno umorne, ne rešavajte to samo filterom — zakažite pregled vida.`,
        `Shumë prej nesh kalojnë tetë orë e më shumë para ekraneve, prandaj nuk është çudi që “lentet për dritën blu” janë ndër pyetjet më të shpeshta në optikë. Ja përgjigjja jonë e sinqertë.

## Çfarë bën filtri
Filtri i dritës blu reflekton ose thith një pjesë të dritës blu-vjollcë. Bashkë me shtresën antirefleks, mund t’i ulë reflektimet nga ekrani dhe ndriçimi, dhe disa njerëz e përjetojnë pamjen pak më të butë. Lentja mund të ketë një reflektim të lehtë blu ose një ton paksa të ngrohtë.

## Çfarë nuk bën
Nuk ka prova të forta se filtri i dritës blu e parandalon lodhjen digjitale të syve ose që mbron nga sëmundjet e syrit. Lodhja para ekranit vjen kryesisht nga fokusimi i gjatë në të njëjtën distancë dhe nga pulitja më e rrallë e syve — jo nga drita blu e ekranit.

## Çfarë ndihmon vërtet
- Receta e saktë për distancën e ekranit — shpesh pikërisht kjo mungon
- Antirefleks cilësor, për më pak reflektime
- Rregulla 20-20-20: çdo 20 minuta shikoni diçka 6 metra larg, për 20 sekonda
- Ekrani pak më poshtë se niveli i syve, rreth një krah larg
- Ndriçim i mirë në dhomë, pa dritë të fortë pas ekranit

## Kur ia vlen një lente për ekran
Nëse punoni shumë orë në kompjuter, një lente e optimizuar për distancën e ndërmjetme — me ose pa filtër blu — mund ta bëjë ditën më të rehatshme. Ju këshillojmë pasi të dimë sa larg e keni ekranin dhe si punoni.

> Nëse sytë ju lodhen vazhdimisht, mos e zgjidhni vetëm me një filtër — rezervoni një kontroll të syve.`,
        `Many of us spend eight hours or more in front of screens, so it’s no surprise that “blue-light lenses” are one of the most common questions we hear. Here is our honest answer.

## What the filter does
A blue-light filter reflects or absorbs part of the blue-violet light. Combined with an anti-reflective coating it can reduce reflections from screens and lighting, and some people find the view a little softer. The lens may show a faint blue reflection or a slightly warm tint.

## What it doesn’t do
There is no strong evidence that blue-light filters prevent digital eye strain or protect against eye disease. Screen fatigue comes mostly from focusing at one distance for long periods and blinking less often — not from the blue light of the screen.

## What really helps
- An accurate prescription for your screen distance — often exactly what’s missing
- A quality anti-reflective coating for fewer reflections
- The 20-20-20 rule: every 20 minutes, look at something 6 metres away for 20 seconds
- A screen slightly below eye level, about an arm’s length away
- Good room lighting, without bright light behind the screen

## When a screen lens is worth it
If you work long hours at a computer, a lens optimised for intermediate distance — with or without a blue filter — can make the day more comfortable. We’ll advise you once we know how far away your screen is and how you work.

> If your eyes are tired all the time, don’t solve it with a filter alone — book an eye exam.`,
      ),
      cover: '/images/misc/lens.webp',
      tag: T('Sočiva', 'Lentet', 'Lenses'),
      author: TEAM,
      readMinutes: 5,
      publishedAt: d(47),
      published: true,
    },
    {
      id: 'post-polarizim',
      slug: 'polarizim-apo-uv400',
      title: T('Naočare za sunce: polarizovana ili UV400?', 'Syze dielli: polarizim apo UV400?', 'Sunglasses: polarised or UV400?'),
      excerpt: T(
        'Koliko je sočivo tamno ne govori koliko vas štiti. Objašnjavamo razliku između UV zaštite i polarizacije — i kada vam treba koja.',
        'Sa e errët është lentja nuk tregon sa ju mbron. Shpjegojmë dallimin mes mbrojtjes UV dhe polarizimit — dhe kur ju duhet secila.',
        'How dark a lens is says nothing about how well it protects you. We explain the difference between UV protection and polarisation — and when you need each.',
      ),
      body: T(
        `Kod naočara za sunce često se govori o „UV400“ i „polarizaciji“ kao da su ista stvar. Nisu — a razlika je važna.

## UV400 — zaštita koja se ne vidi
UV400 znači da sočivo blokira ultraljubičaste zrake do 400 nanometara, dakle UVA i UVB. To je zaštita za zdravlje očiju i ne zavisi od boje: i svetlo sočivo može imati UV400, dok tamno sočivo bez UV zaštite može biti gore nego nikakvo, jer se zenica iza njega širi.

## Polarizacija — protiv odsjaja
Svetlost koja se odbija od vode, mokrog puta ili snega postaje polarizovana i stvara zaslepljujući odsjaj. Polarizovana sočiva blokiraju taj odsjaj, pa su boje čistije, a oči se manje zamaraju. Polarizacija ne zamenjuje UV zaštitu — sve naše polarizovane naočare imaju i UV400.

## Kada se polarizacija isplati
- Vožnja tokom dana, naročito po mokrom putu
- Pored vode: more, jezero, pecanje
- Dugi dani napolju i u planini

Jedno ograničenje: kroz polarizovana sočiva neki LCD ekrani (telefon, instrument tabla) pod određenim uglom mogu delovati tamnije.

## Kategorije filtera
Sunčana sočiva se razvrstavaju od 0 do 4. Većina naočara za svaki dan je u kategoriji 2 ili 3. Kategorija 4 je za veoma jako sunce na planini ili moru i nije dozvoljena za vožnju.

## I sa dioptrijom
Većinu modela naočara za sunce izrađujemo i sa dioptrijskim sočivima, sa polarizacijom ili bez nje, u našoj laboratoriji.

> Kada birate naočare za sunce, pitajte za UV zaštitu i kategoriju filtera — ne samo za boju.`,
        `Te syzet e diellit flitet shpesh për “UV400” dhe “polarizim” sikur të ishin e njëjta gjë. Nuk janë — dhe dallimi ka rëndësi.

## UV400 — mbrojtja që nuk shihet
UV400 do të thotë se lentja bllokon rrezet ultravjollcë deri në 400 nanometra, pra UVA dhe UVB. Kjo është mbrojtja për shëndetin e syve dhe nuk varet nga ngjyra: edhe një lente e çelët mund të ketë UV400, ndërsa një lente e errët pa mbrojtje UV mund të jetë më e keqe se asnjë lente, sepse bebëza pas saj zgjerohet.

## Polarizimi — kundër shkëlqimit
Drita që reflektohet nga uji, rruga e lagur ose bora polarizohet dhe krijon shkëlqim verbues. Lentet e polarizuara e bllokojnë këtë shkëlqim, prandaj ngjyrat duken më të pastra dhe sytë lodhen më pak. Polarizimi nuk e zëvendëson mbrojtjen UV — të gjitha syzet tona të polarizuara kanë edhe UV400.

## Kur ia vlen polarizimi
- Vozitja gjatë ditës, sidomos në rrugë të lagura
- Pranë ujit: deti, liqeni, peshkimi
- Ditë të gjata jashtë dhe në mal

Një kufizim: përmes lenteve të polarizuara, disa ekrane LCD (telefoni, paneli i veturës) mund të duken më të errëta në kënde të caktuara.

## Kategoritë e filtrit
Lentet e diellit klasifikohen nga 0 deri në 4. Shumica e syzeve të përditshme janë në kategorinë 2 ose 3. Kategoria 4 është për diell shumë të fortë në mal ose në det dhe nuk lejohet për vozitje.

## Edhe me dioptri
Shumicën e modeleve të diellit i punojmë edhe me lente me recetë, me ose pa polarizim, në laboratorin tonë.

> Kur zgjidhni syze dielli, pyetni për mbrojtjen UV dhe kategorinë e filtrit — jo vetëm për ngjyrën.`,
        `With sunglasses, “UV400” and “polarised” are often used as if they meant the same thing. They don’t — and the difference matters.

## UV400 — the protection you can’t see
UV400 means the lens blocks ultraviolet rays up to 400 nanometres, so both UVA and UVB. This is the protection that matters for eye health, and it has nothing to do with colour: a light lens can be UV400, while a dark lens without UV protection can be worse than none, because your pupil widens behind it.

## Polarisation — against glare
Light reflected off water, wet roads or snow becomes polarised and creates dazzling glare. Polarised lenses block that glare, so colours look cleaner and your eyes tire less. Polarisation doesn’t replace UV protection — every polarised pair we sell is also UV400.

## When polarisation is worth it
- Driving in daylight, especially on wet roads
- Near water: the sea, lakes, fishing
- Long days outdoors and in the mountains

One limitation: through polarised lenses some LCD screens (your phone, the dashboard) can look darker at certain angles.

## Filter categories
Sun lenses are graded from 0 to 4. Most everyday sunglasses are category 2 or 3. Category 4 is for very strong sun in the mountains or at sea and is not suitable for driving.

## With your prescription, too
We can make most of our sunglasses with prescription lenses, polarised or not, in our own lab.

> When choosing sunglasses, ask about UV protection and the filter category — not just the colour.`,
      ),
      cover: '/images/lookbook/sun-portrait.webp',
      tag: T('Naočare za sunce', 'Syze dielli', 'Sunglasses'),
      author: TEAM,
      readMinutes: 5,
      publishedAt: d(62),
      published: true,
    },
    {
      id: 'post-pastrimi',
      slug: 'si-te-pastroni-syzet',
      title: T('Kako da čistite i čuvate naočare', 'Si t’i pastroni dhe t’i ruani syzet', 'How to clean and store your glasses'),
      excerpt: T(
        'Nekoliko malih navika koje čuvaju sočiva bez ogrebotina i okvir u formi — i tri greške koje prave skoro svi.',
        'Disa zakone të vogla që i mbajnë lentet pa gërvishtje dhe kornizën në formë — dhe tri gabime që i bëjnë pothuajse të gjithë.',
        'A few small habits that keep lenses scratch-free and frames in shape — and three mistakes almost everyone makes.',
      ),
      body: T(
        `Savremena sočiva imaju antirefleksne i zaštitne slojeve koji ih čine jasnijim i otpornijim — ali samo ako se o njima pravilno brinete.

## Čišćenje u četiri koraka
1. Isperite naočare pod mlakom vodom da uklonite prašinu
2. Nanesite kap blagog sapuna bez kreme ili sprej za sočiva
3. Ponovo isperite i lagano otresite vodu
4. Osušite čistom krpicom od mikrofibera

## Tri najčešće greške
- **Čišćenje na suvo** majicom, papirnom maramicom ili salvetom — prašina deluje kao šmirgl papir
- **Alkohol, aceton i sredstva za domaćinstvo** — oštećuju slojeve i acetat
- **Vrela voda** — može da napravi sitne pukotine u sloju

## Čuvanje
Kada ih ne nosite, stavite naočare u tvrdu futrolu. Ako ih ostavljate na kratko, spustite ih sa sočivima nagore. Ne ostavljajte ih u autu na suncu: toplota može da deformiše okvir i ošteti slojeve.

## Stavljanje i skidanje
Skidajte naočare objema rukama. Skidanje jednom rukom rasteže drške na jednu stranu, pa okvir s vremenom počne da stoji iskrivljeno.

## Podešavanje u optici
Ako okvir klizi, steže ili stoji nakrivo, ne savijajte ga sami — naročito acetat, koji se zagreva kontrolisano. Podešavanje u našoj optici je brzo, a uz Negu+ i besplatno.

> Krpicu od mikrofibera povremeno operite vodom i sapunom bez omekšivača — prljava krpica samo razmazuje masnoću.`,
        `Lentet moderne kanë shtresa antirefleks dhe mbrojtëse që i bëjnë më të qarta dhe më rezistente — por vetëm nëse kujdeseni për to si duhet.

## Pastrimi në katër hapa
1. Shpëlajini syzet nën ujë të vakët për ta larguar pluhurin
2. Përdorni një pikë sapuni të butë pa krem ose sprej për lente
3. Shpëlajini sërish dhe shkundeni lehtë ujin
4. Thajini me një leckë mikrofibre të pastër

## Tri gabimet më të shpeshta
- **Pastrimi në të thatë** me bluzë, shami letre ose pecetë — pluhuri vepron si letër zmerile
- **Alkooli, acetoni dhe pastruesit e shtëpisë** — dëmtojnë shtresat dhe acetatin
- **Uji i nxehtë** — mund të krijojë plasaritje të imëta në shtresë

## Ruajtja
Kur nuk i mbani, vendosini në një kuti të fortë. Nëse i lini për pak kohë, lërini me lentet nga lart. Mos i lini në veturë nën diell: nxehtësia mund ta deformojë kornizën dhe t’i dëmtojë shtresat.

## Vendosja dhe heqja
Hiqini syzet me të dyja duart. Kur i hiqni me një dorë, bishtat hapen nga njëra anë dhe me kohë korniza fillon të rrijë shtrembër.

## Rregullimi në optikë
Nëse korniza rrëshqet, ju shtrëngon ose rri shtrembër, mos e përkulni vetë — sidomos acetatin, që duhet ngrohur në mënyrë të kontrolluar. Rregullimi në optikën tonë është i shpejtë, dhe me Kujdes+ është falas.

> Leckën e mikrofibrës lajeni herë pas here me ujë dhe sapun pa zbutës — një leckë e ndotur vetëm e shpërndan yndyrën.`,
        `Modern lenses have anti-reflective and protective coatings that make them clearer and tougher — but only if you look after them properly.

## Cleaning in four steps
1. Rinse your glasses under lukewarm water to remove dust
2. Use a drop of mild, lotion-free soap or a lens spray
3. Rinse again and gently shake off the water
4. Dry with a clean microfibre cloth

## The three most common mistakes
- **Dry wiping** with a T-shirt, tissue or napkin — dust acts like sandpaper
- **Alcohol, acetone and household cleaners** — they damage coatings and acetate
- **Hot water** — it can cause fine cracks in the coating

## Storage
When you’re not wearing them, keep your glasses in a hard case. If you put them down for a moment, rest them lenses up. Never leave them in a car in the sun: heat can warp the frame and damage the coatings.

## Putting them on and taking them off
Use both hands. Taking glasses off with one hand stretches the temples to one side, and over time the frame starts to sit crooked.

## Adjustments in store
If the frame slips, pinches or sits crooked, don’t bend it yourself — especially acetate, which needs controlled heating. Adjustments in our store are quick, and free with Care+.

> Wash your microfibre cloth now and then with soap and water, without fabric softener — a dirty cloth just spreads the grease around.`,
      ),
      cover: '/images/misc/contact.webp',
      tag: T('Nega', 'Kujdesi', 'Care'),
      author: TEAM,
      readMinutes: 4,
      publishedAt: d(78),
      published: true,
    },
    {
      id: 'post-kontrolli',
      slug: 'sa-shpesh-kontrolli-i-syve',
      title: T(
        'Koliko često proveravati vid — kod dece i odraslih',
        'Sa shpesh duhet kontrolluar shikimi — te fëmijët dhe te të rriturit',
        'How often should you have an eye exam — children and adults',
      ),
      excerpt: T(
        'Vid se menja polako, pa to često i ne primetimo. Jednostavan vodič kada da planirate sledeći pregled.',
        'Shikimi ndryshon ngadalë, prandaj shpesh nuk e vërejmë. Një orientim i thjeshtë se kur ta planifikoni kontrollin e radhës.',
        'Vision changes slowly, so we often don’t notice. A simple guide to when to plan your next eye exam.',
      ),
      body: T(
        `Vid se retko menja naglo. Mnogo češće se menja polako, a mozak se tako dobro prilagođava da to ne primećujemo — sve dok nam jednog dana saobraćajni znakovi ne deluju dalje nego ranije.

## Deca
Kod dece se vid brzo razvija, a problemi se često ne pokazuju: dete misli da svi vide isto kao ono. Kao opšta smernica, prvi pregled se preporučuje pre polaska u školu, a zatim jednom godišnje — ili prema savetu stručnjaka.

## Znaci kod dece
- Prilazi preblizu knjizi, telefonu ili televizoru
- Često trlja oči ili zatvara jedno oko da bi bolje video
- Izbegava čitanje ili gubi red dok čita
- Žali se na glavobolju posle škole

## Odrasli
Za odrasle bez tegoba, kao opšta smernica, dobar izbor je pregled na svakih jednu do dve godine. Posle 60. godine, ili ako imate dijabetes, povišen pritisak ili očne bolesti u porodici, pregled se preporučuje svake godine.

## Ne čekajte rok ako
- Vidite mutnije na daljinu ili na blizinu nego ranije
- Imate česte glavobolje ili vam se oči brzo zamaraju
- Noćna vožnja vam je postala teža

## Nagle promene
Ako se vid naglo promeni, ako vidite bljeskove svetla ili senke, ili osećate bol u oku, ne čekajte redovan termin — odmah potražite medicinsku pomoć.

## Šta da ponesete
Naočare koje nosite, poslednji recept i kratku listu situacija u kojima ne vidite dobro: ekran, vožnja, čitanje.`,
        `Shikimi rrallë ndryshon papritur. Shumë më shpesh ndryshon ngadalë, dhe truri përshtatet aq mirë sa nuk e vërejmë — derisa një ditë tabelat e rrugës duken më larg se më parë.

## Fëmijët
Te fëmijët shikimi zhvillohet shpejt dhe problemet shpesh nuk duken: fëmija mendon se kështu shohin të gjithë. Si orientim i përgjithshëm, kontrolli i parë rekomandohet para fillimit të shkollës, e më pas një herë në vit — ose sipas këshillës së profesionistit.

## Shenjat te fëmijët
- Afrohet shumë te libri, telefoni ose televizori
- I fërkon sytë shpesh ose mbyll njërin sy për të parë më mirë
- E shmang leximin ose e humb rreshtin gjatë leximit
- Ankohet për dhimbje koke pas shkollës

## Të rriturit
Për të rriturit pa ankesa, si orientim i përgjithshëm, një kontroll çdo një deri në dy vjet është zgjedhje e mirë. Pas moshës 60 vjeç, ose nëse keni diabet, tension të lartë apo sëmundje të syve në familje, kontrolli rekomandohet çdo vit.

## Mos e prisni afatin nëse
- Shihni më turbull larg ose afër se më parë
- Keni dhimbje koke të shpeshta ose sytë ju lodhen shpejt
- Vozitja natën ju është bërë më e vështirë

## Ndryshimet e papritura
Nëse shikimi ju ndryshon papritur, shihni shkrepje drite ose hije, apo keni dhimbje në sy, mos prisni për termin të rregullt — kërkoni menjëherë ndihmë mjekësore.

## Çfarë të merrni me vete
Syzet që përdorni, recetën e fundit dhe një listë të shkurtër të situatave ku nuk shihni mirë: ekrani, vozitja, leximi.`,
        `Vision rarely changes suddenly. Far more often it changes slowly, and the brain adapts so well that we don’t notice — until one day the road signs seem further away than they used to.

## Children
Children’s vision develops quickly, and problems often go unnoticed: a child assumes everyone sees the way they do. As a general guide, a first exam is recommended before starting school, and then once a year — or as a professional advises.

## Signs to watch for in children
- Holding books or phones very close, or sitting right up to the TV
- Rubbing their eyes often or closing one eye to see better
- Avoiding reading or losing their place while reading
- Complaining of headaches after school

## Adults
For adults without symptoms, an exam every one to two years is a good general rule. After 60, or if you have diabetes, high blood pressure or a family history of eye disease, a yearly exam is recommended.

## Don’t wait for the date if
- Things look blurrier at distance or close up than before
- You get frequent headaches or your eyes tire quickly
- Driving at night has become harder

## Sudden changes
If your vision changes suddenly, you see flashes of light or shadows, or you have pain in the eye, don’t wait for a routine appointment — seek medical help straight away.

## What to bring
The glasses you wear, your latest prescription and a short list of situations where you don’t see well: screens, driving, reading.`,
      ),
      cover: '/images/s/kontrolli.webp',
      tag: T('Pregled vida', 'Kontrolli i syve', 'Eye exams'),
      author: TEAM,
      readMinutes: 5,
      publishedAt: d(94),
      published: true,
    },
    {
      id: 'post-forma',
      slug: 'korniza-sipas-fytyres',
      title: T('Kako da izaberete okvir prema licu', 'Si ta zgjidhni kornizën sipas fytyrës suaj', 'How to choose a frame for your face'),
      excerpt: T(
        'Oblik lica je polazna tačka, a ne pravilo. Kako uskladiti oblik, veličinu i udobnost — i gde pomaže virtuelna proba.',
        'Forma e fytyrës është pikënisje, jo rregull. Si t’i përputhni formën, madhësinë dhe rehatinë — dhe ku ndihmon prova virtuale.',
        'Face shape is a starting point, not a rule. How to balance shape, size and comfort — and where the virtual try-on helps.',
      ),
      body: T(
        `Staro pravilo kaže: kontrast. Okruglom licu ugaoni okviri, ugaonom licu okrugli. To je dobra polazna tačka — ali prave naočare su one koje vam se dopadaju i u kojima vam je udobno.

## Polazna tačka prema obliku
- **Okruglo lice** — pravougaoni ili kvadratni okviri koji dodaju linije
- **Kvadratno lice** — okrugli, ovalni ili „panto“ okviri koji omekšavaju vilicu
- **Ovalno lice** — većina oblika; pazite samo na veličinu
- **Lice u obliku srca** — okviri lakši u gornjem delu ili blagi „cat-eye“ oblici

## Veličina je na prvom mestu
Na drški okvira piše tri broja, npr. 52□18 145: širina sočiva, most i dužina drške, u milimetrima. Uporedite ih sa naočarima koje vam danas dobro stoje. Oči treba da budu otprilike na sredini sočiva, a okvir ne bi trebalo mnogo da prelazi liniju lica.

## Most i udobnost
Most određuje koliko stabilno okvir stoji. Ako vam naočare klize ili ostavljaju tragove, potražite model sa drugačijim mostom ili sa podesivim jastučićima za nos.

## Acetat ili metal
Acetat donosi boju i karakter i topao je na dodir; titan je izuzetno lagan i odličan za celodnevno nošenje. Kod jačih dioptrija manji okviri nose tanja sočiva.

## Probajte virtuelno, odlučite u optici
Uz [virtuelnu probu](/provo-virtualisht) možete od kuće brzo da uporedite oblike i boje — kamera se obrađuje samo u vašem pregledaču. Konačnu odluku donesite kada okvir probate i kada ga podesimo prema vašem licu.

> Kada dolazite da birate, ponesite naočare koje sada nosite — mnogo nam govore o veličini koja vam odgovara.`,
        `Rregulla e vjetër thotë: kontrast. Fytyrat e rrumbullakëta me korniza këndore, fytyrat këndore me korniza të rrumbullakëta. Është një pikënisje e mirë — por syzet e duhura janë ato që ju pëlqejnë dhe ju rrinë rehat.

## Pikënisja sipas formës
- **Fytyrë e rrumbullakët** — korniza drejtkëndore ose katrore që shtojnë linja
- **Fytyrë katrore** — korniza të rrumbullakëta, ovale ose “panto” që e zbusin nofullën
- **Fytyrë ovale** — shumica e formave; kujdes vetëm me madhësinë
- **Fytyrë në formë zemre** — korniza më të lehta në pjesën e sipërme ose forma të buta “cat-eye”

## Madhësia vjen e para
Në bishtin e kornizës shkruhen tre numra, p.sh. 52□18 145: gjerësia e lentes, ura dhe gjatësia e bishtit, në milimetra. Krahasojini me syzet që ju rrinë mirë sot. Sytë duhet të jenë afërsisht në mes të lentes, dhe korniza nuk duhet të dalë shumë përtej linjës së fytyrës.

## Ura dhe rehatia
Ura vendos sa e qëndrueshme rri korniza. Nëse syzet ju rrëshqasin ose ju lënë shenja, kërkoni një model me urë tjetër ose me jastëkë të rregullueshëm të hundës.

## Acetat apo metal
Acetati sjell ngjyrë dhe karakter dhe është i ngrohtë në prekje; titani është jashtëzakonisht i lehtë dhe i shkëlqyer për mbajtje gjithë ditën. Për recetat më të forta, kornizat më të vogla mbajnë lente më të holla.

## Provojeni virtualisht, vendosni në optikë
Me [provën virtuale](/provo-virtualisht) mund të krahasoni shpejt forma dhe ngjyra nga shtëpia — kamera përpunohet vetëm në shfletuesin tuaj. Vendimin përfundimtar merreni pasi ta keni provuar kornizën dhe ta kemi rregulluar sipas fytyrës suaj.

> Kur vini për të zgjedhur, merrni me vete syzet që mbani tani — na tregojnë shumë për madhësinë që ju përshtatet.`,
        `The old rule says: contrast. Round faces with angular frames, angular faces with round ones. It’s a good starting point — but the right glasses are the ones you like and feel comfortable in.

## A starting point by face shape
- **Round face** — rectangular or square frames that add lines
- **Square face** — round, oval or “panto” frames that soften the jaw
- **Oval face** — most shapes work; just watch the size
- **Heart-shaped face** — frames lighter at the top or soft “cat-eye” shapes

## Size comes first
The temple of a frame carries three numbers, e.g. 52□18 145: lens width, bridge and temple length, in millimetres. Compare them with glasses that fit you well today. Your eyes should sit roughly in the middle of each lens, and the frame shouldn’t extend much beyond the sides of your face.

## Bridge and comfort
The bridge decides how steadily a frame sits. If your glasses slide down or leave marks, look for a different bridge or adjustable nose pads.

## Acetate or metal
Acetate brings colour and character and feels warm to the touch; titanium is extremely light and ideal for all-day wear. With stronger prescriptions, smaller frames hold thinner lenses.

## Try virtually, decide in store
With the [virtual try-on](/provo-virtualisht) you can quickly compare shapes and colours from home — the camera is processed only in your browser. Make the final decision once you’ve tried the frame on and we’ve adjusted it to your face.

> When you come in to choose, bring the glasses you wear now — they tell us a lot about the size that suits you.`,
      ),
      cover: '/images/lookbook/atelier-optical.webp',
      tag: T('Stil', 'Stili', 'Style'),
      author: TEAM,
      readMinutes: 6,
      publishedAt: d(112),
      published: true,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Coupons (legacy v1 list — the pricing engine uses `discounts`)      */
/* ------------------------------------------------------------------ */
export function buildCoupons(now = new Date()): Coupon[] {
  return [
    { id: 'cp-1', code: 'MIFTARI10', type: 'percent', value: 10, minTotal: 100, active: true, uses: 37, description: 'Mirëseardhje — 10% për porosi nga 100 €' },
    { id: 'cp-2', code: 'MIRESEVINI', type: 'fixed', value: 5, minTotal: 50, active: true, uses: 21, description: '5 € zbritje për porosinë e parë nga 50 €' },
    {
      id: 'cp-3',
      code: 'VERA2026',
      type: 'percent',
      value: 15,
      minTotal: 80,
      active: true,
      uses: 64,
      expiresAt: new Date(now.getTime() - 38 * 86400000).toISOString(),
      description: 'Vera 2026 — 15% për syze dielli (ka skaduar)',
    },
  ];
}
