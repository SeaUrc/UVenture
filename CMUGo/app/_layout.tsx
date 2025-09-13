import { Stack } from 'expo-router';
import React from 'react';
import ProfileProvider from './context/ProfileContext';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <Stack>
        {/* Tabs navigator */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="battle" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="battle-arena" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
      </Stack>
    </ProfileProvider>
  );
}