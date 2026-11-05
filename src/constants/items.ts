import { type ImageSource } from 'expo-image';

import { type CharacterId } from '@/constants/characters';

// Sketches of characters' items, in assets/images/items/, by the item's name as written in a
// character's items (src/constants/characters.ts). Capitals don't matter. Items without a sketch
// are listed by name alone.
const ITEM_IMAGES: Record<string, ImageSource> = {
  'the one ring': require('@/assets/images/items/The One Ring.png'),
  'barrow blade': require('@/assets/images/items/Barrow Blade.png'),
  'elven bow': require('@/assets/images/items/Elven Bow.png'),
  fireworks: require('@/assets/images/items/Firework.png'),
  'great horn': require('@/assets/images/items/Great Horn.png'),
  potatoes: require('@/assets/images/items/Potatos.png'),
  'the shards of narsil': require('@/assets/images/items/The Shards of Narsil.png'),
  // Gandalf's and Saruman's staffs share this sketch.
  'wizard staff': require('@/assets/images/items/Gandalfs Wizard Staff.png'),
};

// Sketches that belong to one character, for items that share a name with someone else's. Written
// as 'character: item'.
const CHARACTER_ITEM_IMAGES: Record<string, ImageSource> = {
  'gimli: axe': require('@/assets/images/items/Gimlis Axe.png'),
};

export const itemImage = (name: string, character: CharacterId): ImageSource | undefined => {
  const item = name.trim().toLowerCase();
  return CHARACTER_ITEM_IMAGES[`${character}: ${item}`] ?? ITEM_IMAGES[item];
};
