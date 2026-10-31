import { Image, type ImageSource } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BackCover, FrontCover, InsideCover, LEATHER_DARK } from '@/components/book-cover';
import { CharacterPage, Portrait } from '@/components/character-page';
import { MapHalf, MapInset, type BookMap, type MapMarker, type PlacedMarker } from '@/components/book-map';
import { type CharacterId } from '@/constants/characters';
import { Fonts } from '@/constants/theme';

const TURN_DURATION = 900;
// Jumping more than one spread (from a map marker or the home button) turns one page with a few
// blank pages fanning out beneath it, as if thumbing through a stack at once.
const JUMP_DURATION = 1100;
const JUMP_MAX_BLANKS = 4;
// How much later each blank page lifts, and how much sooner it lands, than the one above it.
const JUMP_STAGGER = 0.07;

// Paper pages turn by their top corner. As the corner is pulled across, it dips this far
// below the top edge (as a fraction of the page width) at the middle of the turn.
const CORNER_DIP = 0.15;
const TURN_EASING = Easing.inOut(Easing.cubic);

const PAPER = '#f4e9d0';
const PAGE_COLOR = '#ead8ae';

// Paper for each side of the spread, cut from assets/images/pages/vintage_page.png.
const PAGE_PAPER = {
  left: require('@/assets/images/pages/vintage_page_left.jpg'),
  right: require('@/assets/images/pages/vintage_page_right.jpg'),
};
const PAPER_EDGE = '#d9c69c';
const INK = '#3b2a1a';

// Pages are shaped like a sheet of US letter paper: 8.5 by 11.
export const PAGE_ASPECT = 11 / 8.5;

// The spread showing the map: the first one after opening the cover.
const MAP_SPREAD = 1;

// How far the covers stick out past the pages.
const COVER_MARGIN_X = 14;
const COVER_MARGIN_Y = 12;

