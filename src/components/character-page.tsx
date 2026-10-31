import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { lookUpCharacter, type Character, type CharacterId } from '@/constants/characters';
import { Fonts } from '@/constants/theme';

const INK = '#3b2a1a';
const FRAME = '#8a6a3a';
const SILHOUETTE_BG = '#d9c69c';

// A round frame holding the character's bust, or a placeholder silhouette until one is added.
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

// A character's bust for the top of their page, filling its frame. Until the image arrives, a
// placeholder silhouette stands in.
export function Bust({ id }: { id: CharacterId }) {
  const character = lookUpCharacter(id);
  if (character.image) {
    return (
      <Image
        source={character.image}
        contentFit="cover"
        accessibilityLabel={character.name}
        style={styles.bust}
      />
    );
  }
  return (
    <View style={styles.bust}>
      <Svg width="100%" height="100%" viewBox="0 0 120 100" preserveAspectRatio="xMidYMid slice">
        <Rect width={120} height={100} fill={SILHOUETTE_BG} />
        <Circle cx={60} cy={38} r={20} fill={FRAME} opacity={0.5} />
        <Path d="M22 100 C24 72 40 62 60 62 C80 62 96 72 98 100 Z" fill={FRAME} opacity={0.5} />
      </Svg>
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
// is a quick link to the character's own pages.
export function Portrait({ id, size, disabled, onPress }: PortraitProps) {
  const [hovered, setHovered] = useState(false);
  const character = lookUpCharacter(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Go to ${character.name}`}
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

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderColor: FRAME,
    backgroundColor: SILHOUETTE_BG,
    boxShadow: '0 2px 5px rgba(59, 42, 26, 0.35)',
  },
  bust: {
    width: '100%',
    aspectRatio: 1.2,
    overflow: 'hidden',
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
});
