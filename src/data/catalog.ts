import { unsquashableProducts } from './productsUnsquashable';

export type ProductType = 'Racket' | 'Balls' | 'Wear' | 'Bag' | 'Accessory' | 'String' | 'Grip' | 'Shoe';
export type RacketHeadShape = 'Teardrop' | 'Round' | 'Hybrid';
export type BalanceProfile = 'Head-heavy' | 'Balanced' | 'Head-light';

export type CategorySlug = string;

export type Category = {
  slug: CategorySlug;
  name: string;
  description: string;
  heroTitle: string;
  heroCopy: string;
  accent: string;
  focus: string[];
};

export type Brand = {
  name: string;
  categorySlugs: CategorySlug[];
  note: string;
};

const supplierSourceByBrand: Record<string, string> = {
  unsquashable: 'Double Yellow Squash - https://www.doubleyellowsquash.com/',
  karakal: 'Karakal - https://www.karakal.com/',
  tecnifibre: 'Tecnifibre - https://www.tecnifibre.com/',
  dunlop: 'Dunlop Sports - https://www.dunlopsports.com/',
  head: 'HEAD - https://www.head.com/',
};

export type Product = {
  sku: string;
  name: string;
  categorySlug: CategorySlug;
  type: ProductType;
  brand: string;
  price?: string;
  priceEur?: number;
  originalPriceEur?: number;
  salePriceEur?: number;
  details: string;
  detailsBg?: string;
  description?: string;
  descriptionBg?: string;
  badges: string[];
  imageUrl: string;
  supplierSource?: string;
  stock?: number;
  nameBg?: string;
  costEur?: number;
  color?: string;
  headShape?: RacketHeadShape;
  balance?: BalanceProfile;
  weightGrams?: number;
  attributes?: Record<string, string>;
};

export function getProductSupplierSource(product: Pick<Product, 'brand' | 'imageUrl' | 'supplierSource'>) {
  if (product.supplierSource?.trim()) {
    return product.supplierSource.trim();
  }

  if (product.imageUrl.includes('doubleyellowsquash.com')) {
    return supplierSourceByBrand.unsquashable;
  }

  return supplierSourceByBrand[product.brand.toLowerCase()] ?? 'Добави източник за поръчка';
}

function mapUnsquashableToSportCatalog() {
  return unsquashableProducts.map((item) => ({
    sku: item.sku,
    name: item.name,
    nameBg: item.nameBg,
    categorySlug: 'squash',
    type: (item.type === 'Shoe' ? 'Shoe' : item.type) as ProductType,
    brand: 'Unsquashable',
    price: `€${item.priceEur.toFixed(2)}`,
    priceEur: item.priceEur,
    costEur: Number((item.priceEur * 0.55).toFixed(2)),
    details: item.details,
    detailsBg: item.detailsBg,
    description: item.description,
    descriptionBg: item.descriptionBg,
    badges: item.badges,
    imageUrl: item.imageUrl.includes('via.placeholder.com')
      ? createProductArtwork(item.name, 'Unsquashable', '#ff9f1c')
      : item.imageUrl,
    stock: item.stock,
  })) satisfies Product[];
}

const importedUnsquashableProducts = mapUnsquashableToSportCatalog();