// One location, shown across a two-page spread.
export type BookPage = {
  // The combined name used on the map (e.g. Whitmandell).
  location: string;
  // The Lord of the Rings place it stands in for, and its other name in brackets: the Sindarin
  // name, or the English meaning when the usual name is already Sindarin. Left out when neither
  // applies.
  lotrLocation: string;
  lotrAltName?: string;
  // The real place in Walla Walla.
  wallaWallaName: string;
  description: string;
  characters: CharacterId[];
  score: string;
  // Without a photo, the left page shows a close-up of the location on the map instead.
  photo?: { image: ImageSource };
  mapMarker: MapMarker;
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
  // A multi-spread jump in progress. `key` restarts the animation for each new jump.
  const [jump, setJump] = useState<{ from: number; to: number; key: number } | null>(null);
  const busy = turning !== null || jump !== null;
  // The character whose page is open over the book, if any.
  const [openCharacter, setOpenCharacter] = useState<CharacterId | null>(null);

  // The open spread (value of `current`) where a location's two pages can be seen.
  // Sides on a leaf's front show on the right of spread N, backs on the left of spread N + 1.
  const spreadForPage = (pageIndex: number) => {
    const side = 1 + pageIndex * 2;
    const leaf = 1 + Math.floor(side / 2);
    return side % 2 === 0 ? leaf : leaf + 1;
  };

  // Turns one leaf from spread `from` to the next one in `direction`.
  const turnOnce = (from: number, direction: 1 | -1, onDone?: (spread: number) => void) => {
    const next = from + direction;
    // The turning leaf is the one being lifted: the next unturned leaf going forward,
    // or the last turned leaf going back.
    setTurning(direction === 1 ? from : from - 1);
    setTurnDuration(TURN_DURATION);
    setCurrent(next);
    setTimeout(() => {
      setTurning(null);
      onDone?.(next);
    }, TURN_DURATION);
  };

  // Turn straight from spread `from` to `to` in one go. The real pages snap to the destination
  // at once (hidden beneath the jump animation), and the animation is drawn over them.
  const jumpBetween = (from: number, to: number) => {
    setTurnDuration(0);
    setCurrent(to);
    setJump({ from, to, key: Date.now() });
    setTimeout(() => {
      setJump(null);
      setTurnDuration(TURN_DURATION);
    }, JUMP_DURATION);
  };

  // Get to a spread from wherever the book is: one page turn for a neighbouring spread,
  // otherwise a jump. A closed book opens its cover normally first.
  const riffleTo = (target: number) => {
    if (busy || target === current) return;
    const travel = (from: number) => {
      if (Math.abs(target - from) === 1) turnOnce(from, target > from ? 1 : -1);
      else jumpBetween(from, target);
    };
    if (current === 0) turnOnce(current, 1, (opened) => opened !== target && travel(opened));
    else if (current === leaves.length) turnOnce(current, -1, (opened) => opened !== target && travel(opened));
    else travel(current);
  };

  const goToPage = (pageIndex: number) => riffleTo(spreadForPage(pageIndex));

  const renderMapHalf = (side: 'left' | 'right') => {
    const markers: PlacedMarker[] = pages.map((page, pageIndex) => ({
      marker: page.mapMarker,
      pageIndex,
    }));
    return (
      <MapHalf
        map={map}
        side={side}
        markers={markers}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        interactive={!busy}
        onSelect={goToPage}
      />
    );
  };

  // Page sides in reading order after the cover: the map's right half, then two pages per
  // location (photo on the left, description on the right), then "The End".
  // Pairs of sides make up each paper leaf.
  const sides: ReactNode[] = [
    <View key="map" style={StyleSheet.absoluteFill}>
      {renderMapHalf('right')}
    </View>,
    ...pages.flatMap((page, index) => [
      <LocationPhotoPage
        key={`photo-${index}`}
        page={page}
        map={map}
        number={index * 2 + 1}
        pageWidth={pageWidth}
      />,
      <LocationTextPage
        key={`text-${index}`}
        page={page}
        number={index * 2 + 2}
        pageWidth={pageWidth}
        interactive={!busy}
        onOpenCharacter={setOpenCharacter}
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
            <PagePaper side="left" />
            {renderMapHalf('left')}
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
    });
  }
  leaves.push({
    kind: 'cover',
    // A blank sheet pasted inside the back cover, lined up with the pages.
    front: (
      <InsideCover spine="left">
        <View style={[styles.backPastedown, { top: COVER_MARGIN_Y, width: pageWidth, height: pageHeight }]}>
          <PagePaper side="right" />
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
    if (busy || next < 0 || next > leaves.length) return;
    turnOnce(current, direction);
  };

  // On the web, the left and right arrow keys turn the pages too.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Ignore held-down keys so one press turns one page.
      if (event.repeat) return;
      // With a character's page open, Escape closes it and the book stays put.
      if (openCharacter) {
        if (event.key === 'Escape') setOpenCharacter(null);
        return;
      }
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

      {jump && (
        <JumpFlip
          key={jump.key}
          leaves={leaves}
          from={jump.from}
          to={jump.to}
          coverWidth={coverWidth}
          coverHeight={coverHeight}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
      )}

      <ArrowButton
        label="‹"
        accessibilityLabel="Previous page"
        hidden={isClosedFront}
        disabled={busy}
        onPress={() => turn(-1)}
        style={styles.arrowLeft}
      />
      <ArrowButton
        label="›"
        accessibilityLabel="Next page"
        hidden={isClosedBack}
        disabled={busy}
        onPress={() => turn(1)}
        style={styles.arrowRight}
      />
      {/* Back to the map, which is the first spread after the cover. */}
      <ArrowButton
        label={<HomeIcon />}
        accessibilityLabel="Back to the map"
        hidden={isClosedFront || current === MAP_SPREAD}
        disabled={busy}
        onPress={() => riffleTo(MAP_SPREAD)}
        style={styles.homeButton}
      />

      {openCharacter && (
        <CharacterPage
          id={openCharacter}
          appearsIn={pages
            .filter((page) => page.characters.includes(openCharacter))
            .map((page) => page.location)}
          width={pageWidth * 0.95}
          height={pageHeight * 0.92}
          onClose={() => setOpenCharacter(null)}
        />
      )}
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

  const frontContent = <LeafSide leaf={leaf} side="front" />;
  const backContent = <LeafSide leaf={leaf} side="back" />;

  if (curl) {
    return (
      <CurlingSheet
        angle={angle}
        forward={turned}
        zIndex={zIndex}
        left={left}
        top={top}
        width={width}
        height={height}
        faceStyle={faceStyle}
        front={frontContent}
        back={backContent}
      />
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

// One side of a leaf as it's drawn on the page: paper, content, and the shadow at the spine.
// Fronts of leaves sit on the right of the spread, backs on the left.
function LeafSide({ leaf, side }: { leaf: Leaf; side: 'front' | 'back' }) {
  const front = side === 'front';
  return (
    <>
      {leaf.kind === 'page' && <PagePaper side={front ? 'right' : 'left'} />}
      {front ? leaf.front : leaf.back}
      {(front ? leaf.frontSpineShadow : leaf.backSpineShadow) && (
        <SpineShadow side={front ? 'left' : 'right'} />
      )}
    </>
  );
}

type CurlingSheetProps = {
  angle: SharedValue<number>;
  forward: boolean;
  zIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  faceStyle: object;
  front: ReactNode;
  back: ReactNode;
};

// A paper page being turned by its corner, placed at the spine like a leaf.
function CurlingSheet({ angle, forward, zIndex, left, top, width, height, faceStyle, front, back }: CurlingSheetProps) {
  return (
    <View style={[styles.leaf, { left, top, width, height, zIndex }]} pointerEvents="none">
      {/* Keep the turning page within the open pages, so its folded corner can't poke past them. */}
      <View style={[styles.curlBounds, { left: -width, width: width * 2, height }]}>
        <View style={[styles.curlScene, { left: width, width, height }]}>
          <PageCurl
            angle={angle}
            forward={forward}
            width={width}
            height={height}
            faceStyle={faceStyle}
            front={front}
            back={back}
          />
        </View>
      </View>
    </View>
  );
}

type JumpFlipProps = {
  leaves: Leaf[];
  from: number;
  to: number;
  coverWidth: number;
  coverHeight: number;
  pageWidth: number;
  pageHeight: number;
};

// Turning from spread `from` straight to `to`, drawn over the book (whose real leaves are already
// at `to`). One page turns showing where you're leaving on the way up and where you're arriving
// on the way down, with blank pages fanning out beneath it for the pages skipped over.
function JumpFlip({ leaves, from, to, coverWidth, coverHeight, pageWidth, pageHeight }: JumpFlipProps) {
  const forward = to > from;
  const blanks = Math.min(Math.abs(to - from) - 1, JUMP_MAX_BLANKS);

  // The top page's two sides: going forward it lifts off the right showing the page being left,
  // and lands on the left showing the page arrived at. Going back, the reverse.
  const front = forward ? leaves[from] : leaves[to];
  const back = forward ? leaves[to - 1] : leaves[from - 1];

  // The page on the side being landed on stays as it was until the stack covers it.
  const stayingLeaf = forward ? from - 1 : from;
  const staying = leaves[stayingLeaf];
  const stayingIsCover = staying.kind === 'cover';
  const stayingWidth = stayingIsCover ? coverWidth : pageWidth;

  const sheet = { left: coverWidth, top: COVER_MARGIN_Y, width: pageWidth, height: pageHeight };
  const blankPage: Leaf = {
    kind: 'page',
    front: null,
    back: null,
    frontSpineShadow: true,
    backSpineShadow: true,
  };

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.jumpStaying,
          stayingIsCover ? styles.coverFace : styles.pageFace,
          {
            left: forward ? coverWidth - stayingWidth : coverWidth,
            top: stayingIsCover ? 0 : COVER_MARGIN_Y,
            width: stayingWidth,
            height: stayingIsCover ? coverHeight : pageHeight,
          },
        ]}>
        <LeafSide leaf={staying} side={forward ? 'back' : 'front'} />
      </View>
      {Array.from({ length: blanks }, (_, index) => {
        const level = index + 1;
        return (
          <JumpSheet
            key={level}
            forward={forward}
            // Lifts a little after the page above it, and lands a little before it.
            delay={JUMP_DURATION * JUMP_STAGGER * level}
            duration={JUMP_DURATION * (1 - JUMP_STAGGER * 2 * level)}
            zIndex={JUMP_Z - level}
            {...sheet}
            front={<LeafSide leaf={blankPage} side="front" />}
            back={<LeafSide leaf={blankPage} side="back" />}
          />
        );
      })}
      <JumpSheet
        forward={forward}
        delay={0}
        duration={JUMP_DURATION}
        zIndex={JUMP_Z}
        {...sheet}
        front={<LeafSide leaf={front} side="front" />}
        back={<LeafSide leaf={back} side="back" />}
      />
    </>
  );
}

// Above every real leaf, below the buttons.
const JUMP_Z = 60;

type JumpSheetProps = {
  forward: boolean;
  delay: number;
  duration: number;
  zIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  front: ReactNode;
  back: ReactNode;
};

// One page of a jump, turning once on its own timing.
function JumpSheet({ forward, delay, duration, front, back, ...placement }: JumpSheetProps) {
  const angle = useSharedValue(forward ? 0 : -180);
  useEffect(() => {
    angle.value = withDelay(
      delay,
      withTiming(forward ? -180 : 0, { duration, easing: TURN_EASING }),
    );
  }, [angle, delay, duration, forward]);

  return (
    <CurlingSheet
      angle={angle}
      forward={forward}
      faceStyle={styles.pageFace}
      front={front}
      back={back}
      {...placement}
    />
  );
}

// Where the fold sits while a page is turned by its top corner, for `progress` from 0 (flat on
// the right) to 1 (flat on the left). Coordinates are the page's own, with the spine at x = 0.
//
// The corner travels from (width, 0) to (-width, 0), dipping toward the middle of the page on
// the way. The fold is the crease you'd get by laying the corner down at that point: the line
// halfway between the corner's start and where it is now. Everything past the fold is flipped
// over onto the near side, so it shows the page's back.
//
// To clip along a slanted fold, a large square is rotated so its right edge lies on the fold
// ("fold frame"). The returned values place that square (o), the flipped flap (c), and the flap's
// own view of the fold frame (s).
function foldGeometry(progress: number, width: number, length: number) {
  'worklet';
  const theta = Math.PI * Math.min(1, Math.max(0.01, progress));
  const cornerX = width * Math.cos(theta);
  const cornerY = CORNER_DIP * width * Math.sin(theta);

  // Unit vector pointing across the fold, toward the corner's starting point.
  let nx = width - cornerX;
  let ny = -cornerY;
  const length0 = Math.sqrt(nx * nx + ny * ny);
  nx /= length0;
  ny /= length0;
  const beta = Math.atan2(ny, nx);
  const mx = (width + cornerX) / 2;
  const my = cornerY / 2;

  // Top-left of the fold frame, so its right edge runs along the fold, centered on (mx, my).
  const ox = mx - length * nx + (length / 2) * ny;
  const oy = my - length * ny - (length / 2) * nx;

  // The flap is the page's back, mirrored across the fold: a rotation by 2β plus this offset.
  const along = 2 * (mx * nx + my * ny);
  const cx = -width * Math.cos(2 * beta) + along * nx;
  const cy = -width * Math.sin(2 * beta) + along * ny;

  // The fold frame's origin, seen from inside the flap.
  const cos2 = Math.cos(2 * beta);
  const sin2 = Math.sin(2 * beta);
  const dx = ox - cx;
  const dy = oy - cy;
  return {
    beta,
    ox,
    oy,
    cx,
    cy,
    sx: dx * cos2 + dy * sin2,
    sy: -dx * sin2 + dy * cos2,
    // Shading is strongest mid-turn, when the page is lifted highest.
    strength: Math.sin(theta),
  };
}

type PageCurlProps = {
  angle: SharedValue<number>;
  forward: boolean;
  width: number;
  height: number;
  faceStyle: object;
  front: ReactNode;
  back: ReactNode;
};

// A paper page being turned by its top corner, like a hand would turn it.
// Turning back is the same motion mirrored across the spine, starting from the left page's corner.
function PageCurl({ angle, forward, width, height, faceStyle, front, back }: PageCurlProps) {
  const length = Math.max(width, height) * 3;
  const foldShadowWidth = width * 0.16;
  const revealShadowWidth = width * 0.22;

  const fold = (value: number) => {
    'worklet';
    // `angle` runs 0 → -180 going forward. Going back, the mirrored turn runs the same way.
    const progress = forward ? -value / 180 : 1 + value / 180;
    return foldGeometry(progress, width, length);
  };

  const foldFrame = (f: ReturnType<typeof foldGeometry>, offset: number) => {
    'worklet';
    return [
      { translateX: f.ox },
      { translateY: f.oy },
      { rotate: `${f.beta}rad` },
      { translateX: offset },
    ];
  };

  const clipStyle = useAnimatedStyle(() => ({ transform: foldFrame(fold(angle.value), 0) }));
  // Undoes the clip's rotation so the pages inside sit in their usual place.
  const unclipStyle = useAnimatedStyle(() => {
    const f = fold(angle.value);
    return {
      transform: [{ rotate: `${-f.beta}rad` }, { translateX: -f.ox }, { translateY: -f.oy }],
    };
  });
  const flapStyle = useAnimatedStyle(() => {
    const f = fold(angle.value);
    return {
      transform: [{ translateX: f.cx }, { translateY: f.cy }, { rotate: `${2 * f.beta}rad` }],
    };
  });
  const foldShadowStyle = useAnimatedStyle(() => {
    const f = fold(angle.value);
    return { opacity: f.strength, transform: foldFrame(f, length - foldShadowWidth) };
  });
  const revealShadowStyle = useAnimatedStyle(() => {
    const f = fold(angle.value);
    return { opacity: f.strength, transform: foldFrame(f, length) };
  });
  const sheenStyle = useAnimatedStyle(() => {
    const f = fold(angle.value);
    return {
      opacity: f.strength,
      transform: [
        { translateX: f.sx },
        { translateY: f.sy },
        { rotate: `${-f.beta}rad` },
        { translateX: length - foldShadowWidth },
      ],
    };
  });

  // When turning back the whole scene is mirrored, so each face is pre-mirrored to read correctly.
  const orient = (content: ReactNode) =>
    forward ? content : <View style={[StyleSheet.absoluteFill, styles.mirrored]}>{content}</View>;
  // The side that stays down, and the side revealed as the corner folds over.
  const staying = forward ? front : back;
  const folding = forward ? back : front;

  return (
    <View style={[styles.curlScene, { width, height }, !forward && styles.mirroredAtSpine]}>
      {/* Shadow cast onto the page being uncovered, just past the fold. */}
      <View style={[styles.curlPage, { width, height }]}>
        <Animated.View style={[styles.curlPiece, { width: revealShadowWidth, height: length }, revealShadowStyle]}>
          <CurlGradient
            id="curl-reveal"
            width={revealShadowWidth}
            height={length}
            stops={[
              [0, '#000000', 0.35],
              [1, '#000000', 0],
            ]}
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.curlClip, { width: length, height: length }, clipStyle]}>
        <Animated.View style={[styles.curlPiece, { width, height }, unclipStyle]}>
          {/* The part of the page still lying flat, darkening where it bends up into the fold. */}
          <View style={[styles.curlPage, faceStyle, { width, height }]}>
            {orient(staying)}
            <Animated.View style={[styles.curlPiece, { width: foldShadowWidth, height: length }, foldShadowStyle]}>
              <CurlGradient
                id="curl-fold"
                width={foldShadowWidth}
                height={length}
                stops={[
                  [0, '#000000', 0],
                  [1, '#000000', 0.28],
                ]}
              />
            </Animated.View>
          </View>
          {/* The flap folded back over the page, with a sheen where it curves. */}
          <Animated.View style={[styles.curlPage, styles.curlFlap, faceStyle, { width, height }, flapStyle]}>
            {orient(folding)}
            <Animated.View style={[styles.curlPiece, { width: foldShadowWidth, height: length }, sheenStyle]}>
              <CurlGradient
                id="curl-sheen"
                width={foldShadowWidth}
                height={length}
                stops={[
                  [0, '#ffffff', 0],
                  [0.6, '#ffffff', 0.25],
                  [0.9, '#000000', 0.05],
                  [1, '#000000', 0.2],
                ]}
              />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type CurlGradientProps = {
  id: string;
  width: number;
  height: number;
  // [offset, color, opacity], running left to right.
  stops: [number, string, number][];
};

function CurlGradient({ id, width, height, stops }: CurlGradientProps) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {stops.map(([offset, color, opacity]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

// The vintage paper behind a page's content. Fronts of leaves sit on the right of the spread,
// backs on the left.
function PagePaper({ side }: { side: 'left' | 'right' }) {
  return <Image source={PAGE_PAPER[side]} contentFit="fill" style={StyleSheet.absoluteFill} />;
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

// Left page of a location: its photo (or a close-up of the map) at the top, taped in like a
// print, then the combined name, the Lord of the Rings name, and the real Walla Walla place.
function LocationPhotoPage({ page, map, number, pageWidth }: LocationPageProps & { map: BookMap }) {
  const tape = { width: pageWidth * 0.16, height: pageWidth * 0.045 };
  const printWidth = pageWidth * 0.8;
  // Long names get smaller type so they fit in two lines.
  const titleSize = pageWidth * (page.location.length > 20 ? 0.062 : 0.085);
  return (
    <View style={[styles.pageInner, { padding: pageWidth * 0.1, paddingTop: pageWidth * 0.1 }]}>
      <View style={styles.print}>
        {page.photo ? (
          <Image
            source={page.photo.image}
            contentFit="cover"
            accessibilityLabel={page.location}
            style={styles.photo}
          />
        ) : (
          <MapInset
            map={map}
            marker={page.mapMarker}
            width={printWidth - 12}
            height={(printWidth - 12) / 1.2}
            zoom={3}
            bare
          />
        )}
        <View style={[styles.tape, tape, { left: -tape.width * 0.3, transform: [{ rotate: '-35deg' }] }]} />
        <View style={[styles.tape, tape, { right: -tape.width * 0.3, transform: [{ rotate: '35deg' }] }]} />
      </View>
      <Text style={[styles.pageTitle, { fontSize: titleSize, marginTop: pageWidth * 0.06 }]}>
        {page.location}
      </Text>
      <Text style={[styles.lotrName, { fontSize: pageWidth * 0.05, marginTop: pageWidth * 0.015 }]}>
        {page.lotrLocation}
        {page.lotrAltName && <Text style={styles.altName}> ({page.lotrAltName})</Text>}
      </Text>
      <View style={styles.rule} />
      <Text style={[styles.wallaWallaName, { fontSize: pageWidth * 0.038 }]}>{page.wallaWallaName}</Text>
      {/* Pushes the page number to the bottom, keeping a little space above it on full pages. */}
      <View style={styles.pushDown} />
      <Text style={[styles.pageNumber, styles.pageNumberAfterScore, { fontSize: pageWidth * 0.04 }]}>
        {number}
      </Text>
    </View>
  );
}

type LocationTextPageProps = LocationPageProps & {
  interactive: boolean;
  onOpenCharacter: (id: CharacterId) => void;
};

// Right page of a location: a short description at the top, the characters as round portraits
// running left to right like lines of text, and the score at the bottom.
function LocationTextPage({ page, number, pageWidth, interactive, onOpenCharacter }: LocationTextPageProps) {
  const portraitSize = pageWidth * 0.115;
  return (
    <View
      style={[
        styles.pageInner,
        { padding: pageWidth * 0.1, paddingTop: pageWidth * 0.12, paddingBottom: pageWidth * 0.07 },
      ]}>
      <Text style={[styles.pageBody, { fontSize: pageWidth * 0.04, lineHeight: pageWidth * 0.06 }]}>
        {page.description}
      </Text>

      <Text style={[styles.sectionLabel, { fontSize: pageWidth * 0.03, marginTop: pageWidth * 0.05 }]}>
        Characters
      </Text>
      <View style={[styles.portraits, { rowGap: pageWidth * 0.025, marginTop: pageWidth * 0.015 }]}>
        {page.characters.map((id) => (
          <Portrait key={id} id={id} size={portraitSize} disabled={!interactive} onPress={onOpenCharacter} />
        ))}
      </View>

      <View style={[styles.score, { paddingTop: pageWidth * 0.03 }]}>
        <Text style={[styles.sectionLabel, { fontSize: pageWidth * 0.03 }]}>Score</Text>
        <Text style={[styles.pageBody, { fontSize: pageWidth * 0.04, lineHeight: pageWidth * 0.058 }]}>
          {page.score}
        </Text>
      </View>
      <Text style={[styles.pageNumber, styles.pageNumberAfterScore, { fontSize: pageWidth * 0.04 }]}>
        {number}
      </Text>
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
  label: ReactNode;
  accessibilityLabel: string;
  hidden: boolean;
  disabled: boolean;
  onPress: () => void;
  style: object;
};

function HomeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M2.5 9.5 L10 3 L17.5 9.5 M5 8 V17 H8.5 V12.5 H11.5 V17 H15 V8"
        stroke={PAPER}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

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
      {typeof label === 'string' ? <Text style={styles.arrowLabel}>{label}</Text> : label}
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
  curlScene: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  jumpStaying: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: JUMP_Z - JUMP_MAX_BLANKS - 1,
  },
  curlBounds: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  mirroredAtSpine: {
    transform: [{ scaleX: -1 }],
    transformOrigin: 'left center',
  },
  curlPage: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    transformOrigin: 'left top',
  },
  curlFlap: {
    boxShadow: '0 0 14px rgba(0, 0, 0, 0.3)',
  },
  curlClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    transformOrigin: 'left top',
  },
  curlPiece: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'left top',
  },
  pageFace: {
    backgroundColor: PAGE_COLOR,
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
    backgroundColor: PAGE_COLOR,
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
  lotrName: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: INK,
    textAlign: 'center',
  },
  altName: {
    opacity: 0.75,
  },
  wallaWallaName: {
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    opacity: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  portraits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  score: {
    // Pushes the score to the bottom of the page.
    marginTop: 'auto',
  },
  pageNumberAfterScore: {
    marginTop: 8,
  },
  pushDown: {
    flex: 1,
    minHeight: 8,
  },
  sectionLabel: {
    fontFamily: Fonts.serif,
    fontWeight: 700,
    color: INK,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
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
  homeButton: {
    top: 'auto',
    bottom: 10,
    left: 10,
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
