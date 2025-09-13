import { Stack } from 'expo-router';
import React from 'react';
import ProfileProvider from './context/ProfileContext';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <Stack>
        {/* Tabs navigator */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="battle" options={{ title: 'Battle Arena' }} />
        <Stack.Screen name="battle-arena" options={{ title: 'Battle Arena' }} />
      </Stack>
    </ProfileProvider>
  );
}