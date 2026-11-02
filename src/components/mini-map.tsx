import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type BookMap } from '@/components/book-map';
import { LEATHER_DARK } from '@/components/book-cover';
import { Fonts } from '@/constants/theme';
import { sendBookCommand } from '@/motion/book-commands';

const GOLD = '#e8c877';
// How much the map grows while the cursor is on it. It grows to the left, over the book.
const HOVER_SCALE = 1.7;

// A small copy of the map beside the book that turns back to the map spread when clicked (or,
// with the motion tracker, when the cursor rests on it).
export function MiniMap({ map, width }: { map: BookMap; width: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontSize: Math.max(12, width * 0.085) }]}>Hover to Return to Map</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to the map"
        onPress={() => sendBookCommand('map')}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.frame,
          { width, height: width / map.aspectRatio },
          hovered && styles.frameHovered,
        ]}>
        <Image
          source={require('@/assets/images/pages/vintage_page_right.jpg')}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <Image source={map.image} contentFit="contain" style={StyleSheet.absoluteFill} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: 10,
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: GOLD,
    textAlign: 'center',
  },
  frame: {
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: LEATHER_DARK,
    borderRadius: 4,
    boxShadow: `0 0 0 1px ${GOLD}, 0 4px 14px rgba(0, 0, 0, 0.6)`,
    transformOrigin: 'right center',
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '200ms',
  },
  frameHovered: {
    transform: [{ scale: HOVER_SCALE }],
    zIndex: 10,
    boxShadow: `0 0 0 1px ${GOLD}, 0 0 24px rgba(232, 200, 119, 0.55)`,
  },
});
