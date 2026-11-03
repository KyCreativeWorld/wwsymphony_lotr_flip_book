import { type ImageSource } from 'expo-image';

// Sketches of characters' items, in assets/images/items/, by the item's name as written in a
// character's items (src/constants/characters.ts). Capitals don't matter. Items without a sketch
// are listed by name alone.
const ITEM_IMAGES: Record<string, ImageSource> = {
  'the one ring': require('@/assets/images/items/The One Ring.png'),
};

export const itemImage = (name: string): ImageSource | undefined => ITEM_IMAGES[name.trim().toLowerCase()];
