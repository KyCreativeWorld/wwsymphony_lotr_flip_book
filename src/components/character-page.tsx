import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { lookUpCharacter, type Character, type CharacterId } from '@/constants/characters';
import { Fonts } from '@/constants/theme';

const INK = '#3b2a1a';
const FRAME = '#8a6a3a';

// The character's sketch drawn straight onto the page, or a placeholder silhouette until one is
// added.
function Headshot({ character, size }: { character: Character; size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      {character.image ? (
        <Image source={character.image} contentFit="contain" style={StyleSheet.absoluteFill} />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx={50} cy={40} r={17} fill={FRAME} opacity={0.55} />
          <Path d="M18 92 C20 68 34 60 50 60 C66 60 80 68 82 92 Z" fill={FRAME} opacity={0.55} />
        </Svg>
      )}
    </View>
  );
}

// A character's sketch for the top of their page, drawn straight onto the paper with no frame.
// Until the image arrives, a placeholder silhouette stands in.
export function Bust({ id }: { id: CharacterId }) {
  const character = lookUpCharacter(id);
  if (character.image) {
    return (
      <Image
        source={character.image}
        contentFit="contain"
        accessibilityLabel={character.name}
        style={styles.bust}
      />
    );
  }
  return (
    <View style={styles.bust}>
      <Svg width="100%" height="100%" viewBox="0 0 120 100" preserveAspectRatio="xMidYMid slice">
        <Circle cx={60} cy={38} r={20} fill={FRAME} opacity={0.5} />
        <Path d="M22 100 C24 72 40 62 60 62 C80 62 96 72 98 100 Z" fill={FRAME} opacity={0.5} />
      </Svg>
    </View>
  );
}

type PortraitProps = {
  id: CharacterId;
  size: number;
  // How much room each portrait takes across, and the name's text size.
  width: number;
  nameSize: number;
  disabled: boolean;
  onPress: (id: CharacterId) => void;
};

// A character on a location page: sketch with the name underneath. Grows on hover, and
// is a quick link to the character's own pages.
export function Portrait({ id, size, width, nameSize, disabled, onPress }: PortraitProps) {
  const [hovered, setHovered] = useState(false);
  const character = lookUpCharacter(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Go to ${character.shortName}`}
      disabled={disabled}
      onPress={() => onPress(id)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.portrait, { width }, hovered && styles.portraitHovered]}>
      <Headshot character={character} size={size} />
      <Text style={[styles.portraitName, { fontSize: nameSize }]} numberOfLines={2}>
        {character.shortName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bust: {
    width: '100%',
    aspectRatio: 1.35,
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
