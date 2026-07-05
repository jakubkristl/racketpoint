export type ProductType = 'Racket' | 'Balls' | 'Wear' | 'Bag' | 'Accessory' | 'String' | 'Grip';

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
  price: string;
  details: string;
  badges: string[];
  imageUrl: string;
};

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
    slug: 'rackets',
    name: 'Ракети',
    description: 'Ракети за скуош за различни стилове на игра.',
    heroTitle: 'Подбрани скуош ракети за клубни и състезателни играчи.',
    heroCopy: 'Официална екипировка Double Yellow за корта, с модели за различни нива и предпочитания.',
    accent: 'Основен избор',
    focus: ['Unsquashable', 'Tecnifibre', 'Dunlop', 'Prince', 'Saxon'],
  },
  {
    slug: 'shoes',
    name: 'Обувки',
    description: 'Обувки за стабилност и сцепление в залата.',
    heroTitle: 'Обувки с добро сцепление и стабилност за indoor игра.',
    heroCopy: 'Модели за бързо движение, промяна на посоката и уверен контакт с настилката.',
    accent: 'Стабилност',
    focus: ['Unsquashable', 'Dunlop', 'Indoor', 'Сцепление', 'Комфорт'],
  },
  {
    slug: 'bags',
    name: 'Сакове и раници',
    description: 'Чанти, раници и сакове за ракети и екипировка.',
    heroTitle: 'Чанти и раници за всичко необходимо на корта.',
    heroCopy: 'Удобни решения за пренасяне на ракети, обувки, дрехи и аксесоари.',
    accent: 'За носене',
    focus: ['Раници', 'Сакове', 'Чанти', 'Ракети', 'Обувки'],
  },
  {
    slug: 'strings-grips',
    name: 'Кордажи и грипове',
    description: 'Кордажи, grip-ове и консумативи за поддръжка.',
    heroTitle: 'Кордажи, grip-ове и аксесоари за поддръжка на ракетата.',
    heroCopy: 'Всичко за поддръжка на усещането, контрола и комфорта в ръката.',
    accent: 'Поддръжка',
    focus: ['Кордaж', 'Grip', 'PU Grip', 'Reel', '6 Pack'],
  },
  {
    slug: 'apparel',
    name: 'Облекло',
    description: 'Тениски, чорапи, ленти и екипировка за игра.',
    heroTitle: 'Практично облекло и малки аксесоари за игра и тренировки.',
    heroCopy: 'Комфортни материи, спортни чорапи и ленти за всекидневна употреба.',
    accent: 'За игра',
    focus: ['Тениски', 'Чорапи', 'Ленти', 'Облекло', 'Аксесоари'],
  },
  {
    slug: 'eyewear',
    name: 'Очилa',
    description: 'Защитни очила за скуош и зални спортове.',
    heroTitle: 'Защитни очила за по-спокойна и уверена игра.',
    heroCopy: 'Избор за защита на очите при интензивна тренировка или мач.',
    accent: 'Защита',
    focus: ['Очилa', 'Защита', 'Junior', 'Indoor'],
  },
  {
    slug: 'rentals',
    name: 'Наеми',
    description: 'Наем на ракети и аксесоари в клуба.',
    heroTitle: 'Услуги за наем, ако искаш да пробваш преди покупка.',
    heroCopy: 'Подходящо за гости, начинаещи и клиенти, които тестват екипировка.',
    accent: 'На място',
    focus: ['Racket Rental', 'Towel Rental', 'Клуб', 'Пробване'],
  },
];

export const brands: Brand[] = [
  {
    name: 'Unsquashable',
    categorySlugs: ['rackets', 'shoes', 'bags', 'strings-grips'],
    note: 'Силен бранд за ракети, обувки и аксесоари.',
  },
  {
    name: 'Tecnifibre',
    categorySlugs: ['rackets', 'strings-grips', 'apparel'],
    note: 'Премиум линия за ракети, кордажи и облекло.',
  },
  {
    name: 'Dunlop',
    categorySlugs: ['rackets', 'shoes', 'apparel', 'eyewear'],
    note: 'Универсална марка за игра, тренировки и защита.',
  },
  {
    name: 'Prince',
    categorySlugs: ['rackets'],
    note: 'Класически избор за прецизност и контрол.',
  },
  {
    name: 'Karakal',
    categorySlugs: ['strings-grips'],
    note: 'Надежден избор за grip и консумативи.',
  },
  {
    name: 'Double Yellow',
    categorySlugs: ['rentals'],
    note: 'Клубни услуги и наеми на място.',
  },
];

