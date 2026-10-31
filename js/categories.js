/* Arkitektura e katalogut (raporti Raundi 02, f. 06–08): grupe → nënkategori.
 *
 * Kjo është struktura bazë; CMS-i mund ta zëvendësojë me menunë "Kategoritë" (Përmbajtja → Menutë).
 * Çdo nënkategori ka një destinacion: kur ka produkte (`cat` = kategoria e dyqanit), hap katalogun; kur ende nuk
 * ka, hap faqen e saj me kërkesë për ofertë dhe lidhjet e grupit — asnjë kategori pa destinacion.
 * `builder: true` = pjesë që zgjidhen në konfiguruesin 3D të PC‑së.
 */
window.CATEGORY_GROUPS = [
  {
    slug: "laptope-kompjutere", name: "Laptopë & kompjuterë", nav: "Laptopë & PC", icon: "laptop",
    subs: [
      { slug: "laptope", name: "Laptopë", cat: "Laptopë" },
      { slug: "desktop", name: "Desktop", builder: true },
      { slug: "all-in-one", name: "All-in-One" },
      { slug: "mini-pc", name: "Mini PC" },
      { slug: "workstation", name: "Workstation", builder: true },
      { slug: "pc-gaming", name: "PC gaming", builder: true },
    ],
  },
  {
    slug: "komponente-pc", name: "Komponentë PC", nav: "Komponentë", icon: "cpu",
    subs: [
      { slug: "procesore", name: "Procesorë", cat: "Procesorë" },
      { slug: "kartela-grafike", name: "Kartela grafike", cat: "Kartela grafike" },
      { slug: "pllaka-ame", name: "Pllaka amë", builder: true },
      { slug: "ram", name: "RAM", builder: true },
      { slug: "ssd", name: "SSD", builder: true },
      { slug: "hdd", name: "HDD" },
      { slug: "furnizues-rryme", name: "Furnizues rryme (PSU)", builder: true },
      { slug: "kasa", name: "Kasa", builder: true },
      { slug: "ftohje-ventilatore", name: "Ftohje & ventilatorë", builder: true },
    ],
  },
  {
    slug: "monitore-imazh", name: "Monitorë & imazh", nav: "Monitorë", icon: "monitor",
    subs: [
      { slug: "monitore", name: "Monitorë" },
      { slug: "mbajtese-monitori", name: "Mbajtëse" },
      { slug: "projektore", name: "Projektorë" },
      { slug: "ekrane-prezantimi", name: "Ekrane prezantimi" },
      { slug: "aksesore-monitori", name: "Aksesorë monitori" },
    ],
  },
  {
    slug: "periferike-gaming", name: "Periferikë & gaming", nav: "Maus & tastiera", icon: "keyboard",
    subs: [
      { slug: "maus", name: "Maus" },
      { slug: "tastiera", name: "Tastiera" },
      { slug: "mousepad", name: "Mousepad" },
      { slug: "kontrollues", name: "Kontrollues" },
      { slug: "volante", name: "Volantë" },
      { slug: "karrige-tavolina-gaming", name: "Karrige & tavolina gaming" },
    ],
  },
  {
    slug: "audio-video", name: "Audio & video", nav: "Audio & video", icon: "headphones",
    subs: [
      { slug: "kufje", name: "Kufje" },
      { slug: "altoparlante", name: "Altoparlantë" },
      { slug: "mikrofone", name: "Mikrofonë" },
      { slug: "webcam", name: "Webcam" },
      { slug: "pajisje-streaming", name: "Pajisje streaming" },
    ],
  },
  {
    slug: "rrjet-ruajtje", name: "Rrjet & ruajtje", nav: "Rrjet & ruajtje", icon: "network",
    subs: [
      { slug: "routere", name: "Routerë" },
      { slug: "switch", name: "Switch" },
      { slug: "access-point", name: "Access point" },
      { slug: "rrjet-mesh", name: "Rrjet mesh" },
      { slug: "nas", name: "NAS" },
      { slug: "disqe-te-jashtme", name: "Disqe të jashtme" },
      { slug: "usb", name: "USB" },
    ],
  },
  {
    slug: "printim-zyre", name: "Printim & zyrë", nav: "Printim", icon: "printer",
    subs: [
      { slug: "printere", name: "Printerë" },
      { slug: "skanere", name: "Skanerë" },
      { slug: "multifunksionale", name: "Multifunksionale" },
      { slug: "toner-boje", name: "Toner & bojë" },
      { slug: "leter-aksesore", name: "Letër & aksesorë" },
    ],
  },
  {
    slug: "telefona-tablete", name: "Telefona & tabletë", nav: "Telefona & tabletë", icon: "tablet-smartphone",
    subs: [
      { slug: "telefona", name: "Telefona" },
      { slug: "tablete", name: "Tabletë" },
      { slug: "ore-te-mencura", name: "Orë të mençura" },
      { slug: "mbeshtjellese", name: "Mbështjellëse" },
      { slug: "mbrojtese-ekrani", name: "Mbrojtëse ekrani" },
    ],
  },
  {
    slug: "aksesore-energji", name: "Aksesorë & energji", nav: "Aksesorë", icon: "cable",
    subs: [
      { slug: "kabllo", name: "Kabllo" },
      { slug: "adaptere", name: "Adapterë" },
      { slug: "hub-dock", name: "Hub & dock" },
      { slug: "karikues", name: "Karikues" },
      { slug: "power-bank", name: "Power bank" },
      { slug: "ups", name: "UPS" },
      { slug: "canta", name: "Çanta" },
      { slug: "pastrim", name: "Pastrim" },
    ],
  },
];

/* Shiriti "Gjej kategorinë tënde" (f. 08): hyrje të shpejta, të renditura sipas kërkesës. */
window.CATEGORY_STRIP = [
  { name: "Laptopë", icon: "laptop", href: "#/kategoria/laptope" },
  { name: "Kompjuterë", icon: "pc-case", href: "#/kategoria/desktop" },
  { name: "Monitorë", icon: "monitor", href: "#/kategoria/monitore-imazh" },
  { name: "Komponentë PC", icon: "cpu", href: "#/kategoria/komponente-pc" },
  { name: "Maus & tastiera", icon: "keyboard", href: "#/kategoria/periferike-gaming" },
  { name: "Audio & video", icon: "headphones", href: "#/kategoria/audio-video" },
  { name: "Rrjet & ruajtje", icon: "network", href: "#/kategoria/rrjet-ruajtje" },
  { name: "Printim", icon: "printer", href: "#/kategoria/printim-zyre" },
  { name: "Telefona & tabletë", icon: "tablet-smartphone", href: "#/kategoria/telefona-tablete" },
  { name: "Aksesorë", icon: "cable", href: "#/kategoria/aksesore-energji" },
];
