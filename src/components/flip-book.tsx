import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BackCover, FrontCover, InsideCover, LEATHER_DARK } from '@/components/book-cover';
import { Fonts } from '@/constants/theme';

const TURN_DURATION = 900;
const TURN_EASING = Easing.inOut(Easing.cubic);

const PAPER = '#f4e9d0';
const PAPER_EDGE = '#d9c69c';
const INK = '#3b2a1a';

// How far the covers stick out past the pages.
const COVER_MARGIN_X = 14;
const COVER_MARGIN_Y = 12;

export type BookPage = {
  title: string;
  body: string;
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
  pageWidth: number;
};

export function FlipBook({ pages, pageWidth }: FlipBookProps) {
  const pageHeight = pageWidth * 1.4;
  const coverWidth = pageWidth + COVER_MARGIN_X;
  const coverHeight = pageHeight + COVER_MARGIN_Y * 2;
  const [current, setCurrent] = useState(0);
  const [turning, setTurning] = useState<number | null>(null);

  const renderPage = (index: number) =>
    index < pages.length ? (
      <PageContent page={pages[index]} number={index + 1} pageWidth={pageWidth} />
    ) : (
      <EndPage pageWidth={pageWidth} />
    );

  const leaves: Leaf[] = [
    {
      kind: 'cover',
      front: <FrontCover />,
      back: <InsideCover spine="right" />,
      frontSpineShadow: false,
      backSpineShadow: true,
    },
  ];
  for (let i = 0; i < pages.length; i += 2) {
    leaves.push({
      kind: 'page',
      front: renderPage(i),
      back: renderPage(i + 1),
      frontSpineShadow: true,
      backSpineShadow: true,
    });
  }
  leaves.push({
    kind: 'cover',
    front: <InsideCover spine="left" />,
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
    // The turning leaf is the one being lifted: the next unturned leaf going forward,
    // or the last turned leaf going back.
    setTurning(direction === 1 ? current : current - 1);
    setCurrent(next);
    setTimeout(() => setTurning(null), TURN_DURATION);
  };

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
  zIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

function TurningLeaf({ leaf, turned, zIndex, left, top, width, height }: TurningLeafProps) {
  const angle = useSharedValue(turned ? -180 : 0);

  useEffect(() => {
    angle.value = withTiming(turned ? -180 : 0, {
      duration: TURN_DURATION,
      easing: TURN_EASING,
    });
  }, [turned, angle]);

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

  return (
    <Animated.View style={[styles.leaf, { left, top, width, height, zIndex }, leafStyle]}>
      <Animated.View style={[styles.face, faceStyle, frontStyle]}>
        {leaf.front}
        {leaf.frontSpineShadow && <SpineShadow side="left" />}
        <Animated.View style={[styles.shade, frontShade]} pointerEvents="none" />
      </Animated.View>
      {/* Mirrored so it reads correctly once the leaf has flipped over to the left. */}
      <Animated.View style={[styles.face, faceStyle, styles.mirrored, backStyle]}>
        {leaf.back}
        {leaf.backSpineShadow && <SpineShadow side="right" />}
        <Animated.View style={[styles.shade, backShade]} pointerEvents="none" />
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

function PageContent({
  page,
  number,
  pageWidth,
}: {
  page: BookPage;
  number: number;
  pageWidth: number;
}) {
  return (
    <View style={[styles.pageInner, { padding: pageWidth * 0.1, paddingTop: pageWidth * 0.16 }]}>
      <Text style={[styles.pageTitle, { fontSize: pageWidth * 0.08 }]}>{page.title}</Text>
      <View style={styles.rule} />
      <Text style={[styles.pageBody, { fontSize: pageWidth * 0.045, lineHeight: pageWidth * 0.07 }]}>
        {page.body}
      </Text>
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
  pageFace: {
    backgroundColor: PAPER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PAPER_EDGE,
  },
  coverFace: {
    backgroundColor: LEATHER_DARK,
    borderRadius: 6,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.4)',
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
