import { type ImageSource } from 'expo-image';

export type Character = {
  name: string;
  race: string;
  // An epithet shown under the race, e.g. Ring-bearer.
  title: string;
  // A short bio for the top of the character's right-hand page.
  about: string;
  // A bust of the character, used on their page and in round portraits. Without one, a
  // placeholder silhouette shows instead.
  image?: ImageSource;
};

// Everyone who appears on a location page, by id. Location pages list these ids in
// src/constants/locations.ts, and each character gets their own two-page spread after the
// locations, in order of first appearance. Names are written as in assets/page_info.txt.
//
// To add a bust, put the image in assets/images/characters/ and add to that character, e.g.
//   image: require('@/assets/images/characters/frodo.png'),
export const CHARACTERS = {
  bilbo: {
    name: 'Bilbo',
    race: 'Hobbit',
    title: 'The Burglar',
    about:
      'Frodo’s uncle, who found the One Ring on his own adventure long ago. After his eleventy-first birthday he leaves the Shire and retires to Rivendell.',
  },
  frodo: {
    name: 'Frodo',
    race: 'Hobbit',
    title: 'Ring-bearer',
    about:
      'Bilbo’s heir, who inherits Bag End and the One Ring. He sets out from the Shire to carry the Ring to its destruction.',
  },
  samwise: {
    name: 'Samwise',
    race: 'Hobbit',
    title: 'Samwise the Brave',
    about: 'Frodo’s gardener and most loyal friend, who never leaves his side.',
  },
  merry: {
    name: 'Marry',
    race: 'Hobbit',
    title: 'Esquire of Rohan',
    about: 'A Brandybuck of Buckland and Frodo’s cousin, quick-witted and always ready for an adventure.',
  },
  pippin: {
    name: 'Pippin',
    race: 'Hobbit',
    title: 'Guard of the Citadel',
    about: 'The youngest of the hobbits in the Fellowship, curious, cheerful and often in trouble.',
  },
  gandalf: {
    name: 'Gandalf the Grey',
    race: 'Wizard (Maia)',
    title: 'Mithrandir',
    about:
      'A wandering wizard and friend of the hobbits, who guides the Fellowship until he falls fighting the Balrog in Moria.',
  },
  saruman: {
    name: 'Saruman the White',
    race: 'Wizard (Maia)',
    title: 'Head of the White Council',
    about:
      'Once the wisest of the wizards, he turns to the Dark Lord, betrays Gandalf and imprisons him in the tower of Orthanc.',
  },
  aragorn: {
    name: 'Aragorn',
    race: 'Man (Dúnedain)',
    title: 'Strider, Heir of Isildur',
    about:
      'A Ranger of the North and heir to the throne of Gondor, who meets the hobbits at Bree and guides them to Rivendell.',
  },
  nazgul: {
    name: 'Nazgul',
    race: 'Ringwraiths',
    title: 'The Nine Riders',
    about:
      'Nine kings of Men enslaved by rings of power, who hunt the hobbits on black horses in search of the One Ring.',
  },
  elrond: {
    name: 'Elron',
    race: 'Half-elven',
    title: 'Lord of Rivendell',
    about:
      'The master of Rivendell and a great healer, who calls the Council where the fate of the One Ring is decided.',
  },
  boromir: {
    name: 'Boromir',
    race: 'Man (Gondor)',
    title: 'Captain of Gondor',
    about:
      'A proud warrior of Gondor who joins the Fellowship, but is tempted by the Ring and tries to take it from Frodo.',
  },
  gloin: {
    name: 'Glóin',
    race: 'Dwarf',
    title: 'Father of Gimli',
    about: 'A Dwarf of the Lonely Mountain who once travelled with Bilbo, and comes to the Council of Elron.',
  },
  gimli: {
    name: 'Gimli',
    race: 'Dwarf',
    title: 'Son of Glóin',
    about: 'A stout-hearted Dwarf warrior who represents his people in the Fellowship.',
  },
  legolas: {
    name: 'Legolas',
    race: 'Elf',
    title: 'Prince of the Woodland Realm',
    about: 'A keen-eyed Elf archer from Mirkwood who represents the Elves in the Fellowship.',
  },
  balrog: {
    name: 'The Balrog',
    race: 'Maia (Balrog)',
    title: 'Durin’s Bane',
    about:
      'An ancient demon of shadow and flame woken deep in Moria, who drags Gandalf into the abyss.',
  },
  galadriel: {
    name: 'Lady Galadriel',
    race: 'Elf',
    title: 'Lady of the Golden Wood',
    about:
      'The wise and powerful ruler of Lothlórien, who gives the Fellowship gifts for their journey.',
  },
  celeborn: {
    name: 'Lord Celeborn',
    race: 'Elf',
    title: 'Lord of Lothlórien',
    about: 'Galadriel’s husband, who rules the Golden Wood beside her and welcomes the Fellowship.',
  },
  sauron: {
    name: 'Sauron',
    race: 'Maia',
    title: 'The Dark Lord',
    about:
      'The maker of the One Ring, who seeks it to rule all of Middle-earth. He watches as a great flaming Eye.',
  },
} satisfies Record<string, Character>;

export type CharacterId = keyof typeof CHARACTERS;

export const lookUpCharacter = (id: CharacterId): Character => CHARACTERS[id];
