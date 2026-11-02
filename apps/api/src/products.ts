// Shared product query + serializer so every route returns the same shape.

export const PRODUCT_SELECT = `
  SELECT p.*, s.business_name AS seller_name,
         COALESCE(r.avg, 0) AS rating, COALESCE(r.cnt, 0) AS review_count,
         ROUND((p.mrp - p.price) * 100 / NULLIF(p.mrp, 0))::int AS discount
  FROM products p
  JOIN sellers s ON s.user_id = p.seller_id
  LEFT JOIN (
    SELECT product_id, AVG(rating)::float AS avg, COUNT(*)::int AS cnt
    FROM reviews GROUP BY product_id
  ) r ON r.product_id = p.id
`;

const NEW_DAYS = 14;

export function serializeProduct(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    group: r.grp,
    category: r.category,
    price: r.price,
    mrp: r.mrp,
    discount: r.discount ?? 0,
    stock: r.stock,
    images: r.images,
    skinTypes: r.skin_types,
    hairTypes: r.hair_types,
    sizes: r.sizes,
    option: r.option_label && r.options?.length ? {label: r.option_label, values: r.options} : null,
    status: r.status,
    rejectReason: r.reject_reason,
    featured: r.featured,
    isNew: Date.now() - new Date(r.created_at).getTime() < NEW_DAYS * 864e5,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    rating: Math.round((r.rating ?? 0) * 10) / 10,
    reviewCount: r.review_count ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
