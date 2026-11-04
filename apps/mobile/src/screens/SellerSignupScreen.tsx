import React, {useState} from 'react';
import {KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {Button, Field, Header} from '../components/ui';
import {colors, fonts, radius} from '../theme';
import {api} from '../api';
import {PARTNER_URL, SITE_URL, USE_MOCK} from '../config';

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

export default function SellerSignupScreen({navigation}: any) {
  const [f, setF] = useState({name: '', businessName: '', gstin: '', pan: '', phone: '', email: '', password: ''});
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f) => (v: string) => {
    if (k === 'gstin' || k === 'pan') v = v.toUpperCase();
    setF(prev => ({...prev, [k]: v, ...(k === 'gstin' && v.length >= 12 && !prev.pan ? {pan: v.slice(2, 12)} : {})}));
  };

  const errs = {
    name: f.name.trim().length < 2 && 'Enter your name',
    businessName: f.businessName.trim().length < 2 && 'Enter your business name',
    gstin: !GSTIN_RE.test(f.gstin) && 'Enter a valid 15-character GSTIN',
    pan: !PAN_RE.test(f.pan) && 'Enter a valid PAN',
    phone: !/^[6-9]\d{9}$/.test(f.phone) && 'Enter a valid 10-digit mobile',
    email: !/^\S+@\S+\.\S+$/.test(f.email) && 'Enter a valid email',
    password: f.password.length < 6 && 'At least 6 characters',
  };
  const [agree, setAgree] = useState(false);
  const valid = !Object.values(errs).some(Boolean) && agree;
  const e = (k: keyof typeof errs) => tried && errs[k];

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    setErr(null);
    setBusy(true);
    try {
      await api('/auth/register-seller', {body: {...f, email: f.email.trim(), agree}});
      setDone(true);
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.doneWrap}>
          <View style={s.doneIcon}><Icon name="check" size={40} color="#fff" strokeWidth={2.5} /></View>
          <Text style={s.doneTitle}>Seller account created</Text>
          <Text style={s.doneSub}>
            Next, log in to the Meyra Partner Hub with {f.email} to upload your GST certificate, PAN and bank details. Once
            our team approves your KYC you can list products for free.
          </Text>
          {!USE_MOCK && (
            <Button title="Open Partner Hub" style={{marginTop: 24, paddingHorizontal: 32}} onPress={() => Linking.openURL(PARTNER_URL)} />
          )}
          <Button title="Back to app" variant="outline" style={{marginTop: 12, paddingHorizontal: 32}} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="Become a seller" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          <View style={s.perks}>
            {['Free listing — no setup fee', 'Quick GST-based KYC', 'Commission auto-deducted, payouts to your bank'].map(t => (
              <View key={t} style={s.perk}>
                <Icon name="check" size={16} color={colors.green} strokeWidth={2.5} />
                <Text style={s.perkText}>{t}</Text>
              </View>
            ))}
          </View>

          <Field label="Your name" value={f.name} onChangeText={set('name')} error={e('name')} />
          <Field label="Business / brand name" value={f.businessName} onChangeText={set('businessName')} error={e('businessName')} />
          <Field label="GSTIN" value={f.gstin} onChangeText={set('gstin')} maxLength={15} autoCapitalize="characters"
            placeholder="29ABCDE1234F1Z5" error={e('gstin')} />
          <Field label="PAN" value={f.pan} onChangeText={set('pan')} maxLength={10} autoCapitalize="characters" error={e('pan')} />
          <Field label="Mobile number" value={f.phone} onChangeText={set('phone')} maxLength={10} keyboardType="number-pad" error={e('phone')} />
          <Field label="Email (used to log in)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={e('email')} />
          <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry error={e('password')} />

          <Pressable onPress={() => setAgree(!agree)} style={s.agreeRow}>
            <View style={[s.box, agree && {backgroundColor: colors.ink, borderColor: colors.ink}]}>
              {agree && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={s.agreeText}>
              I agree to the{' '}
              <Text style={{textDecorationLine: 'underline', color: colors.ink}} onPress={() => Linking.openURL(`${SITE_URL}/seller-agreement`)}>Seller Agreement</Text>
              , including commission, GST TCS/TDS deductions and the return policy.
            </Text>
          </Pressable>
          {tried && !agree && <Text style={s.err}>Please accept the Seller Agreement</Text>}
          {err && <Text style={s.err}>{err}</Text>}
          <Button title={busy ? 'Submitting…' : 'Create seller account'} disabled={busy} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  perks: {backgroundColor: '#fff', borderRadius: radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line, marginBottom: 22},
  perk: {flexDirection: 'row', alignItems: 'center', gap: 10},
  perkText: {color: colors.text, fontSize: 13},
  err: {color: colors.red, marginBottom: 12, fontWeight: '600'},
  agreeRow: {flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16},
  box: {width: 20, height: 20, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1},
  agreeText: {flex: 1, color: colors.text, fontSize: 13, lineHeight: 19},
  doneWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  doneIcon: {width: 80, height: 80, borderRadius: 40, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center'},
  doneTitle: {fontSize: 28, fontFamily: fonts.serif, color: colors.ink, marginTop: 20, textAlign: 'center'},
  doneSub: {textAlign: 'center', color: colors.text, marginTop: 10, lineHeight: 21},
});
