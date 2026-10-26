import { type BookPage } from '@/components/flip-book';

// One entry per location, in the order of assets/page_info.txt, with its text copied as written
// there. Edits to that file need to be copied here to show up in the book.
//
// Marker spots are fractions of the map's width and height, written as the pixel position on the
// 1800 × 1200 map image. Each sits in clear space next to its place, so pins don't cover the
// map's lettering or drawings, and they're kept far enough apart to click easily.
const MAP_WIDTH = 1800;
const MAP_HEIGHT = 1200;
const spot = (x: number, y: number) => ({ x: x / MAP_WIDTH, y: y / MAP_HEIGHT });

export const LOCATIONS: BookPage[] = [
  {
    location: 'Bennington',
    lotrLocation: 'Hobbiton',
    characters: 'Bilbo, Frodo, Samwise, Marry, Pippin',
    events:
      'Bilbo’s 111th birthday, Frodo inherits Bag End and the Golden Ring, Gandalf tells Frodo he must leave the Shire.',
    score: 'Concerning Hobbits',
    photo: { image: require('@/assets/images/images/WW Shire.png') },
    mapMarker: { label: 'Bennington', ...spot(414, 388) },
  },
  {
    location: 'Isengard Hotel and Conference Center',
    lotrLocation: 'Isengard',
    characters: 'Saruman the White, Gandalf the Grey',
    events: 'Gandalf is betrayed and imprisoned by Saruman.',
    score: 'A Knife in the Dark',
    mapMarker: { label: 'Isengard Hotel and Conference Center', ...spot(712, 690) },
  },
  {
    location: 'Wheatfields',
    lotrLocation: 'Edge of The Shire',
    characters: 'Frodo, Samwise, Marry, Pippin',
    events: 'The hobbits leave The Shire for the first time.',
    score: 'Shortcuts to Mushrooms',
    mapMarker: { label: 'Wheatfields', ...spot(599, 441) },
  },
  {
    location: 'The Prancing Taco',
    lotrLocation: 'The Prancing Pony, Bree',
    characters: 'Frodo, Samwise, Marry, Pippin, Aragorn',
    events: 'The hobbits meet Aragorn and are hunted by Nazgul.',
    score: 'Not featured',
    photo: { image: require('@/assets/images/images/WW The Prancing Pony.png') },
    mapMarker: { label: 'The Prancing Taco', ...spot(639, 210) },
  },
  {
    location: 'Wallulatop',
    lotrLocation: 'Weathertop',
    characters: 'Frodo, Samwise, Marry, Pippin, Aragorn, Nazgul',
    events:
      'The hobbits camp on Weathertop and are attacked by the Nazgul, Frodo is stabbed by a Morgul-knife.',
    score: 'A Knife in the Dark',
    mapMarker: { label: 'Wallulatop', ...spot(700, 386) },
  },
  {
    location: 'Whitmandell',
    lotrLocation: 'Rivendell',
    characters:
      'Council of Elron: Elron, Gandalf the Grey, Aragorn, Frodo, Bilbo, Boromir, Glóin, Gimli, Legolas',
    events:
      'Frodo wakes up after being healed of his Morgul-knife wound, Council of Elron (where the fate of the One Ring was decided), Bilbo retires here after his eleventy-first birthday.',
    score: 'The Fellowship Theme, Concerning Hobbits',
    photo: { image: require('@/assets/images/images/WW Rivendell.png') },
    mapMarker: { label: 'Whitmandell', ...spot(805, 238) },
  },
  {
    location: 'Blue Mountains',
    lotrLocation: 'Mountains of Caradhras',
    characters: '',
    events:
      'The fellowship is trapped in a snow storm, and chooses to travel through the Mines of Moria.',
    score: 'The Fellowship Theme',
    mapMarker: { label: 'Blue Mountains', ...spot(738, 488) },
  },
  {
    location: 'Mines of Cordiner',
    lotrLocation: 'Mines of Moria',
    characters: '',
    events:
      'Gandalf defends the fellowship from the Balrog on the Bridge of Khazad-dûm before falling into the abyss.',
    score: 'The Fellowship Theme',
    photo: { image: require('@/assets/images/images/WW Moria.png') },
    mapMarker: { label: 'Mines of Cordiner', ...spot(841, 456) },
  },
  {
    location: 'Lothlorineer',
    lotrLocation: 'Lothlorien',
    characters: '',
    events:
      'After escaping the Mines of Moria, the Fellowship receive magical gifts from Lord Celeborn and Lady Galadriel.',
    score: 'The Fellowship Theme',
    mapMarker: { label: 'Lothlorineer', ...spot(949, 432) },
  },
  {
    location: 'Anduin Creek',
    lotrLocation: 'River Anduin',
    characters: '',
    events: 'Driven by the Ring’s influence, Boromir tries to take the Ring from Frodo.',
    score: 'Argonath',
    mapMarker: { label: 'Anduin Creek', ...spot(1004, 636) },
  },
  {
    location: 'Eye of Walla Walla',
    lotrLocation: 'Eye of Sauron',
    characters: '',
    events: 'Acts as a focus on the Dark Lord’s awareness.',
    score: 'Not featured',
    mapMarker: { label: 'Eye of Walla Walla', ...spot(1325, 660) },
  },
];
