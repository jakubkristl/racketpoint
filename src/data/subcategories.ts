import type { Product } from './catalog';

export type ShopSubcategory = {
  slug: string;
  label: string;
  shortLabel: string;
  productTypes: Product['type'][];
  imageUrl: string;
  fallbackImageUrl: string;
};

export const shopSubcategories: ShopSubcategory[] = [
  {
    slug: 'rackets',
    label: 'Ракети',
    shortLabel: 'Ракети',
    productTypes: ['Racket'],
    imageUrl: '/branding/category/subcategories/rackets.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-rakety-52.thumb.jpg.avif?688361',
  },
  {
    slug: 'balls',
    label: 'Топки и пера',
    shortLabel: 'Топки',
    productTypes: ['Balls'],
    imageUrl: '/branding/category/subcategories/balls.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-lopticky-53.thumb.jpg.avif?688412',
  },
  {
    slug: 'grips',
    label: 'Грипове',
    shortLabel: 'Грипове',
    productTypes: ['Grip'],
    imageUrl: '/branding/category/subcategories/grips.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-gripy-omotavky-54.thumb.jpg.avif?688546',
  },
  {
    slug: 'strings',
    label: 'Корди',
    shortLabel: 'Корди',
    productTypes: ['String'],
    imageUrl: '/branding/category/subcategories/strings.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-vyplety-55.thumb.jpg.avif?688620',
  },
  {
    slug: 'bags',
    label: 'Чанти',
    shortLabel: 'Чанти',
    productTypes: ['Bag'],
    imageUrl: '/branding/category/subcategories/bags.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-tasky-56.thumb.jpg.avif?688780',
  },
  {
    slug: 'accessories',
    label: 'Аксесоари',
    shortLabel: 'Аксесоари',
    productTypes: ['Accessory'],
    imageUrl: '/branding/category/subcategories/accessories.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashove-doplnky-57.thumb.jpg.avif?688965',
  },
  {
    slug: 'shoes',
    label: 'Обувки',
    shortLabel: 'Обувки',
    productTypes: ['Shoe'],
    imageUrl: '/branding/category/subcategories/shoes.avif',
    fallbackImageUrl: 'https://www.rakety.sk/sub/rakety.sk/shop/category/squashova-obuv-96.thumb.jpg.avif?437790',
  },
];

const subcategoriesBySlug = new Map(shopSubcategories.map((subcategory) => [subcategory.slug, subcategory]));
const subcategoriesByLabel = new Map(shopSubcategories.map((subcategory) => [subcategory.label, subcategory]));

export function getSubcategoryByParam(value: string) {
  return subcategoriesBySlug.get(value) ?? subcategoriesByLabel.get(value);
}

export function getSubcategoriesForProducts(products: Product[]) {
  return shopSubcategories.map((subcategory) => ({
    ...subcategory,
    count: products.filter((product) => subcategory.productTypes.includes(product.type)).length,
  }));
}