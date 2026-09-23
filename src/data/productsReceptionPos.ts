import type { Product, ProductType } from './catalog';
import { unsquashableProducts } from './productsUnsquashable';

/**
 * Public HTTPS product photos only.
 * Never point at reception-pos / Cloudflare Access /kiosk paths — those load as blank 0×0 images.
 */
const PUBLIC_IMAGE_BY_ID: Record<string, string> = {
  'unsquashable-miguel-rodriguez-one20':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04-UNSQUASHABLEMIGUELRODRIGUEZSPEZIAL110SquashRacket-2600x4000.jpg?v=1758593935&width=900',
  'unsquashable-miguel-rodriguez-autograph':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/UNSQUASHABLEMIGUELRODRIGUEZAUTOGRAPHSquashRacket-04-2600x4000.jpg?v=1770894571&width=900',
  'unsquashable-nick-wall-125-limited-edition':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04_-_NICK_WALL_125_Limited_Edition-2600x4000.jpg?v=1737106314&width=900',
  'unsquashable-hero-pro-125-brazil':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04_-_HERO-PRO_125_BRAZIL_Racket-2600x4000.jpg?v=1758567518&width=900',
  'unsquashable-y-tec-125':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/products/Y-TECracket-Shopify-IMG001.jpg?v=1724404534&width=900',
  'unsquashable-y-tec-pro-125':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/Y-TECPROSquashRacket-2022-Shopify-2600x4000-IMG001_c2e87c8a-9e74-41db-a1f7-88ed2d367c4f.jpg?v=1771870985&width=900',
  'unsquashable-y-tec-pro-110':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04-Y-TECPRO110-2600x4000.jpg?v=1737106612&width=900',
  'unsquashable-tour-tec-pro-125':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/TOUR-TECPROracket-2600x4000-IMG001_9d3d1576-bea2-4636-8de4-7971b5dcb4db.jpg?v=1771514668&width=900',
  'unsquashable-james-willstrop-signature':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/JAMESWILLSTROPAUTOGRAPH2600x4000-ANGLE4_ca3b55e0-10ba-44ca-bc15-ccb66b20dcb3.jpg?v=1724404460&width=900',
  'unsquashable-ultra-lite-120':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04_-_UNSQUASHABLE_THERMO-PRO_120_Squash_Racket_-_2600x4000_4f631c67-cdde-414a-b7c6-8bae42088fbf.jpg?v=1773047996&width=900',
  'unsquashable-ultra-lite-135':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04_-_UNSQUASHABLE_THERMO-PRO_120_Squash_Racket_-_2600x4000_4f631c67-cdde-414a-b7c6-8bae42088fbf.jpg?v=1773047996&width=900',
  'unsquashable-syn-tec-125':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/products/Y-TECracket-Shopify-IMG001.jpg?v=1724404534&width=900',
  'unsquashable-sam-gerrits-autograph':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/files/04-SAMGERRITSracket-2600x4000.jpg?v=1728657391&width=900',
  'dunlop-sonic-core-ultimate-132':
    'https://cdn.webshopapp.com/shops/40033/files/417558576/dunlop-sonic-core-ultimate-132.jpg',
  'tecnifibre-carboflex-125-airshaft':
    'https://cdn.webshopapp.com/shops/40033/files/315848126/tecnifibre-carboflex-125-ns-airshaft.jpg',
  'tecnifibre-carboflex-125-x-speed':
    'https://cdn.webshopapp.com/shops/40033/files/308779736/tecnifibre-carboflex-125-x-speed.jpg',
  'tecnifibre-carboflex-125-x-top':
    'https://cdn.webshopapp.com/shops/40033/files/487694047/tecnifibre-carboflex-125-x-top.jpg',
  'tecnifibre-carboflex-120-x-top-v2':
    'https://cdn.webshopapp.com/shops/40033/files/466313160/tecnifibre-carboflex-120-x-top-v2.jpg',
  'karakal-pu-super-grip-pro-6-pack':
    'https://cdn.shopify.com/s/files/1/0648/8322/8918/files/karakal-pu-super-grip-pack-of-two-02.webp?v=1784548209&width=900',
  'unsquashable-tour-tec-pro-deluxe-racket-bag':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/products/UNSQUASHABLETOUR-TECPRODeluxeRacketBag2angle.jpg?v=1724404422&width=900',
  'unsquashable-tour-tec-pro-backpack':
    'https://cdn.shopify.com/s/files/1/0510/5264/2502/products/UNSQUASHABLETOUR-TECPRODeluxeRacketBag2angle.jpg?v=1724404422&width=900',
  'unsquashable-tour-tec-pro-pu-grip-6-pack':
    'https://cdn.shopify.com/s/files/1/0648/8322/8918/files/karakal-pu-super-grip-pack-of-two-02.webp?v=1784548209&width=900',
};

