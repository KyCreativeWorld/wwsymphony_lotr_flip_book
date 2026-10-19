import { Image, type ImageSource } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BackCover, FrontCover, InsideCover, LEATHER_DARK } from '@/components/book-cover';
import { AgedPaper, PaperWear } from '@/components/aged-paper';
import { MapHalf, MapInset, type BookMap, type MapMarker, type PlacedMarker } from '@/components/book-map';
import { Fonts } from '@/constants/theme';

const TURN_DURATION = 900;
// Each page turn while riffling to a location picked on the map.
const RIFFLE_DURATION = 450;

// A turning paper page is drawn as this many vertical strips, each bent a little further
// than the one before it, so the page curls.
const CURL_STRIPS = 16;
// How far (in degrees) the outer edge runs ahead of the spine at the middle of a turn.
const MAX_CURL = 75;
const TURN_EASING = Easing.inOut(Easing.cubic);

const PAPER = '#f4e9d0';
const PAPER_EDGE = '#d9c69c';
const INK = '#3b2a1a';

// Pages are shaped like a sheet of US letter paper: 8.5 by 11.
export const PAGE_ASPECT = 11 / 8.5;

// How far the covers stick out past the pages.
const COVER_MARGIN_X = 14;
const COVER_MARGIN_Y = 12;

export type BookPage = {
  title: string;
  body: string;
  image: ImageSource;
  // Width divided by height, so the photo keeps its shape on the page.
  imageAspectRatio: number;
  // Where this location sits on the map, if it has a marker.
  mapMarker?: MapMarker;
};

// A leaf is one sheet of paper (or a cover board): its front shows on the right,
// its back on the left once turned.
type Leaf = {
  kind: 'page' | 'cover';
  front: ReactNode;
  back: ReactNode;
  // Outer cover faces carry their own spine shading in the artwork.
  frontSpineShadow: boolean;
  backSpineShadow: boolean;
  // Paper leaves get aged paper, stained and creased differently per seed.
  paperSeed?: number;
};

type FlipBookProps = {
  pages: BookPage[];
  // Spread across the first two pages you see after opening the cover.
  map: BookMap;
  pageWidth: number;
};

