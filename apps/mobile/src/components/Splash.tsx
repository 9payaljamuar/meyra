import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {IMG} from '../images';
import {colors, fonts} from '../theme';

const MIN_SHOW_MS = 2600;

/** Branded intro shown over the app while it boots; fades away once `ready` and the animation has played. */
export default function Splash({ready, onDone}: {ready: boolean; onDone: () => void}) {
  const logo = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const started = useRef(Date.now()).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, {toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.parallel([
        Animated.timing(line, {toValue: 1, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true}),
        Animated.timing(shine, {toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
      Animated.timing(tag, {toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]).start();
  }, [logo, line, tag, shine]);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - started));
    const t = setTimeout(() => {
      Animated.timing(out, {toValue: 1, duration: 550, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start(onDone);
    }, wait);
    return () => clearTimeout(t);
  }, [ready, out, onDone, started]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        s.root,
        {opacity: out.interpolate({inputRange: [0, 1], outputRange: [1, 0]}),
          transform: [{scale: out.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]})}]},
      ]}>
      <View style={s.frame} />
      <Animated.View style={{
        opacity: logo,
        transform: [{scale: logo.interpolate({inputRange: [0, 1], outputRange: [0.86, 1]})},
          {translateY: logo.interpolate({inputRange: [0, 1], outputRange: [12, 0]})}],
      }}>
        <View style={{overflow: 'hidden'}}>
          <Animated.Image source={IMG['m-logo']} style={s.logo} resizeMode="contain" />
          {/* light sweep across the logo */}
          <Animated.View style={[s.shine, {
            transform: [{translateX: shine.interpolate({inputRange: [0, 1], outputRange: [-160, 280]})}, {rotate: '20deg'}],
          }]} />
        </View>
      </Animated.View>
      <Animated.View style={[s.line, {transform: [{scaleX: line}]}]} />
      <Animated.View style={{
        alignItems: 'center', opacity: tag,
        transform: [{translateY: tag.interpolate({inputRange: [0, 1], outputRange: [10, 0]})}],
      }}>
        <Text style={s.tagline}>Crafting Confidence</Text>
        <Text style={s.small}>BEAUTY  ·  FASHION  ·  JEWELLERY</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100},
  frame: {
    position: 'absolute', top: 28, bottom: 28, left: 20, right: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gold, opacity: 0.5,
  },
  logo: {width: 240, height: 114},
  shine: {position: 'absolute', top: -40, width: 46, height: 200, backgroundColor: 'rgba(255,255,255,0.55)'},
  line: {width: 120, height: 1, backgroundColor: colors.gold, marginTop: 18, marginBottom: 18},
  tagline: {fontFamily: fonts.serifItalic, fontSize: 24, color: colors.ink},
  small: {marginTop: 10, fontSize: 9.5, letterSpacing: 3, color: colors.muted, fontWeight: '600'},
});
