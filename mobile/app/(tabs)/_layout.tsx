import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../src/components/nav/BottomTabBar';

export default function TabLayout() {
  return (
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
  );
}
