import React from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon, {IconName} from '../components/Icon';
import {Header} from '../components/ui';
import {colors, fonts, radius} from '../theme';
import {useStore} from '../store';

export default function AccountScreen({navigation}: any) {
  const {user, logout, wishlist} = useStore();
  const need = (screen: string) => () => navigation.navigate(user ? screen : 'Login', user ? undefined : {next: screen});

  const rows: {icon: IconName; label: string; sub: string; onPress: () => void}[] = [
    {icon: 'package', label: 'My orders', sub: 'Track, cancel or review', onPress: need('Orders')},
    {icon: 'heart', label: 'Wishlist', sub: `${wishlist.length} saved item${wishlist.length === 1 ? '' : 's'}`, onPress: () => navigation.navigate('Wishlist')},
    {icon: 'store', label: 'Sell on Meyra', sub: 'Register your business with GST', onPress: () => navigation.navigate('SellerSignup')},
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header title="Account" />
      <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
        <View style={s.profile}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user?.name ?? 'G')[0].toUpperCase()}</Text></View>
          <View style={{flex: 1}}>
            <Text style={s.hello}>Hello, {user?.name ?? 'Guest'}</Text>
            <Text style={s.sub}>{user ? user.email : 'Login or sign up to place orders'}</Text>
          </View>
          {!user && (
            <Pressable style={s.login} onPress={() => navigation.navigate('Login')}>
              <Text style={s.loginText}>LOGIN</Text>
            </Pressable>
          )}
        </View>

        <View style={s.card}>
          {rows.map((r, i) => (
            <Pressable key={r.label} style={[s.row, i > 0 && s.rowBorder]} onPress={r.onPress}>
              <Icon name={r.icon} size={20} color={colors.goldDark} />
              <View style={{flex: 1}}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowSub}>{r.sub}</Text>
              </View>
              <Icon name="right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable style={[s.card, s.row]} onPress={() =>
            Alert.alert('Log out?', undefined, [{text: 'Cancel'}, {text: 'Log out', style: 'destructive', onPress: logout}])}>
            <Text style={[s.rowLabel, {color: colors.red}]}>Log out</Text>
          </Pressable>
        )}

        <Text style={s.foot}>Meyra · support@meyraglory.com · +91 993-959-0555</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  profile: {flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', padding: 18, borderRadius: 4},
  avatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 24, fontFamily: fonts.serif, color: colors.goldDark},
  hello: {fontSize: 22, fontFamily: fonts.serif, color: colors.ink},
  sub: {fontSize: 12, color: colors.muted, marginTop: 2},
  login: {backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 10},
  loginText: {color: '#fff', fontWeight: '700', fontSize: 11.5, letterSpacing: 1.6},
  card: {backgroundColor: '#fff', borderRadius: 4},
  row: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16},
  rowBorder: {borderTopWidth: 1, borderTopColor: colors.line},
  rowLabel: {fontSize: 15, fontWeight: '600', color: colors.ink},
  rowSub: {fontSize: 12, color: colors.muted, marginTop: 2},
  foot: {textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 10},
});
