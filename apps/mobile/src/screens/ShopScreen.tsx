import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import {Button, Chip, ErrorState} from '../components/ui';
import {CardSkeleton} from '../components/fx';
import {colors, fonts, radius} from '../theme';
import {Meta, Product, qs, useApi} from '../api';

type Sort = 'popular' | 'price_asc' | 'price_desc' | 'discount' | 'rating' | 'newest';

type Filters = {
  group?: string;
  category?: string;
  skin: string[];
  hair: string[];
  price?: [number, number];
  minDiscount: number;
};

const EMPTY: Filters = {skin: [], hair: [], minDiscount: 0};

const PRICE_BANDS: {label: string; range: [number, number]}[] = [
  {label: 'Under ₹500', range: [0, 500]},
  {label: '₹500 – ₹1,000', range: [500, 1000]},
  {label: '₹1,000 – ₹2,000', range: [1000, 2000]},
  {label: 'Above ₹2,000', range: [2000, 0]},
];
const DISCOUNTS = [10, 20, 30, 40, 50];
const SORTS: {key: Sort; label: string}[] = [
  {key: 'popular', label: 'Popular'},
  {key: 'newest', label: 'Newest'},
  {key: 'price_asc', label: 'Price: Low to High'},
  {key: 'price_desc', label: 'Price: High to Low'},
  {key: 'discount', label: 'Discount'},
  {key: 'rating', label: 'Rating'},
];

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export default function ShopScreen({navigation, route}: any) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort>('popular');
  const [open, setOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const {data: meta} = useApi<Meta>('/meta');
  const q = useDebounced(query.trim());

  // Home navigates here with params; apply them as a fresh filter state.
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    setFilters({...EMPTY, group: p.group, category: p.category});
    setSort(p.sort ?? 'popular');
    setQuery('');
    if (p.focus) setTimeout(() => input.current?.focus(), 150);
  }, [route.params]);

  const path = '/products?' + qs({
    q, group: filters.group, category: filters.category, skin: filters.skin, hair: filters.hair,
    minPrice: filters.price?.[0] || undefined, maxPrice: filters.price?.[1] || undefined,
    minDiscount: filters.minDiscount || undefined, sort,
  });
  const {data: results, loading, error, reload} = useApi<Product[]>(path);

  const showBeauty = !filters.group || filters.group === 'Cosmetics';
  const activeCount =
    filters.skin.length + filters.hair.length + (filters.price ? 1 : 0) + (filters.minDiscount ? 1 : 0);
  const categories = filters.group ? meta?.categories[filters.group] ?? [] : [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.searchRow}>
        <View style={s.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            ref={input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, brands"
            placeholderTextColor={colors.muted}
            style={s.input}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <Pressable style={s.filterBtn} onPress={() => setOpen(true)}>
          <Icon name="sliders" size={20} color={colors.ink} />
          {activeCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0}}
        contentContainerStyle={{paddingHorizontal: 16, gap: 8, paddingVertical: 8}}>
        <Chip label="All" active={!filters.group && !filters.category}
          onPress={() => setFilters({...filters, group: undefined, category: undefined})} />
        {(meta?.groups ?? []).map(g => (
          <Chip key={g} label={g} active={filters.group === g}
            onPress={() => setFilters({...filters, group: g, category: undefined, skin: [], hair: []})} />
        ))}
        {!filters.group && filters.category && <Chip label={filters.category} active />}
      </ScrollView>
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0}}
          contentContainerStyle={{paddingHorizontal: 16, gap: 8, paddingBottom: 8}}>
          {categories.map(c => (
            <Chip key={c} label={c} active={filters.category === c}
              onPress={() => setFilters({...filters, category: filters.category === c ? undefined : c})} />
          ))}
        </ScrollView>
      )}

      <View style={s.resultRow}>
        <Text style={s.resultText}>
          {results ? `${results.length} product${results.length === 1 ? '' : 's'}` : ' '}
          {filters.category ? ` in ${filters.category}` : ''}
        </Text>
        <Pressable onPress={() => setSortOpen(true)} hitSlop={8}>
          <Text style={s.sortText}>SORT · {SORTS.find(x => x.key === sort)!.label.toUpperCase()}</Text>
        </Pressable>
      </View>

      {error && !results ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={results ?? []}
          numColumns={2}
          keyExtractor={p => String(p.id)}
          columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
          contentContainerStyle={{gap: 18, paddingBottom: 24}}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={loading && results?.length ? <ActivityIndicator color={colors.gold} style={{marginBottom: 8}} /> : undefined}
          ListEmptyComponent={
            loading ? (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16}}>
                {[0, 1, 2, 3].map(n => <CardSkeleton key={n} width="47%" />)}
              </View>
            ) : (
              <View style={{alignItems: 'center', marginTop: 60}}>
                <Text style={{color: colors.muted}}>No products match your filters.</Text>
                <Pressable onPress={() => { setFilters(EMPTY); setQuery(''); }}>
                  <Text style={{color: colors.gold, fontWeight: '700', marginTop: 10}}>Clear filters</Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({item}) => (
            <View style={{flex: 1, maxWidth: '50%'}}>
              <ProductCard product={item} width="100%"
                onPress={() => navigation.navigate('Product', {id: item.id})} />
            </View>
          )}
        />
      )}

      <Modal visible={sortOpen} animationType="fade" transparent onRequestClose={() => setSortOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setSortOpen(false)}>
          <SafeAreaView style={s.sheet} edges={['bottom']}>
            <Text style={[s.sheetTitle, {padding: 16}]}>Sort by</Text>
            {SORTS.map(o => (
              <Pressable key={o.key} style={s.sortRow} onPress={() => { setSort(o.key); setSortOpen(false); }}>
                <Text style={{fontSize: 15, color: colors.ink, fontWeight: o.key === sort ? '700' : '400'}}>{o.label}</Text>
                {o.key === sort && <Icon name="check" size={18} color={colors.gold} />}
              </Pressable>
            ))}
          </SafeAreaView>
        </Pressable>
      </Modal>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <SafeAreaView style={s.sheet} edges={['bottom']}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Filters</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}><Icon name="x" /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 8}}>
              {showBeauty && (
                <Group title="Skin type">
                  {(meta?.skinTypes ?? []).map(t => (
                    <Chip key={t} label={t} active={filters.skin.includes(t)}
                      onPress={() => setFilters({...filters, skin: toggle(filters.skin, t)})} />
                  ))}
                </Group>
              )}
              {showBeauty && (
                <Group title="Hair type">
                  {(meta?.hairTypes ?? []).map(t => (
                    <Chip key={t} label={t} active={filters.hair.includes(t)}
                      onPress={() => setFilters({...filters, hair: toggle(filters.hair, t)})} />
                  ))}
                </Group>
              )}
              <Group title="Price">
                {PRICE_BANDS.map(b => (
                  <Chip key={b.label} label={b.label}
                    active={filters.price?.[0] === b.range[0]}
                    onPress={() => setFilters({...filters, price: filters.price?.[0] === b.range[0] ? undefined : b.range})} />
                ))}
              </Group>
              <Group title="Discount">
                {DISCOUNTS.map(d => (
                  <Chip key={d} label={`${d}% & above`} active={filters.minDiscount === d}
                    onPress={() => setFilters({...filters, minDiscount: filters.minDiscount === d ? 0 : d})} />
                ))}
              </Group>
            </ScrollView>
            <View style={s.sheetFoot}>
              <Button title="Clear all" variant="outline" style={{flex: 1}}
                onPress={() => setFilters({...EMPTY, group: filters.group, category: filters.category})} />
              <Button title={results ? `Show ${results.length} results` : 'Apply'} style={{flex: 2}} onPress={() => setOpen(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Group({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <View style={{marginBottom: 22}}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  searchRow: {flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, alignItems: 'center'},
  search: {
    flex: 1, height: 46, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
  },
  input: {flex: 1, fontSize: 14, color: colors.ink, padding: 0},
  filterBtn: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: {color: '#fff', fontSize: 10, fontWeight: '800'},
  resultRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12},
  resultText: {color: colors.muted, fontSize: 13},
  sortText: {color: colors.ink, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%'},
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  sheetTitle: {fontSize: 22, fontFamily: fonts.serif, color: colors.ink},
  sortRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line},
  groupTitle: {fontSize: 11.5, fontWeight: '700', color: colors.ink, marginBottom: 12, letterSpacing: 1.6, textTransform: 'uppercase'},
  sheetFoot: {flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line},
});
