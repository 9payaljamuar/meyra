// Shared catalog vocabulary. Clients fetch it from GET /meta so lists stay in one place.
export const GROUPS = ['Cosmetics', 'Apparel', 'Accessories'] as const;

export const CATEGORIES: Record<(typeof GROUPS)[number], string[]> = {
  Cosmetics: ['Skincare', 'Haircare', 'Makeup', 'Fragrance'],
  Apparel: ['Dresses', 'Tops', 'Kurtas', 'Bottoms'],
  Accessories: ['Earrings', 'Necklaces', 'Hair Accessories', 'Bags'],
};

export const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'];
export const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Dry & Frizzy', 'Oily Scalp', 'Thinning'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const ALL_CATEGORIES = Object.values(CATEGORIES).flat();
