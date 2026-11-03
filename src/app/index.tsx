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

export default function HomeScreen() {
  // The book shares the screen with directions along the top and a mini map on the right.
  const window = useWindowDimensions();
  const sideWidth = clamp(window.width * 0.16, 140, 280);
  const directionsSize = clamp(window.width * 0.012, 12, 18);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.directions}>
          <Directions fontSize={directionsSize} />
        </View>
        <View style={styles.main}>
          <View style={styles.bookArea} onLayout={onLayout}>
            {pageWidth !== null && <FlipBook pages={LOCATIONS} map={MAP} pageWidth={pageWidth} />}
          </View>
          <View style={[styles.side, { width: sideWidth }]}>
            <MiniMap map={MAP} width={sideWidth - Spacing.four} />
          </View>
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
  side: {
    // Above the book, so the mini map can grow over it on hover.
    zIndex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