type ReceptionPosSeed = {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  department: 'Racket' | 'Grips' | 'Apparel' | 'Balls';
  stockQty: number;
  featured?: boolean;
};

const STORE_PRODUCTS: ReceptionPosSeed[] = [
  {
    id: 'unsquashable-miguel-rodriguez-one20',
    name: 'Unsquashable MIGUEL RODRÍGUEZ ONE20 Limited Edition',
    price: 115,
    costPrice: 72.6,
    department: 'Racket',
    stockQty: 1,
    featured: true,
  },
  {
    id: 'unsquashable-miguel-rodriguez-autograph',
    name: 'Unsquashable MIGUEL RODRÍGUEZ AUTOGRAPH',
    price: 115,
    costPrice: 66,
    department: 'Racket',
    stockQty: 1,
    featured: true,
  },
  {
    id: 'unsquashable-nick-wall-125-limited-edition',
    name: 'Unsquashable NICK WALL 125 Limited Edition',
    price: 105,
    costPrice: 72.6,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-hero-pro-125-brazil',
    name: 'Unsquashable HERO-PRO 125 BRAZIL',
    price: 95,
    costPrice: 60,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-y-tec-125',
    name: 'Unsquashable Y-TEC 125',
    price: 95,
    costPrice: 60,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-y-tec-pro-125',
    name: 'Unsquashable Y-TEC PRO 125',
    price: 95,
    costPrice: 60.5,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-y-tec-pro-110',
    name: 'Unsquashable Y-TEC PRO 110',
    price: 95,
    costPrice: 60.5,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-tour-tec-pro-125',
    name: 'Unsquashable TOUR-TEC PRO 125',
    price: 75,
    costPrice: 60.5,
    department: 'Racket',
    stockQty: 2,
  },
  {
    id: 'unsquashable-james-willstrop-signature',
    name: 'Unsquashable JAMES WILLSTROP SIGNATURE',
    price: 115,
    costPrice: 54.45,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-ultra-lite-120',
    name: 'Unsquashable ULTRA-LITE 120',
    price: 69,
    costPrice: 54,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-ultra-lite-135',
    name: 'Unsquashable ULTRA-LITE 135',
    price: 59,
    costPrice: 36.3,
    department: 'Racket',
    stockQty: 2,
  },
  {
    id: 'unsquashable-syn-tec-125',
    name: 'Unsquashable SYN-TEC 125',
    price: 80,
    costPrice: 54.45,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-sam-gerrits-autograph',
    name: 'Unsquashable SAM GERRITS AUTOGRAPH',
    price: 99,
    costPrice: 72.6,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'saxon-aerox-125',
    name: 'Saxon Aerox 125',
    price: 59,
    costPrice: 36,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'dunlop-sonic-core-ultimate-132',
    name: 'Dunlop Sonic Core Ultimate 132',
    price: 95,
    costPrice: 75.02,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'prince-vortex-pro-650',
    name: 'Prince Vortex Pro 650',
    price: 89,
    costPrice: 75.63,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'tecnifibre-carboflex-125-airshaft',
    name: 'Tecnifibre Carboflex 125 Airshaft',
    price: 95,
    costPrice: 84,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'tecnifibre-carboflex-125-x-speed',
    name: 'Tecnifibre Carboflex 125 X-Speed',
    price: 100,
    costPrice: 90,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'tecnifibre-carboflex-125-x-top',
    name: 'Tecnifibre Carboflex 125 X-Top',
    price: 106,
    costPrice: 96,
    department: 'Racket',
    stockQty: 1,
    featured: true,
  },
  {
    id: 'tecnifibre-carboflex-120-x-top-v2',
    name: 'Tecnifibre Carboflex 120 X-Top V2',
    price: 125,
    costPrice: 108,
    department: 'Racket',
    stockQty: 1,
  },
  {
    id: 'unsquashable-tour-tec-pro-pu-grip-6-pack',
    name: 'Unsquashable TOUR-TEC PRO PU Grip - 6 Pack',
    price: 24,
    costPrice: 10.95,
    department: 'Grips',
    stockQty: 4,
    featured: true,
  },
  {
    id: 'karakal-pu-super-grip-pro-6-pack',
    name: 'Karakal PU Super Grip Pro - 6 Pack',
    price: 24,
    costPrice: 15,
    department: 'Grips',
    stockQty: 4,
  },
  {
    id: 'unsquashable-cross-tec-black-shoe',
    name: 'Unsquashable CROSS-TEC black shoe',
    price: 85,
    costPrice: 60.5,
    department: 'Apparel',
    stockQty: 1,
  },
  {
    id: 'unsquashable-fast-tec-pro-shoe',
    name: 'Unsquashable FAST-TEC Pro shoe',
    price: 95,
    costPrice: 66,
    department: 'Apparel',
    stockQty: 1,
  },
  {
    id: 'unsquashable-tour-tec-pro-backpack',
    name: 'Unsquashable TOUR-TEC PRO Backpack',
    price: 59,
    costPrice: 45,
    department: 'Apparel',
    stockQty: 2,
  },
  {
    id: 'unsquashable-tour-tec-pro-deluxe-racket-bag',
    name: 'Unsquashable TOUR-TEC PRO Deluxe Racket Bag',
    price: 99,
    costPrice: 60.5,
    department: 'Apparel',
    stockQty: 1,
    featured: true,
  },
  {
    id: 'unsquashable-tour-tec-pro-string-reel',
    name: 'Unsquashable TOUR-TEC PRO 1.18 Squash String - Yellow - 100M Reel',
    price: 92,
    costPrice: 84.7,
    department: 'Grips',
    stockQty: 2,
  },
  {
    id: 'dunlop-pro-ball-12-pack',
    name: 'Dunlop Pro Ball 12 Pack',
    price: 48,
    costPrice: 31.46,
    department: 'Balls',
    stockQty: 2,
    featured: true,
  },
  {
    id: 'dunlop-junior-protective-eyewear',
    name: 'Dunlop Junior Protective Eyewear',
    price: 21,
    costPrice: 18.15,
    department: 'Apparel',
    stockQty: 2,
  },
  {
    id: 'dunlop-mens-indoor-crew-socks',
    name: "Dunlop Men's Indoor Crew socks",
    price: 4,
    costPrice: 2.98,
    department: 'Apparel',
    stockQty: 4,
  },
  {
    id: 'tecnifibre-tech-socks',
    name: 'Tecnifibre Tech socks',
    price: 9.5,
    costPrice: 6.6,
    department: 'Apparel',
    stockQty: 4,
  },
  {
    id: 'tecnifibre-classic-socks',
    name: 'Tecnifibre Classic socks',
    price: 9.5,
    costPrice: 6.6,
    department: 'Apparel',
    stockQty: 4,
  },
  {
    id: 'tecnifibre-wristband-xl',
    name: 'Tecnifibre wristband XL',
    price: 5.6,
    costPrice: 3.98,
    department: 'Apparel',
    stockQty: 4,
  },
  {
    id: 'tecnifibre-team-tech-tee',
    name: 'Tecnifibre Team Tech Tee',
    price: 35,
    costPrice: 24.24,
    department: 'Apparel',
    stockQty: 2,
  },
  {
    id: 'tecnifibre-team-cotton-tee',
    name: 'Tecnifibre Team Cotton Tee',
    price: 20,
    costPrice: 15.04,
    department: 'Apparel',
    stockQty: 2,
  },
];

