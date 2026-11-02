// Motion & feedback: heart pop, skeleton shimmer, offers ticker, toast.
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from './Icon';
import {colors, radius} from '../theme';

export function HeartButton({active, onPress, size = 18, style}: {
  active: boolean; onPress: () => void; size?: number; style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (!active) {
      scale.setValue(0.6);
      Animated.spring(scale, {toValue: 1, friction: 3, tension: 160, useNativeDriver: true}).start();
    }
    onPress();
  };
  return (
    <Pressable onPress={press} hitSlop={10} style={style}>
      <Animated.View style={{transform: [{scale}]}}>
        <Icon name="heart" size={size} color={active ? colors.blushDark : colors.ink}
          fill={active ? colors.blushDark : 'none'} strokeWidth={1.5} />
      </Animated.View>
    </Pressable>
  );
}

export function Skeleton({style}: {style?: ViewStyle}) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(o, {toValue: 0.5, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{backgroundColor: '#EDE7DD', borderRadius: radius.sm, opacity: o}, style]} />;
}

export function CardSkeleton({width}: {width: number | `${number}%`}) {
  return (
    <View style={{width}}>
      <Skeleton style={{aspectRatio: 0.75, borderRadius: 4}} />
      <Skeleton style={{height: 10, width: '40%', marginTop: 10}} />
      <Skeleton style={{height: 14, width: '85%', marginTop: 6}} />
      <Skeleton style={{height: 14, width: '50%', marginTop: 6}} />
    </View>
  );
}

const TICKER = 'FREE DELIVERY ABOVE ₹499   ✦   NEW ARRIVALS EVERY WEEK   ✦   100% GENUINE, KYC-VERIFIED SELLERS   ✦   EASY 7-DAY RETURNS   ✦   ';

export function Ticker() {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    const loop = Animated.loop(
      Animated.timing(x, {toValue: -w, duration: w * 22, easing: Easing.linear, useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [w, x]);
  return (
    <View style={fx.ticker}>
      {/* Wide row so each copy lays out on one line instead of wrapping to the screen width. */}
      <Animated.View style={{flexDirection: 'row', width: 4000, transform: [{translateX: x}]}}>
        <Text style={fx.tickerText} numberOfLines={1} onLayout={e => setW(e.nativeEvent.layout.width)}>{TICKER}</Text>
        <Text style={fx.tickerText} numberOfLines={1}>{TICKER}</Text>
      </Animated.View>
    </View>
  );
}

// ---- Toast ----

const ToastCtx = createContext<(msg: string, action?: {label: string; onPress: () => void}) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [msg, setMsg] = useState<{text: string; action?: {label: string; onPress: () => void}} | null>(null);
  const y = useRef(new Animated.Value(120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.timing(y, {toValue: 120, duration: 200, useNativeDriver: true}).start(() => setMsg(null));
  }, [y]);

  const show = useCallback((text: string, action?: {label: string; onPress: () => void}) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({text, action});
    Animated.spring(y, {toValue: 0, friction: 8, useNativeDriver: true}).start();
    timer.current = setTimeout(hide, 2600);
  }, [y, hide]);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="box-none" style={[fx.toastWrap, {bottom: insets.bottom + 76, transform: [{translateY: y}]}]}>
          <View style={fx.toast}>
            <Icon name="check" size={16} color={colors.goldLight} strokeWidth={2.5} />
            <Text style={fx.toastText}>{msg.text}</Text>
            {msg.action && (
              <Pressable onPress={() => { hide(); msg.action!.onPress(); }} hitSlop={8}>
                <Text style={fx.toastAction}>{msg.action.label}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

const fx = StyleSheet.create({
  ticker: {
    backgroundColor: colors.goldSoft, height: 30, justifyContent: 'center', overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.goldLight,
  },
  tickerText: {color: colors.goldDark, fontSize: 10.5, letterSpacing: 1.6, fontWeight: '700'},
  toastWrap: {position: 'absolute', left: 16, right: 16, alignItems: 'center'},
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: radius.pill,
    paddingHorizontal: 18, paddingVertical: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
  },
  toastText: {color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1},
  toastAction: {color: colors.goldLight, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginLeft: 6},
});
