import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {Button, Header} from '../components/ui';
import {colors, fonts, radius, rupee} from '../theme';
import {api} from '../api';
import {useStore} from '../store';

type Phase = 'choose' | 'processing' | 'waiting' | 'failed';

const METHODS = [
  {key: 'upi', title: 'UPI', sub: 'Google Pay, PhonePe, Paytm, BHIM'},
  {key: 'card', title: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay'},
  {key: 'nb', title: 'Netbanking', sub: 'All major banks'},
  {key: 'wallet', title: 'Wallets', sub: 'Paytm, Amazon Pay, Mobikwik'},
];

/**
 * Test mode: a simulated Razorpay checkout (no money moves).
 * Live mode: opens the Razorpay payment page and polls the order until the payment is confirmed.
 */
export default function PaymentScreen({navigation, route}: any) {
  const {order} = route.params;
  const test: boolean = order.payment?.test ?? true;
  const url: string | null = order.payment?.url ?? null;
  const {clearCart} = useStore();
  const [phase, setPhase] = useState<Phase>(test ? 'choose' : 'waiting');
  const [method, setMethod] = useState('upi');
  const done = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const succeed = useCallback(() => {
    if (done.current) return;
    done.current = true;
    clearCart();
    navigation.reset({index: 1, routes: [{name: 'Tabs'}, {name: 'OrderSuccess', params: {order: {...order, payment_method: 'ONLINE'}}}]});
  }, [clearCart, navigation, order]);

  const cancel = useCallback(() => {
    Alert.alert('Cancel payment?', 'Your bag will be kept so you can try again.', [
      {text: 'Keep paying'},
      {text: 'Cancel payment', style: 'destructive', onPress: async () => {
        done.current = true;
        await api(`/orders/${order.id}/payment/cancel`, {method: 'POST'}).catch(() => {});
        navigation.goBack();
      }},
    ]);
    return true;
  }, [navigation, order.id]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', cancel);
    return () => sub.remove();
  }, [cancel]);

  // Live mode: open Razorpay and poll for the result.
  useEffect(() => {
    if (test) return;
    if (url) Linking.openURL(url).catch(() => {});
    const t = setInterval(async () => {
      try {
        const s = await api<{status: string}>(`/orders/${order.id}/payment`);
        if (s.status === 'paid') succeed();
        if (s.status === 'failed') setPhase('failed');
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [test, url, order.id, succeed]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue: 1, duration: 800, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 0, duration: 800, useNativeDriver: true}),
    ])).start();
  }, [pulse]);

  const payTest = async (outcome: 'success' | 'failure') => {
    setPhase('processing');
    await new Promise<void>(r => setTimeout(r, 1600));
    await api(`/orders/${order.id}/payment/test`, {body: {outcome}}).catch(() => {});
    if (outcome === 'success') succeed();
    else setPhase('failed');
  };

  if (phase === 'processing' || phase === 'waiting') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Animated.View style={[s.ring, {transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.12]})}]}]}>
            <ActivityIndicator color={colors.gold} size="large" />
          </Animated.View>
          <Text style={s.bigTitle}>{phase === 'processing' ? 'Processing payment' : 'Complete your payment'}</Text>
          <Text style={s.sub}>
            {phase === 'processing'
              ? `Paying ${rupee(order.total)} securely…`
              : `We opened the secure Razorpay page for ${rupee(order.total)}. This screen updates automatically once you pay.`}
          </Text>
          {phase === 'waiting' && (
            <>
              {url && <Button title="Open payment page" style={{marginTop: 26, alignSelf: 'stretch'}} onPress={() => Linking.openURL(url)} />}
              <Pressable onPress={cancel} style={{marginTop: 18}}><Text style={s.link}>Cancel payment</Text></Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'failed') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <View style={[s.ring, {borderColor: colors.blush, backgroundColor: '#FBEFED'}]}><Icon name="x" size={34} color={colors.blushDark} strokeWidth={2} /></View>
          <Text style={s.bigTitle}>Payment didn’t go through</Text>
          <Text style={s.sub}>No money was taken. Your bag is saved — try again or choose cash on delivery.</Text>
          <Button title="Back to checkout" style={{marginTop: 26, alignSelf: 'stretch'}} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="Payment" onBack={cancel} />
      <ScrollView contentContainerStyle={{padding: 16}}>
        <View style={s.amount}>
          <Text style={s.amountLabel}>AMOUNT PAYABLE</Text>
          <Text style={s.amountValue}>{rupee(order.total)}</Text>
          <Text style={s.amountSub}>Order #{order.id} · Meyra</Text>
        </View>
        <Text style={s.h}>PAY USING</Text>
        {METHODS.map(m => (
          <Pressable key={m.key} onPress={() => setMethod(m.key)} style={[s.method, method === m.key && s.methodOn]}>
            <View style={[s.radio, method === m.key && {borderColor: colors.gold}]}>{method === m.key && <View style={s.radioDot} />}</View>
            <View style={{flex: 1}}>
              <Text style={s.methodTitle}>{m.title}</Text>
              <Text style={s.methodSub}>{m.sub}</Text>
            </View>
          </Pressable>
        ))}
        <View style={s.secure}>
          <Icon name="shield" size={18} color={colors.green} />
          <Text style={s.secureText}>Secured by Razorpay · 256-bit encryption</Text>
        </View>
        <Text style={s.testNote}>Test mode: no real money is charged.</Text>
      </ScrollView>
      <View style={s.bar}>
        <Button title={`Pay ${rupee(order.total)}`} variant="gold" onPress={() => payTest('success')} />
        <Pressable onPress={() => payTest('failure')} style={{alignSelf: 'center', marginTop: 12}}>
          <Text style={[s.link, {fontSize: 12}]}>Simulate a failed payment</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  ring: {width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: colors.goldLight, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center'},
  bigTitle: {fontFamily: fonts.serif, fontSize: 28, color: colors.ink, marginTop: 24, textAlign: 'center'},
  sub: {color: colors.text, textAlign: 'center', marginTop: 10, lineHeight: 21},
  link: {color: colors.ink, textDecorationLine: 'underline', fontWeight: '600'},
  amount: {backgroundColor: colors.ink, padding: 22, borderRadius: radius.sm, marginBottom: 24},
  amountLabel: {color: colors.goldLight, fontSize: 10, letterSpacing: 2, fontWeight: '700'},
  amountValue: {color: '#fff', fontFamily: fonts.serif, fontSize: 38, marginTop: 6},
  amountSub: {color: '#B9B2A7', fontSize: 12, marginTop: 4},
  h: {fontSize: 11.5, letterSpacing: 1.6, fontWeight: '700', color: colors.ink, marginBottom: 12},
  method: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, marginBottom: 10},
  methodOn: {borderColor: colors.gold, backgroundColor: '#FFFDF7'},
  methodTitle: {fontSize: 15, fontWeight: '600', color: colors.ink},
  methodSub: {fontSize: 12, color: colors.muted, marginTop: 2},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center'},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold},
  secure: {flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 18},
  secureText: {fontSize: 12, color: colors.text},
  testNote: {fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 6},
  bar: {padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line},
});
