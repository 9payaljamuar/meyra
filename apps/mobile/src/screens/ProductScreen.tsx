import React, {useRef, useState} from 'react';
import {
  ActivityIndicator, Animated, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import {Button, Chip, ErrorState, RatingPill, SectionHeader, Stars} from '../components/ui';
import {colors, fonts, radius, rupee} from '../theme';
import {HeartButton, useToast} from '../components/fx';
import {imageUrl, Product, Review, useApi} from '../api';
import {useStore} from '../store';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});

export default function ProductScreen({navigation, route}: any) {
  const {id} = route.params;
  const {data: product, error, reload} = useApi<Product>(`/products/${id}`);
  const {data: reviews} = useApi<Review[]>(`/products/${id}/reviews`);
  const {data: similar} = useApi<Product[]>(product ? `/products?category=${encodeURIComponent(product.category)}&limit=8` : null);
  const {width} = useWindowDimensions();
  const {addToCart, wishlist, toggleWish, count, user} = useStore();
  const toast = useToast();
  const [optIdx, setOptIdx] = useState(0);
  const [size, setSize] = useState<string | undefined>();
  const [slide, setSlide] = useState(0);
  const [tried, setTried] = useState(false);
  const burst = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  if (error) return <SafeAreaView style={s.root}><ErrorState message={error} onRetry={reload} /></SafeAreaView>;
  if (!product) return <SafeAreaView style={s.root}><ActivityIndicator color={colors.gold} style={{marginTop: 80}} /></SafeAreaView>;

  const opt = product.option?.values[optIdx];
  const gallery = opt?.images?.length ? opt.images : product.images;
  const wished = wishlist.includes(product.id);
  const needSize = product.sizes.length > 0 && !size;
  const soldOut = product.stock === 0;
  // Stock per shade/colour × size, when the seller tracks it.
  const vs = product.variantStock ?? {};
  const hasVariants = Object.keys(vs).length > 0;
  const availFor = (o?: string, z?: string) => (hasVariants ? vs[`${o ?? ''}|${z ?? ''}`] ?? 0 : product.stock);
  const optionAvail = (o: string) =>
    product.sizes.length ? product.sizes.reduce((n, z) => n + availFor(o, z), 0) : availFor(o, undefined);
  const selected = !needSize ? availFor(opt?.name, size) : null;
  const selectionOut = selected === 0 && !soldOut;
  const others = (similar ?? []).filter(p => p.id !== product.id);

  const add = () => {
    setTried(true);
    if (needSize || soldOut || selectionOut) return false;
    addToCart(product, opt?.name, size);
    return true;
  };

  const imgH = width * 1.25;

  // Double-tap the photo to like it, Instagram-style.
  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!wished) toggleWish(product.id);
      burst.setValue(0);
      Animated.sequence([
        Animated.spring(burst, {toValue: 1, friction: 4, tension: 120, useNativeDriver: true}),
        Animated.timing(burst, {toValue: 2, duration: 300, delay: 250, useNativeDriver: true}),
      ]).start();
    }
    lastTap.current = now;
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <FlatList
            key={optIdx}
            data={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i, n) => i + n}
            onMomentumScrollEnd={e => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({item}) => (
              <Pressable onPress={onImageTap}>
                <Image source={imageUrl(item)} style={{width, height: imgH, backgroundColor: '#F2EDE5'}} resizeMode="cover" />
              </Pressable>
            )}
          />
          <Animated.View pointerEvents="none" style={[s.burst, {
            opacity: burst.interpolate({inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0]}),
            transform: [{scale: burst.interpolate({inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.3]})}],
          }]}>
            <Icon name="heart" size={96} color="#fff" fill="#fff" strokeWidth={1} />
          </Animated.View>
          <View style={s.tapHint} pointerEvents="none">
            <Text style={s.tapHintText}>DOUBLE-TAP TO SAVE</Text>
          </View>
          <Pressable style={[s.round, {left: 12}]} onPress={() => navigation.goBack()}>
            <Icon name="back" color={colors.ink} />
          </Pressable>
          <View style={[s.roundRow, {right: 12}]}>
            <HeartButton active={wished} size={20} style={s.round2} onPress={() => {
              toggleWish(product.id);
              if (!wished) toast('Saved to wishlist');
            }} />
            <Pressable style={s.round2} onPress={() => navigation.navigate('Tabs', {screen: 'Cart'})}>
              <Icon name="bag" color={colors.ink} />
              {count > 0 && <View style={s.dot}><Text style={s.dotText}>{count}</Text></View>}
            </Pressable>
          </View>
          {gallery.length > 1 && (
            <View style={s.dots}>
              {gallery.map((_, i) => (
                <View key={i} style={[s.pip, i === slide && s.pipOn]} />
              ))}
            </View>
          )}
        </View>

        <View style={s.body}>
          <Text style={s.seller}>{product.sellerName}</Text>
          <Text style={s.name}>{product.name}</Text>
          {product.reviewCount > 0 && (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
              <RatingPill rating={product.rating} count={product.reviewCount} />
              <Text style={{color: colors.muted, fontSize: 12}}>{product.reviewCount} ratings</Text>
            </View>
          )}

          <View style={s.priceRow}>
            <Text style={s.price}>{rupee(product.price)}</Text>
            {product.discount > 0 && (
              <>
                <Text style={s.mrp}>{rupee(product.mrp)}</Text>
                <View style={s.offPill}><Text style={s.offText}>{product.discount}% OFF</Text></View>
              </>
            )}
          </View>
          <Text style={s.tax}>Inclusive of all taxes · Free delivery above ₹499</Text>
          {soldOut ? (
            <Text style={[s.stock, {color: colors.red}]}>Out of stock</Text>
          ) : selectionOut ? (
            <Text style={[s.stock, {color: colors.red}]}>This {[opt && product.option?.label.toLowerCase(), size && 'size'].filter(Boolean).join(' & ') || 'option'} is sold out</Text>
          ) : selected != null && selected < 5 ? (
            <Text style={[s.stock, {color: colors.red}]}>Hurry, only {selected} left!</Text>
          ) : null}

          {product.option && (
            <View style={{marginTop: 20}}>
              <Text style={s.label}>
                {product.option.label.toUpperCase()}: <Text style={{fontWeight: '400', letterSpacing: 0}}>{opt?.name}</Text>
              </Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10}}>
                {product.option.values.map((v, i) => (
                  <Pressable key={v.name} onPress={() => { setOptIdx(i); setSlide(0); }}
                    style={[s.swatchRing, i === optIdx && {borderColor: colors.ink}, optionAvail(v.name) === 0 && {opacity: 0.35}]}>
                    <View style={[s.swatch, {backgroundColor: v.hex}]} />
                    {optionAvail(v.name) === 0 && <View style={s.strike} />}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {product.sizes.length > 0 && (
            <View style={{marginTop: 20}}>
              <Text style={s.label}>SELECT SIZE</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10}}>
                {product.sizes.map(z => (
                  <Pressable key={z} onPress={() => setSize(z)}
                    style={[s.size, size === z && s.sizeOn, availFor(opt?.name, z) === 0 && s.sizeOut]}>
                    <Text style={[s.sizeText, size === z && {color: '#fff'}, availFor(opt?.name, z) === 0 && {textDecorationLine: 'line-through'}]}>{z}</Text>
                  </Pressable>
                ))}
              </View>
              {needSize && tried && <Text style={s.hint}>Please select a size</Text>}
            </View>
          )}

          {(product.skinTypes.length > 0 || product.hairTypes.length > 0) && (
            <View style={{marginTop: 20}}>
              <Text style={s.label}>{product.skinTypes.length ? 'SUITABLE FOR SKIN' : 'SUITABLE FOR HAIR'}</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
                {(product.skinTypes.length ? product.skinTypes : product.hairTypes).map(t => <Chip key={t} label={t} />)}
              </View>
            </View>
          )}

          <View style={s.divider} />
          <Text style={s.label}>THE DETAILS</Text>
          <Text style={s.desc}>{product.description || 'No description provided.'}</Text>

          <View style={s.trust}>
            <Trust icon="shield" text="Genuine, KYC-verified seller" />
            <Trust icon="package" text="Easy 7-day returns" />
          </View>
        </View>

        <SectionHeader
          kicker="Real customers"
          title="Reviews"
          action="Write a review"
          onAction={() => (user ? navigation.navigate('WriteReview', {product}) : navigation.navigate('Login'))}
        />
        {product.reviewCount > 0 ? (
          <View style={s.revSummary}>
            <Text style={s.revBig}>{product.rating.toFixed(1)}</Text>
            <View style={{marginLeft: 12}}>
              <Stars rating={product.rating} size={16} />
              <Text style={{color: colors.muted, fontSize: 12, marginTop: 4}}>Based on {product.reviewCount} ratings</Text>
            </View>
          </View>
        ) : (
          <Text style={{paddingHorizontal: 16, color: colors.muted}}>No reviews yet. Be the first!</Text>
        )}
        <View style={{paddingHorizontal: 16}}>
          {(reviews ?? []).slice(0, 6).map(r => (
            <View key={r.id} style={s.review}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{fontWeight: '700', color: colors.ink}}>{r.name}</Text>
                <Text style={{color: colors.muted, fontSize: 12}}>{fmtDate(r.createdAt)}</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4}}>
                <Stars rating={r.rating} size={12} />
                {r.verified && <Text style={{color: colors.green, fontSize: 11, fontWeight: '600'}}>✓ Verified purchase</Text>}
              </View>
              {!!r.text && <Text style={s.revText}>{r.text}</Text>}
              {r.photos.length > 0 && (
                <View style={{flexDirection: 'row', gap: 8}}>
                  {r.photos.map(p => <Image key={p} source={imageUrl(p)} style={s.revPhoto} />)}
                </View>
              )}
            </View>
          ))}
        </View>

        {others.length > 0 && (
          <>
            <SectionHeader kicker="More to love" title="You may also like" />
            <FlatList
              horizontal data={others} keyExtractor={p => String(p.id)} showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 16, gap: 12, paddingBottom: 24}}
              renderItem={({item}) => (
                <ProductCard product={item} onPress={() => navigation.push('Product', {id: item.id})} />
              )}
            />
          </>
        )}
      </ScrollView>

      <View style={s.bar}>
        <Button title={soldOut ? 'Sold out' : 'Add to bag'} variant="outline" style={{flex: 1}} disabled={soldOut || selectionOut}
          onPress={() => add() && toast('Added to bag', {label: 'VIEW BAG', onPress: () => navigation.navigate('Tabs', {screen: 'Cart'})})} />
        <Button title="Buy now" style={{flex: 1}} disabled={soldOut || selectionOut}
          onPress={() => { if (add()) navigation.navigate('Tabs', {screen: 'Cart'}); }} />
      </View>
    </SafeAreaView>
  );
}

