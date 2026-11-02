import React, {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, Field, Header} from '../components/ui';
import {colors, fonts, radius} from '../theme';
import {api} from '../api';
import {useStore} from '../store';
import {PriceSummary} from './CartScreen';

const ADDR_KEY = 'meyra_address';
type Address = {name: string; phone: string; line1: string; city: string; state: string; pincode: string};
const EMPTY: Address = {name: '', phone: '', line1: '', city: '', state: '', pincode: ''};

export default function CheckoutScreen({navigation}: any) {
  const {cart, clearCart, user} = useStore();
  const [a, setA] = useState<Address>({...EMPTY, name: user?.name ?? ''});
  const [pay, setPay] = useState<'COD' | 'ONLINE'>('COD');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ADDR_KEY).then(v => v && setA(JSON.parse(v))).catch(() => {});
  }, []);

  const set = (k: keyof Address) => (v: string) => setA(prev => ({...prev, [k]: v}));

  const place = async () => {
    setErr(null);
    setBusy(true);
    try {
      const order = await api('/orders', {
        body: {
          items: cart.map(l => ({productId: l.productId, qty: l.qty, option: l.option, size: l.size})),
          address: a,
          paymentMethod: pay,
        },
      });
      await AsyncStorage.setItem(ADDR_KEY, JSON.stringify(a));
      if (pay === 'ONLINE') {
        // Bag is cleared only once the payment succeeds.
        navigation.navigate('Payment', {order});
        return;
      }
      clearCart();
      navigation.reset({index: 1, routes: [{name: 'Tabs'}, {name: 'OrderSuccess', params: {order}}]});
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="Checkout" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          <Text style={s.h}>Delivery address</Text>
          <Field label="Full name" value={a.name} onChangeText={set('name')} />
          <Field label="Mobile number" value={a.phone} onChangeText={set('phone')} keyboardType="number-pad" maxLength={10} />
          <Field label="House no., street, area" value={a.line1} onChangeText={set('line1')} />
          <View style={{flexDirection: 'row', gap: 12}}>
            <View style={{flex: 1}}><Field label="City" value={a.city} onChangeText={set('city')} /></View>
            <View style={{flex: 1}}><Field label="Pincode" value={a.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} /></View>
          </View>
          <Field label="State" value={a.state} onChangeText={set('state')} />

          <Text style={[s.h, {marginTop: 8}]}>Payment</Text>
          <PayOption label="Cash on delivery" sub="Pay when your order arrives" on={pay === 'COD'} onPress={() => setPay('COD')} />
          <PayOption label="UPI / Card / Netbanking" sub="Pay securely with Razorpay" on={pay === 'ONLINE'} onPress={() => setPay('ONLINE')} />

          <PriceSummary />
          {err && <Text style={s.err}>{err}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.bar}>
        <Button title={busy ? 'Placing order…' : pay === 'ONLINE' ? 'Continue to payment' : 'Place order'} disabled={busy || !cart.length} style={{flex: 1}} onPress={place} />
      </View>
    </SafeAreaView>
  );
}

function PayOption({label, sub, on, onPress}: {label: string; sub: string; on: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={[s.pay, on && {borderColor: colors.gold, backgroundColor: '#FFFDF7'}]}>
      <View style={[s.radio, on && {borderColor: colors.gold}]}>{on && <View style={s.radioDot} />}</View>
      <View style={{flex: 1}}>
        <Text style={{fontWeight: '700', color: colors.ink}}>{label}</Text>
        <Text style={{fontSize: 12, color: colors.muted, marginTop: 2}}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  h: {fontSize: 22, fontFamily: fonts.serif, color: colors.ink, marginBottom: 14},
  pay: {flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', marginBottom: 10},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center'},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold},
  err: {color: colors.red, marginTop: 14, fontWeight: '600', textAlign: 'center'},
  bar: {padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line},
});
