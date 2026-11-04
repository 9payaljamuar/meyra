import React, {useState} from 'react';
import {ActivityIndicator, Alert, FlatList, Image, LayoutAnimation, Linking, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {EmptyState, ErrorState, Header} from '../components/ui';
import {colors, fonts, radius, rupee} from '../theme';
import {api, imageUrl, useApi} from '../api';
import {SITE_URL} from '../config';

const STATUS: Record<string, {label: string; color: string; bg: string}> = {
  placed: {label: 'Order placed', color: '#B7791F', bg: '#FDF3E1'},
  shipped: {label: 'Shipped', color: '#2C6DB0', bg: '#E8F0FA'},
  delivered: {label: 'Delivered', color: colors.green, bg: '#E6F4EC'},
  cancelled: {label: 'Cancelled', color: colors.red, bg: '#FBEAE8'},
  pending_payment: {label: 'Awaiting payment', color: '#B7791F', bg: '#FDF3E1'},
  return_requested: {label: 'Return requested', color: '#B7791F', bg: '#FDF3E1'},
  return_approved: {label: 'Return approved', color: '#2C6DB0', bg: '#E8F0FA'},
  refunded: {label: 'Refunded', color: '#6B4EA0', bg: '#EFE9F7'},
};

const when = (s: string) =>
  new Date(s).toLocaleString('en-IN', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});

const fmt = (s: string) => new Date(s).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});

