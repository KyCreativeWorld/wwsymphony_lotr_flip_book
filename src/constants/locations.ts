import { type BookPage } from '@/components/flip-book';
import { type CharacterId } from '@/constants/characters';

// One entry per location, in the order of assets/page_info.txt. Names, scores and the events in
// each description come from that file; edits there need to be copied here to show up in the
// book.
//
// Marker spots are fractions of the map's width and height, written as the pixel position on the
// 1800 × 1200 map image. Each sits on the red dot drawn on the map for its place.
const MAP_WIDTH = 1800;
const MAP_HEIGHT = 1200;
const spot = (x: number, y: number) => ({ x: x / MAP_WIDTH, y: y / MAP_HEIGHT });

// The nine walkers, listed together on the pages they travel through as a group. (Gandalf is
// left out after Moria, where he falls.)
const FELLOWSHIP: CharacterId[] = [
  'frodo',
  'samwise',
  'merry',
  'pippin',
  'gandalf',
  'aragorn',
  'legolas',
  'gimli',
  'boromir',
];

export const LOCATIONS: BookPage[] = [
  {
    location: 'Bennington',
    lotrLocation: 'Hobbiton',
    wallaWallaName: 'Bennington Lake',
    description:
      'The quiet, green heart of the Shire. Bilbo celebrates his 111th birthday, Frodo inherits Bag End and the Golden Ring, and Gandalf tells Frodo he must leave the Shire.',
    characters: ['frodo', 'samwise', 'merry', 'pippin', 'gandalf'],
    score: 'Concerning Hobbits',
    photo: { image: require('@/assets/images/locations/WW Shire.png') },
    mapMarker: { label: 'Bennington', ...spot(429, 349) },
  },
  {
    location: 'Isengard Hotel and Conference Center',
    lotrLocation: 'Isengard',
    lotrAltName: 'Angrenost',
    wallaWallaName: 'Marcus Whitman Hotel & Conference Center',
    description:
      'The tallest tower in town stands in for Saruman’s fortress of Orthanc. Gandalf is betrayed and imprisoned here by Saruman.',
    characters: ['saruman', 'gandalf'],
    score: 'A Knife in the Dark',
    mapMarker: { label: 'Isengard Hotel and Conference Center', ...spot(840, 683) },
  },
  {
    location: 'The Prancing Taco',
    lotrLocation: 'The Prancing Pony, Bree',
    wallaWallaName: 'Taco Bell',
    description:
      'The inn at Bree, where travellers stop for a meal on the road. The hobbits meet Aragorn here and are hunted by Nazgul.',
    characters: ['frodo', 'samwise', 'merry', 'pippin', 'aragorn'],
    score: 'Not featured',
    photo: { image: require('@/assets/images/locations/WW The Prancing Pony.png') },
    mapMarker: { label: 'The Prancing Taco', ...spot(635, 236) },
  },
  {
    location: 'Wallula Top',
    lotrLocation: 'Weathertop',
    lotrAltName: 'Amon Sûl',
    wallaWallaName: 'Wallula Gap',
    description:
      'A lonely hilltop on the road east. The hobbits camp on Weathertop and are attacked by the Nazgul, and Frodo is stabbed by a Morgul-knife.',
    characters: ['frodo', 'samwise', 'merry', 'pippin', 'aragorn'],
    score: 'A Knife in the Dark',
    mapMarker: { label: 'Wallula Top', ...spot(730, 351) },
  },
  {
    location: 'Whitmandell',
    lotrLocation: 'Rivendell',
    lotrAltName: 'Imladris',
    wallaWallaName: 'Whitman College',
    description:
      'The Last Homely House east of the Sea. Frodo wakes after being healed of his Morgul-knife wound, the Council of Elron decides the fate of the One Ring, and Bilbo retires here after his eleventy-first birthday.',
    characters: ['gandalf', 'aragorn', 'frodo', 'boromir', 'gimli', 'legolas', 'samwise', 'merry', 'pippin'],
    score: 'The Fellowship Theme, Concerning Hobbits',
    photo: { image: require('@/assets/images/locations/WW Rivendell.png') },
    mapMarker: { label: 'Whitmandell', ...spot(868, 301) },
  },
  {
    location: 'Blue Mountains',
    lotrLocation: 'Mountains of Caradhras',
    lotrAltName: 'the Redhorn',
    wallaWallaName: 'The Blue Mountains',
    description:
      'The high, snowy pass the Fellowship tries to cross. Trapped in a snow storm, they choose to travel through the Mines of Moria instead.',
    characters: FELLOWSHIP,
    score: 'The Fellowship Theme',
    mapMarker: { label: 'Blue Mountains', ...spot(875, 408) },
  },
  {
    location: 'Mines of Cordiner',
    lotrLocation: 'Mines of Moria',
    lotrAltName: 'the Black Chasm',
    wallaWallaName: 'Cordiner Hall',
    description:
      'Vast, dark halls beneath the mountains. Gandalf defends the Fellowship from the Balrog on the Bridge of Khazad-dûm before falling into the abyss.',
    characters: [...FELLOWSHIP, 'gollum'],
    score: 'The Fellowship Theme',
    photo: { image: require('@/assets/images/locations/WW Moria.png') },
    mapMarker: { label: 'Mines of Cordiner', ...spot(875, 530) },
  },
  {
    location: 'Lothlorineer',
    lotrLocation: 'Lothlorien',
    lotrAltName: 'Lórien of the Blossom',
    wallaWallaName: 'Pioneer Park',
    description:
      'The golden wood of the Elves. After escaping the Mines of Moria, the Fellowship receive magical gifts from Lord Celeborn and Lady Galadriel.',
    characters: FELLOWSHIP.filter((id) => id !== 'gandalf'),
    score: 'The Fellowship Theme',
    mapMarker: { label: 'Lothlorineer', ...spot(950, 482) },
  },
  {
    location: 'Anduin Creek',
    lotrLocation: 'River Anduin',
    lotrAltName: 'the Great River',
    wallaWallaName: 'Mill Creek',
    description:
      'The Great River the Fellowship follows south by boat. Driven by the Ring’s influence, Boromir tries to take the Ring from Frodo.',
    characters: [...FELLOWSHIP.filter((id) => id !== 'gandalf'), 'gollum'],
    score: 'Argonath',
    mapMarker: { label: 'Anduin Creek', ...spot(1056, 614) },
  },
  {
    location: 'Eye of Walla Walla',
    lotrLocation: 'Eye of Sauron',
    wallaWallaName: 'Walla Walla VA Water Tower',
    description:
      'The ever-watchful Eye above the Dark Tower. It acts as a focus on the Dark Lord’s awareness.',
    characters: ['sauron'],
    score: 'Not featured',
    mapMarker: { label: 'Eye of Walla Walla', ...spot(1315, 836) },
  },
];
