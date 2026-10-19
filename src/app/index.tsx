import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type BookMap } from '@/components/book-map';
import { FlipBook, PAGE_ASPECT, type BookPage } from '@/components/flip-book';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

const MAP: BookMap = {
  image: require('@/assets/images/pages/WW Middle Earth Overlay Temp.jpg'),
  aspectRatio: 1124 / 722,
};

// Marker positions are fractions of the map image's width and height (0 to 1).
const PAGES: BookPage[] = [
  {
    title: 'WW Shire',
    body: 'This is where the Shire would be in Walla Walla: green lawns and shady trees, a quiet place where adventures are not usually welcome.',
    image: require('@/assets/images/pages/WW Shire.jpg'),
    imageAspectRatio: 2366 / 1262,
    mapMarker: { label: 'The Shire', x: 0.142, y: 0.416 },
  },
  {
    title: 'WW Prancing Pony',
    body: "This is where the Prancing Pony would be in Walla Walla. Bree's famous inn becomes a Taco Bell, still the place to stop for a meal on the road.",
    image: require('@/assets/images/pages/WW The Prancing Pony.jpg'),
    imageAspectRatio: 2322 / 1144,
    mapMarker: { label: 'The Prancing Pony', x: 0.338, y: 0.396 },
  },
  {
    title: 'WW Rivendell',
    body: "This is where Rivendell would be in Walla Walla: Whitman College's clock tower, the Last Homely House east of the Sea.",
    image: require('@/assets/images/pages/WW Rivendell.jpg'),
    imageAspectRatio: 1780 / 1268,
    mapMarker: { label: 'Rivendell', x: 0.707, y: 0.266 },
  },
  {
    title: 'WW Moria',
    body: 'This is where Moria would be in Walla Walla: the roundabout at Howard St and E Chestnut St. Speak, friend, and yield.',
    image: require('@/assets/images/pages/WW Moria.jpg'),
    imageAspectRatio: 1862 / 972,
    mapMarker: { label: 'Moria', x: 0.651, y: 0.679 },
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
        (area.height - CoverExtraHeight) / PAGE_ASPECT,
      ),
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.bookArea} onLayout={onLayout}>
          {pageWidth !== null && <FlipBook pages={PAGES} map={MAP} pageWidth={pageWidth} />}
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
