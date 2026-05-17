import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { BottomTabBar } from '../../src/components/nav/bottom-tab-bar';
import { useSession } from '../../src/auth/session-provider';

export default function TabLayout() {
  const { authenticated, booting } = useSession();
  if (booting) return null;
  if (!authenticated) return <Redirect href="/auth/welcome" />;

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
