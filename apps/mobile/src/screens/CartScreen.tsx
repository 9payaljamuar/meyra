import React from 'react';
import {FlatList, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {Button, EmptyState, Header} from '../components/ui';
import {colors, fonts, radius, rupee} from '../theme';
import {imageUrl} from '../api';
import {useStore} from '../store';

export const FREE_DELIVERY_ABOVE = 499;
export const DELIVERY_FEE = 49;

export function PriceSummary() {
  const {subtotal, mrpTotal, count} = useStore();
  const discount = mrpTotal - subtotal;
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  return (
    <View style={s.summary}>
      <Text style={s.sumTitle}>Price details</Text>
      <Row label={`Bag total (${count} items)`} value={rupee(mrpTotal)} />
      <Row label="Discount" value={`− ${rupee(discount)}`} green />
      <Row label="Delivery" value={delivery ? rupee(delivery) : 'FREE'} green={!delivery} />
      <View style={s.sep} />
      <Row label="Total" value={rupee(subtotal + delivery)} bold />
      {discount > 0 && <Text style={s.save}>You save {rupee(discount)} on this order</Text>}
    </View>
  );
}

export default function CartScreen({navigation}: any) {
  const {cart, subtotal, count, changeQty, remove, user} = useStore();
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;

  const checkout = () => navigation.navigate(user ? 'Checkout' : 'Login', user ? undefined : {next: 'Checkout'});

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header title={`My Bag${count ? ` (${count})` : ''}`} />
      {cart.length === 0 ? (
        <EmptyState icon="bag" title="Your bag is empty" text="Add something you love — it will wait for you here."
          action="Start shopping" onAction={() => navigation.navigate('Shop')} />
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={l => l.key}
            contentContainerStyle={{padding: 16, gap: 12}}
            renderItem={({item}) => (
              <View style={s.line}>
                <Pressable onPress={() => navigation.navigate('Product', {id: item.productId})}>
                  <Image source={imageUrl(item.image)} style={s.thumb} />
                </Pressable>
                <View style={{flex: 1}}>
                  <Text style={s.seller}>{item.sellerName}</Text>
                  <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                  {(item.option || item.size) && (
                    <Text style={s.meta}>{[item.option, item.size && `Size ${item.size}`].filter(Boolean).join(' · ')}</Text>
                  )}
                  <View style={s.priceRow}>
                    <Text style={s.price}>{rupee(item.price * item.qty)}</Text>
                    {item.mrp > item.price && <Text style={s.mrp}>{rupee(item.mrp * item.qty)}</Text>}
                  </View>
                  <View style={s.qtyRow}>
                    <View style={s.qty}>
                      <Pressable hitSlop={8} onPress={() => changeQty(item.key, -1)}><Icon name="minus" size={16} color={colors.ink} /></Pressable>
                      <Text style={s.qtyText}>{item.qty}</Text>
                      <Pressable hitSlop={8} onPress={() => changeQty(item.key, 1)}><Icon name="plus" size={16} color={colors.ink} /></Pressable>
                    </View>
                    <Pressable onPress={() => remove(item.key)} hitSlop={8}>
                      <Icon name="trash" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
            ListFooterComponent={<PriceSummary />}
          />
          <View style={s.bar}>
            <View>
              <Text style={{color: colors.muted, fontSize: 12}}>Total</Text>
              <Text style={{fontSize: 22, fontFamily: fonts.serif, color: colors.ink}}>{rupee(subtotal + delivery)}</Text>
            </View>
            <Button title="Checkout" style={{flex: 1, marginLeft: 20}} onPress={checkout} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Row({label, value, green, bold}: {label: string; value: string; green?: boolean; bold?: boolean}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
      <Text style={{color: bold ? colors.ink : colors.text, fontWeight: bold ? '800' : '400', fontSize: bold ? 16 : 14}}>{label}</Text>
      <Text style={{color: green ? colors.green : colors.ink, fontWeight: bold ? '800' : '600', fontSize: bold ? 16 : 14}}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 14},
  line: {flexDirection: 'row', gap: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line},
  thumb: {width: 96, height: 128, borderRadius: 3, backgroundColor: '#F2EDE5'},
  seller: {fontSize: 9.5, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '700'},
  name: {fontSize: 15, color: colors.ink, marginTop: 3},
  meta: {fontSize: 12, color: colors.muted, marginTop: 3},
  priceRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6},
  price: {fontSize: 17, fontFamily: fonts.serif, color: colors.ink},
  mrp: {fontSize: 12, color: colors.muted, textDecorationLine: 'line-through'},
  qtyRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8},
  qty: {flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5},
  qtyText: {fontSize: 14, fontWeight: '700', minWidth: 16, textAlign: 'center', color: colors.ink},
  summary: {backgroundColor: '#fff', padding: 18, borderRadius: 4, marginTop: 6},
  sumTitle: {fontSize: 11.5, fontWeight: '700', color: colors.ink, letterSpacing: 1.6, textTransform: 'uppercase'},
  sep: {height: 1, backgroundColor: colors.line, marginTop: 14, marginBottom: 4},
  save: {color: colors.green, fontWeight: '600', fontSize: 12, marginTop: 10},
  bar: {flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line},
});
