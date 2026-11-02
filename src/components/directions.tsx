import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

const GOLD = '#e8c877';

// How to use the book with the handheld object, shown in a row above it.
const STEPS = [
  { gesture: 'Point at the screen', result: 'to move the ring' },
  { gesture: 'Hold the ring still', result: 'on anything to select it' },
  { gesture: 'Swipe right to left', result: 'for the next page' },
  { gesture: 'Swipe left to right', result: 'for the previous page' },
];

export function Directions({ fontSize }: { fontSize: number }) {
  return (
    <View style={[styles.row, { columnGap: fontSize * 2, rowGap: fontSize * 0.4 }]}>
      {STEPS.map(({ gesture, result }) => (
        <Text key={gesture} style={[styles.step, { fontSize }]}>
          <Text style={styles.gesture}>{gesture}</Text> {result}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  step: {
    fontFamily: Fonts.serif,
    color: GOLD,
    opacity: 0.85,
  },
  gesture: {
    fontWeight: 700,
    opacity: 1,
  },
});
