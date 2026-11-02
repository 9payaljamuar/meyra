import React, {useRef} from 'react';
import {Animated, DimensionValue, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {HeartButton} from './fx';
import {RatingPill} from './ui';
import {imageUrl, Product} from '../api';
import {colors, fonts, rupee} from '../theme';
import {useStore} from '../store';

export const CARD_W = 164;

export default function ProductCard({
  product, onPress, width, dark,
}: {product: Product; onPress: () => void; width?: DimensionValue; dark?: boolean}) {
  const {wishlist, toggleWish} = useStore();
  const wished = wishlist.includes(product.id);
  const ink = dark ? '#fff' : colors.ink;
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, {toValue: v, friction: 7, tension: 200, useNativeDriver: true}).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.96)} onPressOut={() => to(1)} style={{width: width ?? CARD_W}}>
      <Animated.View style={{transform: [{scale}]}}>
        <View style={s.imgWrap}>
          <Image source={imageUrl(product.images[0])} style={s.img} resizeMode="cover" />
          <HeartButton active={wished} onPress={() => toggleWish(product.id)} style={s.heart} />
          {product.featured ? (
            <Text style={s.tag}>BESTSELLER</Text>
          ) : product.isNew ? (
            <Text style={[s.tag, {backgroundColor: colors.gold}]}>NEW</Text>
          ) : null}
          {product.stock === 0 && (
            <View style={s.soldOut}><Text style={s.soldOutText}>SOLD OUT</Text></View>
          )}
          {product.reviewCount > 0 && (
            <View style={s.rating}>
              <RatingPill rating={product.rating} count={product.reviewCount} />
            </View>
          )}
        </View>
        <Text style={[s.seller, dark && {color: colors.goldLight}]} numberOfLines={1}>{product.sellerName.toUpperCase()}</Text>
        <Text style={[s.name, {color: ink}]} numberOfLines={2}>{product.name}</Text>
        <View style={s.priceRow}>
          <Text style={[s.price, {color: ink}]}>{rupee(product.price)}</Text>
          {product.discount > 0 && (
            <>
              <Text style={[s.mrp, dark && {color: '#9A938A'}]}>{rupee(product.mrp)}</Text>
              <Text style={s.off}>{product.discount}% OFF</Text>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  imgWrap: {borderRadius: 4, overflow: 'hidden', backgroundColor: '#F2EDE5', aspectRatio: 0.75},
  img: {width: '100%', height: '100%'},
  heart: {
    position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  tag: {
    position: 'absolute', top: 10, left: 0, backgroundColor: colors.ink, color: '#fff',
    fontSize: 8.5, fontWeight: '800', letterSpacing: 1.4, paddingHorizontal: 8, paddingVertical: 4,
    overflow: 'hidden',
  },
  soldOut: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(250,247,242,0.65)', alignItems: 'center', justifyContent: 'center'},
  soldOutText: {fontWeight: '800', color: colors.ink, fontSize: 11, letterSpacing: 2},
  rating: {position: 'absolute', bottom: 8, left: 8},
  seller: {marginTop: 10, fontSize: 9.5, color: colors.muted, letterSpacing: 1.2, fontWeight: '600'},
  name: {marginTop: 3, fontSize: 13.5, lineHeight: 18, minHeight: 36},
  priceRow: {flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 5, flexWrap: 'wrap'},
  price: {fontSize: 16, fontFamily: fonts.serif},
  mrp: {fontSize: 11.5, color: colors.muted, textDecorationLine: 'line-through'},
  off: {fontSize: 10.5, color: colors.blushDark, fontWeight: '800', letterSpacing: 0.4},
});
