import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList, Image, ImageSourcePropType, Pressable, RefreshControl, ScrollView, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import Icon from '../components/Icon';
import ProductCard, {CARD_W} from '../components/ProductCard';
import {CardSkeleton, Ticker} from '../components/fx';
import {ErrorState, SectionHeader} from '../components/ui';
import {IMG} from '../images';
import {colors, fonts, radius, rupee} from '../theme';
import {imageUrl, Product, useApi} from '../api';
import {useStore} from '../store';

const CATEGORY_TILES = [
  {name: 'Skincare', category: 'Skincare', image: 'm-orange'},
  {name: 'Haircare', category: 'Haircare', image: 'm-hairgrowth'},
  {name: 'Dresses', category: 'Dresses', image: 'p23'},
  {name: 'Earrings', category: 'Earrings', image: 'p05'},
  {name: 'Necklaces', category: 'Necklaces', image: 'p17'},
  {name: 'Hair Clips', category: 'Hair Accessories', image: 'p14'},
];

const SLIDES: {image: string; kicker: string; title: string; cta: string; params: object}[] = [
  {image: 'p23', kicker: 'THE FESTIVE EDIT', title: 'Dresses that\nturn heads', cta: 'Shop dresses', params: {category: 'Dresses'}},
  {image: 'm-orange', kicker: 'MEYRA GLORY', title: 'Crafting confidence,\nnaturally', cta: 'Shop skin & hair', params: {group: 'Cosmetics'}},
  {image: 'p15', kicker: 'FINE EVERYDAY JEWELS', title: 'Little things,\nbig sparkle', cta: 'Shop jewellery', params: {group: 'Accessories'}},
];