function Trust({icon, text}: {icon: 'shield' | 'package'; text: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
      <Icon name={icon} size={20} color={colors.goldDark} />
      <Text style={{fontSize: 12, color: colors.text, flex: 1}}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  round: {
    position: 'absolute', top: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  roundRow: {position: 'absolute', top: 12, flexDirection: 'row', gap: 10},
  round2: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  dotText: {color: '#fff', fontSize: 10, fontWeight: '800'},
  dots: {position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6},
  burst: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center'},
  tapHint: {position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 4},
  tapHintText: {color: '#fff', fontSize: 8.5, letterSpacing: 1.4, fontWeight: '700'},
  pip: {width: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.6)'},
  pipOn: {backgroundColor: '#fff', width: 20},
  body: {padding: 16},
  seller: {fontSize: 11, color: colors.gold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2},
  name: {fontSize: 28, lineHeight: 34, fontFamily: fonts.serif, color: colors.ink, marginTop: 6},
  priceRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14},
  price: {fontSize: 28, fontFamily: fonts.serif, color: colors.ink},
  mrp: {fontSize: 16, color: colors.muted, textDecorationLine: 'line-through'},
  offPill: {backgroundColor: colors.blush, paddingHorizontal: 8, paddingVertical: 4},
  offText: {color: colors.blushDark, fontWeight: '800', fontSize: 11, letterSpacing: 1},
  tax: {fontSize: 12, color: colors.muted, marginTop: 4},
  stock: {fontSize: 13, fontWeight: '700', marginTop: 8},
  label: {fontSize: 11.5, fontWeight: '700', color: colors.ink, letterSpacing: 1.6},
  swatchRing: {width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
  swatch: {width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line},
  size: {
    minWidth: 50, height: 44, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  sizeOn: {backgroundColor: colors.ink, borderColor: colors.ink},
  sizeOut: {opacity: 0.4},
  strike: {position: 'absolute', width: 46, height: 1.5, backgroundColor: colors.ink, transform: [{rotate: '-45deg'}]},
  sizeText: {fontWeight: '600', color: colors.ink},
  hint: {color: colors.red, fontSize: 12, marginTop: 8},
  divider: {height: 1, backgroundColor: colors.line, marginVertical: 20},
  desc: {fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 8},
  trust: {flexDirection: 'row', gap: 12, marginTop: 22, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line},
  revSummary: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8},
  revBig: {fontSize: 44, fontFamily: fonts.serif, color: colors.ink},
  review: {paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line},
  revText: {marginTop: 8, fontSize: 14, color: colors.text, lineHeight: 20},
  revPhoto: {width: 84, height: 84, borderRadius: radius.sm, marginTop: 10},
  bar: {
    flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line,
  },
});
