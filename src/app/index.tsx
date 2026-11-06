import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type BookMap } from '@/components/book-map';
import { Directions } from '@/components/directions';
import { FlipBook, PAGE_ASPECT } from '@/components/flip-book';
import { MotionControl } from '@/components/motion-control';
import { LOCATIONS } from '@/constants/locations';
import { BottomTabInset, Spacing } from '@/constants/theme';

const MAP: BookMap = {
  image: require('@/assets/images/WallaWallaMap.png'),
  aspectRatio: 1800 / 1200,
};

// Width the covers add around the pages (both sides) and their extra height.
const CoverExtraWidth = 28;
const CoverExtraHeight = 24;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// A screen whose short side is under this many points is treated as a phone.
const PHONE_MAX_SIDE = 600;

export default function HomeScreen() {
  // The book fills the screen below a line of directions.
  const window = useWindowDimensions();
  // On a phone the book takes the whole screen: the keyboard directions are left out. Held
  // sideways it's the usual two-page book; held upright it's a single-page book, each page
  // holding both halves of a spread.
  const phone = Math.min(window.width, window.height) < PHONE_MAX_SIDE;
  const upright = phone && window.height > window.width;
  const directionsSize = clamp(window.width * 0.012, 12, 18);

  // Measured on the client: the web build is pre-rendered without knowing the window size.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  // A single page is as wide as the screen allows (its cover sticks out on one side only) and as
  // tall as the screen, rather than letter-shaped.
  const singlePage = upright && area && {
    width: area.width - CoverExtraWidth / 2,
    height: area.height - CoverExtraHeight,
  };
  const pageWidth = singlePage
    ? singlePage.width
    : area &&
      Math.max(
        120,
        Math.min((area.width - CoverExtraWidth) / 2, (area.height - CoverExtraHeight) / PAGE_ASPECT),
      );

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, phone && styles.safeAreaPhone]}>
        {!phone && (
          <View style={styles.directions}>
            <Directions fontSize={directionsSize} />
          </View>
        )}
        <View style={[styles.bookArea, phone && styles.bookAreaPhone]} onLayout={onLayout}>
          {pageWidth !== null && (
            <FlipBook
              pages={LOCATIONS}
              map={MAP}
              pageWidth={pageWidth}
              single={upright}
              pageHeight={singlePage ? singlePage.height : undefined}
            />
          )}
        </View>
      </SafeAreaView>
      <MotionControl />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Black whatever the system's light or dark mode, so the book stands out.
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
    paddingHorizontal: Spacing.three,
  },
  safeAreaPhone: {
    paddingBottom: 0,
    paddingHorizontal: Spacing.one,
  },
  directions: {
    paddingTop: Spacing.three,
  },
  bookArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
  bookAreaPhone: {
    marginVertical: Spacing.one,
  },
});