export default function HomeScreen({navigation}: any) {
  const {count} = useStore();
  const {data, error, loading, reload} = useApi<Product[]>('/products?limit=200');
  const open = (id: number) => navigation.navigate('Product', {id});
  const shop = (params?: object) => navigation.navigate('Shop', {...params, at: Date.now()});

  const all = data ?? [];
  const bestsellers = all.filter(p => p.featured);
  const meyra = all.filter(p => p.group === 'Cosmetics');
  const deals = [...all].sort((a, b) => b.discount - a.discount).slice(0, 10);
  const fresh = all.filter(p => p.isNew);
  const look = [
    all.find(p => p.category === 'Dresses' && p.images[0]?.includes('p24')) ?? all.find(p => p.category === 'Dresses'),
    all.find(p => p.category === 'Earrings'),
    all.find(p => p.category === 'Hair Accessories'),
  ].filter(Boolean) as Product[];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.top}>
        <Pressable onPress={() => shop({focus: true})} hitSlop={10} style={s.topBtn}>
          <Icon name="search" color={colors.ink} strokeWidth={1.5} />
        </Pressable>
        <Image source={IMG['m-logo']} style={s.logo} resizeMode="contain" />
        <Pressable onPress={() => navigation.navigate('Cart')} hitSlop={10} style={s.topBtn}>
          <Icon name="bag" color={colors.ink} strokeWidth={1.5} />
          {count > 0 && <View style={s.badge}><Text style={s.badgeText}>{count}</Text></View>}
        </Pressable>
      </View>
      <Ticker />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} colors={[colors.gold]} />}>
        <Hero onPress={shop} />

        <FlatList
          horizontal
          data={CATEGORY_TILES}
          keyExtractor={c => c.name}
          showsHorizontalScrollIndicator={false}
          style={{marginTop: 22}}
          contentContainerStyle={{paddingHorizontal: 14, gap: 14}}
          renderItem={({item}) => (
            <StoryRing label={item.name} source={IMG[item.image]} onPress={() => shop({category: item.category})} />
          )}
        />

        {error && !data && <ErrorState message={error} onRetry={reload} />}

        <SectionHeader kicker="Most loved" title="Bestsellers" action="View all" onAction={() => shop({})} />
        <Rail items={bestsellers} loading={!data} onOpen={open} />

        {meyra.length > 0 && (
          <View style={s.luxe}>
            <Text style={s.luxeKicker}>✦  THE BRAND STORE  ✦</Text>
            <Text style={s.luxeTitle}>Meyra Glory</Text>
            <Text style={s.luxeSub}>Pure ingredients. Gentle formulas. A healthy glow.</Text>
            <FlatList
              horizontal
              data={meyra}
              keyExtractor={p => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 16, gap: 14, paddingTop: 22}}
              renderItem={({item}) => <ProductCard product={item} onPress={() => open(item.id)} />}
            />
            <Pressable onPress={() => shop({group: 'Cosmetics'})} style={s.luxeBtn}>
              <Text style={s.luxeBtnText}>EXPLORE THE COLLECTION</Text>
            </Pressable>
          </View>
        )}

        {look.length === 3 && <ShopTheLook items={look} onOpen={open} />}

        <SectionHeader kicker="Up to 50% off" title="Best deals" action="View all" onAction={() => shop({sort: 'discount'})} />
        <Rail items={deals} loading={!data} onOpen={open} />

        <Pressable style={s.sell} onPress={() => navigation.navigate('SellerSignup')}>
          <View style={{flex: 1}}>
            <Text style={s.sellKicker}>FOR BRANDS & BOUTIQUES</Text>
            <Text style={s.sellTitle}>Sell on Meyra</Text>
            <Text style={s.sellSub}>Free listing · GST-based KYC · Automatic payouts</Text>
          </View>
          <View style={s.sellArrow}><Icon name="right" color="#fff" size={20} /></View>
        </Pressable>

        {fresh.length > 0 && (
          <>
            <SectionHeader kicker="Just landed" title="New arrivals" action="View all" onAction={() => shop({sort: 'newest'})} />
            <Rail items={fresh} loading={false} onOpen={open} />
          </>
        )}

        <View style={s.footer}>
          <Text style={s.footerScript}>Crafting Confidence</Text>
          <Text style={s.footerLine}>NATURAL · HONEST · PURE</Text>
          <Text style={s.footerSmall}>Meyra — Bengaluru, India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero({onPress}: {onPress: (p: object) => void}) {
  const {width} = useWindowDimensions();
  const ref = useRef<FlatList>(null);
  const [i, setI] = useState(0);
  const h = Math.round(width * 1.12);

  useEffect(() => {
    const t = setInterval(() => {
      const next = (i + 1) % SLIDES.length;
      ref.current?.scrollToIndex({index: next, animated: true});
      setI(next);
    }, 4500);
    return () => clearInterval(t);
  }, [i]);

  return (
    <View>
      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={x => x.image}
        getItemLayout={(_, index) => ({length: width, offset: width * index, index})}
        onMomentumScrollEnd={e => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({item}) => (
          <Pressable onPress={() => onPress(item.params)} style={{width, height: h}}>
            <Image source={IMG[item.image]} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.45" stopColor="#000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0.72" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#shade)" />
            </Svg>
            <View style={s.heroText}>
              <Text style={s.heroKicker}>{item.kicker}</Text>
              <Text style={s.heroTitle}>{item.title}</Text>
              <Text style={s.heroCta}>{item.cta.toUpperCase()}</Text>
            </View>
          </Pressable>
        )}
      />
      <View style={s.heroDots}>
        {SLIDES.map((_, n) => <View key={n} style={[s.heroDot, n === i && s.heroDotOn]} />)}
      </View>
    </View>
  );
}

