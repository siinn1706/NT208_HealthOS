import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../src/components/nav/bottom-tab-bar';
import { ErrorBoundary } from '../../src/components/error/error-boundary';

export default function TabLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="care" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="meds" />
        <Tabs.Screen name="me"   />
      </Tabs>
    </ErrorBoundary>
  );
}
