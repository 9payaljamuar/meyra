export type Group = 'Cosmetics' | 'Apparel' | 'Accessories';
export type Category =
  | 'Skincare'
  | 'Haircare'
  | 'Dresses'
  | 'Earrings'
  | 'Necklaces'
  | 'Hair Accessories';

export type Option = {
  label: 'Shade' | 'Colour';
  values: {name: string; hex: string; images?: string[]}[];
};

export type Product = {
  id: string;
  name: string;
  seller: string;
  group: Group;
  category: Category;
  price: number;
  mrp: number;
  images: string[];
  desc: string;
  skinTypes?: string[];
  hairTypes?: string[];
  option?: Option;
  sizes?: string[];
  rating: number;
  reviewCount: number;
  bestseller?: boolean;
  isNew?: boolean;
};

export const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'];
export const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Dry & Frizzy', 'Oily Scalp', 'Thinning'];

export const discountOf = (p: Product) =>
  Math.round(((p.mrp - p.price) / p.mrp) * 100);

const ALL_SKIN = SKIN_TYPES;
const ALL_HAIR = HAIR_TYPES;
const MEYRA = 'Meyra Glory';
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const PRODUCTS: Product[] = [
  // ---- Cosmetics (Meyra Glory) ----
  {
    id: 'c1', name: 'Aloe Vera Cleansing Milk', seller: MEYRA, group: 'Cosmetics',
    category: 'Skincare', price: 399, mrp: 499, images: ['m-aloe-cm'],
    desc: 'A silky, gentle cleanser that removes makeup and impurities while keeping skin soft, hydrated and naturally glowing.',
    skinTypes: ['Dry', 'Sensitive', 'Normal', 'Combination'], rating: 4.5, reviewCount: 128, bestseller: true,
  },
  {
    id: 'c10', name: 'Orange Cleansing Milk', seller: MEYRA, group: 'Cosmetics',
    category: 'Skincare', price: 399, mrp: 499, images: ['m-orange'],
    desc: 'Removes dirt, makeup and impurities while energizing skin. Enriched with orange extract to brighten dull skin. Ideal for daily use and all skin types.',
    skinTypes: ALL_SKIN, rating: 4.6, reviewCount: 96, bestseller: true,
  },
  {
    id: 'c4', name: 'Charcoal Facewash', seller: MEYRA, group: 'Cosmetics',
    category: 'Skincare', price: 549, mrp: 699, images: ['m-charcoal'],
    desc: 'Deep-cleansing charcoal facewash that pulls out excess oil and pollution for clear, fresh skin.',
    skinTypes: ['Oily', 'Combination'], rating: 4.4, reviewCount: 74,
  },
  {
    id: 'c5', name: 'De-Tan Papaya Facewash', seller: MEYRA, group: 'Cosmetics',
    category: 'Skincare', price: 499, mrp: 649, images: ['m-papaya'],
    desc: 'Papaya enzymes gently lift tan and dullness, revealing an even, radiant glow.',
    skinTypes: ['Normal', 'Combination', 'Dry'], rating: 4.3, reviewCount: 58,
  },
  {
    id: 'c8', name: 'Neem Facewash', seller: MEYRA, group: 'Cosmetics',
    category: 'Skincare', price: 399, mrp: 549, images: ['m-neem'],
    desc: 'A gentle, refreshing cleanser with neem that removes impurities and keeps breakouts in check.',
    skinTypes: ['Oily', 'Combination', 'Normal'], rating: 4.5, reviewCount: 83,
  },
  {
    id: 'c2', name: 'Aloe Vera Shampoo', seller: MEYRA, group: 'Cosmetics',
    category: 'Haircare', price: 349, mrp: 449, images: ['m-aloe-sh'],
    desc: 'Nourishing, sulfate-free formula that gently cleanses and leaves hair soft and healthy with every wash.',
    hairTypes: ['Dry & Frizzy', 'Wavy', 'Straight', 'Curly'], rating: 4.4, reviewCount: 61,
  },
  {
    id: 'c3', name: 'Anti Dandruff Shampoo', seller: MEYRA, group: 'Cosmetics',
    category: 'Haircare', price: 299, mrp: 399, images: ['m-dandruff'],
    desc: 'Clears flakes and soothes the scalp while keeping hair fresh and manageable.',
    hairTypes: ['Oily Scalp', 'Straight', 'Wavy'], rating: 4.2, reviewCount: 47,
  },
  {
    id: 'c9', name: 'Onion Shampoo', seller: MEYRA, group: 'Cosmetics',
    category: 'Haircare', price: 399, mrp: 499, images: ['m-onion'],
    desc: 'Onion-extract shampoo that nourishes roots and helps reduce hair fall.',
    hairTypes: ['Thinning', 'Straight', 'Wavy', 'Curly'], rating: 4.5, reviewCount: 102, bestseller: true,
  },
  {
    id: 'c7', name: 'Hair Growth Solution', seller: MEYRA, group: 'Cosmetics',
    category: 'Haircare', price: 1199, mrp: 1599, images: ['m-hairgrowth'],
    desc: 'A revitalizing blend of Indian botanicals that strengthens roots, reduces hair fall and supports thicker, healthier hair.',
    hairTypes: ALL_HAIR, rating: 4.6, reviewCount: 139, bestseller: true,
  },
  {
    id: 'c6', name: 'Glo Scent Hair Mist', seller: MEYRA, group: 'Cosmetics',
    category: 'Haircare', price: 849, mrp: 999, images: ['m-mist'],
    desc: 'Fragrant leave-in hair mist for a long-lasting fresh scent and a soft, glossy finish.',
    hairTypes: ALL_HAIR, rating: 4.3, reviewCount: 22, isNew: true,
  },

  // ---- Accessories: earrings & necklaces ----
  {
    id: 'j1', name: 'Pearl Bow Stud Earrings', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 249, mrp: 499, images: ['p01', 'p04'],
    desc: 'Dainty golden bow studs with a lustrous pearl drop. Lightweight for all-day wear.',
    rating: 4.4, reviewCount: 36, bestseller: true,
  },
  {
    id: 'j2', name: 'Oxidised Kundan Chandbali', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 399, mrp: 899, images: ['p02'],
    desc: 'Statement oxidised chandbali with sparkling stones and a pearl drop. Perfect with ethnic wear.',
    rating: 4.6, reviewCount: 52,
  },
  {
    id: 'j3', name: 'Butterfly Crystal Studs', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 199, mrp: 399, images: ['p03', 'p07'],
    desc: 'Colourful enamel butterfly studs topped with a clear crystal.',
    rating: 4.3, reviewCount: 29, isNew: true,
  },
  {
    id: 'j4', name: 'Pearl & Crystal Floral Drops', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 449, mrp: 799, images: ['p05', 'p10'],
    desc: 'Elegant floral drop earrings with pearl petals and smoky crystal teardrops.',
    rating: 4.5, reviewCount: 41,
  },
  {
    id: 'j5', name: 'Oxidised Mirror Jhumka Studs', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 349, mrp: 699, images: ['p06', 'p09'],
    desc: 'Mirror-work oxidised studs with tiny ghungroo beads. Boho meets festive.',
    rating: 4.5, reviewCount: 33,
  },
  {
    id: 'j6', name: 'Crystal Round Studs', seller: 'Silver Tales', group: 'Accessories',
    category: 'Earrings', price: 299, mrp: 499, images: ['p08'],
    desc: 'Sparkling round studs with a vintage-style crystal cluster.',
    rating: 4.2, reviewCount: 18,
  },
  {
    id: 'j7', name: 'Heart Pendant Necklace', seller: 'Silver Tales', group: 'Accessories',
    category: 'Necklaces', price: 599, mrp: 999, images: ['p15'],
    desc: 'Minimal silver-tone chain with a delicate heart pendant.',
    rating: 4.6, reviewCount: 64,
  },
  {
    id: 'j8', name: 'Gold Open-Heart Necklace', seller: 'Silver Tales', group: 'Accessories',
    category: 'Necklaces', price: 649, mrp: 1099, images: ['p17'],
    desc: 'Fine gold-tone chain with an open heart pendant. Everyday elegance.',
    rating: 4.7, reviewCount: 71, bestseller: true,
  },

  // ---- Accessories: hair ----
  {
    id: 'h1', name: 'Gold Rectangle Hair Claw', seller: 'Clip & Co', group: 'Accessories',
    category: 'Hair Accessories', price: 199, mrp: 349, images: ['p11'],
    desc: 'Minimal gold-tone rectangle claw clip with a strong grip.',
    rating: 4.4, reviewCount: 45,
  },
  {
    id: 'h2', name: 'Round Sunglasses Hair Clip', seller: 'Clip & Co', group: 'Accessories',
    category: 'Hair Accessories', price: 149, mrp: 299, images: ['p12'],
    desc: 'Playful round sunglasses clip for half-up styles.',
    rating: 4.1, reviewCount: 14, isNew: true,
  },
  {
    id: 'h3', name: 'Bow Pom-Pom Claw Clip', seller: 'Clip & Co', group: 'Accessories',
    category: 'Hair Accessories', price: 299, mrp: 499, images: ['p13'],
    desc: 'Soft cream bow claw with pom-pom charms and a pearl tassel.',
    rating: 4.5, reviewCount: 27,
  },
  {
    id: 'h4', name: 'Gold Twist Pearl Claw', seller: 'Clip & Co', group: 'Accessories',
    category: 'Hair Accessories', price: 349, mrp: 599, images: ['p14'],
    desc: 'Sculpted gold twist claw with pearl detailing for effortless updos.',
    rating: 4.6, reviewCount: 38,
  },
  {
    id: 'h5', name: 'Floral Claw Clip Set', seller: 'Clip & Co', group: 'Accessories',
    category: 'Hair Accessories', price: 249, mrp: 399, images: ['p16'],
    desc: 'Set of matte floral claw clips in neutral shades.',
    rating: 4.3, reviewCount: 31,
  },

  // ---- Apparel ----
  {
    id: 'a1', name: 'Floral Puff-Sleeve Midi Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 1299, mrp: 2499, images: ['p18'], sizes: SIZES,
    desc: 'Sweetheart neckline, puff sleeves and a flattering side slit in a soft ditsy floral print.',
    rating: 4.5, reviewCount: 57, bestseller: true,
  },
  {
    id: 'a2', name: 'Printed Wrap Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 1099, mrp: 1999, images: ['p19'], sizes: SIZES,
    desc: 'Easy knee-length dress with a ruched front and long sleeves.',
    rating: 4.2, reviewCount: 24,
  },
  {
    id: 'a3', name: 'Flutter Sleeve Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 899, mrp: 1599, images: ['p20'], sizes: SIZES,
    desc: 'Breezy flutter-sleeve dress in a lightweight fabric. Available in many colours.',
    rating: 4.1, reviewCount: 19,
  },
  {
    id: 'a4', name: 'Tropical Print Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 999, mrp: 1799, images: ['p21'], sizes: SIZES,
    desc: 'Soft pastel tropical print with a gathered V-neck and 3/4 sleeves.',
    rating: 4.3, reviewCount: 22, isNew: true,
  },
  {
    id: 'a5', name: 'Green Floral Wrap Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 1199, mrp: 2199, images: ['p22'], sizes: SIZES,
    desc: 'Fresh green floral dress with a ruched bodice, perfect for brunch and travel.',
    rating: 4.4, reviewCount: 35,
  },
  {
    id: 'a6', name: 'Halter Floral Maxi Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 1899, mrp: 3499, images: ['p23'], sizes: SIZES,
    desc: 'Deep-V halter maxi with a tiered, flowing skirt. Made for parties and vacations.',
    rating: 4.7, reviewCount: 44, bestseller: true,
  },
  {
    id: 'a7', name: 'Cream Floral Slit Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 1399, mrp: 2699, images: ['p24'], sizes: SIZES,
    desc: 'Puff-sleeve midi in a creamy floral print with a high side slit.',
    rating: 4.5, reviewCount: 39,
  },
  {
    id: 'a8', name: 'High-Low Sleeveless Dress', seller: 'Urban Frock', group: 'Apparel',
    category: 'Dresses', price: 999, mrp: 1799, images: ['p25'], sizes: SIZES,
    desc: 'Sleeveless V-neck dress with an elasticated waist and a high-low hem.',
    option: {
      label: 'Colour',
      values: [
        {name: 'Blush Pink', hex: '#E8A0BA', images: ['p25']},
        {name: 'Mustard', hex: '#E0A81F', images: ['p26']},
        {name: 'Magenta', hex: '#A8236A', images: ['p27']},
      ],
    },
    rating: 4.4, reviewCount: 48, isNew: true,
  },
];

export const byId = (id: string) => PRODUCTS.find(p => p.id === id)!;

export const CATEGORY_TILES: {name: string; category?: Category; group?: Group; image: string}[] = [
  {name: 'Skincare', category: 'Skincare', image: 'm-orange'},
  {name: 'Haircare', category: 'Haircare', image: 'm-hairgrowth'},
  {name: 'Dresses', category: 'Dresses', image: 'p23'},
  {name: 'Earrings', category: 'Earrings', image: 'p05'},
  {name: 'Necklaces', category: 'Necklaces', image: 'p17'},
  {name: 'Hair Clips', category: 'Hair Accessories', image: 'p14'},
];
