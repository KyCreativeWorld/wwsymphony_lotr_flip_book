import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { loadBookFont } from '@/constants/book-font';

// The flip book is the app's only screen, so the layout just shows it.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(loadBookFont, []);
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