function normalizeImageName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bsignature\b/g, 'autograph')
    .replace(/\blimited edition\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPublicCatalogImage(name: string) {
  const target = normalizeImageName(name);
  const exact = unsquashableProducts.find((item) => normalizeImageName(item.name) === target);
  if (exact?.imageUrl?.startsWith('http')) {
    return exact.imageUrl;
  }

  // Allow "TOUR-TEC PRO 125" to match catalog "TOUR-TEC PRO" only when the extra tokens are weight/size.
  const weightSuffix = target.match(/^(.*?)\s+(\d{2,3})$/);
  if (weightSuffix) {
    const base = weightSuffix[1];
    const baseMatches = unsquashableProducts.filter((item) => {
      if (!item.imageUrl?.startsWith('http')) {
        return false;
      }
      return normalizeImageName(item.name) === base;
    });
    if (baseMatches.length === 1) {
      return baseMatches[0].imageUrl;
    }
  }

  return undefined;
}

function isBlockedImageHost(url: string) {
  const normalized = url.trim().toLowerCase();
  return normalized.includes('/kiosk/')
    || normalized.includes('reception-pos')
    || normalized.includes('jakub-personal.workers.dev')
    || normalized.includes('cloudflareaccess.com');
}

function posImageUrl(item: ReceptionPosSeed) {
  const byId = PUBLIC_IMAGE_BY_ID[item.id];
  if (byId && !isBlockedImageHost(byId)) {
    return byId;
  }

  const fromCatalog = findPublicCatalogImage(item.name);
  if (fromCatalog && !isBlockedImageHost(fromCatalog)) {
    return fromCatalog;
  }

  return '';
}

function brandFromName(name: string) {
  const token = name.split(/\s+/)[0]?.replace(/[^A-Za-z]/g, '') ?? '';
  if (token.toLowerCase() === 'unsquashable' || token.toLowerCase() === 'unsuashable') {
    return 'Unsquashable';
  }

  return token || 'Unsquashable';
}

function typeFromSeed(item: ReceptionPosSeed): ProductType {
  const haystack = `${item.name} ${item.department}`.toLowerCase();

  if (item.department === 'Racket') {
    return 'Racket';
  }

  if (item.department === 'Balls' || haystack.includes('ball')) {
    return 'Balls';
  }

  if (haystack.includes('string') || haystack.includes('reel')) {
    return 'String';
  }

  if (item.department === 'Grips' || haystack.includes('grip')) {
    return 'Grip';
  }

  if (haystack.includes('shoe')) {
    return 'Shoe';
  }

  if (haystack.includes('bag') || haystack.includes('backpack')) {
    return 'Bag';
  }

  if (haystack.includes('eyewear') || haystack.includes('wristband')) {
    return 'Accessory';
  }

  return 'Wear';
}

export function isReceptionPosProduct(product: Pick<Product, 'sku' | 'attributes'>) {
  return product.attributes?.source === 'reception-pos' || product.sku.startsWith('POS-');
}

export const receptionPosProducts: Product[] = STORE_PRODUCTS.map((item) => {
  const type = typeFromSeed(item);
  const brand = brandFromName(item.name);
  const stock = item.stockQty;

  return {
    sku: `POS-${item.id}`,
    name: item.name,
    nameBg: item.name,
    categorySlug: 'squash',
    type,
    brand,
    price: `€${item.price.toFixed(2)}`,
    priceEur: item.price,
    costEur: item.costPrice,
    details: 'Налична бройка в клуба Double Yellow. Може да се вземе на място или да се поръча за доставка.',
    detailsBg: 'Налична бройка в клуба Double Yellow. Може да се вземе на място или да се поръча за доставка.',
    description: item.name,
    badges: item.featured ? ['На склад', 'Хит'] : ['На склад'],
    imageUrl: posImageUrl(item),
    stock,
    supplierSource: 'Double Yellow Squash Club reception shop',
    attributes: {
      source: 'reception-pos',
      sourceSku: item.id,
      productType: type,
    },
  };
});
