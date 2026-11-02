import React, {useState} from 'react';
import {Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from '../components/Icon';
import {useToast} from '../components/fx';
import {Button, Chip, Field, Header} from '../components/ui';
import {colors, fonts, radius, rupee} from '../theme';
import {api, imageUrl, uploadImages} from '../api';

const REASONS = ['Size doesn’t fit', 'Damaged or defective', 'Different from photos', 'Wrong item received', 'Didn’t suit my skin', 'Changed my mind'];

export default function ReturnRequestScreen({navigation, route}: any) {
  const {item} = route.params;
  const toast = useToast();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<{uri: string; type?: string; fileName?: string}[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 3 - photos.length, quality: 0.7, maxWidth: 1280, maxHeight: 1280});
    const picked = (res.assets ?? []).filter(a => a.uri).map(a => ({uri: a.uri!, type: a.type, fileName: a.fileName}));
    setPhotos(p => [...p, ...picked].slice(0, 3));
  };

  const submit = async () => {
    if (!reason) return setErr('Please choose a reason');
    setErr(null);
    setBusy(true);
    try {
      const urls = photos.length ? await uploadImages(photos) : [];
      await api(`/orders/items/${item.id}/return`, {body: {reason: details.trim() ? `${reason} — ${details.trim()}` : reason, photos: urls}});
      toast('Return requested. We’ll update you soon.');
      navigation.goBack();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="Return item" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          <View style={s.product}>
            <Image source={imageUrl(item.image)} style={s.thumb} />
            <View style={{flex: 1}}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>Refund of {rupee(item.line_total)} after pickup</Text>
            </View>
          </View>

          <Text style={s.h}>WHY ARE YOU RETURNING IT?</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20}}>
            {REASONS.map(r => <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />)}
          </View>

          <Field label="More details (optional)" value={details} onChangeText={setDetails} multiline />

          <Text style={s.h}>PHOTOS (HELPS US APPROVE FASTER)</Text>
          <View style={{flexDirection: 'row', gap: 10}}>
            {photos.map((p, i) => (
              <View key={p.uri}>
                <Image source={{uri: p.uri}} style={s.photo} />
                <Pressable style={s.remove} onPress={() => setPhotos(photos.filter((_, j) => j !== i))}>
                  <Icon name="x" size={12} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
            {photos.length < 3 && (
              <Pressable style={[s.photo, s.add]} onPress={pick}>
                <Icon name="plus" color={colors.muted} />
              </Pressable>
            )}
          </View>

          <View style={s.policy}>
            <Text style={s.policyTitle}>How returns work</Text>
            <Text style={s.policyText}>1. The seller reviews your request.{'\n'}2. Our courier picks the item up — keep it unused with tags.{'\n'}3. Refund goes to your original payment method (cash orders: UPI/bank) once it’s received.</Text>
          </View>
          {err && <Text style={s.err}>{err}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.bar}>
        <Button title={busy ? 'Submitting…' : 'Request return'} disabled={busy} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  product: {flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 24},
  thumb: {width: 64, height: 80, borderRadius: 3, backgroundColor: '#F2EDE5'},
  name: {fontFamily: fonts.serif, fontSize: 18, color: colors.ink},
  meta: {fontSize: 12, color: colors.muted, marginTop: 4},
  h: {fontSize: 11.5, letterSpacing: 1.6, fontWeight: '700', color: colors.ink, marginBottom: 12},
  photo: {width: 80, height: 80, borderRadius: radius.sm},
  add: {borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  remove: {position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center'},
  policy: {backgroundColor: '#fff', padding: 16, marginTop: 24, borderRadius: 4},
  policyTitle: {fontFamily: fonts.serif, fontSize: 17, color: colors.ink, marginBottom: 8},
  policyText: {fontSize: 13, color: colors.text, lineHeight: 21},
  err: {color: colors.red, marginTop: 16, fontWeight: '600'},
  bar: {padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line},
});
