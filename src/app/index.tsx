import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type BookMap } from '@/components/book-map';
import { FlipBook, PAGE_ASPECT } from '@/components/flip-book';
import { ThemedView } from '@/components/themed-view';
import { LOCATIONS } from '@/constants/locations';
import { BottomTabInset, Spacing } from '@/constants/theme';

const MAP: BookMap = {
  image: require('@/assets/images/WallaWallaMap.png'),
  aspectRatio: 1800 / 1200,
};

// Width the covers add around the pages (both sides) and their extra height.
const CoverExtraWidth = 28;
const CoverExtraHeight = 24;

export default function HomeScreen() {
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.bookArea} onLayout={onLayout}>
          {pageWidth !== null && <FlipBook pages={LOCATIONS} map={MAP} pageWidth={pageWidth} />}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: BottomTabInset,
    paddingHorizontal: Spacing.three,
  },
  bookArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
});
