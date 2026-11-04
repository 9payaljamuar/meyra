import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import FloatingField from '../components/FloatingField';
import {useToast} from '../components/fx';
import {Button, Header} from '../components/ui';
import {colors, fonts} from '../theme';
import {useStore} from '../store';

export default function ForgotPasswordScreen({navigation, route}: any) {
  const {forgotPassword, resetPassword} = useStore();
  const toast = useToast();
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = () => run(async () => {
    setDevCode(await forgotPassword(email.trim()));
    setSent(true);
  });

  const reset = () => run(async () => {
    await resetPassword(email.trim(), code, password);
    toast('Password updated — you’re signed in');
    // Leave both the reset and login screens.
    const next = route.params?.next;
    navigation.pop(2);
    if (next) navigation.navigate(next);
  });

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 28}} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{sent ? 'Check your email' : 'Forgot password?'}</Text>
          <Text style={s.sub}>
            {sent
              ? `If ${email.trim()} has a Meyra account, we sent it a 6-digit code. It expires in 15 minutes.`
              : 'Enter your account email and we’ll send you a code to set a new password.'}
          </Text>
          {!sent ? (
            <FloatingField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          ) : (
            <>
              <FloatingField label="6-digit code" value={code} onChangeText={t => setCode(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} />
              <FloatingField label="New password" value={password} onChangeText={setPassword} secure />
              {devCode && <Text style={s.hint}>Test mode — your code is {devCode}</Text>}
            </>
          )}
          {err && <Text style={s.err}>{err}</Text>}
          <Button
            style={{marginTop: 16}}
            disabled={busy || (!sent ? !email.trim() : code.length !== 6 || password.length < 6)}
            title={busy ? 'Please wait…' : sent ? 'Set new password' : 'Send code'}
            onPress={sent ? reset : send}
          />
          {sent && (
            <Pressable onPress={() => { setSent(false); setCode(''); }} style={{alignSelf: 'center', marginTop: 18}}>
              <Text style={s.link}>Use a different email</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  title: {fontFamily: fonts.serif, fontSize: 30, color: colors.ink},
  sub: {color: colors.muted, marginTop: 8, marginBottom: 24, lineHeight: 20},
  hint: {color: colors.goldDark, fontSize: 12, marginBottom: 8},
  err: {color: colors.red, marginTop: 6, fontWeight: '600'},
  link: {color: colors.ink, fontSize: 12.5, fontWeight: '600', textDecorationLine: 'underline'},
});
