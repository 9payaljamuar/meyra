import {Product} from './catalog';

export type Review = {
  id: string;
  name: string;
  rating: number;
  date: string;
  text: string;
  photo?: string;
  verified: boolean;
};

const POOL: Omit<Review, 'id' | 'photo'>[] = [
  {name: 'Ananya R.', rating: 5, date: '12 Oct 2026', text: 'Absolutely love it. Quality is much better than I expected for the price.', verified: true},
  {name: 'Priya S.', rating: 4, date: '03 Oct 2026', text: 'Looks exactly like the pictures. Delivery was quick and packaging was neat.', verified: true},
  {name: 'Kavya M.', rating: 5, date: '27 Sep 2026', text: 'Got so many compliments! Will definitely order again.', verified: true},
  {name: 'Sneha K.', rating: 4, date: '19 Sep 2026', text: 'Good value for money. Would recommend to friends.', verified: true},
  {name: 'Riya P.', rating: 3, date: '08 Sep 2026', text: 'Decent product. Slightly different shade in real light but still nice.', verified: true},
  {name: 'Meera J.', rating: 5, date: '30 Aug 2026', text: 'Perfect! Exactly what I was looking for.', verified: false},
];

const COSMETIC_POOL: Omit<Review, 'id' | 'photo'>[] = [
  {name: 'Ananya R.', rating: 5, date: '12 Oct 2026', text: 'Gentle on my skin and smells lovely. Noticed a difference in two weeks.', verified: true},
  {name: 'Priya S.', rating: 4, date: '03 Oct 2026', text: 'Natural ingredients and no irritation. Bottle design is premium too.', verified: true},
  {name: 'Kavya M.', rating: 5, date: '27 Sep 2026', text: 'Using it daily now. My hair feels softer and healthier.', verified: true},
  {name: 'Sneha K.', rating: 4, date: '19 Sep 2026', text: 'Good product, a little goes a long way.', verified: true},
];

export function reviewsFor(p: Product): Review[] {
  const pool = p.group === 'Cosmetics' ? COSMETIC_POOL : POOL;
  const seed = p.id.charCodeAt(p.id.length - 1);
  const out: Review[] = [];
  for (let i = 0; i < Math.min(4, pool.length); i++) {
    const r = pool[(seed + i) % pool.length];
    out.push({
      ...r,
      id: `${p.id}-r${i}`,
      photo: i % 2 === 0 ? p.images[i % p.images.length] : undefined,
    });
  }
  return out;
}
