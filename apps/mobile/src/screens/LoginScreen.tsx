import React, {useEffect, useRef, useState} from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  useWindowDimensions, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import FloatingField from '../components/FloatingField';
import Icon from '../components/Icon';
import {useToast} from '../components/fx';
import {Button} from '../components/ui';
import {IMG} from '../images';
import {colors, fonts} from '../theme';
import {USE_MOCK} from '../config';
import {Meta, useApi} from '../api';
import {useStore} from '../store';

type Mode = 'login' | 'register';
type Method = 'email' | 'phone';

export default function LoginScreen({navigation, route}: any) {
  const {login, register, sendOtp, verifyOtp} = useStore();
  const toast = useToast();
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'login');
  const [method, setMethod] = useState<Method>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | undefined>();
  const {data: meta} = useApi<Meta>('/meta');
  const phoneOk = meta?.features?.phoneLogin !== false;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- motion ---
  const zoom = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const tab = useRef(new Animated.Value(mode === 'login' ? 0 : 1)).current;
  const form = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(zoom, {toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
    Animated.spring(sheet, {toValue: 1, friction: 9, tension: 50, useNativeDriver: true}).start();
  }, [zoom, sheet]);

  useEffect(() => {
    if (!resendIn) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fadeSwap = (fn: () => void) => {
    Animated.timing(form, {toValue: 0, duration: 120, useNativeDriver: true}).start(() => {
      fn();
      setErr(null);
      Animated.timing(form, {toValue: 1, duration: 220, useNativeDriver: true}).start();
    });
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    Animated.spring(tab, {toValue: m === 'login' ? 0 : 1, friction: 8, useNativeDriver: true}).start();
    fadeSwap(() => setMode(m));
  };

  const fail = (msg: string) => {
    setErr(msg);
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map(v => Animated.timing(shake, {toValue: v, duration: 50, useNativeDriver: true})),
    ).start();
  };

  const finish = (first?: string) => {
    toast(first ? `Welcome to Meyra, ${first}` : 'Welcome back');
    const next = route.params?.next;
    if (next) navigation.replace(next);
    else navigation.goBack();
  };

  const run = async (fn: () => Promise<void>, first?: string) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
      finish(first);
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = () =>
    mode === 'login'
      ? run(() => login(email.trim(), password))
      : run(() => register(name.trim(), email.trim(), password), name.trim().split(' ')[0]);

  const requestOtp = async () => {
    setErr(null);
    setBusy(true);
    try {
      setDevCode(await sendOtp(phone));
      setOtpSent(true);
      setCode('');
      setResendIn(30);
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(false);
    }
  };

  const imgH = height * 0.42;
  const tabW = (width - 56) / 2;

  return (
    <View style={{flex: 1, backgroundColor: colors.ink}}>
      <View style={{height: imgH + 40, overflow: 'hidden'}}>
        <Animated.Image
          source={IMG.p23}
          resizeMode="cover"
          style={{width, height: imgH + 40, transform: [{scale: zoom.interpolate({inputRange: [0, 1], outputRange: [1.05, 1.18]})}]}}
        />
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="a" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#000" stopOpacity="0.55" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#a)" />
        </Svg>
        <View style={[s.hero, {paddingTop: insets.top + 10}]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.close}>
            <Icon name="x" color="#fff" strokeWidth={1.5} />
          </Pressable>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 30}}>
            <Text style={s.brand}>MEYRA</Text>
            <View style={s.brandLine} />
            <Text style={s.brandTag}>Crafting Confidence</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[s.sheet, {
        transform: [{translateY: sheet.interpolate({inputRange: [0, 1], outputRange: [height * 0.6, 0]})}],
      }]}>
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{padding: 28, paddingBottom: insets.bottom + 28}} keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={s.tabs}>
              {(['login', 'register'] as Mode[]).map(m => (
                <Pressable key={m} style={{width: tabW, alignItems: 'center', paddingVertical: 10}} onPress={() => switchMode(m)}>
                  <Text style={[s.tabText, mode === m && {color: colors.ink}]}>{m === 'login' ? 'SIGN IN' : 'JOIN'}</Text>
                </Pressable>
              ))}
              <Animated.View style={[s.tabLine, {width: tabW, transform: [{translateX: tab.interpolate({inputRange: [0, 1], outputRange: [0, tabW]})}]}]} />
            </View>

            <Animated.View style={{
              opacity: form,
              transform: [{translateY: form.interpolate({inputRange: [0, 1], outputRange: [10, 0]})}, {translateX: shake}],
            }}>
              <Text style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
              <Text style={s.sub}>
                {mode === 'login' ? 'Sign in to your wishlist, bag and orders.' : 'Join for early access to new drops and offers.'}
              </Text>

              {method === 'email' ? (
                <>
                  {mode === 'register' && (
                    <FloatingField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
                  )}
                  <FloatingField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
                    autoCapitalize="none" autoComplete="email" />
                  <FloatingField label="Password" value={password} onChangeText={setPassword} secure
                    onSubmitEditing={submitEmail} returnKeyType="go" />
                  {mode === 'login' && (
                    <Pressable onPress={() => navigation.navigate('ForgotPassword', {email: email.trim(), next: route.params?.next})} style={{alignSelf: 'flex-end', marginTop: -6}}>
                      <Text style={s.link}>Forgot password?</Text>
                    </Pressable>
                  )}
                </>
              ) : !otpSent ? (
                <FloatingField label="Mobile number" value={phone} onChangeText={t => setPhone(t.replace(/\D/g, ''))}
                  keyboardType="number-pad" maxLength={10} prefix="+91" />
              ) : (
                <OtpInput code={code} onChange={setCode} phone={phone} devCode={devCode} onEdit={() => setOtpSent(false)} />
              )}

              {err && <Text style={s.err}>{err}</Text>}

              <View style={{marginTop: 22}}>
                {method === 'email' ? (
                  <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} disabled={busy} onPress={submitEmail} />
                ) : !otpSent ? (
                  <Button title={busy ? 'Sending…' : 'Send code'} disabled={busy || phone.length !== 10} onPress={requestOtp} />
                ) : (
                  <Button title={busy ? 'Verifying…' : 'Verify & continue'} disabled={busy || code.length !== 6}
                    onPress={() => run(() => verifyOtp(phone, code))} />
                )}
              </View>

              {method === 'phone' && otpSent && (
                <Pressable disabled={resendIn > 0} onPress={requestOtp} style={{alignSelf: 'center', marginTop: 16}}>
                  <Text style={[s.link, resendIn > 0 && {color: colors.muted}]}>
                    {resendIn > 0 ? `Resend code in 0:${String(resendIn).padStart(2, '0')}` : 'Resend code'}
                  </Text>
                </Pressable>
              )}

              {phoneOk && (
                <>
                  <View style={s.or}>
                    <View style={s.orLine} /><Text style={s.orText}>OR</Text><View style={s.orLine} />
                  </View>
                  <Pressable style={s.alt} onPress={() => fadeSwap(() => { setMethod(method === 'email' ? 'phone' : 'email'); setOtpSent(false); })}>
                    <Text style={s.altText}>{method === 'email' ? 'Continue with mobile number' : 'Continue with email'}</Text>
                  </Pressable>
                </>
              )}

              {USE_MOCK && mode === 'login' && method === 'email' && (
                <Pressable onPress={() => { setEmail('customer@meyra.app'); setPassword('customer123'); }} style={s.demo}>
                  <Text style={s.demoText}>Preview: tap to fill demo account</Text>
                </Pressable>
              )}

              <Text style={s.terms}>
                By continuing you agree to Meyra’s Terms of Use and Privacy Policy.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function OtpInput({code, onChange, phone, devCode, onEdit}: {code: string; onChange: (c: string) => void; phone: string; devCode?: string; onEdit: () => void}) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const cursor = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 250);
    Animated.loop(Animated.sequence([
      Animated.timing(cursor, {toValue: 0, duration: 500, useNativeDriver: true}),
      Animated.timing(cursor, {toValue: 1, duration: 500, useNativeDriver: true}),
    ])).start();
  }, [cursor]);
  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
        <Text style={{color: colors.text}}>Code sent to +91 {phone}  </Text>
        <Pressable onPress={onEdit} hitSlop={8}><Text style={s.link}>Edit</Text></Pressable>
      </View>
      <Pressable style={{flexDirection: 'row', justifyContent: 'space-between'}} onPress={() => ref.current?.focus()}>
        {[0, 1, 2, 3, 4, 5].map(n => {
          const active = n === code.length;
          return (
            <View key={n} style={[s.otpBox, (active || code[n]) && {borderBottomColor: colors.ink}]}>
              {code[n] ? (
                <Text style={s.otpDigit}>{code[n]}</Text>
              ) : active ? (
                <Animated.View style={[s.otpCursor, {opacity: cursor}]} />
              ) : null}
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={code}
        onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        style={{position: 'absolute', opacity: 0, height: 1, width: 1}}
      />
      {devCode && <Text style={[s.terms, {marginTop: 12, textAlign: 'left'}]}>Test mode — your code is {devCode}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {...StyleSheet.absoluteFill, paddingHorizontal: 20},
  close: {width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center'},
  brand: {color: '#fff', fontFamily: fonts.serif, fontSize: 44, letterSpacing: 12, marginLeft: 12},
  brandLine: {width: 50, height: 1, backgroundColor: colors.goldLight, marginVertical: 12},
  brandTag: {color: 'rgba(255,255,255,0.9)', fontFamily: fonts.serifItalic, fontSize: 18},
  sheet: {flex: 1, marginTop: -40, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 26},
  tabText: {fontSize: 12, letterSpacing: 2.4, fontWeight: '700', color: colors.muted},
  tabLine: {position: 'absolute', bottom: -1, left: 0, height: 2, backgroundColor: colors.ink},
  title: {fontFamily: fonts.serif, fontSize: 30, color: colors.ink},
  sub: {color: colors.muted, marginTop: 6, marginBottom: 20, fontSize: 14},
  link: {color: colors.ink, fontSize: 12.5, fontWeight: '600', textDecorationLine: 'underline'},
  err: {color: colors.red, marginTop: 14, fontWeight: '600', fontSize: 13},
  or: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22},
  orLine: {flex: 1, height: 1, backgroundColor: colors.line},
  orText: {fontSize: 10.5, letterSpacing: 2, color: colors.muted, fontWeight: '700'},
  alt: {borderWidth: 1, borderColor: colors.line, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 6},
  altText: {color: colors.ink, fontSize: 14, fontWeight: '600'},
  demo: {marginTop: 14, alignSelf: 'center', backgroundColor: colors.goldSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99},
  demoText: {color: colors.goldDark, fontSize: 12, fontWeight: '600'},
  terms: {fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 22, lineHeight: 16},
  otpBox: {width: 44, height: 54, borderBottomWidth: 2, borderBottomColor: colors.line, alignItems: 'center', justifyContent: 'center'},
  otpDigit: {fontFamily: fonts.serif, fontSize: 28, color: colors.ink},
  otpCursor: {width: 2, height: 26, backgroundColor: colors.gold},
});