export function createProductArtwork(title: string, subtitle: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b6b57"/>
          <stop offset="100%" stop-color="#102721"/>
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="80%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)"/>
      <rect width="800" height="600" fill="url(#glow)"/>
      <circle cx="620" cy="120" r="120" fill="${accent}" fill-opacity="0.22"/>
      <circle cx="160" cy="500" r="180" fill="#ffffff" fill-opacity="0.08"/>
      <text x="56" y="410" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700">${title}</text>
      <text x="56" y="468" fill="#d8efe8" font-family="Arial, Helvetica, sans-serif" font-size="30">${subtitle}</text>
      <rect x="56" y="66" rx="22" ry="22" width="190" height="52" fill="#ffffff" fill-opacity="0.16"/>
      <text x="84" y="101" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Racketpoint.bg</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createEditorialArtwork(title: string, subtitle: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="ed-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7f6f2"/>
          <stop offset="55%" stop-color="#eef3f8"/>
          <stop offset="100%" stop-color="#dde7ee"/>
        </linearGradient>
        <radialGradient id="ed-glow" cx="22%" cy="14%" r="88%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="ed-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#17324b"/>
          <stop offset="100%" stop-color="#0e1a25"/>
        </linearGradient>
      </defs>
      <rect width="1400" height="900" fill="url(#ed-bg)"/>
      <rect width="1400" height="900" fill="url(#ed-glow)"/>
      <g opacity="0.22" stroke="#cdd8e2" stroke-width="3">
        <path d="M0 170h1400"/>
        <path d="M0 420h1400"/>
        <path d="M0 670h1400"/>
        <path d="M180 0v900"/>
        <path d="M520 0v900"/>
        <path d="M920 0v900"/>
        <path d="M1240 0v900"/>
      </g>
      <g opacity="0.78">
        <ellipse cx="1015" cy="210" rx="230" ry="120" fill="${accent}" fill-opacity="0.16"/>
        <circle cx="1120" cy="260" r="90" fill="${accent}" fill-opacity="0.1"/>
        <path d="M160 620c130-170 340-250 580-240 170 7 325 72 455 186" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" opacity="0.72"/>
        <path d="M180 650c120-150 320-220 536-214 154 4 301 54 430 154" fill="none" stroke="#123e68" stroke-width="7" stroke-linecap="round" opacity="0.38"/>
      </g>
      <g transform="translate(110 130)" opacity="0.95">
        <rect x="0" y="0" width="250" height="70" rx="22" fill="url(#ed-dark)" opacity="0.92"/>
        <text x="32" y="46" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">Racketpoint.bg</text>
      </g>
      <g transform="translate(930 160)">
        <rect x="0" y="0" width="240" height="440" rx="32" fill="#ffffff" fill-opacity="0.88" stroke="#d7e1ea" stroke-width="4"/>
        <circle cx="78" cy="134" r="62" fill="${accent}" fill-opacity="0.12"/>
        <circle cx="168" cy="134" r="62" fill="#143455" fill-opacity="0.08"/>
        <path d="M68 118c34-30 76-40 128-30 18 4 35 10 50 20" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
        <path d="M84 168c34 10 74 12 120 6" fill="none" stroke="#123e68" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
        <rect x="36" y="238" width="168" height="18" rx="9" fill="#123e68" opacity="0.18"/>
        <rect x="36" y="272" width="150" height="18" rx="9" fill="#123e68" opacity="0.12"/>
        <rect x="36" y="306" width="120" height="18" rx="9" fill="#123e68" opacity="0.12"/>
        <text x="36" y="360" fill="#17324b" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${subtitle}</text>
      </g>
      <g transform="translate(120 270)">
        <circle cx="120" cy="120" r="102" fill="#fff" fill-opacity="0.6" stroke="#c8d4df" stroke-width="8"/>
        <circle cx="120" cy="120" r="68" fill="none" stroke="${accent}" stroke-width="8"/>
        <path d="M72 108c25-16 56-24 94-24 16 0 31 2 45 5" fill="none" stroke="#17324b" stroke-width="7" stroke-linecap="round"/>
        <path d="M60 152c26 10 58 15 96 15 19 0 40-2 64-6" fill="none" stroke="#17324b" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
        <text x="18" y="264" fill="#17324b" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${title}</text>
      </g>
      <text x="124" y="790" fill="#17324b" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createSportArtwork(sport: string, _subtitle: string, accent: string) {
  const sportKey = sport.toLowerCase();
  const motif = (() => {
    if (sportKey === 'squash') {
      return `
        <g transform="translate(140 220)">
          <ellipse cx="170" cy="132" rx="110" ry="154" fill="#fff" fill-opacity="0.55" stroke="#17324b" stroke-width="8"/>
          <circle cx="170" cy="132" r="72" fill="none" stroke="${accent}" stroke-width="8"/>
          <path d="M122 88c34-24 80-34 126-30" fill="none" stroke="#17324b" stroke-width="8" stroke-linecap="round"/>
          <path d="M114 176c36 14 84 16 142 6" fill="none" stroke="#17324b" stroke-width="8" stroke-linecap="round"/>
          <path d="M60 220c88-32 178-48 270-48" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
        </g>
      `;
    }

    if (sportKey === 'badminton') {
      return `
        <g transform="translate(180 170) rotate(-12 180 180)">
          <path d="M110 40l180 180" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
          <path d="M88 62l38-22 22 38-38 22z" fill="#fff" fill-opacity="0.88" stroke="#17324b" stroke-width="6"/>
          <path d="M88 62c42 18 82 52 118 102" fill="none" stroke="#17324b" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
          <path d="M196 172c24 32 44 72 58 120" fill="none" stroke="#17324b" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
          <ellipse cx="260" cy="256" rx="82" ry="110" fill="#fff" fill-opacity="0.7" stroke="#c8d4df" stroke-width="8"/>
          <path d="M220 226c26 10 56 14 94 10" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
        </g>
      `;
    }

    if (sportKey === 'padel') {
      return `
        <g transform="translate(150 150)">
          <rect x="170" y="40" width="240" height="360" rx="92" fill="#fff" fill-opacity="0.72" stroke="#17324b" stroke-width="10"/>
          <circle cx="230" cy="130" r="20" fill="${accent}" fill-opacity="0.9"/>
          <circle cx="310" cy="130" r="20" fill="${accent}" fill-opacity="0.55"/>
          <circle cx="230" cy="220" r="20" fill="${accent}" fill-opacity="0.55"/>
          <circle cx="310" cy="220" r="20" fill="${accent}" fill-opacity="0.9"/>
          <circle cx="270" cy="310" r="20" fill="#17324b" fill-opacity="0.18"/>
          <path d="M110 340c120-100 244-140 372-122" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
        </g>
      `;
    }

    if (sportKey === 'table-tennis') {
      return `
        <g transform="translate(150 190)">
          <rect x="20" y="40" width="340" height="160" rx="22" fill="#fff" fill-opacity="0.72" stroke="#17324b" stroke-width="8"/>
          <path d="M190 40v160" stroke="#17324b" stroke-width="8" stroke-linecap="round"/>
          <circle cx="440" cy="152" r="80" fill="#fff" fill-opacity="0.82" stroke="${accent}" stroke-width="8"/>
          <path d="M390 152c30-18 64-24 100-18" fill="none" stroke="#17324b" stroke-width="7" stroke-linecap="round"/>
          <path d="M88 84c40 16 92 24 156 24" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
    }

    if (sportKey === 'tennis') {
      return `
        <g transform="translate(150 170)">
          <ellipse cx="220" cy="160" rx="150" ry="195" fill="#fff" fill-opacity="0.56" stroke="#17324b" stroke-width="8"/>
          <ellipse cx="220" cy="160" rx="92" ry="126" fill="none" stroke="${accent}" stroke-width="8"/>
          <path d="M158 104c34-22 76-34 124-36" fill="none" stroke="#17324b" stroke-width="7" stroke-linecap="round"/>
          <path d="M150 214c36 12 82 16 138 12" fill="none" stroke="#17324b" stroke-width="7" stroke-linecap="round"/>
          <circle cx="430" cy="300" r="52" fill="${accent}" fill-opacity="0.88"/>
          <path d="M110 316c108-46 216-64 324-54" fill="none" stroke="${accent}" stroke-width="15" stroke-linecap="round"/>
        </g>
      `;
    }

    return `
      <g transform="translate(150 170)">
        <ellipse cx="220" cy="160" rx="150" ry="195" fill="#fff" fill-opacity="0.56" stroke="#17324b" stroke-width="8"/>
        <ellipse cx="220" cy="160" rx="92" ry="126" fill="none" stroke="${accent}" stroke-width="8"/>
      </g>
    `;
  })();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" role="img" aria-label="${sport}">
      <defs>
        <linearGradient id="sport-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7f6f2"/>
          <stop offset="55%" stop-color="#eef3f8"/>
          <stop offset="100%" stop-color="#dde7ee"/>
        </linearGradient>
        <radialGradient id="sport-glow" cx="18%" cy="14%" r="88%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1400" height="900" fill="url(#sport-bg)"/>
      <rect width="1400" height="900" fill="url(#sport-glow)"/>
      <g opacity="0.18" stroke="#cdd8e2" stroke-width="3">
        <path d="M0 180h1400"/>
        <path d="M0 430h1400"/>
        <path d="M0 680h1400"/>
        <path d="M210 0v900"/>
        <path d="M560 0v900"/>
        <path d="M960 0v900"/>
        <path d="M1260 0v900"/>
      </g>
      <g opacity="0.92">
        <rect x="110" y="116" width="280" height="72" rx="22" fill="#17324b" fill-opacity="0.92"/>
        <text x="142" y="163" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Racketpoint.bg</text>
      </g>
      ${motif}
      <g transform="translate(870 140)">
        <rect x="0" y="0" width="320" height="460" rx="34" fill="#ffffff" fill-opacity="0.86" stroke="#d7e1ea" stroke-width="4"/>
        <rect x="32" y="180" width="256" height="20" rx="10" fill="${accent}" fill-opacity="0.16"/>
        <rect x="32" y="216" width="224" height="20" rx="10" fill="#123e68" fill-opacity="0.12"/>
        <rect x="32" y="252" width="198" height="20" rx="10" fill="#123e68" fill-opacity="0.12"/>
        <rect x="32" y="288" width="168" height="20" rx="10" fill="#123e68" fill-opacity="0.12"/>
        <rect x="32" y="324" width="246" height="20" rx="10" fill="#123e68" fill-opacity="0.12"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const categories: Category[] = [
  {
    slug: 'squash',
    name: 'Squash',
    description: 'Rackets, grips, strings, bags and apparel for squash players.',
    heroTitle: 'Squash selection for club and tournament players.',
    heroCopy: '',
    accent: 'Main launch vertical',
    focus: ['Rackets', 'Grips', 'Strings', 'Apparel', 'Bags'],
  },
  {
    slug: 'tennis',
    name: 'Tennis',
    description: 'Tennis rackets, grips, bags, balls and essentials.',
    heroTitle: 'Tennis category foundation for performance and club play.',
    heroCopy: '',
    accent: 'Growth category',
    focus: ['Rackets', 'Grips', 'Bags', 'Balls', 'Accessories'],
  },
  {
    slug: 'table-tennis',
    name: 'Table Tennis',
    description: 'Bats, rubbers, balls, covers and accessories.',
    heroTitle: 'Table tennis layout with clear subcategory navigation.',
    heroCopy: '',
    accent: 'Structured rollout',
    focus: ['Bats', 'Balls', 'Bags', 'Grips', 'Accessories'],
  },
  {
    slug: 'badminton',
    name: 'Badminton',
    description: 'Badminton rackets, shuttlecocks, grips, apparel and bags.',
    heroTitle: 'Badminton setup for recreational and competitive players.',
    heroCopy: '',
    accent: 'Category expansion',
    focus: ['Rackets', 'Shuttlecocks', 'Grips', 'Bags', 'Apparel'],
  },
  {
    slug: 'padel',
    name: 'Padel',
    description: 'Padel rackets, overgrips, bags and match accessories.',
    heroTitle: 'Padel category prepared for retail conversion and merchandising.',
    heroCopy: '',
    accent: 'Fast-moving category',
    focus: ['Rackets', 'Overgrips', 'Bags', 'Balls', 'Accessories'],
  },
];

export const brands: Brand[] = [
  {
    name: 'Unsquashable',
    categorySlugs: ['squash'],
    note: 'Core performance brand for squash rackets, strings and bags.',
  },
  {
    name: 'Karakal',
    categorySlugs: ['squash', 'tennis', 'table-tennis', 'badminton', 'padel'],
    note: 'Cross-sport brand covering grips, rackets, bags, apparel and accessories.',
  },
  {
    name: 'Tecnifibre',
    categorySlugs: ['squash', 'tennis'],
    note: 'Premium racket and string option for advanced players.',
  },
  {
    name: 'Dunlop',
    categorySlugs: ['tennis', 'table-tennis', 'badminton'],
    note: 'Reliable all-round catalogue for rackets, balls and training products.',
  },
];

export const products: Product[] = [
  {
    sku: 'SQ-001',
    name: 'Unsquashable MIGUEL RODRIGUEZ AUTOGRAPH',
    categorySlug: 'squash',
    type: 'Racket',
    brand: 'Unsquashable',
    price: '€115.00',
    details: 'Autograph model focused on precision and controlled acceleration.',
    badges: ['Autograph', 'Premium'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/unsquashable-miguel-rodriguez-autograph-480.webp',
  },
  {
    sku: 'SQ-002',
    name: 'Karakal Raw Pro 2.1 Squash Racket',
    categorySlug: 'squash',
    type: 'Racket',
    brand: 'Karakal',
    price: '€129.00',
    details: 'Balanced frame for players wanting quick handling with stable contact.',
    badges: ['Control', 'Power'],
    imageUrl: createProductArtwork('Karakal Squash', 'Raw Pro 2.1', '#f6b042'),
  },
  {
    sku: 'SQ-003',
    name: 'Karakal PU Super Grip Twin Pack',
    categorySlug: 'squash',
    type: 'Grip',
    brand: 'Karakal',
    price: '€8.90',
    details: 'Dual-pack grip option for weekly players who rotate rackets.',
    badges: ['Grip', 'Popular'],
    imageUrl: createProductArtwork('Karakal Grip', 'Twin Pack', '#ff8c5a'),
  },
  {
    sku: 'SQ-004',
    name: 'Unsquashable TOUR-TEC PRO Deluxe Racket Bag',
    categorySlug: 'squash',
    type: 'Bag',
    brand: 'Unsquashable',
    price: '€99.00',
    details: 'Large tournament bag with separate compartments for shoes and rackets.',
    badges: ['Bag', 'Travel'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/bags/Unsquashable%20TOUR-TEC%20PRO%20Deluxe%20Racket%20Bag-480.webp',
  },
  {
    sku: 'TN-001',
    name: 'Karakal S-80 FF Tennis Racket',
    categorySlug: 'tennis',
    type: 'Racket',
    brand: 'Karakal',
    price: '€149.00',
    details: 'All-court tennis frame tuned for acceleration and spin response.',
    badges: ['Tennis', 'All Court'],
    imageUrl: createProductArtwork('Karakal Tennis', 'S-80 FF', '#8bc34a'),
  },
  {
    sku: 'TN-002',
    name: 'Karakal X-Tac Tennis Overgrip 3 Pack',
    categorySlug: 'tennis',
    type: 'Grip',
    brand: 'Karakal',
    price: '€10.50',
    details: 'Tacky overgrip set for reliable traction through long sessions.',
    badges: ['Grip', '3 Pack'],
    imageUrl: createProductArtwork('Karakal Tennis', 'X-Tac Overgrip', '#13a89e'),
  },
  {
    sku: 'TN-003',
    name: 'Karakal Team 6R Tennis Bag',
    categorySlug: 'tennis',
    type: 'Bag',
    brand: 'Karakal',
    price: '€69.00',
    details: 'Six-racket bag with thermal compartment and side accessory pockets.',
    badges: ['Bag', '6R'],
    imageUrl: createProductArtwork('Karakal Tennis', 'Team 6R Bag', '#f15b76'),
  },
  {
    sku: 'TT-001',
    name: 'Karakal Drive Carbon Table Tennis Bat',
    categorySlug: 'table-tennis',
    type: 'Racket',
    brand: 'Karakal',
    price: '€54.00',
    details: 'Controlled offensive bat for club-level rallies and spin play.',
    badges: ['Bat', 'Spin'],
    imageUrl: createProductArtwork('Karakal Table Tennis', 'Drive Carbon', '#4d77ff'),
  },
  {
    sku: 'TT-002',
    name: 'Karakal 40+ Match Balls 6 Pack',
    categorySlug: 'table-tennis',
    type: 'Balls',
    brand: 'Karakal',
    price: '€6.50',
    details: 'ITTF-size training and match balls for steady bounce and durability.',
    badges: ['Balls', '6 Pack'],
    imageUrl: createProductArtwork('Karakal Table Tennis', '40+ Balls', '#ffbc42'),
  },
  {
    sku: 'TT-003',
    name: 'Karakal Paddle Cover Bag',
    categorySlug: 'table-tennis',
    type: 'Bag',
    brand: 'Karakal',
    price: '€21.00',
    details: 'Protective bat bag with zipped accessory compartment.',
    badges: ['Bag', 'Cover'],
    imageUrl: createProductArtwork('Karakal Table Tennis', 'Paddle Cover', '#7bc8f6'),
  },
  {
    sku: 'BD-001',
    name: 'Karakal Aero Pro 78 Badminton Racket',
    categorySlug: 'badminton',
    type: 'Racket',
    brand: 'Karakal',
    price: '€89.00',
    details: 'Lightweight badminton frame for quick exchanges and overhead speed.',
    badges: ['Badminton', 'Lightweight'],
    imageUrl: createProductArtwork('Karakal Badminton', 'Aero Pro 78', '#8a5cff'),
  },
  {
    sku: 'BD-002',
    name: 'Karakal PU Super Grip Badminton',
    categorySlug: 'badminton',
    type: 'Grip',
    brand: 'Karakal',
    price: '€4.20',
    details: 'Classic tacky grip option for badminton handles.',
    badges: ['Grip', 'Classic'],
    imageUrl: createProductArtwork('Karakal Badminton', 'PU Super Grip', '#59d99b'),
  },
  {
    sku: 'BD-003',
    name: 'Karakal Precision Shuttlecock 12 Pack',
    categorySlug: 'badminton',
    type: 'Balls',
    brand: 'Karakal',
    price: '€14.00',
    details: 'Durable nylon shuttle set for training and recreational matches.',
    badges: ['Shuttle', '12 Pack'],
    imageUrl: createProductArtwork('Karakal Badminton', 'Shuttlecock Pack', '#ffd35e'),
  },
  {
    sku: 'PD-001',
    name: 'Karakal Padel Control 365',
    categorySlug: 'padel',
    type: 'Racket',
    brand: 'Karakal',
    price: '€169.00',
    details: 'Padel racket balancing comfort and directional control for long rallies.',
    badges: ['Padel', 'Control'],
    imageUrl: createProductArtwork('Karakal Padel', 'Control 365', '#ff6b6b'),
  },
  {
    sku: 'PD-002',
    name: 'Karakal Padel Overgrip 3 Pack',
    categorySlug: 'padel',
    type: 'Grip',
    brand: 'Karakal',
    price: '€11.00',
    details: 'Sweat-ready overgrip set designed for textured padel handles.',
    badges: ['Padel', 'Grip'],
    imageUrl: createProductArtwork('Karakal Padel', 'Overgrip 3 Pack', '#5ac8fa'),
  },
  {
    sku: 'PD-003',
    name: 'Karakal Padel Team Bag',
    categorySlug: 'padel',
    type: 'Bag',
    brand: 'Karakal',
    price: '€74.00',
    details: 'Large-format bag with separate compartments for shoes and accessories.',
    badges: ['Padel', 'Team Bag'],
    imageUrl: createProductArtwork('Karakal Padel', 'Team Bag', '#29c4a9'),
  },
  {
    sku: 'PD-004',
    name: 'Karakal Padel Court Tee',
    categorySlug: 'padel',
    type: 'Wear',
    brand: 'Karakal',
    price: '€34.00',
    details: 'Lightweight technical tee for match play and training blocks.',
    badges: ['Apparel', 'Match'],
    imageUrl: createProductArtwork('Karakal Padel', 'Court Tee', '#ff9f1c'),
  },
  {
    sku: 'SQ-005',
    name: 'Karakal Pro Performance Tee',
    categorySlug: 'squash',
    type: 'Wear',
    brand: 'Karakal',
    price: '€32.00',
    details: 'Breathable training tee with movement-focused fit for squash sessions.',
    badges: ['Apparel', 'Training'],
    imageUrl: createProductArtwork('Karakal Squash', 'Performance Tee', '#36cfc9'),
  },
  {
    sku: 'TN-004',
    name: 'Karakal Tennis Dampener Set',
    categorySlug: 'tennis',
    type: 'Accessory',
    brand: 'Karakal',
    price: '€7.00',
    details: 'Vibration dampener pair for cleaner response and impact feel.',
    badges: ['Accessory', '2 Pack'],
    imageUrl: createProductArtwork('Karakal Tennis', 'Dampener Set', '#00a8e8'),
  },
  {
    sku: 'BD-004',
    name: 'Karakal Court Backpack',
    categorySlug: 'badminton',
    type: 'Bag',
    brand: 'Karakal',
    price: '€58.00',
    details: 'Multi-sport backpack for badminton and training accessories.',
    badges: ['Bag', 'Everyday'],
    imageUrl: createProductArtwork('Karakal Badminton', 'Court Backpack', '#20bf6b'),
  },
  ...importedUnsquashableProducts,
];

export const categoryBySlug = new Map(categories.map((category) => [category.slug, category] as const));

export const productsByCategory = categories.reduce<Record<CategorySlug, Product[]>>(
  (groupedProducts, category) => {
    groupedProducts[category.slug] = products.filter((product) => product.categorySlug === category.slug);
    return groupedProducts;
  },
  {
    squash: [],
    tennis: [],
    'table-tennis': [],
    badminton: [],
    padel: [],
  },
);
