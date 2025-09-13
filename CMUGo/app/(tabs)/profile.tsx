import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

type ProfileData = {
  username: string;
  team: string;
  image: string;
  strength: number;
  total_score: number;
  battles_won: number;
  battles_lost: number;
  locations_owned: number;
  locations_conquered: number;
  current_streak: number;
  best_streak: number;
  rank: string;
  join_date: string;
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

  const loadProfileData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchUserStats(),
        fetchOwnedLocations(),
        fetchDefendingLocations(),
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
        setProfileData(profileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
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
      const response = await fetch(`${databaseUrl}/api/profile/get_team_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          team_name: profileData.team,
        }),
      });

      if (response.ok) {
        const teamData = await response.json();
        setTeamStats(teamData);
      }
    } catch (error) {
      console.error('Error fetching team stats:', error);
    }
  };

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
    const totalBattles = (profileData.battles_won || 0) + (profileData.battles_lost || 0);
    return totalBattles > 0 ? Math.round(((profileData.battles_won || 0) / totalBattles) * 100) : 0;
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
            <Image 
              source={
                profileData.image 
                  ? { uri: `data:image/png;base64,${profileData.image}` }
                  : require('../../assets/images/icon.png')
              } 
              style={styles.profileImage} 
            />
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
        {teamStats && (
          <View style={styles.teamContainer}>
            <Text style={styles.sectionTitle}>Team Affiliation</Text>
            <View style={[styles.teamCard, { borderColor: teamStats.team_color }]}>
              <View style={styles.teamHeader}>
                <View style={[styles.teamColorDot, { backgroundColor: teamStats.team_color }]} />
                <Text style={styles.teamName}>{teamStats.team_name}</Text>
              </View>
              <View style={styles.teamStatsRow}>
                <View style={styles.teamStat}>
                  <Text style={styles.teamStatValue}>{teamStats.total_members}</Text>
                  <Text style={styles.teamStatLabel}>Members</Text>
                </View>
                <View style={styles.teamStat}>
                  <Text style={styles.teamStatValue}>{teamStats.total_locations}</Text>
                  <Text style={styles.teamStatLabel}>Locations</Text>
                </View>
                <View style={styles.teamStat}>
                  <Text style={styles.teamStatValue}>#{teamStats.team_rank}</Text>
                  <Text style={styles.teamStatLabel}>Rank</Text>
                </View>
              </View>
            </View>
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
              <Text style={styles.statValue}>{profileData.total_score || 0}</Text>
              <Text style={styles.statLabel}>Total Score</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getWinRate()}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{profileData.battles_won || 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{profileData.battles_lost || 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#FFD700' }]}>{profileData.current_streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Defending Locations */}
        <View style={styles.locationsContainer}>
          <Text style={styles.sectionTitle}>Defending Champion ({defendingLocations.length})</Text>
          {defendingLocations.length > 0 ? (
            <View style={styles.locationsList}>
              {defendingLocations.slice(0, 5).map((location, index) => (
                <View key={location.id} style={[styles.locationCard, styles.championCard]}>
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
    backgroundColor: Colors.dark.background,
    // backgroundColor: '#0f0f23',
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
  rankBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
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
  locationTeam: {
    fontSize: 12,
    color: '#ccc',
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
  achievementsContainer: {
    marginBottom: 30,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  achievementIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  achievementText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    // backgroundColor: '#0f0f23',
    backgroundColor: Colors.dark.background
    // borderTopWidth: 1,
    // borderTopColor: 'rgba(255, 255, 255, 0.1)',
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