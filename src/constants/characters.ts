import { type ImageSource } from 'expo-image';

export type Character = {
  // Full name, for the character's own page.
  name: string;
  // Short name, for the portraits on location pages.
  shortName: string;
  race: string;
  // An epithet shown under the race, e.g. Ring-bearer. Not every character has one.
  title?: string;
  home: string;
  items: string;
  // A short description for the top of the character's right-hand page.
  about: string;
  // A sketch of the character, used on their page and in round portraits. Without one, a
  // placeholder silhouette shows instead.
  image?: ImageSource;
};

// Everyone with a page in the book, by id, as written in assets/character_info.txt. Location
// pages list these ids in src/constants/locations.ts, and each character gets their own two-page
// spread after the locations, in order of first appearance.
//
// Busts are line drawings in assets/images/characters/. A character without one shows a
// placeholder silhouette until it's added, e.g.
//   image: require('@/assets/images/characters/Bilbo.png'),
export const CHARACTERS = {
  frodo: {
    image: require('@/assets/images/characters/Frodo.png'),
    name: 'Frodo Baggins',
    shortName: 'Frodo',
    race: 'Hobbit',
    title: 'Ring-bearer',
    home: 'The Shire',
    items: 'The One Ring, Sting',
    about:
      'An unusually adventurous hobbit tasked with the impossible: to take the One Ring to Mount Doom, the only place where it can be destroyed.',
  },
  samwise: {
    image: require('@/assets/images/characters/Sam.png'),
    name: 'Samwise Gamgee',
    shortName: 'Samwise',
    race: 'Hobbit',
    title: 'Gardener',
    home: 'The Shire',
    items: 'Potatoes, Soil from Galadriel’s garden and a Mallorn seed',
    about:
      'A loyal hobbit who is initially Frodo’s gardener before he joins and helps Frodo through his journey to Mount Doom to destroy the One Ring.',
  },
  merry: {
    image: require('@/assets/images/characters/Merry.png'),
    name: 'Meriadoc “Merry” Brandybuck',
    shortName: 'Merry',
    race: 'Hobbit',
    home: 'The Shire',
    items: 'Ent-draught, Barrow Blade',
    about:
      'A dependable hobbit who, because of being cousins and friends with the Ring-bearer Frodo Baggins, joins the fellowship with his best friend and cousin Pippin.',
  },
  pippin: {
    image: require('@/assets/images/characters/Pippin.png'),
    name: 'Peregrin “Pippin” Took',
    shortName: 'Pippin',
    race: 'Hobbit',
    home: 'The Shire',
    items: 'Ent-draught, Barrow Blade',
    about:
      'An impulsive, but loyal hobbit who, because of being cousins and friends with the Ring-bearer Frodo Baggins, joins the fellowship with his best friend and cousin Merry.',
  },
  gandalf: {
    image: require('@/assets/images/characters/Gandalf.png'),
    name: 'Gandalf the Grey',
    shortName: 'Gandalf the Grey',
    race: 'Maia',
    title: 'Grey Wizard',
    home: 'Valinor',
    items: 'Wizard Staff, fireworks, Glamdring',
    about:
      'The most loyal of the five Wizards sent to Middle-earth, Gandalf discovers that Bilbo and later Frodo possesses the One Ring and initiates the forming of the Fellowship of the Ring.',
  },
  aragorn: {
    image: require('@/assets/images/characters/Aragorn.png'),
    name: 'Aragorn, son of Arathorn',
    shortName: 'Aragorn',
    race: 'Human',
    title: 'Isildur’s Heir',
    home: 'Rivendell',
    items: 'The Shards of Narsil, Evenstar',
    about:
      'The Heir of Isildur, a Ranger of the North, and the rightful heir of Gondor, Aragorn joins the Fellowship of the Ring to help Frodo destroy the One Ring and fiercely fights against the forces of Sauron.',
  },
  sauron: {
    image: require('@/assets/images/characters/Sauron.png'),
    name: 'Sauron',
    shortName: 'Sauron',
    race: 'Maia',
    title: 'The Dark Lord',
    home: 'Mordor',
    items: 'The One Ring',
    about: 'The Dark Lord, maker of the One Ring.',
  },
  legolas: {
    image: require('@/assets/images/characters/Legolas.png'),
    name: 'Legolas Greenleaf',
    shortName: 'Legolas',
    race: 'Elf',
    title: 'Prince of the Woodland Realm',
    home: 'Woodland Realm, Mirkwood',
    items: 'Elven Bow, long white knife',
    about:
      'A Woodland Elf who forms an unlikely (because of the ancient quarrel between Elves and Dwarves) friendship with Dwarf Gimli and joins the Fellowship of the Ring as a representative of the Elves.',
  },
  gimli: {
    image: require('@/assets/images/characters/Gimli.png'),
    name: 'Gimli, son of Glóin',
    shortName: 'Gimli',
    race: 'Dwarf',
    home: 'Ered Luin',
    items: 'Axe',
    about:
      'A Dwarf of the House of Durin who forms an unlikely (because of the ancient quarrel between Elves and Dwarves) friendship with Elf Legolas and joins the Fellowship of the Ring as a representative of the Dwarves.',
  },
  gollum: {
    image: require('@/assets/images/characters/Gollum.png'),
    name: 'Gollum (Sméagol)',
    shortName: 'Gollum',
    race: 'Hobbit',
    home: 'Misty Mountains',
    items: 'The One Ring',
    about:
      'A Hobbit corrupted by the One Ring, whose only goal after Bilbo took the Ring is to get the precious Ring back into his possession.',
  },
  boromir: {
    image: require('@/assets/images/characters/Boromir.png'),
    name: 'Boromir',
    shortName: 'Boromir',
    race: 'Human',
    title: 'Captain of the White Tower',
    home: 'Gondor',
    items: 'Great Horn',
    about:
      'A renowned warrior and the heir to the Stewardship of Gondor, the first line of defense against Mordor, who joins the Fellowship of the Ring as a representative of Gondor.',
  },
  saruman: {
    image: require('@/assets/images/characters/Saruman.png'),
    name: 'Saruman the White',
    shortName: 'Saruman the White',
    race: 'Maia',
    title: 'White Wizard, head of the White Council',
    home: 'Isengard',
    items: 'Wizard Staff, Palantir',
    about:
      'The first wizard to be sent to Middle-earth and the head of the White Council, Saruman rules Isengard and studies the movements of Sauron.',
  },
} satisfies Record<string, Character>;

export type CharacterId = keyof typeof CHARACTERS;

export const lookUpCharacter = (id: CharacterId): Character => CHARACTERS[id];
