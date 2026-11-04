import React, {useState} from 'react';
import {FlatList, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from './Icon';
import {colors, fonts, radius} from '../theme';

// GST place of supply needs an exact state, so this is a list rather than free text.
export const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function StatePicker({value, onChange}: {value: string; onChange: (s: string) => void}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{marginBottom: 16}}>
      <Text style={s.label}>STATE</Text>
      <Pressable style={s.input} onPress={() => setOpen(true)}>
        <Text style={{color: value ? colors.ink : colors.muted, fontSize: 15, flex: 1}}>{value || 'Select state'}</Text>
        <Icon name="right" size={16} color={colors.muted} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: colors.bg}}>
          <View style={s.head}>
            <Text style={s.title}>Select state</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}><Icon name="x" /></Pressable>
          </View>
          <FlatList
            data={STATES}
            keyExtractor={x => x}
            renderItem={({item}) => (
              <Pressable style={s.row} onPress={() => { onChange(item); setOpen(false); }}>
                <Text style={{fontSize: 15, color: colors.ink, flex: 1, fontWeight: item === value ? '700' : '400'}}>{item}</Text>
                {item === value && <Icon name="check" size={18} color={colors.gold} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: {fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6, letterSpacing: 1.2},
  input: {
    height: 50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff',
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
  },
  head: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line},
  title: {fontFamily: fonts.serif, fontSize: 22, color: colors.ink},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line},
});
