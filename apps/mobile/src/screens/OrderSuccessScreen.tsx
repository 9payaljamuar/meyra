import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {Button} from '../components/ui';
import {colors, fonts, rupee} from '../theme';

export default function OrderSuccessScreen({navigation, route}: any) {
  const order = route.params?.order;
  return (
    <SafeAreaView style={s.root}>
      <View style={s.wrap}>
        <View style={s.icon}><Icon name="check" size={44} color="#fff" strokeWidth={2.5} /></View>
        <Text style={s.title}>Order placed!</Text>
        <Text style={s.sub}>
          Order #{order?.id} · {rupee(order?.total ?? 0)}{'\n'}
          {order?.payment_method === 'COD' ? 'Pay on delivery.' : 'Paid online.'} Sellers have been notified.
        </Text>
        <Button title="Track my orders" style={{marginTop: 28, paddingHorizontal: 32}}
          onPress={() => navigation.replace('Orders')} />
        <Button title="Continue shopping" variant="outline" style={{marginTop: 12, paddingHorizontal: 32}}
          onPress={() => navigation.popToTop()} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  wrap: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  icon: {width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 32, fontFamily: fonts.serif, color: colors.ink, marginTop: 22},
  sub: {textAlign: 'center', color: colors.text, marginTop: 10, lineHeight: 22},
});
