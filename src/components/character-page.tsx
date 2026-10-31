import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { CHARACTERS, type Character, type CharacterId } from '@/constants/characters';
import { Fonts } from '@/constants/theme';

const INK = '#3b2a1a';
const FRAME = '#8a6a3a';
const SILHOUETTE_BG = '#d9c69c';
const PAPER = require('@/assets/images/pages/vintage_page_right.jpg');

const lookUp = (id: CharacterId): Character => CHARACTERS[id];

// A round frame holding the character's headshot, or a placeholder silhouette until one is added.
function Headshot({ character, size }: { character: Character; size: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.05 }]}>
      {character.image ? (
        <Image source={character.image} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={50} fill={SILHOUETTE_BG} />
          <Circle cx={50} cy={40} r={17} fill={FRAME} opacity={0.55} />
          <Path d="M18 92 C20 68 34 60 50 60 C66 60 80 68 82 92 Z" fill={FRAME} opacity={0.55} />
        </Svg>
      )}
    </View>
  );
}

type PortraitProps = {
  id: CharacterId;
  size: number;
  disabled: boolean;
  onPress: (id: CharacterId) => void;
};

// A character on a location page: round portrait with the name underneath. Grows on hover, and
// opens the character's page when clicked.
export function Portrait({ id, size, disabled, onPress }: PortraitProps) {
  const [hovered, setHovered] = useState(false);
  const character = lookUp(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`About ${character.name}`}
      disabled={disabled}
      onPress={() => onPress(id)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.portrait, { width: size * 1.45 }, hovered && styles.portraitHovered]}>
      <Headshot character={character} size={size} />
      <Text style={[styles.portraitName, { fontSize: Math.max(10, size * 0.22) }]} numberOfLines={2}>
        {character.name}
      </Text>
    </Pressable>
  );
}

type CharacterPageProps = {
  id: CharacterId;
  // Where this character appears, listed on their page.
  appearsIn: string[];
  width: number;
  height: number;
  onClose: () => void;
};

// A character's own page, laid over the book so closing it leaves the book where it was.
export function CharacterPage({ id, appearsIn, width, height, onClose }: CharacterPageProps) {
  const character = lookUp(id);
  return (
    <View style={styles.backdrop}>
      {/* Clicking outside the page closes it. */}
      <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.sheet, { width, height, padding: width * 0.09 }]}>
        <Image source={PAPER} contentFit="fill" style={StyleSheet.absoluteFill} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
        <Headshot character={character} size={width * 0.38} />
        <Text style={[styles.name, { fontSize: width * 0.085 }]}>{character.name}</Text>
        <View style={styles.rule} />
        <Text style={[styles.about, { fontSize: width * 0.045, lineHeight: width * 0.066 }]}>
          {character.about ?? `More about ${character.name} is coming soon.`}
        </Text>
        <Text style={[styles.label, { fontSize: width * 0.032, marginTop: width * 0.06 }]}>Appears in</Text>
        <Text style={[styles.about, { fontSize: width * 0.042, lineHeight: width * 0.062 }]}>
          {appearsIn.join(', ')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderColor: FRAME,
    backgroundColor: SILHOUETTE_BG,
    boxShadow: '0 2px 5px rgba(59, 42, 26, 0.35)',
  },
  portrait: {
    alignItems: 'center',
    transitionProperty: 'transform',
    transitionDuration: '150ms',
  },
  portraitHovered: {
    transform: [{ scale: 1.18 }],
    zIndex: 1,
  },
  portraitName: {
    marginTop: 4,
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    textAlign: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 10, 4, 0.55)',
  },
  sheet: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 4,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 58, 34, 0.85)',
  },
  closePressed: {
    opacity: 0.6,
  },
  closeLabel: {
    color: '#f4e9d0',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: 700,
  },
  name: {
    marginTop: 16,
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    textAlign: 'center',
  },
  rule: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: FRAME,
    opacity: 0.4,
    marginVertical: 12,
    marginHorizontal: '20%',
  },
  about: {
    fontFamily: Fonts.serif,
    color: INK,
    textAlign: 'center',
  },
  label: {
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
});
