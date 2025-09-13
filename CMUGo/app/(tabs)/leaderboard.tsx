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
  members?: number;
};

const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

export default function LeaderboardScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch function for leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${databaseUrl}/api/teams/get_teams`);
      if (!response.ok) {
        console.log('Response status:', response.status);
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      console.log('API response:', data); // Debug log
      
      // Handle different possible response structures
      const teamsArray = data.teams || data.data || data || [];
      
      // Transform API data to match our Team type
      const leaderboardData: Team[] = teamsArray
        .map((team: any, index: number) => ({
          id: team.id || index,
          name: team.name || 'Unknown Team',
          points: team.points || team.score || 0, // Handle null/undefined points
          rank: index + 1,
          color: team.color || '#007AFF',
          members: team.members || team.member_count || 0,
        }))
        .sort((a: Team, b: Team) => (b.points || 0) - (a.points || 0)); // Safe sorting
      
      // Update ranks after sorting
      const rankedTeams = leaderboardData.map((team, index) => ({
        ...team,
        rank: index + 1,
      }));
      
      console.log('Processed teams:', rankedTeams); // Debug log
      setTeams(rankedTeams);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Set empty array on error instead of keeping undefined
      setTeams([]);
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
    <View key={team.id} style={styles.teamItem}>
      <View style={styles.rankContainer}>
        <View style={[styles.rankBadge, { backgroundColor: team.color }]}>
          <ThemedText style={styles.rankText}>#{team.rank}</ThemedText>
        </View>
      </View>
      
      <View style={styles.teamInfo}>
        <ThemedText style={[styles.teamName, { fontFamily: Fonts.rounded }]}>
          {team.name}
        </ThemedText>
        {team.members !== undefined && (
          <ThemedText style={styles.memberCount}>
            {team.members} member{team.members !== 1 ? 's' : ''}
          </ThemedText>
        )}
      </View>
      
      <View style={styles.pointsContainer}>
        <ThemedText style={[styles.pointsText, { fontFamily: Fonts.rounded }]}>
          {(team.points || 0).toLocaleString()}
        </ThemedText>
        <ThemedText style={styles.pointsLabel}>points</ThemedText>
      </View>
    </View>
  );

  if (isLoading && teams.length === 0) {
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
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading teams...</ThemedText>
        </View>
      </ThemedView>
    );
  }

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
          {teams.length > 0 ? (
            teams.map(renderTeamItem)
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No teams found
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Pull down to refresh
              </ThemedText>
            </View>
          )}
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
    lineHeight: 36,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
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