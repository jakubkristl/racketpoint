import type { Product } from './catalog';

export type ShopSubcategory = {
  slug: string;
  label: string;
  shortLabel: string;
  productTypes: Product['type'][];
  imageUrl: string;
  fallbackImageUrl: string;
  imageBySport?: Record<string, string>;
  fallbackBySport?: Record<string, string>;
};

const rakety = {
  squashRackets: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/da704f968f9d9064ed8e13d28036736a.thumb_60x60.jpg.avif',
  squashBalls: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/9d9148f5839602ca796f06c59d465260.thumb_60x60.jpg.avif',
  squashGrips: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/5e288bf7749ceef565cdcf7733b8b980.thumb_60x60.jpg.avif',
  squashStrings: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/4b7198c471013776410ad97d4b9ae2ae.thumb_60x60.jpg.avif',
  squashBags: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/9041cd964244a00eb9f3bfa8534caf10.thumb_60x60.jpg.avif',
  squashAccessories: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/3dab73801d659d62da017179a73f7715.thumb_60x60.jpg.avif',
  squashShoes: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/245d11106866bc83c036fde64469cbbb.thumb_60x60.jpg.avif',
  badmintonRackets: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/a29f9ab89217da2ba6a2a0fb0b9bfc33.thumb_60x60.jpg.avif',
  badmintonShuttles: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/c8a475257b445fff3a2964459d0624d7.thumb_60x60.jpg.avif',
  badmintonGrips: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/5ddda00e007145176119693b7366cfee.thumb_60x60.jpg.avif',
  badmintonStrings: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/1f07ba78dbf483729933af9717b2857c.thumb_60x60.jpg.avif',
  badmintonBags: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/c53afa25c254f9945404ff85d44bc03e.thumb_60x60.jpg.avif',
  badmintonAccessories: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/f3474b07e3e34431f6ce0e59d6a3024d.thumb_60x60.jpg.avif',
  badmintonShoes: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/e298fd89c629ad2398225a6f7f43c738.thumb_60x60.jpg.avif',
  tennisRackets: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/96b334036bc6a3395dc045c24d995e24.thumb_60x60.jpg.avif',
  tennisBalls: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/c4e08107b7f425048ef4feacf5f7925e.thumb_60x60.jpg.avif',
  tennisGrips: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/abc6af2b1c6b891f8c7c0028a40f6974.thumb_60x60.jpg.avif',
  tennisStrings: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/8fbe148334461e9a5c1da9e7635dcd13.thumb_60x60.jpg.avif',
  tennisBags: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/3ac3d0f5b5c4bea582e14077c15ecce4.thumb_60x60.jpg.avif',
  tennisAccessories: 'https://www.rakety.sk/sub/rakety.sk/shop/menu_item/c1dfc7a1fc8cb42afe1f3d992167d97b.thumb_60x60.jpg.avif',
  padelRackets: 'https://www.rakety.sk/sub/rakety.sk/shop/product/resized/padlova-raketa-snauwaertvitas-elite-584.thumb_290x260.webp.avif?341',
  padelBalls: 'https://images.pexels.com/photos/35646550/pexels-photo-35646550.jpeg?auto=compress&cs=tinysrgb&w=200',
  padelShoes: 'https://www.rakety.sk/sub/rakety.sk/shop/product/resized/padelova-obuv-joma-spin-777.thumb_290x260.jpg.avif?117',
  padelBags: 'https://www.rakety.sk/sub/rakety.sk/shop/product/resized/taska-na-rakety-oliver-pickelball-padelbag-sivo-modra-712.thumb_290x260.jpg.avif?461341',
  tableTennisRackets: 'https://images.pexels.com/photos/709134/pexels-photo-709134.jpeg?auto=compress&cs=tinysrgb&w=200',
  tableTennisBalls: 'https://images.pexels.com/photos/4080060/pexels-photo-4080060.jpeg?auto=compress&cs=tinysrgb&w=200',
};

