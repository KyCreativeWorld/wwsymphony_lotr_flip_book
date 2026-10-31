import { type ImageSource } from 'expo-image';

export type Character = {
  name: string;
  // A headshot for the round portrait. Without one, a placeholder silhouette shows instead.
  image?: ImageSource;
  // Shown on the character's page. Without it, the page says more is coming.
  about?: string;
};

// Everyone who appears on a location page, by id. Location pages list these ids in
// src/constants/locations.ts. Names are written as in assets/page_info.txt.
//
// To add a headshot, put the image in assets/images/characters/ and add, for example:
//   frodo: { name: 'Frodo', image: require('@/assets/images/characters/frodo.png') },
export const CHARACTERS = {
  bilbo: { name: 'Bilbo' },
  frodo: { name: 'Frodo' },
  samwise: { name: 'Samwise' },
  merry: { name: 'Marry' },
  pippin: { name: 'Pippin' },
  gandalf: { name: 'Gandalf the Grey' },
  saruman: { name: 'Saruman the White' },
  aragorn: { name: 'Aragorn' },
  nazgul: { name: 'Nazgul' },
  elrond: { name: 'Elron' },
  boromir: { name: 'Boromir' },
  gloin: { name: 'Glóin' },
  gimli: { name: 'Gimli' },
  legolas: { name: 'Legolas' },
  galadriel: { name: 'Lady Galadriel' },
  celeborn: { name: 'Lord Celeborn' },
  balrog: { name: 'The Balrog' },
  sauron: { name: 'Sauron' },
} satisfies Record<string, Character>;

export type CharacterId = keyof typeof CHARACTERS;
