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

const subcategorySlugsBySport: Record<string, string[]> = {
  squash: ['rackets', 'balls', 'grips', 'strings', 'bags', 'accessories', 'shoes'],
  badminton: ['rackets', 'balls', 'grips', 'bags', 'accessories', 'shoes'],
  padel: ['rackets', 'balls', 'grips', 'bags', 'accessories', 'shoes'],
  tennis: ['rackets', 'balls', 'grips', 'strings', 'bags', 'accessories', 'shoes'],
  'table-tennis': ['rackets', 'balls', 'bags', 'accessories'],
};

const sportSpecificLabels: Record<string, Record<string, string>> = {
  squash: { balls: 'Топки' },
  badminton: { balls: 'Пера' },
  padel: { rackets: 'Падел ракети' },
  'table-tennis': { rackets: 'Хилки', balls: 'Топчета' },
};

const subcategoryImagesBySport: Record<string, Partial<Record<string, { imageUrl: string; fallbackImageUrl: string }>>> = {
  squash: {
    rackets: { imageUrl: '/branding/category/subcategories/rackets.avif', fallbackImageUrl: 'https://images.pexels.com/photos/14629511/pexels-photo-14629511.jpeg?auto=compress&cs=tinysrgb&w=600' },
    balls: { imageUrl: '/branding/category/subcategories/balls.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648078/pexels-photo-7648078.jpeg?auto=compress&cs=tinysrgb&w=600' },
    grips: { imageUrl: '/branding/category/subcategories/grips.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648079/pexels-photo-7648079.jpeg?auto=compress&cs=tinysrgb&w=600' },
    strings: { imageUrl: '/branding/category/subcategories/strings.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648084/pexels-photo-7648084.jpeg?auto=compress&cs=tinysrgb&w=600' },
    bags: { imageUrl: '/branding/category/subcategories/bags.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648297/pexels-photo-7648297.jpeg?auto=compress&cs=tinysrgb&w=600' },
    accessories: { imageUrl: '/branding/category/subcategories/accessories.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648080/pexels-photo-7648080.jpeg?auto=compress&cs=tinysrgb&w=600' },
    shoes: { imageUrl: '/branding/category/subcategories/shoes.avif', fallbackImageUrl: 'https://images.pexels.com/photos/7648280/pexels-photo-7648280.jpeg?auto=compress&cs=tinysrgb&w=600' },
  },
  badminton: {
    rackets: { imageUrl: 'https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/rackets.avif' },
    balls: { imageUrl: 'https://images.pexels.com/photos/8007075/pexels-photo-8007075.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/balls.avif' },
    grips: { imageUrl: 'https://images.pexels.com/photos/6878017/pexels-photo-6878017.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/grips.avif' },
    bags: { imageUrl: 'https://images.pexels.com/photos/8007173/pexels-photo-8007173.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/bags.avif' },
    accessories: { imageUrl: 'https://images.pexels.com/photos/8007408/pexels-photo-8007408.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/accessories.avif' },
    shoes: { imageUrl: 'https://images.pexels.com/photos/8007094/pexels-photo-8007094.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/shoes.avif' },
  },
  padel: {
    rackets: { imageUrl: 'https://images.pexels.com/photos/35248374/pexels-photo-35248374.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/rackets.avif' },
    balls: { imageUrl: 'https://images.pexels.com/photos/35646550/pexels-photo-35646550.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/balls.avif' },
    grips: { imageUrl: 'https://images.pexels.com/photos/4536850/pexels-photo-4536850.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/grips.avif' },
    bags: { imageUrl: 'https://images.pexels.com/photos/32897038/pexels-photo-32897038.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/bags.avif' },
    accessories: { imageUrl: 'https://images.pexels.com/photos/35248259/pexels-photo-35248259.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/accessories.avif' },
    shoes: { imageUrl: 'https://images.pexels.com/photos/35248470/pexels-photo-35248470.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/shoes.avif' },
  },
  tennis: {
    rackets: { imageUrl: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/rackets.avif' },
    balls: { imageUrl: 'https://images.pexels.com/photos/5739115/pexels-photo-5739115.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/balls.avif' },
    grips: { imageUrl: 'https://images.pexels.com/photos/5739121/pexels-photo-5739121.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/grips.avif' },
    strings: { imageUrl: 'https://images.pexels.com/photos/5741292/pexels-photo-5741292.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/strings.avif' },
    bags: { imageUrl: 'https://images.pexels.com/photos/8223947/pexels-photo-8223947.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/bags.avif' },
    accessories: { imageUrl: 'https://images.pexels.com/photos/12645014/pexels-photo-12645014.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/accessories.avif' },
    shoes: { imageUrl: 'https://images.pexels.com/photos/8224433/pexels-photo-8224433.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/shoes.avif' },
  },
  'table-tennis': {
    rackets: { imageUrl: 'https://images.pexels.com/photos/709134/pexels-photo-709134.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/rackets.avif' },
    balls: { imageUrl: 'https://images.pexels.com/photos/4080060/pexels-photo-4080060.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/balls.avif' },
    bags: { imageUrl: 'https://images.pexels.com/photos/38446271/pexels-photo-38446271.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/bags.avif' },
    accessories: { imageUrl: 'https://images.pexels.com/photos/6631422/pexels-photo-6631422.jpeg?auto=compress&cs=tinysrgb&w=600', fallbackImageUrl: '/branding/category/subcategories/accessories.avif' },
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
    const images = subcategoryImagesBySport[sportSlug]?.[slug];
    return subcategory ? [{ ...subcategory, label: labels[slug] ?? subcategory.label, ...images }] : [];
  });
}

export function getSubcategoriesForProducts(products: Product[], sportSlug?: string) {
  const subcategories = sportSlug ? getSubcategoriesForSport(sportSlug) : shopSubcategories;

  return subcategories.map((subcategory) => ({
    ...subcategory,
    count: products.filter((product) => subcategory.productTypes.includes(product.type)).length,
  }));
}