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
  stock?: number;
  nameBg?: string;
  costEur?: number;
  color?: string;
  headShape?: RacketHeadShape;
  balance?: BalanceProfile;
  weightGrams?: number;
  attributes?: Record<string, string>;
};

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

export const categories: Category[] = [
  {
    slug: 'squash',
    name: 'Squash',
    description: 'Rackets, grips, strings, bags and apparel for squash players.',
    heroTitle: 'Squash selection for club and tournament players.',
    heroCopy: 'Core assortment built around Unsquashable and Karakal with room for fast expansion.',
    accent: 'Main launch vertical',
    focus: ['Rackets', 'Grips', 'Strings', 'Apparel', 'Bags'],
  },
  {
    slug: 'tennis',
    name: 'Tennis',
    description: 'Tennis rackets, grips, bags, balls and essentials.',
    heroTitle: 'Tennis category foundation for performance and club play.',
    heroCopy: 'Structured as a full category tree and ready for population with additional SKUs.',
    accent: 'Growth category',
    focus: ['Rackets', 'Grips', 'Bags', 'Balls', 'Accessories'],
  },
  {
    slug: 'table-tennis',
    name: 'Table Tennis',
    description: 'Bats, rubbers, balls, covers and accessories.',
    heroTitle: 'Table tennis layout with clear subcategory navigation.',
    heroCopy: 'Designed for quick expansion from starter sets to club-level products.',
    accent: 'Structured rollout',
    focus: ['Bats', 'Balls', 'Bags', 'Grips', 'Accessories'],
  },
  {
    slug: 'badminton',
    name: 'Badminton',
    description: 'Badminton rackets, shuttlecocks, grips, apparel and bags.',
    heroTitle: 'Badminton setup for recreational and competitive players.',
    heroCopy: 'Subcategory-first architecture keeps collection growth clean and easy to manage.',
    accent: 'Category expansion',
    focus: ['Rackets', 'Shuttlecocks', 'Grips', 'Bags', 'Apparel'],
  },
  {
    slug: 'padel',
    name: 'Padel',
    description: 'Padel rackets, overgrips, bags and match accessories.',
    heroTitle: 'Padel category prepared for retail conversion and merchandising.',
    heroCopy: 'Built as a dedicated vertical, not as a filter under tennis.',
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
