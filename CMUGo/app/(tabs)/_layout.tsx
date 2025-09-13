import { Tabs } from 'expo-router';
import React from 'react';
import ProfileProvider from '../context/ProfileContext';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          // borderTopWidth: 0,
          borderTopColor:'rgb(0, 0, 0)',
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 10,
        },
      }}
      >
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={28} 
              name="trophy.fill" 
              color={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={28} 
              name="map.fill" 
              color={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({color, focused}) => (
            <IconSymbol
              size={28}
              name="person.circle.fill"
              color={color}
              style={{opacity: focused ? 1 : 0.7}}
            />
          )
        }}
      />
    </Tabs>
  );
}