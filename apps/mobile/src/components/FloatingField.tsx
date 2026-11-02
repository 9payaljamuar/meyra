import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import Icon from './Icon';
import {colors} from '../theme';

/** Underlined input whose label floats up on focus; optional show/hide for passwords. */
export default function FloatingField({label, value, secure, prefix, ...props}: TextInputProps & {
  label: string; value: string; secure?: boolean; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const up = useRef(new Animated.Value(value ? 1 : 0)).current;
  const raised = focused || !!value;

  useEffect(() => {
    Animated.timing(up, {toValue: raised ? 1 : 0, duration: 180, useNativeDriver: true}).start();
  }, [raised, up]);

  return (
    <View style={s.wrap}>
      <Animated.Text
        pointerEvents="none"
        style={[s.label, {
          color: focused ? colors.gold : colors.muted,
          transform: [
            {translateY: up.interpolate({inputRange: [0, 1], outputRange: [22, 0]})},
            {scale: up.interpolate({inputRange: [0, 1], outputRange: [1.2, 1]})},
          ],
        }]}>
        {label.toUpperCase()}
      </Animated.Text>
      <View style={[s.row, {borderBottomColor: focused ? colors.ink : colors.line}]}>
        {prefix && raised && <Text style={s.prefix}>{prefix}</Text>}
        <TextInput
          {...props}
          value={value}
          secureTextEntry={secure && hidden}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={colors.muted}
          style={s.input}
        />
        {secure && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={10}>
            <Text style={s.toggle}>{hidden ? 'SHOW' : 'HIDE'}</Text>
          </Pressable>
        )}
        {!secure && !!value && focused && (
          <Pressable onPress={() => props.onChangeText?.('')} hitSlop={10}>
            <Icon name="x" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {marginBottom: 18, paddingTop: 6},
  label: {position: 'absolute', top: 6, left: 0, fontSize: 10, letterSpacing: 1.6, fontWeight: '700', transformOrigin: 'left'},
  row: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginTop: 14},
  prefix: {fontSize: 16, color: colors.ink, marginRight: 6},
  input: {flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10, paddingHorizontal: 0},
  toggle: {fontSize: 10.5, letterSpacing: 1.4, fontWeight: '700', color: colors.ink},
});