export const products: Product[] = [
  {
    sku: 'RKT-001',
    name: 'Unsquashable MIGUEL RODRIGUEZ AUTOGRAPH',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Unsquashable',
    price: '€115.00',
    details: 'Автограф модел за играчи, търсещи прецизност и усещане.',
    badges: ['Autograph', 'Premium'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/unsquashable-miguel-rodriguez-autograph-480.webp',
  },
  {
    sku: 'RKT-002',
    name: 'Unsquashable NICK WALL 125 Limited Edition',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Unsquashable',
    price: '€105.00',
    details: 'Лимитирана версия за динамична и атакуваща игра.',
    badges: ['Limited', 'Fast'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/Unsquashable%20NICK%20WALL%20125%20Limited%20Edition-480.webp',
  },
  {
    sku: 'RKT-003',
    name: 'Tecnifibre Carboflex 120 X-Top V2',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Tecnifibre',
    price: '€165.00',
    details: 'Популярен избор за играчи, търсещи скорост и сила.',
    badges: ['Top', 'Speed'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/Tecnifibre%20Carboflex%20120%20X-Top%20V2-1200.webp',
  },
  {
    sku: 'RKT-004',
    name: 'Prince Vortex Pro 650',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Prince',
    price: '€89.00',
    details: 'Класическа ракета с фокус върху контрол и усещане.',
    badges: ['Classic', 'Control'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/Prince%20Vortex%20Pro%20650-768.webp',
  },
  {
    sku: 'RKT-005',
    name: 'Dunlop Sonic Core Ultimate 132',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Dunlop',
    price: '€95.00',
    details: 'Универсална ракета за играчи, които искат стабилност.',
    badges: ['Ultimate', 'All-round'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/Dunlop%20Sonic%20Core%20Ultimate%20132-480.webp',
  },
  {
    sku: 'RKT-006',
    name: 'Saxon Aerox 125',
    categorySlug: 'rackets',
    type: 'Racket',
    brand: 'Saxon',
    price: '€59.00',
    details: 'Достъпна ракета за тренировки и напредък.',
    badges: ['Value', 'Training'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rackets/Saxon%20Aerox%20125-1200.jpg',
  },
  {
    sku: 'SHOE-007',
    name: 'Unsquashable CROSS-TEC Black Shoe',
    categorySlug: 'shoes',
    type: 'Wear',
    brand: 'Unsquashable',
    price: '€85.00',
    details: 'Черни обувки за стабилност и сцепление в залата.',
    badges: ['Shoes', 'Indoor'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/shoes/Unsquashable%20CROSS-TEC%20Black%20Shoe-2048.webp',
  },
  {
    sku: 'SHOE-008',
    name: 'Unsquashable FAST-TEC Pro Shoe',
    categorySlug: 'shoes',
    type: 'Wear',
    brand: 'Unsquashable',
    price: '€95.00',
    details: 'Бърза обувка с уверен отскок и стабилна подметка.',
    badges: ['Fast', 'Pro'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/shoes/Unsquashable%20FAST-TEC%20Pro%20Shoe-480.webp',
  },
  {
    sku: 'SHOE-009',
    name: 'Unsquashable TOUR-TEC PRO Shoe',
    categorySlug: 'shoes',
    type: 'Wear',
    brand: 'Unsquashable',
    price: '€90.00',
    details: 'Tour модел за играчи, които искат баланс и комфорт.',
    badges: ['Tour', 'Comfort'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/shoes/Unsquashable%20TOUR-TEC%20PRO%20Shoe-2048.webp',
  },
  {
    sku: 'BAG-010',
    name: 'Unsquashable TOUR-TEC PRO Backpack',
    categorySlug: 'bags',
    type: 'Bag',
    brand: 'Unsquashable',
    price: '€59.00',
    details: 'Раница за ракета и ежедневна клубна употреба.',
    badges: ['Backpack', 'Club'],
    imageUrl: 'https://www.doubleyellowsquash.com/_next/image?url=%2Fstore%2Fproducts%2Fbags%2FUnsquashable%20TOUR-TEC%20PRO%20Backpack.webp&w=384&q=75',
  },
  {
    sku: 'BAG-011',
    name: 'Unsquashable TOUR-TEC PRO Deluxe Racket Bag',
    categorySlug: 'bags',
    type: 'Bag',
    brand: 'Unsquashable',
    price: '€99.00',
    details: 'Делукс чанта с място за повече оборудване и обувки.',
    badges: ['Deluxe', 'Travel'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/bags/Unsquashable%20TOUR-TEC%20PRO%20Deluxe%20Racket%20Bag-480.webp',
  },
  {
    sku: 'STR-012',
    name: 'Unsquashable TOUR-TEC PRO 1.18 Squash String - Yellow - 100M Reel',
    categorySlug: 'strings-grips',
    type: 'String',
    brand: 'Unsquashable',
    price: '€92.00',
    details: 'Корда за добър отклик и усещане, макара 100 м.',
    badges: ['String', 'Reel'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/strings-grips/Unsquashable%20TOUR-TEC%20PRO%201.18%20String%20(Yellow)%20%E2%80%94%20100m%20Reel-480.webp',
  },
  {
    sku: 'GRP-013',
    name: 'Unsquashable TOUR-TEC PRO PU Grip - 6 Pack',
    categorySlug: 'strings-grips',
    type: 'Grip',
    brand: 'Unsquashable',
    price: '€24.00',
    details: 'PU grip пакет за бърза смяна и стабилен захват.',
    badges: ['Grip', '6 Pack'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/strings-grips/Unsquashable%20TOUR-TEC%20PRO%20PU%20Grip-1200.jpg',
  },
  {
    sku: 'GRP-014',
    name: 'Karakal PU Super Grip',
    categorySlug: 'strings-grips',
    type: 'Grip',
    brand: 'Karakal',
    price: '€4.00',
    details: 'Единичен grip за подмяна и по-сигурен захват.',
    badges: ['Grip', 'Single'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/strings-grips/karakal-pu-grip-1200.webp',
  },
  {
    sku: 'APP-015',
    name: 'Tecnifibre Team Tech Tee',
    categorySlug: 'apparel',
    type: 'Wear',
    brand: 'Tecnifibre',
    price: '€35.00',
    details: 'Техническа тениска за тренировки и мачове.',
    badges: ['Tech', 'Tee'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/apparel/Tecnifibre%20Team%20Tech%20Tee-1200.jpg',
  },
  {
    sku: 'APP-016',
    name: "Dunlop Men's Indoor Crew Socks",
    categorySlug: 'apparel',
    type: 'Wear',
    brand: 'Dunlop',
    price: '€4.00',
    details: 'Спортни чорапи за игра на закрито.',
    badges: ['Socks', 'Indoor'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/apparel/Dunlop%20Men%27s%20Indoor%20Crew%20Socks-480.webp',
  },
  {
    sku: 'APP-017',
    name: 'Tecnifibre Wristband XL',
    categorySlug: 'apparel',
    type: 'Accessory',
    brand: 'Tecnifibre',
    price: '€5.60',
    details: 'Широка лента за комфорт и контрол на влагата.',
    badges: ['Wristband', 'XL'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/apparel/Tecnifibre%20Wristband%20XL-1200.jpg',
  },
  {
    sku: 'APP-018',
    name: 'Tecnifibre Tech Socks',
    categorySlug: 'apparel',
    type: 'Wear',
    brand: 'Tecnifibre',
    price: '€9.50',
    details: 'Технически чорапи за тренировки и състезания.',
    badges: ['Socks', 'Tech'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/apparel/Tecnifibre%20Tech%20Socks-1200.jpg',
  },
  {
    sku: 'APP-019',
    name: 'Tecnifibre Classic Socks',
    categorySlug: 'apparel',
    type: 'Wear',
    brand: 'Tecnifibre',
    price: '€9.50',
    details: 'Класически спортни чорапи за всекидневна игра.',
    badges: ['Socks', 'Classic'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/apparel/Tecnifibre%20Classic%20Socks-1200.jpg',
  },
  {
    sku: 'EYE-020',
    name: 'Dunlop Junior Protective Eyewear',
    categorySlug: 'eyewear',
    type: 'Accessory',
    brand: 'Dunlop',
    price: '€21.00',
    details: 'Защитни очила за младши играчи и безопасна игра.',
    badges: ['Junior', 'Protection'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/eyewear/Dunlop%20Junior%20Protective%20Eyewear-1200.jpg',
  },
  {
    sku: 'REN-021',
    name: 'Racket Rental',
    categorySlug: 'rentals',
    type: 'Accessory',
    brand: 'Double Yellow',
    price: '€2.50',
    details: 'Наем на ракета за пробна игра в клуба.',
    badges: ['Rental', 'Club'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rentals/Racket-1200.webp',
  },
  {
    sku: 'REN-022',
    name: 'Towel Rental',
    categorySlug: 'rentals',
    type: 'Accessory',
    brand: 'Double Yellow',
    price: '€1.00',
    details: 'Наем на кърпа за удобно ползване на място.',
    badges: ['Rental', 'Towel'],
    imageUrl: 'https://www.doubleyellowsquash.com/optimized/store/products/rentals/Towel-1200.webp',
  },
];

export const categoryBySlug = new Map(categories.map((category) => [category.slug, category] as const));

export const productsByCategory = categories.reduce<Record<CategorySlug, Product[]>>(
  (groupedProducts, category) => {
    groupedProducts[category.slug] = products.filter((product) => product.categorySlug === category.slug);
    return groupedProducts;
  },
  {
    rackets: [],
    shoes: [],
    bags: [],
    'strings-grips': [],
    apparel: [],
    eyewear: [],
    rentals: [],
  },
);