export default function OrdersScreen({navigation}: any) {
  const {data, error, loading, reload} = useApi<any[]>('/orders');
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // Refresh when coming back (e.g. after requesting a return).
  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === id ? null : id);
  };

  const cancel = (itemId: number) =>
    Alert.alert('Cancel this item?', undefined, [
      {text: 'Keep'},
      {
        text: 'Cancel item', style: 'destructive', onPress: async () => {
          setBusy(itemId);
          try {
            await api(`/orders/items/${itemId}/cancel`, {method: 'POST'});
            await reload();
          } catch (e: any) {
            Alert.alert(e.message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header title="My orders" onBack={() => navigation.goBack()} />
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : !data ? (
        <ActivityIndicator color={colors.gold} style={{marginTop: 60}} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={{padding: 16, gap: 14}}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} colors={[colors.gold]} />}
          ListEmptyComponent={
            <EmptyState icon="package" title="No orders yet" action="Start shopping"
              onAction={() => navigation.navigate('Tabs', {screen: 'Shop'})} />
          }
          renderItem={({item: o}) => (
            <View style={s.card}>
              <View style={s.head}>
                <Text style={{fontFamily: fonts.serif, fontSize: 17, color: colors.ink}}>Order #{o.id}</Text>
                <Text style={{color: colors.muted, fontSize: 12}}>{fmt(o.created_at)} · {rupee(o.total)} · {o.payment_method}</Text>
              </View>
              {o.items.map((it: any) => {
                const st = STATUS[it.status] ?? STATUS.placed;
                const expanded = open === it.id;
                return (
                  <View key={it.id} style={s.itemWrap}>
                  <View style={s.item}>
                    <Pressable onPress={() => navigation.navigate('Product', {id: it.product_id})}>
                      <Image source={imageUrl(it.image)} style={s.thumb} />
                    </Pressable>
                    <View style={{flex: 1}}>
                      <Text style={s.name} numberOfLines={2}>{it.name}</Text>
                      <Text style={s.meta}>
                        {[`Qty ${it.qty}`, it.option, it.size && `Size ${it.size}`].filter(Boolean).join(' · ')} · {it.seller_name}
                      </Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap'}}>
                        <Text style={[s.badge, {color: st.color, backgroundColor: st.bg}]}>{st.label}</Text>
                        {it.status === 'placed' && (
                          <Pressable onPress={() => cancel(it.id)} disabled={busy === it.id}>
                            <Text style={s.link}>{busy === it.id ? 'Cancelling…' : 'Cancel'}</Text>
                          </Pressable>
                        )}
                        {it.status === 'delivered' && (
                          <Pressable onPress={() => navigation.navigate('WriteReview', {product: {id: it.product_id, name: it.name, images: [it.image]}})}>
                            <Text style={s.link}>★ Review</Text>
                          </Pressable>
                        )}
                        {it.can_return && (
                          <Pressable onPress={() => navigation.navigate('ReturnRequest', {item: it})}>
                            <Text style={s.link}>Return</Text>
                          </Pressable>
                        )}
                      </View>
                      {it.awb && (
                        <Pressable onPress={() => it.tracking_url && Linking.openURL(it.tracking_url)} style={{marginTop: 6}}>
                          <Text style={s.track}>{it.courier} · AWB {it.awb} ↗</Text>
                        </Pressable>
                      )}
                      {it.invoice_url && (
                        <Pressable onPress={() => Linking.openURL(SITE_URL + it.invoice_url)} style={{marginTop: 6}}>
                          <Text style={s.track}>Download GST invoice ↗</Text>
                        </Pressable>
                      )}
                      {it.refund_method && (
                        <Text style={s.refund}>
                          Refund {rupee(it.refund_amount)} · {it.refund_method === 'gateway' ? 'to your original payment method' : 'our team will contact you'}
                        </Text>
                      )}
                    </View>
                  </View>
                  {it.tracking?.length > 0 && (
                    <Pressable onPress={() => toggle(it.id)} style={s.trackToggle}>
                      <Text style={s.trackToggleText}>{expanded ? 'HIDE TRACKING' : 'TRACK ORDER'}</Text>
                      <Icon name={expanded ? 'minus' : 'plus'} size={14} color={colors.ink} />
                    </Pressable>
                  )}
                  {expanded && (
                    <View style={s.timeline}>
                      {it.tracking.map((e: any, n: number) => {
                        const last = n === it.tracking.length - 1;
                        return (
                          <View key={n} style={s.tlRow}>
                            <View style={{alignItems: 'center', width: 18}}>
                              <View style={[s.tlDot, last && s.tlDotOn]} />
                              {!last && <View style={s.tlLine} />}
                            </View>
                            <View style={{flex: 1, paddingBottom: last ? 0 : 16}}>
                              <Text style={[s.tlNote, last && {fontWeight: '700'}]}>{e.note}</Text>
                              <Text style={s.tlAt}>{when(e.at)}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  </View>
                );
              })}
              <Text style={s.addr}>Deliver to {o.address.name}, {o.address.line1}, {o.address.city} {o.address.pincode}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  card: {backgroundColor: '#fff', borderRadius: 4, overflow: 'hidden'},
  head: {padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 2},
  itemWrap: {borderBottomWidth: 1, borderBottomColor: colors.line},
  item: {flexDirection: 'row', gap: 12, padding: 14},
  track: {fontSize: 12, color: colors.ink, textDecorationLine: 'underline'},
  refund: {fontSize: 12, color: '#6B4EA0', marginTop: 6, fontWeight: '600'},
  trackToggle: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12},
  trackToggleText: {fontSize: 10.5, letterSpacing: 1.6, fontWeight: '700', color: colors.ink},
  timeline: {paddingHorizontal: 14, paddingBottom: 16},
  tlRow: {flexDirection: 'row', gap: 10},
  tlDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line, marginTop: 3},
  tlDotOn: {backgroundColor: colors.gold, transform: [{scale: 1.3}]},
  tlLine: {width: 1.5, flex: 1, backgroundColor: colors.goldLight, marginTop: 2},
  tlNote: {fontSize: 13, color: colors.ink},
  tlAt: {fontSize: 11, color: colors.muted, marginTop: 2},
  thumb: {width: 64, height: 80, borderRadius: radius.sm, backgroundColor: colors.bg},
  name: {fontWeight: '600', color: colors.ink},
  meta: {fontSize: 12, color: colors.muted, marginTop: 2},
  badge: {fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden'},
  link: {color: colors.gold, fontWeight: '700', fontSize: 13},
  addr: {fontSize: 12, color: colors.muted, padding: 14},
});
