import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';

// The tab list still has to declare the routes, but it's hidden so the flip book fills the page.
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="home" href="/" />
        <TabTrigger name="explore" href="/explore" />
      </TabList>
    </Tabs>
  );
}