export function FlipBook({ pages, map, pageWidth }: FlipBookProps) {
  const pageHeight = pageWidth * PAGE_ASPECT;
  const coverWidth = pageWidth + COVER_MARGIN_X;
  const coverHeight = pageHeight + COVER_MARGIN_Y * 2;
  const [current, setCurrent] = useState(0);
  const [turning, setTurning] = useState<number | null>(null);
  const [turnDuration, setTurnDuration] = useState(TURN_DURATION);

  // The open spread (value of `current`) where a location's two pages can be seen.
  // Sides on a leaf's front show on the right of spread N, backs on the left of spread N + 1.
  const spreadForPage = (pageIndex: number) => {
    const side = 1 + pageIndex * 2;
    const leaf = 1 + Math.floor(side / 2);
    return side % 2 === 0 ? leaf : leaf + 1;
  };

  // Turns one leaf at a time from spread `from` until reaching spread `to`.
  const turnTowards = (from: number, to: number, duration: number) => {
    const direction = to > from ? 1 : -1;
    const next = from + direction;
    // The turning leaf is the one being lifted: the next unturned leaf going forward,
    // or the last turned leaf going back.
    setTurning(direction === 1 ? from : from - 1);
    setTurnDuration(duration);
    setCurrent(next);
    setTimeout(() => {
      if (next === to) setTurning(null);
      else turnTowards(next, to, duration);
    }, duration);
  };

  // Riffle through the pages in between to reach a location chosen on the map.
  const goToPage = (pageIndex: number) => {
    const target = spreadForPage(pageIndex);
    if (turning !== null || target === current) return;
    turnTowards(current, target, RIFFLE_DURATION);
  };

  const renderMapHalf = (side: 'left' | 'right') => {
    const markers: PlacedMarker[] = pages.flatMap((page, pageIndex) =>
      page.mapMarker ? [{ marker: page.mapMarker, pageIndex }] : [],
    );
    return (
      <MapHalf
        map={map}
        side={side}
        markers={markers}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        interactive={turning === null}
        onSelect={goToPage}
      />
    );
  };

  // Page sides in reading order after the cover: the map's right half, then two pages per
  // location (photo on the left, description on the right), then "The End".
  // Pairs of sides make up each paper leaf.
  const sides: ReactNode[] = [
    renderMapHalf('right'),
    ...pages.flatMap((page, index) => [
      <LocationPhotoPage key={`photo-${index}`} page={page} number={index * 2 + 1} pageWidth={pageWidth} />,
      <LocationTextPage
        key={`text-${index}`}
        page={page}
        map={map}
        number={index * 2 + 2}
        pageWidth={pageWidth}
      />,
    ]),
    <EndPage key="end" pageWidth={pageWidth} />,
  ];
  if (sides.length % 2 === 1) sides.push(<View key="blank" />);

  const leaves: Leaf[] = [
    {
      kind: 'cover',
      front: <FrontCover />,
      // The left half of the map is printed on the inside of the front cover, lined up with the page.
      back: (
        <InsideCover spine="right">
          <View style={[styles.coverMap, { top: COVER_MARGIN_Y, width: pageWidth, height: pageHeight }]}>
            {renderMapHalf('left')}
            <PaperWear width={pageWidth} height={pageHeight} seed={1} spine="right" />
          </View>
        </InsideCover>
      ),
      frontSpineShadow: false,
      backSpineShadow: true,
    },
  ];
  for (let i = 0; i < sides.length; i += 2) {
    leaves.push({
      kind: 'page',
      front: sides[i],
      back: sides[i + 1],
      frontSpineShadow: true,
      backSpineShadow: true,
      paperSeed: i + 2,
    });
  }
  leaves.push({
    kind: 'cover',
    // A blank, aged sheet pasted inside the back cover, lined up with the pages.
    front: (
      <InsideCover spine="left">
        <View style={[styles.backPastedown, { top: COVER_MARGIN_Y, width: pageWidth, height: pageHeight }]}>
          <AgedPaper width={pageWidth} height={pageHeight} seed={99} spine="left" />
          <PaperWear width={pageWidth} height={pageHeight} seed={99} spine="left" />
        </View>
      </InsideCover>
    ),
    back: <BackCover />,
    frontSpineShadow: true,
    backSpineShadow: false,
  });

  const isClosedFront = current === 0;
  const isClosedBack = current === leaves.length;

  // A closed book only fills one half of the spread, so slide it to the middle.
  const shift = useSharedValue(0);
  useEffect(() => {
    const target = isClosedFront ? -coverWidth / 2 : isClosedBack ? coverWidth / 2 : 0;
    shift.value = withTiming(target, { duration: TURN_DURATION, easing: TURN_EASING });
  }, [isClosedFront, isClosedBack, coverWidth, shift]);
  const shiftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));

  const turn = (direction: 1 | -1) => {
    const next = current + direction;
    if (turning !== null || next < 0 || next > leaves.length) return;
    turnTowards(current, next, TURN_DURATION);
  };

  // On the web, the left and right arrow keys turn the pages too.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Ignore held-down keys so one press turns one page.
      if (event.repeat) return;
      if (event.key === 'ArrowRight') turn(1);
      else if (event.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const getZIndex = (index: number) => {
    if (index === turning) return leaves.length + 1;
    // Turned leaves stack up on the left (latest on top); unturned ones on the right (first on top).
    return index < current ? index + 1 : leaves.length - index;
  };

  return (
    <Animated.View style={[{ width: coverWidth * 2, height: coverHeight }, shiftStyle]}>
      {leaves.map((leaf, index) => (
        <TurningLeaf
          key={index}
          leaf={leaf}
          turned={index < current}
          duration={turnDuration}
          curl={leaf.kind === 'page' && index === turning}
          zIndex={getZIndex(index)}
          left={coverWidth}
          top={leaf.kind === 'cover' ? 0 : COVER_MARGIN_Y}
          width={leaf.kind === 'cover' ? coverWidth : pageWidth}
          height={leaf.kind === 'cover' ? coverHeight : pageHeight}
        />
      ))}

      <ArrowButton
        label="‹"
        accessibilityLabel="Previous page"
        hidden={isClosedFront}
        disabled={turning !== null}
        onPress={() => turn(-1)}
        style={styles.arrowLeft}
      />
      <ArrowButton
        label="›"
        accessibilityLabel="Next page"
        hidden={isClosedBack}
        disabled={turning !== null}
        onPress={() => turn(1)}
        style={styles.arrowRight}
      />
    </Animated.View>
  );
}

