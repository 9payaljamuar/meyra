import React, {useState} from 'react';
import {Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from '../components/Icon';
import {Button, Field, Header} from '../components/ui';
import {colors, fonts, radius} from '../theme';
import {api, imageUrl, uploadImages} from '../api';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function WriteReviewScreen({navigation, route}: any) {
  const {product} = route.params;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<{uri: string; type?: string; fileName?: string}[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 5 - photos.length, quality: 0.7, maxWidth: 1280, maxHeight: 1280});
    const picked = (res.assets ?? []).filter(a => a.uri).map(a => ({uri: a.uri!, type: a.type, fileName: a.fileName}));
    setPhotos(p => [...p, ...picked].slice(0, 5));
  };

  const submit = async () => {
    if (!rating) return setErr('Please choose a star rating');
    setErr(null);
    setBusy(true);
    try {
      const urls = photos.length ? await uploadImages(photos) : [];
      await api(`/products/${product.id}/reviews`, {body: {rating, text: text.trim(), photos: urls}});
      navigation.goBack();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header title="Write a review" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          <View style={s.product}>
            <Image source={imageUrl(product.images?.[0])} style={s.thumb} />
            <Text style={s.name} numberOfLines={2}>{product.name}</Text>
          </View>

          <Text style={s.h}>Your rating</Text>
          <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
            {[1, 2, 3, 4, 5].map(i => (
              <Pressable key={i} onPress={() => setRating(i)} hitSlop={6}>
                <Icon name="star" size={36} color={colors.star} fill={i <= rating ? colors.star : 'none'} strokeWidth={1.4} />
              </Pressable>
            ))}
            <Text style={{marginLeft: 6, color: colors.text, fontWeight: '600'}}>{LABELS[rating]}</Text>
          </View>

          <View style={{height: 20}} />
          <Field label="Your review" value={text} onChangeText={setText} multiline placeholder="What did you like or dislike?" />

          <Text style={s.h}>Add photos</Text>
          <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
            {photos.map((p, i) => (
              <View key={p.uri}>
                <Image source={{uri: p.uri}} style={s.photo} />
                <Pressable style={s.remove} onPress={() => setPhotos(photos.filter((_, j) => j !== i))}>
                  <Icon name="x" size={12} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
            {photos.length < 5 && (
              <Pressable style={[s.photo, s.add]} onPress={pick}>
                <Icon name="plus" color={colors.muted} />
                <Text style={{fontSize: 11, color: colors.muted}}>Photo</Text>
              </Pressable>
            )}
          </View>
          {err && <Text style={s.err}>{err}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.bar}>
        <Button title={busy ? 'Submitting…' : 'Submit review'} disabled={busy} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  product: {flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 22},
  thumb: {width: 56, height: 70, borderRadius: radius.sm, backgroundColor: '#fff'},
  name: {flex: 1, fontFamily: fonts.serif, color: colors.ink, fontSize: 18},
  h: {fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10},
  photo: {width: 80, height: 80, borderRadius: radius.sm},
  add: {borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  remove: {position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center'},
  err: {color: colors.red, marginTop: 16, fontWeight: '600'},
  bar: {padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line},
});
