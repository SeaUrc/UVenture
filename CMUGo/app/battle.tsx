import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Team colors for display
const teamColors = {
  'Team Red': '#F44336',
  'Team Blue': '#2196F3',
  'Team Yellow': '#FFD700',
  'Team Green': '#4CAF50',
};

const BATTLE_COOLDOWN_MINUTES = 5; // 5 minute cooldown

export default function BattleScreen() {
  const { id, latitude, longitude, title, description } = useLocalSearchParams();
  const router = useRouter();

  // Cooldown state
  const [onCooldown, setOnCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  // Team and leaderboard state
  const [controllingTeam, setControllingTeam] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingTeamData, setLoadingTeamData] = useState(true);

  useEffect(() => {
    // Fetch team and leaderboard data
    fetchPokestopData();

    // Check if user is on cooldown for this pokestop
    checkCooldownStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh cooldown status when screen comes into focus
      checkCooldownStatus();
    }, [id])
  );

  // Cooldown timer effect
  useEffect(() => {
    let interval;
    if (onCooldown && cooldownTimeLeft > 0) {
      interval = setInterval(() => {
        setCooldownTimeLeft(prev => {
          if (prev <= 1) {
            setOnCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [onCooldown, cooldownTimeLeft]);

  const checkCooldownStatus = async () => {
  try {
    // Check local storage first
    const cooldownKey = `arena_cooldown_${id}`;
    const cooldownData = await AsyncStorage.getItem(cooldownKey);
    
    if (cooldownData) {
      const { cooldownEndTime } = JSON.parse(cooldownData);
      const currentTime = Date.now();
      
      if (currentTime < cooldownEndTime) {
        // Still on cooldown
        const timeLeft = Math.ceil((cooldownEndTime - currentTime) / 1000);
        setOnCooldown(true);
        setCooldownTimeLeft(timeLeft);
      } else {
        // Cooldown expired, remove it
        await AsyncStorage.removeItem(cooldownKey);
        setOnCooldown(false);
      }
    }
    
    // Also check server as backup
    const response = await fetch(`YOUR_API_URL/arenas/${id}/cooldown/USER_ID`);
    const serverCooldownData = await response.json();
    
    if (serverCooldownData.onCooldown) {
      setOnCooldown(true);
      setCooldownTimeLeft(serverCooldownData.timeLeft);
    }
  } catch (error) {
    console.error('Error checking cooldown:', error);
  }
};

  const formatCooldownTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchPokestopData = async () => {
    try {
      setLoadingTeamData(true);
      
      // Fetch controlling team data
      const teamResponse = await fetch(`YOUR_API_URL/pokestops/${id}/team`);
      const teamData = await teamResponse.json();
      setControllingTeam(teamData);

      // Fetch leaderboard for this pokestop
      const leaderboardResponse = await fetch(`YOUR_API_URL/pokestops/${id}/leaderboard`);
      const leaderboardData = await leaderboardResponse.json();
      setLeaderboard(leaderboardData);

    } catch (error) {
      console.error('Error fetching pokestop data:', error);
      // Mock data for development
      setControllingTeam({
        name: 'Team Blue',
        points: 150,
        controlledSince: '2 hours ago'
      });
      setLeaderboard([
        { team: 'Team Blue', points: 150 },
        { team: 'Team Red', points: 120 },
        { team: 'Team Yellow', points: 95 },
        { team: 'Team Green', points: 80 },
      ]);
    } finally {
      setLoadingTeamData(false);
    }
  };

  const startBattle = () => {
  if (onCooldown) {
    Alert.alert('Cooldown Active', `You must wait ${formatCooldownTime(cooldownTimeLeft)} before battling again.`);
    return;
  }
  
  // Navigate to battle arena
  router.push({
    pathname: '/battle-arena',
    params: {
      arenaId: id,
      title: title,
    },
  });
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.locationTitle}>
        {title ? `${title}` : 'PokéStop'}
      </Text>

      {/* Cooldown Status */}
      {onCooldown && (
        <View style={styles.cooldownSection}>
          <Text style={styles.cooldownTitle}>Battle Cooldown Active</Text>
          <Text style={styles.cooldownTime}>
            Time remaining: {formatCooldownTime(cooldownTimeLeft)}
          </Text>
          <Text style={styles.cooldownMessage}>
            You must wait before battling at this PokéStop again.
          </Text>
        </View>
      )}

      {/* Team Control Section */}
      <View style={styles.teamSection}>
        <Text style={styles.sectionTitle}>PokéStop Control</Text>
        {loadingTeamData ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : controllingTeam ? (
          <View style={styles.teamControl}>
            <Text style={[styles.controllingTeam, { color: teamColors[controllingTeam.name] || '#666' }]}>
              Controlled by {controllingTeam.name}
            </Text>
            <Text style={styles.teamPoints}>{controllingTeam.points} points</Text>
            <Text style={styles.controlTime}>Since {controllingTeam.controlledSince}</Text>
          </View>
        ) : (
          <Text style={styles.neutralText}>Neutral Territory</Text>
        )}
      </View>

      {/* Leaderboard Section */}
      <View style={styles.leaderboardSection}>
        <Text style={styles.sectionTitle}>Team Leaderboard</Text>
        {loadingTeamData ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <View style={styles.leaderboard}>
            {leaderboard.map((team, index) => (
              <View key={team.team} style={styles.leaderboardItem}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Text style={[styles.teamName, { color: teamColors[team.team] || '#666' }]}>
                  {team.team}
                </Text>
                <Text style={styles.points}>{team.points} pts</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Battle Controls */}
      <View style={styles.controls}>
        {onCooldown ? (
          <View style={styles.cooldownButton}>
            <Text style={styles.cooldownButtonText}>
              Cooldown: {formatCooldownTime(cooldownTimeLeft)}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={startBattle}>
            <Text style={styles.buttonText}>Start Battle</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f0f0f0' 
  },
  locationTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  cooldownSection: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderColor: '#f44336',
    borderWidth: 1,
    alignItems: 'center',
  },
  cooldownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 5,
  },
  cooldownTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 5,
  },
  cooldownMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  teamSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  teamControl: {
    alignItems: 'center',
  },
  controllingTeam: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamPoints: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  controlTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  neutralText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  leaderboard: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  points: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 50,
    marginTop: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  cooldownButton: {
    backgroundColor: '#999',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  cooldownButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});