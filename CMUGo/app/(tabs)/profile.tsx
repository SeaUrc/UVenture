import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView, RefreshControl, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

type ProfileData = {
  username: string;
  team: number;
  image: string;
  strength: number;
  wins: number;
  losses: number;
  defending: string[];
  best_streak: number;
  rank?: string;
  join_date?: string;
};

type LocationData = {
  id: number;
  name: string;
  owner_team_name: string;
  owner_team_color: string;
  strongest_owner_id: number;
};

type TeamStats = {
  team_name: string;
  team_color: string;
  total_members: number;
  total_locations: number;
  team_rank: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  
  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  // Profile data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [ownedLocations, setOwnedLocations] = useState<LocationData[]>([]);
  const [defendingLocations, setDefendingLocations] = useState<LocationData[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const getAuthData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userIdStr = await AsyncStorage.getItem('userId');
        setUserToken(token);
        setUserId(userIdStr ? parseInt(userIdStr) : null);
      } catch (error) {
        console.error('Error getting auth data:', error);
      }
    };

    getAuthData();
  }, []);

  useEffect(() => {
    if (userToken && userId) {
      loadProfileData();
    }
  }, [userToken, userId]);

  // Use useFocusEffect to check for updates when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkForUpdatedData = async () => {
        try {
          const updatedData = await AsyncStorage.getItem('updatedProfileData');
          console.log('Checking for updated profile data:', updatedData);
          
          if (updatedData) {
            const parsedData = JSON.parse(updatedData);
            console.log('Found updated profile data from battle:', parsedData);
            
            // Update the profile data immediately
            setProfileData(prevData => ({
              ...prevData,
              ...parsedData
            }));
            
            // Clear the temporary data
            await AsyncStorage.removeItem('updatedProfileData');
            console.log('Cleared temporary profile data');
            
            // Fetch fresh data from server after showing updated data
            setTimeout(async () => {
              console.log('Fetching fresh profile data from server');
              await fetchUserProfile();
            }, 2000);
          }
        } catch (error) {
          console.error('Error checking for updated profile data:', error);
        }
      };

      // Only check for updates if we have auth data
      if (userToken && userId) {
        checkForUpdatedData();
      }
    }, [userToken, userId])
  );

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Fetch user profile which now includes strength, wins, losses, and defending locations
      await fetchUserProfile();
      
      // Fetch additional data in parallel
      await Promise.all([
        fetchOwnedLocations(),
        fetchTeamStats(),
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${databaseUrl}/api/profile/get_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
        }),
      });

      if (response.ok) {
        const profileData = await response.json();
        console.log('Profile data fetched from server:', profileData); // Debug log
        setProfileData(profileData);
        
        // Convert defending location names to LocationData format for consistency
        if (profileData.defending) {
          const defendingLocs = profileData.defending.map((name: string, index: number) => ({
            id: index, // Use index as temporary ID
            name: name,
            owner_team_name: '', // We don't have this info from the new endpoint
            owner_team_color: '', // We don't have this info from the new endpoint
            strongest_owner_id: userId || 0,
          }));
          setDefendingLocations(defendingLocs);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Image picker functions
  const pickImageFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setImageModalVisible(false);
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setImageModalVisible(false);
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!userToken) {
      Alert.alert('Error', 'You must be logged in to upload a profile picture');
      return;
    }

    setUploadingImage(true);
    try {
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix
          const base64Image = result.split(',')[1];
          resolve(base64Image);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const uploadResponse = await fetch(`${databaseUrl}/api/profile/set_picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          image: base64Data,
        }),
      });

      if (uploadResponse.ok) {
        Alert.alert('Success!', 'Profile picture updated successfully!');
        // Refresh profile data to show new image
        await fetchUserProfile();
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    setImageModalVisible(true);
  };

  // Fetch user battle statistics
  const fetchUserStats = async () => {
    if (!userToken) return;

    try {
      const response = await fetch(`${databaseUrl}/api/profile/get_user_stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setProfileData(prev => prev ? { ...prev, ...statsData } : null);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Fetch locations owned by user
  const fetchOwnedLocations = async () => {
    if (!userToken) return;

    try {
      const response = await fetch(`${databaseUrl}/api/profile/get_owned_locations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const locationsData = await response.json();
        setOwnedLocations(locationsData.locations || []);
      }
    } catch (error) {
      console.error('Error fetching owned locations:', error);
    }
  };

  // Fetch locations where user is defending champion
  const fetchDefendingLocations = async () => {
    if (!userToken || !userId) return;

    try {
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) return;
      
      const data = await response.json();
      const defendingLocs = data.data.filter((loc: LocationData) => 
        loc.strongest_owner_id === userId
      );
      setDefendingLocations(defendingLocs);
    } catch (error) {
      console.error('Error fetching defending locations:', error);
    }
  };

  // Fetch team statistics
  const fetchTeamStats = async () => {
    if (!userToken || !profileData?.team) return;

    try {
      console.log('Fetching team stats for team ID:', profileData.team); // Debug log
      
      const response = await fetch(`${databaseUrl}/api/profile/get_team_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          team_id: profileData.team, // Changed from team_name to team_id
        }),
      });

      if (response.ok) {
        const teamData = await response.json();
        console.log('Team stats fetched:', teamData); // Debug log
        setTeamStats(teamData);
      } else {
        console.log('Team stats response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching team stats:', error);
    }
  };

  // Update the useEffect to work with team ID
  useEffect(() => {
    if (profileData?.team && userToken) {
      fetchTeamStats();
    }
  }, [profileData?.team, userToken]);

  const logout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userToken', 'userId']);
              router.replace('/login');
            } catch (error) {
              console.error('Error logging out:', error);
            }
          },
        },
      ]
    );
  };

  const getRankColor = (rank: string) => {
    switch (rank?.toLowerCase()) {
      case 'champion': return '#FFD700';
      case 'warrior': return '#FF6B35';
      case 'fighter': return '#4ECDC4';
      case 'novice': return '#95E1D3';
      default: return '#ccc';
    }
  };

  const getWinRate = () => {
    if (!profileData) return 0;
    const totalBattles = (profileData.wins || 0) + (profileData.losses || 0);
    return totalBattles > 0 ? Math.round(((profileData.wins || 0) / totalBattles) * 100) : 0;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={showImageOptions} disabled={uploadingImage}>
              <Image 
                source={
                  profileData.image 
                    ? { uri: `data:image/png;base64,${profileData.image}` }
                    : require('../../assets/images/icon.png')
                } 
                style={[styles.profileImage, uploadingImage && styles.profileImageUploading]} 
              />
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.rankBadge, { backgroundColor: getRankColor(profileData.rank) }]}>
              <Text style={styles.rankText}>{profileData.rank || 'Novice'}</Text>
            </View>
          </View>
          
          <Text style={styles.username}>{profileData.username}</Text>
          <Text style={styles.joinDate}>
            Joined: {profileData.join_date ? new Date(profileData.join_date).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>

        {/* Team Info */}
        {profileData?.team && (
          <View style={styles.teamContainer}>
            <Text style={styles.sectionTitle}>Team Affiliation</Text>
            {teamStats ? (
              <View style={[styles.teamCard, { borderColor: teamStats.team_color || '#ccc' }]}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamColorDot, { backgroundColor: teamStats.team_color || '#ccc' }]} />
                  <Text style={styles.teamName}>{teamStats.team_name}</Text>
                </View>
                <View style={styles.teamStatsRow}>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>{teamStats.total_members || 0}</Text>
                    <Text style={styles.teamStatLabel}>Members</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>{teamStats.total_locations || 0}</Text>
                    <Text style={styles.teamStatLabel}>Locations</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>#{teamStats.team_rank || 'N/A'}</Text>
                    <Text style={styles.teamStatLabel}>Rank</Text>
                  </View>
                </View>
              </View>
            ) : (
              // Fallback display when team stats aren't loaded yet
              <View style={[styles.teamCard, { borderColor: '#ccc' }]}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamColorDot, { backgroundColor: '#ccc' }]} />
                  <Text style={styles.teamName}>Team #{profileData.team}</Text>
                </View>
                <View style={styles.teamStatsRow}>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>-</Text>
                    <Text style={styles.teamStatLabel}>Members</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>-</Text>
                    <Text style={styles.teamStatLabel}>Locations</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Text style={styles.teamStatValue}>-</Text>
                    <Text style={styles.teamStatLabel}>Rank</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Battle Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Battle Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profileData.strength || 0}</Text>
              <Text style={styles.statLabel}>Strength</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getWinRate()}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{profileData.wins || 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{profileData.losses || 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
          </View>
        </View>

        {/* Defending Locations */}
        <View style={styles.locationsContainer}>
          <Text style={styles.sectionTitle}>Defending Champion ({defendingLocations.length})</Text>
          {defendingLocations.length > 0 ? (
            <View style={styles.locationsList}>
              {defendingLocations.slice(0, 5).map((location, index) => (
                <View key={index} style={[styles.locationCard, styles.championCard]}>
                  <Text style={styles.championIcon}>👑</Text>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.championText}>Champion</Text>
                </View>
              ))}
              {defendingLocations.length > 5 && (
                <Text style={styles.moreText}>+{defendingLocations.length - 5} more championships</Text>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No locations defended yet</Text>
          )}
        </View>

      </ScrollView>

      {/* Image Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Profile Picture</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Text style={styles.modalButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButton} onPress={pickImageFromLibrary}>
              <Text style={styles.modalButtonText}>📱 Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalCancelButton]} 
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, styles.modalCancelText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Button */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  profileImageUploading: {
    opacity: 0.5,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  cameraIcon: {
    fontSize: 16,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rankBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  rankText: {
    color: '#0f0f23',
    fontSize: 12,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  joinDate: {
    fontSize: 14,
    color: '#ccc',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  teamContainer: {
    marginBottom: 30,
  },
  teamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  teamColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  teamStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  teamStat: {
    alignItems: 'center',
  },
  teamStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  teamStatLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 5,
  },
  locationsContainer: {
    marginBottom: 30,
  },
  locationsList: {
    gap: 10,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
  },
  championCard: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  championIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  locationName: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  championText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  moreText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 25,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelText: {
    color: '#ccc',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0f0f23',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});