type TurningLeafProps = {
  leaf: Leaf;
  turned: boolean;
  duration: number;
  // Bend the page while it turns. Covers are stiff boards, so they stay flat.
  curl: boolean;
  zIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

function TurningLeaf({ leaf, turned, duration, curl, zIndex, left, top, width, height }: TurningLeafProps) {
  const angle = useSharedValue(turned ? -180 : 0);

  useEffect(() => {
    angle.value = withTiming(turned ? -180 : 0, { duration, easing: TURN_EASING });
  }, [turned, duration, angle]);

  // Rotate around the spine (the leaf's left edge), with perspective so it lifts toward the reader.
  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: width * 5 }, { rotateY: `${angle.value}deg` }],
  }));
  // Show the front until the leaf stands upright, then the back.
  const frontStyle = useAnimatedStyle(() => ({ opacity: angle.value > -90 ? 1 : 0 }));
  const backStyle = useAnimatedStyle(() => ({ opacity: angle.value > -90 ? 0 : 1 }));
  // Darken each face as it tilts away from the light.
  const frontShade = useAnimatedStyle(() => ({
    opacity: interpolate(angle.value, [0, -90], [0, 0.35], 'clamp'),
  }));
  const backShade = useAnimatedStyle(() => ({
    opacity: interpolate(angle.value, [-90, -180], [0.35, 0], 'clamp'),
  }));

  const faceStyle = leaf.kind === 'cover' ? styles.coverFace : styles.pageFace;

  const frontContent = (
    <>
      {leaf.paperSeed !== undefined && (
        <AgedPaper width={width} height={height} seed={leaf.paperSeed} spine="left" />
      )}
      {leaf.front}
      {leaf.paperSeed !== undefined && (
        <PaperWear width={width} height={height} seed={leaf.paperSeed} spine="left" />
      )}
      {leaf.frontSpineShadow && <SpineShadow side="left" />}
    </>
  );
  const backContent = (
    <>
      {leaf.paperSeed !== undefined && (
        <AgedPaper width={width} height={height} seed={leaf.paperSeed + 1} spine="right" />
      )}
      {leaf.back}
      {leaf.paperSeed !== undefined && (
        <PaperWear width={width} height={height} seed={leaf.paperSeed + 1} spine="right" />
      )}
      {leaf.backSpineShadow && <SpineShadow side="right" />}
    </>
  );

  if (curl) {
    return (
      <View style={[styles.leaf, { left, top, width, height, zIndex }]} pointerEvents="none">
        {Array.from({ length: CURL_STRIPS }, (_, index) => (
          <CurlStrip
            key={index}
            index={index}
            angle={angle}
            forward={turned}
            width={width}
            height={height}
            faceStyle={faceStyle}
            front={frontContent}
            back={backContent}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.leaf, { left, top, width, height, zIndex }, leafStyle]}>
      {/* Only the side facing up takes clicks, so hidden map markers can't be pressed. */}
      <Animated.View
        style={[styles.face, faceStyle, frontStyle]}
        pointerEvents={turned ? 'none' : 'auto'}>
        {frontContent}
        <Animated.View style={[styles.shade, frontShade]} pointerEvents="none" />
      </Animated.View>
      {/* Mirrored so it reads correctly once the leaf has flipped over to the left. */}
      <Animated.View
        style={[styles.face, faceStyle, styles.mirrored, backStyle]}
        pointerEvents={turned ? 'auto' : 'none'}>
        {backContent}
        <Animated.View style={[styles.shade, backShade]} pointerEvents="none" />
      </Animated.View>
    </Animated.View>
  );
}

// The angle of one strip of a curling page. `pageAngle` runs from 0 (lying on the right)
// to -180 (lying on the left). The outer edge leads the turn, as if pulled by hand, and the
// bend is strongest midway through.
function curlAngle(pageAngle: number, forward: boolean, strip: number) {
  'worklet';
  const progress = Math.min(1, Math.max(0, -pageAngle / 180));
  const bend = Math.sin(Math.PI * progress) * MAX_CURL;
  // Strips nearer the outer edge bend more.
  const reach = Math.pow((strip + 0.5) / CURL_STRIPS, 1.5);
  const lead = forward ? -bend * reach : bend * reach;
  return Math.min(0, Math.max(-180, pageAngle + lead));
}

type CurlStripProps = {
  index: number;
  angle: SharedValue<number>;
  forward: boolean;
  width: number;
  height: number;
  faceStyle: object;
  front: ReactNode;
  back: ReactNode;
};

// One vertical slice of a curling page. Every strip is placed in 3D by walking out from the
// spine along the strips before it, so together they form one smooth, bent sheet.
function CurlStrip({ index, angle, forward, width, height, faceStyle, front, back }: CurlStripProps) {
  const stripWidth = width / CURL_STRIPS;
  const perspective = width * 5;

  const stripStyle = useAnimatedStyle(() => {
    let x = 0;
    let z = 0;
    for (let j = 0; j < index; j++) {
      const radians = (curlAngle(angle.value, forward, j) * Math.PI) / 180;
      x += stripWidth * Math.cos(radians);
      z -= stripWidth * Math.sin(radians);
    }
    // Reach the strip's spot (x, z) by turning toward it and sliding out along that direction,
    // then turn the rest of the way to the strip's own angle.
    const toward = (Math.atan2(-z, x) * 180) / Math.PI;
    const distance = Math.sqrt(x * x + z * z);
    const own = curlAngle(angle.value, forward, index);
    return {
      transform: [
        { perspective },
        { rotateY: `${toward}deg` },
        { translateX: distance },
        { rotateY: `${own - toward}deg` },
      ],
    };
  });
  const frontStyle = useAnimatedStyle(() => ({
    opacity: curlAngle(angle.value, forward, index) > -90 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: curlAngle(angle.value, forward, index) > -90 ? 0 : 1,
  }));
  // Each strip catches the light by its own angle, which shades the curve.
  const frontShade = useAnimatedStyle(() => ({
    opacity: interpolate(curlAngle(angle.value, forward, index), [0, -90], [0, 0.4], 'clamp'),
  }));
  const backShade = useAnimatedStyle(() => ({
    opacity: interpolate(curlAngle(angle.value, forward, index), [-90, -180], [0.4, 0], 'clamp'),
  }));

  // Each face is drawn at full size and shifted so only this strip's slice shows.
  const slice = { left: -index * stripWidth, width, height };
  return (
    // One pixel wider than its share, so neighbouring strips overlap instead of leaving hairline gaps.
    <Animated.View style={[styles.strip, { width: stripWidth + 1, height }, stripStyle]}>
      <Animated.View style={[styles.stripFace, faceStyle, slice, frontStyle]}>
        {front}
        <Animated.View style={[styles.shade, frontShade]} />
      </Animated.View>
      <Animated.View style={[styles.stripFace, faceStyle, slice, styles.mirrored, backStyle]}>
        {back}
        <Animated.View style={[styles.shade, backShade]} />
      </Animated.View>
    </Animated.View>
  );
}

function SpineShadow({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={[styles.spine, side === 'left' ? { left: 0 } : { right: 0 }]} pointerEvents="none">
      {[0.14, 0.09, 0.05, 0.02].map((opacity, index) => (
        <View
          key={index}
          style={[
            styles.spineBand,
            { opacity, [side]: index * 5, width: 5 },
          ]}
        />
      ))}
    </View>
  );
}

type LocationPageProps = {
  page: BookPage;
  number: number;
  pageWidth: number;
};

// Left page of a location: the photo, taped in like a print, with the title underneath.
function LocationPhotoPage({ page, number, pageWidth }: LocationPageProps) {
  const tape = { width: pageWidth * 0.16, height: pageWidth * 0.045 };
  return (
    <View style={[styles.pageInner, { padding: pageWidth * 0.1, paddingTop: pageWidth * 0.13 }]}>
      <View style={styles.print}>
        <Image
          source={page.image}
          contentFit="cover"
          accessibilityLabel={page.title}
          style={styles.photo}
        />
        <View style={[styles.tape, tape, { left: -tape.width * 0.3, transform: [{ rotate: '-35deg' }] }]} />
        <View style={[styles.tape, tape, { right: -tape.width * 0.3, transform: [{ rotate: '35deg' }] }]} />
      </View>
      <Text style={[styles.pageTitle, { fontSize: pageWidth * 0.085, marginTop: pageWidth * 0.07 }]}>
        {page.title}
      </Text>
      <View style={styles.rule} />
      <Text style={[styles.pageNumber, { fontSize: pageWidth * 0.04 }]}>{number}</Text>
    </View>
  );
}

// Right page of a location: what it is, and a close-up of where it sits on the map.
function LocationTextPage({ page, map, number, pageWidth }: LocationPageProps & { map: BookMap }) {
  const insetWidth = pageWidth * 0.8;
  return (
    <View
      style={[
        styles.pageInner,
        { padding: pageWidth * 0.1, paddingTop: pageWidth * 0.12, paddingBottom: pageWidth * 0.07 },
      ]}>
      {page.mapMarker && (
        <Text style={[styles.pageHeading, { fontSize: pageWidth * 0.065 }]}>{page.mapMarker.label}</Text>
      )}
      <Text style={[styles.pageSubheading, { fontSize: pageWidth * 0.036 }]}>in Walla Walla</Text>
      <View style={styles.rule} />
      <Text style={[styles.pageBody, { fontSize: pageWidth * 0.045, lineHeight: pageWidth * 0.07 }]}>
        {page.body}
      </Text>
      {page.mapMarker && (
        <View style={[styles.insetBlock, { marginTop: pageWidth * 0.045 }]}>
          <MapInset map={map} marker={page.mapMarker} width={insetWidth} height={insetWidth * 0.5} zoom={2.6} />
          <Text style={[styles.insetCaption, { fontSize: pageWidth * 0.034 }]}>Where it lies on the map</Text>
        </View>
      )}
      <Text style={[styles.pageNumber, { fontSize: pageWidth * 0.04 }]}>{number}</Text>
    </View>
  );
}

function EndPage({ pageWidth }: { pageWidth: number }) {
  return (
    <View style={[styles.pageInner, styles.centered]}>
      <Text style={[styles.pageTitle, { fontSize: pageWidth * 0.07 }]}>~ The End ~</Text>
    </View>
  );
}

type ArrowButtonProps = {
  label: string;
  accessibilityLabel: string;
  hidden: boolean;
  disabled: boolean;
  onPress: () => void;
  style: object;
};

function ArrowButton({ label, accessibilityLabel, hidden, disabled, onPress, style }: ArrowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={hidden || disabled}
      accessibilityElementsHidden={hidden}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        style,
        disabled && styles.arrowDisabled,
        hidden && styles.arrowHidden,
        pressed && styles.arrowPressed,
      ]}>
      <Text style={styles.arrowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    transformOrigin: 'left center',
  },
  face: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    transformOrigin: 'left center',
  },
  stripFace: {
    position: 'absolute',
    top: 0,
  },
  pageFace: {
    // The aged paper draws the page, including its rough edges.
    backgroundColor: 'transparent',
  },
  coverFace: {
    backgroundColor: LEATHER_DARK,
    borderRadius: 6,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.4)',
  },
  coverMap: {
    position: 'absolute',
    right: 0,
  },
  backPastedown: {
    position: 'absolute',
    left: 0,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
  },
  spineBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  pageInner: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    transform: [{ rotate: '-1.5deg' }],
    borderWidth: 6,
    borderColor: '#fbf6ea',
    backgroundColor: '#fbf6ea',
    boxShadow: '0 3px 8px rgba(59, 42, 26, 0.4)',
  },
  photo: {
    width: '100%',
    aspectRatio: 1.2,
  },
  tape: {
    position: 'absolute',
    top: -6,
    backgroundColor: 'rgba(236, 226, 196, 0.8)',
    boxShadow: '0 1px 2px rgba(59, 42, 26, 0.25)',
  },
  pageHeading: {
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    textAlign: 'center',
  },
  pageSubheading: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: INK,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 2,
  },
  insetBlock: {
    alignItems: 'center',
  },
  insetCaption: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: INK,
    opacity: 0.75,
    marginTop: 6,
  },
  pageTitle: {
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    textAlign: 'center',
  },
  rule: {
    height: 1,
    backgroundColor: PAPER_EDGE,
    marginVertical: 12,
    marginHorizontal: '20%',
  },
  pageBody: {
    fontFamily: Fonts.serif,
    color: INK,
  },
  pageNumber: {
    fontFamily: Fonts.serif,
    color: INK,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 'auto',
  },
  arrow: {
    position: 'absolute',
    top: 10,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 58, 34, 0.85)',
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
  arrowLabel: {
    color: PAPER,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: 700,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowHidden: {
    opacity: 0,
  },
  arrowPressed: {
    opacity: 0.6,
  },
});
