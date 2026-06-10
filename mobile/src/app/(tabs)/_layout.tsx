import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { c, font, VIOLET } from '@/theme/tokens';

function Icon({ glyph, color, focused }: { glyph: string; color: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.5, textShadowColor: VIOLET, textShadowRadius: focused ? 12 : 0 }}>
      {glyph}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.3 },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Platform.OS === 'ios' ? 26 : 16,
          height: 64,
          borderRadius: 24,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: Platform.OS === 'web' ? 'rgba(18,20,28,0.92)' : 'transparent',
          elevation: 0,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'web' ? null : (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,20,28,0.55)', borderRadius: 24 }]} />
            </BlurView>
          ),
      }}>
      <Tabs.Screen name="index" options={{ title: 'Carte', tabBarIcon: ({ focused }) => <Icon glyph="🗺️" color="" focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Ligue', tabBarIcon: ({ focused }) => <Icon glyph="🏆" color="" focused={focused} /> }} />
      <Tabs.Screen name="friends" options={{ title: 'Défis', tabBarIcon: ({ focused }) => <Icon glyph="⚔️" color="" focused={focused} /> }} />
      <Tabs.Screen name="rewards" options={{ title: 'Lots', tabBarIcon: ({ focused }) => <Icon glyph="🎁" color="" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <Icon glyph="👤" color="" focused={focused} /> }} />
    </Tabs>
  );
}
