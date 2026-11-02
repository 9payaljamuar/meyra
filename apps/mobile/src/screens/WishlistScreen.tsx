import React from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ProductCard from '../components/ProductCard';
import {EmptyState, Header} from '../components/ui';
import {colors} from '../theme';
import {Product, useApi} from '../api';
import {useStore} from '../store';

export default function WishlistScreen({navigation}: any) {
  const {wishlist} = useStore();
  const {data, loading} = useApi<Product[]>(wishlist.length ? `/products?ids=${wishlist.join(',')}` : null);
  // Keep the order the user saved things in; drop anything no longer on sale.
  const items = wishlist.length ? wishlist.map(id => data?.find(p => p.id === id)).filter(Boolean) as Product[] : [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header title="Wishlist" />
      {loading && !data ? (
        <ActivityIndicator color={colors.gold} style={{marginTop: 60}} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={p => String(p.id)}
          columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
          contentContainerStyle={{gap: 18, paddingBottom: 24, paddingTop: 8}}
          ListEmptyComponent={
            <EmptyState icon="heart" title="Nothing saved yet" text="Tap ♡ on anything you love to save it here."
              action="Explore" onAction={() => navigation.navigate('Shop')} />
          }
          renderItem={({item}) => (
            <View style={{flex: 1, maxWidth: '50%'}}>
              <ProductCard product={item} width="100%" onPress={() => navigation.navigate('Product', {id: item.id})} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({root: {flex: 1, backgroundColor: colors.bg}});
