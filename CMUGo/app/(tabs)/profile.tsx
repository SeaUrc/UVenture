import React, { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Button, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function ProfileScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImageFromCamera = async () => {
    // Request camera permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E0E0FF', dark: '#2D2D4D' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#6A5ACD"
          name="person.circle"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Profile
        </ThemedText>
      </ThemedView>
      <ThemedText>This is your profile page. You can add your information here.</ThemedText>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Name</ThemedText>
        <ThemedText>John Doe</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Email</ThemedText>
        <ThemedText>john.doe@example.com</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Bio</ThemedText>
        <ThemedText>A short bio about yourself goes here.</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Profile Image</ThemedText>
        <View style={{ alignItems: 'center' }}>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.profileImage}
            />
          )}
          <Button title="Take Photo" onPress={pickImageFromCamera} />
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#6A5ACD',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    marginTop: 16,
    gap: 4,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
      },
});