const pexels = {
  squashRackets: 'https://images.pexels.com/photos/14629511/pexels-photo-14629511.jpeg?auto=compress&cs=tinysrgb&w=200',
  squashBalls: 'https://images.pexels.com/photos/7648078/pexels-photo-7648078.jpeg?auto=compress&cs=tinysrgb&w=200',
  badmintonRackets: 'https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=200',
  badmintonShuttles: 'https://images.pexels.com/photos/3660204/pexels-photo-3660204.jpeg?auto=compress&cs=tinysrgb&w=200',
  tennisRackets: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=200',
  tennisBalls: 'https://images.pexels.com/photos/5739115/pexels-photo-5739115.jpeg?auto=compress&cs=tinysrgb&w=200',
  padelRackets: 'https://images.pexels.com/photos/35248374/pexels-photo-35248374.jpeg?auto=compress&cs=tinysrgb&w=200',
  padelBalls: 'https://images.pexels.com/photos/35646550/pexels-photo-35646550.jpeg?auto=compress&cs=tinysrgb&w=200',
  shoes: 'https://images.pexels.com/photos/7648280/pexels-photo-7648280.jpeg?auto=compress&cs=tinysrgb&w=200',
  bags: 'https://images.pexels.com/photos/7648297/pexels-photo-7648297.jpeg?auto=compress&cs=tinysrgb&w=200',
};

export const shopSubcategories: ShopSubcategory[] = [
  {
    slug: 'rackets',
    label: 'Ракети',
    shortLabel: 'Ракети',
    productTypes: ['Racket'],
    imageUrl: rakety.squashRackets,
    fallbackImageUrl: pexels.squashRackets,
    imageBySport: {
      squash: rakety.squashRackets,
      badminton: rakety.badmintonRackets,
      tennis: rakety.tennisRackets,
      padel: rakety.padelRackets,
      'table-tennis': rakety.tableTennisRackets,
    },
    fallbackBySport: {
      squash: pexels.squashRackets,
      badminton: pexels.badmintonRackets,
      tennis: pexels.tennisRackets,
      padel: pexels.padelRackets,
      'table-tennis': rakety.tableTennisRackets,
    },
  },
  {
    slug: 'balls',
    label: 'Топки',
    shortLabel: 'Топки',
    productTypes: ['Balls'],
    imageUrl: rakety.squashBalls,
    fallbackImageUrl: pexels.squashBalls,
    imageBySport: {
      squash: rakety.squashBalls,
      badminton: rakety.badmintonShuttles,
      tennis: rakety.tennisBalls,
      padel: rakety.padelBalls,
      'table-tennis': rakety.tableTennisBalls,
    },
    fallbackBySport: {
      squash: pexels.squashBalls,
      badminton: pexels.badmintonShuttles,
      tennis: pexels.tennisBalls,
      padel: pexels.padelBalls,
      'table-tennis': rakety.tableTennisBalls,
    },
  },
  {
    slug: 'grips',
    label: 'Грипове',
    shortLabel: 'Грипове',
    productTypes: ['Grip'],
    imageUrl: rakety.squashGrips,
    fallbackImageUrl: rakety.squashGrips,
    imageBySport: {
      squash: rakety.squashGrips,
      badminton: rakety.badmintonGrips,
      tennis: rakety.tennisGrips,
      padel: rakety.tennisGrips,
    },
  },
  {
    slug: 'strings',
    label: 'Кордажи',
    shortLabel: 'Кордажи',
    productTypes: ['String'],
    imageUrl: rakety.squashStrings,
    fallbackImageUrl: rakety.squashStrings,
    imageBySport: {
      squash: rakety.squashStrings,
      badminton: rakety.badmintonStrings,
      tennis: rakety.tennisStrings,
    },
  },
  {
    slug: 'bags',
    label: 'Чанти',
    shortLabel: 'Чанти',
    productTypes: ['Bag'],
    imageUrl: rakety.squashBags,
    fallbackImageUrl: pexels.bags,
    imageBySport: {
      squash: rakety.squashBags,
      badminton: rakety.badmintonBags,
      tennis: rakety.tennisBags,
      padel: rakety.padelBags,
      'table-tennis': rakety.tennisBags,
    },
  },
  {
    slug: 'accessories',
    label: 'Аксесоари',
    shortLabel: 'Аксесоари',
    productTypes: ['Accessory', 'Wear'],
    imageUrl: rakety.squashAccessories,
    fallbackImageUrl: rakety.squashAccessories,
    imageBySport: {
      squash: rakety.squashAccessories,
      badminton: rakety.badmintonAccessories,
      tennis: rakety.tennisAccessories,
      padel: rakety.tennisAccessories,
      'table-tennis': rakety.tennisAccessories,
    },
  },
  {
    slug: 'shoes',
    label: 'Обувки',
    shortLabel: 'Обувки',
    productTypes: ['Shoe'],
    imageUrl: rakety.squashShoes,
    fallbackImageUrl: pexels.shoes,
    imageBySport: {
      squash: rakety.squashShoes,
      badminton: rakety.badmintonShoes,
      tennis: rakety.squashShoes,
      padel: rakety.padelShoes,
    },
  },
];