function StoryRing({label, source, onPress}: {label: string; source: ImageSourcePropType; onPress: () => void}) {
  const size = 72;
  return (
    <Pressable onPress={onPress} style={{alignItems: 'center', width: size + 4}}>
      <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.goldLight} />
              <Stop offset="0.55" stopColor={colors.gold} />
              <Stop offset="1" stopColor={colors.blushDark} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} stroke="url(#ring)" strokeWidth={2} fill="none" />
        </Svg>
        <Image source={source} style={{width: size - 10, height: size - 10, borderRadius: (size - 10) / 2}} />
      </View>
      <Text style={s.ringLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Rail({items, loading, onOpen}: {items: Product[]; loading: boolean; onOpen: (id: number) => void}) {
  if (loading) {
    return (
      <View style={{flexDirection: 'row', gap: 14, paddingHorizontal: 16}}>
        {[0, 1, 2].map(n => <CardSkeleton key={n} width={CARD_W} />)}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={p => String(p.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 16, gap: 14}}
      renderItem={({item}) => <ProductCard product={item} onPress={() => onOpen(item.id)} />}
    />
  );
}

function ShopTheLook({items, onOpen}: {items: Product[]; onOpen: (id: number) => void}) {
  const {width} = useWindowDimensions();
  return (
    <View>
      <SectionHeader kicker="Styled for you" title="Shop the look" />
      <View style={{paddingHorizontal: 16}}>
        <View>
          <Image source={IMG.p24} style={{width: width - 32, height: (width - 32) * 1.05, borderRadius: 4}} resizeMode="cover" />
          <View style={s.lookTag}>
            <Text style={s.lookTagText}>SUNDAY BRUNCH</Text>
          </View>
        </View>
        {items.map((p, n) => (
          <Pressable key={p.id} onPress={() => onOpen(p.id)} style={[s.lookRow, n === 0 && {borderTopWidth: 0}]}>
            <Text style={s.lookNum}>0{n + 1}</Text>
            <Image source={imageUrl(p.images[0])} style={s.lookThumb} />
            <View style={{flex: 1}}>
              <Text style={s.lookName} numberOfLines={1}>{p.name}</Text>
              <Text style={s.lookPrice}>{rupee(p.price)}</Text>
            </View>
            <Icon name="right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 58},
  topBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  logo: {width: 124, height: 46},
  badge: {
    position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: {color: '#fff', fontSize: 9.5, fontWeight: '800'},
  heroText: {position: 'absolute', left: 22, right: 22, bottom: 44},
  heroKicker: {color: colors.goldLight, fontSize: 11, letterSpacing: 3, fontWeight: '700'},
  heroTitle: {color: '#fff', fontSize: 34, lineHeight: 40, fontFamily: fonts.serif, marginTop: 8},
  heroCta: {
    color: '#fff', fontSize: 12, letterSpacing: 2, fontWeight: '700', marginTop: 16, alignSelf: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: '#fff', paddingBottom: 3,
  },
  heroDots: {position: 'absolute', bottom: 18, left: 22, flexDirection: 'row', gap: 6},
  heroDot: {width: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.5)'},
  heroDotOn: {width: 22, backgroundColor: '#fff'},
  ringLabel: {marginTop: 7, fontSize: 11.5, color: colors.text, letterSpacing: 0.2},
  // Light champagne "brand store" band, framed with hairline gold rules.
  luxe: {
    backgroundColor: '#F4ECDD', marginTop: 40, paddingTop: 36, paddingBottom: 30,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.goldLight,
  },
  luxeKicker: {color: colors.gold, fontSize: 10, letterSpacing: 3, textAlign: 'center', fontWeight: '700'},
  luxeTitle: {color: colors.ink, fontSize: 36, fontFamily: fonts.serifItalic, textAlign: 'center', marginTop: 8},
  luxeSub: {color: colors.text, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 32},
  luxeBtn: {
    alignSelf: 'center', marginTop: 26, backgroundColor: colors.ink,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  luxeBtnText: {color: '#fff', fontSize: 11.5, letterSpacing: 2, fontWeight: '700'},
  lookTag: {position: 'absolute', left: 14, top: 14, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 6},
  lookTagText: {fontSize: 10, letterSpacing: 2, fontWeight: '700', color: colors.ink},
  lookRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line},
  lookNum: {fontFamily: fonts.serifItalic, fontSize: 18, color: colors.gold, width: 26},
  lookThumb: {width: 52, height: 64, borderRadius: 3, backgroundColor: '#F2EDE5'},
  lookName: {fontSize: 14, color: colors.ink},
  lookPrice: {fontFamily: fonts.serif, fontSize: 15, color: colors.ink, marginTop: 2},
  sell: {
    marginHorizontal: 16, marginTop: 36, padding: 20, borderRadius: radius.sm, backgroundColor: colors.blush,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  sellKicker: {fontSize: 9.5, letterSpacing: 2, fontWeight: '700', color: colors.blushDark},
  sellTitle: {fontSize: 24, fontFamily: fonts.serif, color: colors.ink, marginTop: 4},
  sellSub: {fontSize: 12, color: colors.text, marginTop: 4},
  sellArrow: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center'},
  footer: {alignItems: 'center', marginTop: 48},
  footerScript: {fontFamily: fonts.serifItalic, fontSize: 22, color: colors.gold},
  footerLine: {color: colors.ink, fontWeight: '700', letterSpacing: 3, fontSize: 10, marginTop: 8},
  footerSmall: {color: colors.muted, fontSize: 11, marginTop: 6},
});
