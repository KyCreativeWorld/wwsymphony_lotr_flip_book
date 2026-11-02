import { Asset } from 'expo-asset';

// The book's lettering: Cinzel, a free (SIL Open Font License) typeface in the style of the
// carved Roman capitals on the Lord of the Rings films. Its licence is in assets/fonts/.
//
// It's a variable font, so one file has every weight. expo-font registers a font with a single
// weight on SDK 57, which would make bold text fake-bold, so the font is registered here directly
// with its full weight range. global.css puts it first in --font-serif.
export function loadBookFont() {
  const { uri } = Asset.fromModule(require('@/assets/fonts/Cinzel-Variable.ttf'));
  const face = new FontFace('Cinzel', `url(${uri})`, { weight: '400 900', display: 'swap' });
  document.fonts.add(face);
  face.load().catch(() => {
    // Falls back to Georgia.
  });
}