const subcategorySlugsBySport: Record<string, string[]> = {
  squash: ['rackets', 'balls', 'grips', 'strings', 'bags', 'accessories', 'shoes'],
  badminton: ['rackets', 'balls', 'grips', 'strings', 'bags', 'accessories', 'shoes'],
  padel: ['rackets', 'balls', 'grips', 'bags', 'accessories', 'shoes'],
  tennis: ['rackets', 'balls', 'grips', 'strings', 'bags', 'accessories', 'shoes'],
  'table-tennis': ['rackets', 'balls', 'bags', 'accessories'],
};

const sportSpecificLabels: Record<string, Record<string, string>> = {
  squash: {
    rackets: 'Скуош ракети',
    balls: 'Скуош топки',
    grips: 'Скуош грипове',
    strings: 'Скуош кордажи',
    bags: 'Скуош чанти',
    accessories: 'Скуош аксесоари',
    shoes: 'Скуош обувки',
  },
  badminton: {
    rackets: 'Бадминтон ракети',
    balls: 'Пера',
    grips: 'Бадминтон грипове',
    strings: 'Бадминтон кордажи',
    bags: 'Бадминтон чанти',
    accessories: 'Бадминтон аксесоари',
    shoes: 'Бадминтон обувки',
  },
  padel: {
    rackets: 'Падел ракети',
    balls: 'Падел топки',
    grips: 'Падел грипове',
    bags: 'Падел чанти',
    accessories: 'Падел аксесоари',
    shoes: 'Падел обувки',
  },
  tennis: {
    rackets: 'Тенис ракети',
    balls: 'Тенис топки',
    grips: 'Тенис грипове',
    strings: 'Тенис кордажи',
    bags: 'Тенис чанти',
    accessories: 'Тенис аксесоари',
    shoes: 'Тенис обувки',
  },
  'table-tennis': {
    rackets: 'Хилки',
    balls: 'Топчета',
    bags: 'Чанти',
    accessories: 'Аксесоари',
  },
};

const subcategoriesBySlug = new Map(shopSubcategories.map((subcategory) => [subcategory.slug, subcategory]));
const subcategoriesByLabel = new Map(shopSubcategories.map((subcategory) => [subcategory.label, subcategory]));

export function getSubcategoryByParam(value: string) {
  return subcategoriesBySlug.get(value) ?? subcategoriesByLabel.get(value);
}

export function getSubcategoriesForSport(sportSlug: string) {
  const labels = sportSpecificLabels[sportSlug] ?? {};
  const slugs = subcategorySlugsBySport[sportSlug] ?? shopSubcategories.map((subcategory) => subcategory.slug);

  return slugs.flatMap((slug) => {
    const subcategory = subcategoriesBySlug.get(slug);
    if (!subcategory) {
      return [];
    }

    return [{
      ...subcategory,
      label: labels[slug] ?? subcategory.label,
      imageUrl: subcategory.imageBySport?.[sportSlug] ?? subcategory.imageUrl,
      fallbackImageUrl: subcategory.fallbackBySport?.[sportSlug]
        ?? subcategory.fallbackImageUrl
        ?? subcategory.imageBySport?.[sportSlug]
        ?? subcategory.imageUrl,
    }];
  });
}

export function getSubcategoriesForProducts(products: Product[], sportSlug?: string) {
  const subcategories = sportSlug ? getSubcategoriesForSport(sportSlug) : shopSubcategories;

  return subcategories.map((subcategory) => ({
    ...subcategory,
    count: products.filter((product) => subcategory.productTypes.includes(product.type)).length,
  }));
}
