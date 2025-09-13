import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type Team = {
  id: number;
  name: string;
  points: number;
  rank: number;
  color: string;
  members: number;
};

// Dummy data for the leaderboard
const dummyTeams: Team[] = [
  { id: 1, name: 'MCS', points: 2450, rank: 1, color: '#FF6B6B', members: 12 },
  { id: 2, name: 'SCS', points: 2180, rank: 2, color: '#4ECDC4', members: 15 },
  { id: 3, name: 'Tepper', points: 1950, rank: 3, color: '#45B7D1', members: 8 },
  { id: 4, name: 'Dietrich', points: 1820, rank: 4, color: '#96CEB4', members: 10 },
  { id: 5, name: 'Heinz', points: 1650, rank: 5, color: '#FFEAA7', members: 7 },
  { id: 6, name: 'CFA', points: 1420, rank: 6, color: '#DDA0DD', members: 9 },
  { id: 7, name: 'Engineering', points: 1280, rank: 7, color: '#98D8C8', members: 11 },
  { id: 8, name: 'Mellon', points: 1100, rank: 8, color: '#F7DC6F', members: 6 },
];

export default function LeaderboardScreen() {
  const [teams, setTeams] = useState<Team[]>(dummyTeams);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sample fetch function for leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      
      // Replace with your actual API endpoint
      const response = await fetch('https://your-api-endpoint.com/leaderboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      
      // Transform API data to match our Team type
      const leaderboardData: Team[] = data.teams.map((team: any, index: number) => ({
        id: team.id,
        name: team.name,
        points: team.points,
        rank: index + 1,
        color: team.color || '#007AFF',
        members: team.member_count || 0,
      }));
      
      setTeams(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Keep dummy data on error
    } finally {
      setIsLoading(false);
    }
  };

  // Pull to refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const renderTeamItem = (team: Team) => (
    <TouchableOpacity key={team.id} style={styles.teamItem}>
      <View style={styles.rankContainer}>
        <View style={[styles.rankBadge, { backgroundColor: team.color }]}>
          <ThemedText style={styles.rankText}>#{team.rank}</ThemedText>
        </View>
      </View>
      
      <View style={styles.teamInfo}>
        <ThemedText style={[styles.teamName, { fontFamily: Fonts.rounded }]}>
          {team.name}
        </ThemedText>
        <ThemedText style={styles.memberCount}>
          {team.members} members
        </ThemedText>
      </View>
      
      <View style={styles.pointsContainer}>
        <ThemedText style={[styles.pointsText, { fontFamily: Fonts.rounded }]}>
          {team.points.toLocaleString()}
        </ThemedText>
        <ThemedText style={styles.pointsLabel}>points</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText 
          type="defaultSemiBold" 
          style={[styles.title, { fontFamily: Fonts.rounded }]}
        >
          Leaderboard
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Team Rankings
        </ThemedText>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.leaderboardContainer}>
          {teams.map(renderTeamItem)}
        </View>
        
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Pull down to refresh
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    lineHeight: 36, // Add proper line height
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  leaderboardContainer: {
    gap: 12,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rankContainer: {
    marginRight: 16,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pointsLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.5,
  },
});
