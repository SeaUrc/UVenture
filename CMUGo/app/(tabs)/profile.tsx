import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Button, View, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../context/ProfileContext';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function ProfileScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { profileImage, setProfileImage } = useProfile();

  // New state for team/affiliation info
  const [profileData, setProfileData] = useState<{ team?: string; affiliation?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Fetch profile data from API
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch('YOUR_API_PROFILE_ENDPOINT');
        if (!response.ok) throw new Error('Failed to fetch profile data');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        setProfileData(null);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfileData();
  }, []);

  const uploadProfileImage = async (uri: string) => {
    const formData = new FormData();
    formData.append('profileImage', {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      // Optionally handle response data here
    } catch (error: any) {
      alert('Image upload failed: ' + error.message);
    }
  };

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
      setProfileImage(result.assets[0].uri);
      await uploadProfileImage(result.assets[0].uri);
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
      {/* New section for team/affiliation */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Team / Affiliation</ThemedText>
        {loadingProfile ? (
          <ActivityIndicator size="small" color="#6A5ACD" />
        ) : profileData ? (
          <>
            <ThemedText>Team: {profileData.team ?? 'N/A'}</ThemedText>
            <ThemedText>Affiliation: {profileData.affiliation ?? 'N/A'}</ThemedText>
          </>
        ) : (
          <ThemedText>Unable to load team/affiliation info.</ThemedText>
        )}
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Profile Image</ThemedText>
        <View style={{ alignItems: 'center' }}>
          {profileImage && (
            <Image
              source={{ uri: profileImage }}
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