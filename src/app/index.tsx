import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type BookMap } from '@/components/book-map';
import { Directions } from '@/components/directions';
import { FlipBook, PAGE_ASPECT } from '@/components/flip-book';
import { MiniMap } from '@/components/mini-map';
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
  // The book shares the screen with directions along the top and a mini map on the right.
  const window = useWindowDimensions();
  // On a phone the book takes the whole screen in landscape: the tracker directions and the
  // hover-only mini map are left out (the book's home button still goes back to the map), and a
  // phone held upright gets everything turned a quarter turn, so it's read with the phone sideways.
  const phone = Math.min(window.width, window.height) < PHONE_MAX_SIDE;
  const rotated = phone && window.height > window.width;
  const stage = rotated ? { width: window.height, height: window.width } : window;
  const sideWidth = clamp(stage.width * 0.16, 140, 280);
  const directionsSize = clamp(stage.width * 0.012, 12, 18);

  // Measured on the client: the web build is pre-rendered without knowing the window size.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  const pageWidth =
    area &&
    Math.max(
      120,
      Math.min(
        (area.width - CoverExtraWidth) / 2,
        (area.height - CoverExtraHeight) / PAGE_ASPECT,
      ),
    );

  return (
    <View style={styles.container}>
      <View
        style={
          rotated
            ? [
                styles.rotated,
                {
                  width: stage.width,
                  height: stage.height,
                  left: (window.width - stage.width) / 2,
                  top: (window.height - stage.height) / 2,
                },
              ]
            : styles.stage
        }>
        <SafeAreaView style={[styles.safeArea, phone && styles.safeAreaPhone]}>
          {!phone && (
            <View style={styles.directions}>
              <Directions fontSize={directionsSize} />
            </View>
          )}
          <View style={styles.main}>
            <View style={[styles.bookArea, phone && styles.bookAreaPhone]} onLayout={onLayout}>
              {pageWidth !== null && <FlipBook pages={LOCATIONS} map={MAP} pageWidth={pageWidth} />}
            </View>
            {!phone && (
              <View style={[styles.side, { width: sideWidth }]}>
                <MiniMap map={MAP} width={sideWidth - Spacing.four} />
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
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
  stage: {
    flex: 1,
  },
  // Turned a quarter turn clockwise about its centre, so its top edge runs along the right of an
  // upright phone.
  rotated: {
    position: 'absolute',
    transform: [{ rotate: '90deg' }],
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
  main: {
    flex: 1,
    flexDirection: 'row',
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
  side: {
    // Above the book, so the mini map can grow over it on hover.
    zIndex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
