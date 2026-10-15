import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlipBook, type BookPage } from '@/components/flip-book';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

const PAGES: BookPage[] = [
  {
    title: 'The Shire',
    body: 'In a hole in the ground there lived a hobbit. Green hills, round doors, and second breakfasts. A quiet place where adventures were not usually welcome.',
  },
  {
    title: 'Rivendell',
    body: 'The Last Homely House east of the Sea. Here the Fellowship was formed, nine walkers set against the nine riders, and the long road south began.',
  },
  {
    title: 'Mordor',
    body: 'Where the shadows lie. Across the ash plains of Gorgoroth, Mount Doom burns, and only there can the One Ring be unmade.',
  },
];

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
        (area.height - CoverExtraHeight) / 1.4,
        380,
      ),
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.bookArea} onLayout={onLayout}>
          {pageWidth !== null && <FlipBook pages={PAGES} pageWidth={pageWidth} />}
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
    paddingHorizontal: Spacing.four,
  },
  bookArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.five,
  },
});
