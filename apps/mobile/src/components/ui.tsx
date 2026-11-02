import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle} from 'react-native';
import Icon from './Icon';
import {colors, fonts, radius} from '../theme';

export function Stars({rating, size = 13}: {rating: number; size?: number}) {
  return (
    <View style={{flexDirection: 'row'}}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={i}
          name="star"
          size={size}
          color={colors.star}
          fill={i <= Math.round(rating) ? colors.star : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

/** Small frosted pill that sits on product images. */
export function RatingPill({rating, count}: {rating: number; count?: number}) {
  return (
    <View style={s.ratingPill}>
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
      <Icon name="star" size={10} color={colors.gold} fill={colors.gold} strokeWidth={1} />
      {count != null && <Text style={s.ratingCount}>  {count}</Text>}
    </View>
  );
}

export function Chip({
  label, active, onPress, style,
}: {label: string; active?: boolean; onPress?: () => void; style?: ViewStyle}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && s.chipActive, style]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  title, onPress, variant = 'solid', style, disabled,
}: {title: string; onPress?: () => void; variant?: 'solid' | 'outline' | 'gold' | 'light'; style?: ViewStyle; disabled?: boolean}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        s.btn, variant === 'solid' && s.btnSolid, variant === 'outline' && s.btnOutline, variant === 'gold' && s.btnGold, variant === 'light' && s.btnLight,
        (disabled || pressed) && {opacity: disabled ? 0.45 : 0.85}, style,
      ]}>
      <Text style={[s.btnText, variant === 'outline' && {color: colors.ink}]}>{title.toUpperCase()}</Text>
    </Pressable>
  );
}

export function SectionHeader({title, kicker, action, onAction, dark}: {
  title: string; kicker?: string; action?: string; onAction?: () => void; dark?: boolean;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={{flex: 1}}>
        {kicker && <Text style={[s.kicker, dark && {color: colors.goldLight}]}>{kicker.toUpperCase()}</Text>}
        <Text style={[s.sectionTitle, dark && {color: '#fff'}]}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[s.sectionAction, dark && {color: colors.goldLight, borderBottomColor: colors.goldLight}]}>
            {action.toUpperCase()}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function Header({title, onBack, right}: {title: string; onBack?: () => void; right?: React.ReactNode}) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={s.headerBtn}>
          <Icon name="back" color={colors.ink} strokeWidth={1.5} />
        </Pressable>
      ) : (
        <View style={s.headerBtn} />
      )}
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerBtn}>{right}</View>
    </View>
  );
}

export function ErrorState({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <View style={{alignItems: 'center', padding: 32}}>
      <Text style={{color: colors.text, textAlign: 'center'}}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={{marginTop: 12}}>
          <Text style={s.sectionAction}>TRY AGAIN</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Field({label, error, ...props}: TextInputProps & {label: string; error?: string | false}) {
  return (
    <View style={{marginBottom: 16}}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[s.input, props.multiline && {height: 104, textAlignVertical: 'top', paddingTop: 12}, error ? {borderColor: colors.red} : null]}
      />
      {!!error && <Text style={s.fieldErr}>{error}</Text>}
    </View>
  );
}

export function EmptyState({icon, title, text, action, onAction}: {
  icon: 'bag' | 'heart' | 'package'; title: string; text?: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={{alignItems: 'center', marginTop: 90, paddingHorizontal: 32}}>
      <View style={s.emptyIcon}><Icon name={icon} size={30} color={colors.gold} strokeWidth={1.4} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      {text && <Text style={{color: colors.muted, marginTop: 6, textAlign: 'center'}}>{text}</Text>}
      {action && <Button title={action} style={{marginTop: 22, paddingHorizontal: 30}} onPress={onAction} />}
    </View>
  );
}

const s = StyleSheet.create({
  fieldLabel: {fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6, letterSpacing: 1.2},
  input: {
    height: 50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff',
    paddingHorizontal: 14, fontSize: 15, color: colors.ink,
  },
  fieldErr: {color: colors.red, fontSize: 12, marginTop: 4},
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start', gap: 3,
  },
  ratingText: {color: colors.ink, fontSize: 11, fontWeight: '700'},
  ratingCount: {color: colors.muted, fontSize: 10},
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  chipActive: {backgroundColor: colors.ink, borderColor: colors.ink},
  chipText: {color: colors.text, fontSize: 13},
  chipTextActive: {color: '#fff', fontWeight: '600'},
  btn: {height: 52, paddingHorizontal: 16, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  btnSolid: {backgroundColor: colors.ink},
  btnGold: {backgroundColor: colors.gold},
  btnOutline: {borderWidth: 1, borderColor: colors.ink, backgroundColor: 'transparent'},
  btnLight: {borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'transparent'},
  btnText: {color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.6},
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, marginTop: 34, marginBottom: 14,
  },
  kicker: {fontSize: 10, letterSpacing: 2.2, color: colors.gold, fontWeight: '700', marginBottom: 4},
  sectionTitle: {fontSize: 24, color: colors.ink, fontFamily: fonts.serif},
  sectionAction: {
    fontSize: 11, color: colors.ink, fontWeight: '700', letterSpacing: 1.4,
    borderBottomWidth: 1, borderBottomColor: colors.ink, paddingBottom: 2, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, height: 56,
  },
  headerBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 20, color: colors.ink, fontFamily: fonts.serif},
  emptyIcon: {width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center'},
  emptyTitle: {fontSize: 22, color: colors.ink, fontFamily: fonts.serif, marginTop: 16},
});
