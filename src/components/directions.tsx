import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

const GOLD = '#e8c877';

// How to get around the book with the keyboard, shown in a row above it.
const STEPS = [
  { gesture: 'Left and right arrow keys', result: 'to flip the pages' },
  { gesture: 'M or Space', result: 'to go back to the map' },
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
