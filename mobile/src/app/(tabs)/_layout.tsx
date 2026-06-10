import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { light } from '@/theme/tokens';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: light.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarStyle: { backgroundColor: light.surface, borderTopColor: light.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Map', tabBarIcon: ({ color }) => <Icon glyph="🗺" color={color} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Classement', tabBarIcon: ({ color }) => <Icon glyph="🏆" color={color} /> }} />
      <Tabs.Screen name="friends" options={{ title: 'Défis', tabBarIcon: ({ color }) => <Icon glyph="⚔️" color={color} /> }} />
      <Tabs.Screen name="rewards" options={{ title: 'Récompenses', tabBarIcon: ({ color }) => <Icon glyph="🎁" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Icon glyph="👤" color={color} /> }} />
    </Tabs>
  );
}
