import React, {useRef, useState} from 'react';
import {Animated, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {Button} from '../components/ui';
import {IMG} from '../images';
import {colors, fonts} from '../theme';
import {useStore} from '../store';

const SLIDES = [
  {image: 'p18', kicker: 'NEW SEASON', title: 'Style that\nspeaks for you', text: 'Dresses, jewels and beauty from India’s finest boutiques — in one place.'},
  {image: 'm-aloe-cm', kicker: 'BEAUTY, PERSONALISED', title: 'Made for your\nskin & hair', text: 'Filter by skin type, hair type, shade and price to find your perfect match.'},
  {image: 'p17', kicker: 'EVERYDAY LUXE', title: 'Glow,\nevery single day', text: 'Free delivery above ₹499, easy returns and verified sellers only.'},
];

export default function WelcomeScreen({navigation}: any) {
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {finishOnboarding} = useStore();
  const x = useRef(new Animated.Value(0)).current;
  const list = useRef<FlatList>(null);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const done = (then?: 'login' | 'register') => {
    finishOnboarding();
    navigation.reset({
      index: then ? 1 : 0,
      routes: [{name: 'Tabs'}, ...(then ? [{name: 'Login', params: {mode: then}}] : [])],
    });
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.ink}}>
      <Animated.FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={sl => sl.image}
        getItemLayout={(_, n) => ({length: width, offset: width * n, index: n})}
        onScroll={Animated.event([{nativeEvent: {contentOffset: {x}}}], {useNativeDriver: true})}
        onMomentumScrollEnd={e => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({item, index}) => {
          const range = [(index - 1) * width, index * width, (index + 1) * width];
          return (
            <View style={{width, height, overflow: 'hidden'}}>
              {/* parallax: image drifts slower than the page */}
              <Animated.Image
                source={IMG[item.image]}
                resizeMode="cover"
                style={{
                  width: width * 1.3, height, position: 'absolute', left: -width * 0.15,
                  transform: [
                    {translateX: x.interpolate({inputRange: range, outputRange: [-width * 0.25, 0, width * 0.25]})},
                    {scale: x.interpolate({inputRange: range, outputRange: [1.15, 1, 1.15]})},
                  ],
                }}
              />
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#000" stopOpacity="0.25" />
                    <Stop offset="0.4" stopColor="#000" stopOpacity="0" />
                    <Stop offset="1" stopColor="#000" stopOpacity="0.85" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#g)" />
              </Svg>
              <Animated.View style={[s.copy, {
                bottom: 170 + insets.bottom,
                opacity: x.interpolate({inputRange: range, outputRange: [0, 1, 0]}),
                transform: [{translateY: x.interpolate({inputRange: range, outputRange: [40, 0, 40]})}],
              }]}>
                <Text style={s.kicker}>{item.kicker}</Text>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.text}>{item.text}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      <View style={[s.top, {top: insets.top + 8}]}>
        <Text style={s.brand}>MEYRA</Text>
        <Pressable onPress={() => done()} hitSlop={12}>
          <Text style={s.skip}>SKIP</Text>
        </Pressable>
      </View>

      <View style={[s.bottom, {paddingBottom: insets.bottom + 24}]}>
        <View style={s.dots}>
          {SLIDES.map((_, n) => (
            <Animated.View key={n} style={[s.dot, {
              opacity: x.interpolate({inputRange: [(n - 1) * width, n * width, (n + 1) * width], outputRange: [0.4, 1, 0.4], extrapolate: 'clamp'}),
              transform: [{scaleX: x.interpolate({inputRange: [(n - 1) * width, n * width, (n + 1) * width], outputRange: [1, 3.5, 1], extrapolate: 'clamp'})}],
            }]} />
          ))}
        </View>
        {last ? (
          <View style={{flexDirection: 'row', gap: 12}}>
            <Button title="Sign in" variant="light" style={{flex: 1}} onPress={() => done('login')} />
            <Button title="Join Meyra" variant="gold" style={{flex: 1}} onPress={() => done('register')} />
          </View>
        ) : (
          <Button title="Next" variant="gold" onPress={() => list.current?.scrollToIndex({index: i + 1})} />
        )}
        <Pressable onPress={() => done()} style={{marginTop: 16, alignSelf: 'center'}} hitSlop={8}>
          <Text style={s.browse}>Browse as guest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: {position: 'absolute', left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  brand: {color: '#fff', fontFamily: fonts.serif, fontSize: 20, letterSpacing: 6},
  skip: {color: 'rgba(255,255,255,0.85)', fontSize: 11.5, letterSpacing: 2, fontWeight: '700'},
  copy: {position: 'absolute', left: 24, right: 24},
  kicker: {color: colors.goldLight, fontSize: 11, letterSpacing: 3, fontWeight: '700'},
  title: {color: '#fff', fontSize: 40, lineHeight: 46, fontFamily: fonts.serif, marginTop: 10},
  text: {color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 320},
  bottom: {position: 'absolute', left: 24, right: 24, bottom: 0},
  dots: {flexDirection: 'row', gap: 12, marginBottom: 22, marginLeft: 6},
  dot: {width: 6, height: 2, backgroundColor: '#fff'},
  browse: {color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecorationLine: 'underline'},
});
