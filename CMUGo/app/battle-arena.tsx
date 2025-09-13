import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

type LocationData = {
  id: number;
  name: string;
  image: string;
  latitude: number;
  longitude: number;
  owner_team: number;
  owner_team_color: string;
  owner_team_name: string;
  owner_count: number;
  owned_since: string;
  strongest_owner_id: number;
};

type ProfileData = {
  username: string;
  team: string;
  image: string;
};

// Mock enemy avatars based on team colors
const getEnemyAvatar = (teamColor: string) => {
  const avatarMap = {
    '#FF0000': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    '#0000FF': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
    '#00FF00': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
    '#FFFF00': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
  };
  return avatarMap[teamColor] || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
};

const BATTLE_COOLDOWN_MINUTES = 1;

export default function BattleArenaScreen() {
  const { id, title, ownerTeam, ownerColor } = useLocalSearchParams();
  const router = useRouter();

  // Battle state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const [battleTime, setBattleTime] = useState(0);
  
  // Battle data
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [strongestOwnerProfile, setStrongestOwnerProfile] = useState<ProfileData | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  
  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

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
    if (id && userToken && userId) {
      fetchLocationData();
      fetchUserProfile();
    }
  }, [id, userToken, userId]);

  // Fetch user's own profile
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
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch location data from database
  const fetchLocationData = async () => {
    try {
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      
      const data = await response.json();
      const location = data.data.find((loc: LocationData) => loc.id === parseInt(id as string));
      
      if (location) {
        setLocationData(location);
        
        // Fetch strongest owner profile if it exists and it's not the current user
        if (location.strongest_owner_id && location.strongest_owner_id > 0 && location.strongest_owner_id !== userId) {
          await fetchStrongestOwnerProfile(location.strongest_owner_id);
        } else {
          setStrongestOwnerProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
      Alert.alert('Error', 'Failed to load battle arena data');
    }
  };

  // Fetch strongest owner profile
  const fetchStrongestOwnerProfile = async (ownerId: number) => {
    try {
      const response = await fetch(`${databaseUrl}/api/profile/get_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ownerId,
        }),
      });

      if (response.ok) {
        const profileData = await response.json();
        if (profileData && profileData.username) {
          setStrongestOwnerProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching strongest owner profile:', error);
      setStrongestOwnerProfile(null);
    }
  };

  // Battle timer effect
  useEffect(() => {
    let battleTimer: NodeJS.Timeout;
    
    if (battleStarted && !battleResult) {
      battleTimer = setInterval(() => {
        setBattleTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (battleTimer) {
        clearInterval(battleTimer);
      }
    };
  }, [battleStarted, battleResult]);

  // Enemy attack interval effect
  useEffect(() => {
    let enemyAttackInterval: NodeJS.Timeout;
    
    if (battleStarted && !battleResult && enemyHealth > 0 && playerHealth > 0) {
      enemyAttackInterval = setInterval(() => {
        enemyAttack();
      }, 1200 + Math.random() * 1800); // Enemy attacks every 1.2-3 seconds
    }

    return () => {
      if (enemyAttackInterval) {
        clearInterval(enemyAttackInterval);
      }
    };
  }, [battleStarted, battleResult, enemyHealth, playerHealth]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startBattle = () => {
    setBattleStarted(true);
    setPlayerHealth(100);
    setEnemyHealth(100);
    setBattleTime(0);
    setBattleResult(null);
  };

  const playerAttack = () => {
    if (battleResult || !battleStarted) return;

    const damage = Math.floor(Math.random() * 20) + 10; // 10-29 damage
    const newEnemyHealth = Math.max(0, enemyHealth - damage);
    setEnemyHealth(newEnemyHealth);

    if (newEnemyHealth <= 0) {
      setBattleResult('victory');
      submitBattleResult('win');
      startCooldown();
    }
  };

  const enemyAttack = () => {
    if (battleResult || playerHealth <= 0 || enemyHealth <= 0) return;

    const enemyDamage = Math.floor(Math.random() * 15) + 8; // 8-22 damage
    setPlayerHealth(prevHealth => {
      const newPlayerHealth = Math.max(0, prevHealth - enemyDamage);
      
      if (newPlayerHealth <= 0) {
        setBattleResult('defeat');
        submitBattleResult('lose');
        startCooldown();
      }
      
      return newPlayerHealth;
    });
  };

  const calculateBattleScore = (result: 'win' | 'lose') => {
    let score = 50; // Base score
    
    if (result === 'win') {
      score += 50; // Win bonus
      score += Math.max(0, 30 - battleTime); // Time bonus
      score += playerHealth; // Health bonus
    } else {
      score = Math.max(10, score - 20); // Minimum participation score
    }
    
    return score;
  };

  const updateLocalProfileStats = async (result: 'win' | 'lose') => {
    if (!userProfile) return;

    try {
      const updatedProfile = { ...userProfile };
      
      if (result === 'win') {
        updatedProfile.wins = (updatedProfile.wins || 0) + 1;
        // Increase strength by 1-3 points for winning
        updatedProfile.strength = (updatedProfile.strength || 0) + Math.floor(Math.random() * 3) + 1;
      } else {
        updatedProfile.losses = (updatedProfile.losses || 0) + 1;
        // Decrease strength by 0-2 points for losing (minimum 1)
        const strengthLoss = Math.floor(Math.random() * 3);
        updatedProfile.strength = Math.max(1, (updatedProfile.strength || 1) - strengthLoss);
      }

      setUserProfile(updatedProfile);
      
      // Store updated profile data with a timestamp to ensure it's fresh
      const updateData = {
        ...updatedProfile,
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem('updatedProfileData', JSON.stringify(updateData));
      
      console.log(`Battle result: ${result}, Updated stats stored:`, {
        wins: updatedProfile.wins,
        losses: updatedProfile.losses,
        strength: updatedProfile.strength,
        timestamp: updateData.lastUpdated
      });
      
    } catch (error) {
      console.error('Error updating local profile stats:', error);
    }
  };

  const submitBattleResult = async (result: 'win' | 'lose') => {
    if (!userToken || !id) return;

    try {
      const battleScore = calculateBattleScore(result);
      
      // Store cooldown BEFORE making the API call
      await storeCooldownData();
      
      // Update local profile stats IMMEDIATELY after storing cooldown
      await updateLocalProfileStats(result);
      // console.log(id as string);
      // console.log(battle)
      const response = await fetch(`${databaseUrl}/api/interactions/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: parseInt(id as string),
          score: battleScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const battleResponse = await response.json();
      
      if (battleResponse.message === 'win' && result === 'win') {
        await becomeOwner(locationData?.name || 'the location');
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1500);
      } else if (result === 'win') {
        Alert.alert('Close Victory!', 'You won the battle but the location remains contested. Great effort!', [
          {
            text: 'OK',
            onPress: () => {
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1000);
            }
          }
        ]);
      } else {
        Alert.alert(
          'Defeat',
          `You were defeated at ${locationData?.name || 'the location'}. Train harder and try again in ${BATTLE_COOLDOWN_MINUTES} minutes!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 1000);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting battle result:', error);
      Alert.alert('Error', 'Failed to submit battle result. Please try again.');
    }
  };

  const becomeOwner = async (locationName: string) => {
    if (!userToken || !id) return;

    try {
      const response = await fetch(`${databaseUrl}/api/interactions/become_owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: parseInt(id as string),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      Alert.alert('Success!', `You are now an owner of this ${locationName}!`);
    } catch (error) {
      console.error('Error becoming owner:', error);
      Alert.alert('Error', `Failed to become owner of this ${locationName}.`);
    }
  };

  const startCooldown = () => {
    // This function is now called from submitBattleResult
    // We don't need to call storeCooldownData here again
  };

  const storeCooldownData = async () => {
    try {
      const cooldownSeconds = BATTLE_COOLDOWN_MINUTES * 60;
      const cooldownEndTime = Date.now() + (cooldownSeconds * 1000);
      const cooldownKey = `battle_cooldown_${id}`;
      
      await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        cooldownEndTime,
        locationId: id
      }));
      
      console.log(`Cooldown stored for location ${id}, ends at:`, new Date(cooldownEndTime));
    } catch (error) {
      console.error('Error storing cooldown:', error);
    }
  };

  const exitBattle = () => {
    router.replace('/(tabs)');
  };

  // Get display info for both fighters
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.username,
        image: userProfile.image 
          ? `data:image/png;base64,${userProfile.image}` 
          : null,
        team: userProfile.team,
      };
    }
    
    return {
      name: 'You',
      image: null,
      team: 'Your Team',
    };
  };

  const getEnemyDisplayInfo = () => {
    if (strongestOwnerProfile) {
      return {
        name: strongestOwnerProfile.username,
        image: strongestOwnerProfile.image 
          ? `data:image/png;base64,${strongestOwnerProfile.image}` 
          : getEnemyAvatar(locationData?.owner_team_color || '#FF0000'),
        team: strongestOwnerProfile.team,
      };
    }
    
    return {
      name: locationData?.owner_team_name || 'Enemy Team',
      image: getEnemyAvatar(locationData?.owner_team_color || '#FF0000'),
      team: locationData?.owner_team_name || 'Unknown Team',
    };
  };

  const userInfo = getUserDisplayInfo();
  const enemyInfo = getEnemyDisplayInfo();

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>⚔️ Battle Arena</Text>
        <Text style={styles.subtitle}>{title || locationData?.name}</Text>
        <Text style={styles.description}>
          1. Challenge the defending champion to capture this location! {'\n'}2. Tap the Attack button to deal damage. {'\n'}3. Defeat them to capture this location!
        </Text>
      </View>

      {/* Battle Timer */}
      {battleStarted && !battleResult && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            Battle Time: {formatTime(battleTime)}
          </Text>
        </View>
      )}

      {/* Battle Field */}
      <View style={styles.battleField}>
        {!battleStarted && !battleResult && (
          <View style={styles.startContainer}>
            <TouchableOpacity style={styles.startButton} onPress={startBattle}>
              <Text style={styles.startButtonText}>Begin Battle</Text>
            </TouchableOpacity>
          </View>
        )}

        {battleStarted && (
          <View style={styles.combatArea}>
            <View style={styles.playerSide}>
              <Text style={styles.playerName}>{userInfo.name}</Text>
              <Image 
                source={
                  userInfo.image 
                    ? { uri: userInfo.image }
                    : require('../assets/images/icon.png')
                } 
                style={styles.playerImage} 
              />
              <View style={styles.healthBar}>
                <View style={[styles.healthFill, { width: `${playerHealth}%`, backgroundColor: '#4CAF50' }]} />
              </View>
              <Text style={styles.healthText}>HP: {playerHealth}/100</Text>
              {/* <Text style={styles.teamText}>{userInfo.team}</Text> */}
            </View>

            <Text style={styles.vsText}>VS</Text>

            <View style={styles.enemySide}>
              <Text style={styles.enemyName}>{enemyInfo.name}</Text>
              <Image source={{ uri: enemyInfo.image }} style={styles.enemyImage} />
              <View style={styles.healthBar}>
                <View style={[styles.healthFill, { width: `${enemyHealth}%`, backgroundColor: '#F44336' }]} />
              </View>
              <Text style={styles.healthText}>HP: {enemyHealth}/100</Text>
              {/* <Text style={styles.teamText}>{enemyInfo.team}</Text> */}
            </View>
          </View>
        )}

        {/* Battle Result Display */}
        {battleResult && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultText, { color: battleResult === 'victory' ? '#4CAF50' : '#F44336' }]}>
              {battleResult === 'victory' ? 'VICTORY!' : 'DEFEAT!'}
            </Text>
            <Text style={styles.resultSubtext}>
              Battle completed in {formatTime(battleTime)}
            </Text>
            <Text style={styles.resultSubtext}>
              Final Score: {calculateBattleScore(battleResult === 'victory' ? 'win' : 'lose')} points
            </Text>
            <Text style={styles.resultSubtext}>
              Health Remaining: {playerHealth}/100
            </Text>
          </View>
        )}
      </View>

      {/* Battle Controls */}
      <View style={styles.controls}>
        {battleResult || !battleStarted ? (
          <TouchableOpacity style={styles.exitButton} onPress={exitBattle}>
            <Text style={styles.exitButtonText}>Exit Arena</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.attackButton} onPress={playerAttack}>
            <Text style={styles.attackButtonText}>Attack!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    padding: 24,
    paddingTop: 60,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 22,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'left',
    fontWeight: '500',
    opacity: 0.9,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  battleField: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
    paddingVertical: 24,
  },
  combatArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    minHeight: 240,
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 32,
  },
  instructions: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
    paddingHorizontal: 16,
    fontWeight: '500',
    opacity: 0.9,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  enemySide: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  enemyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#F44336',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  playerImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  enemyImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#F44336',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
  healthBar: {
    width: 120,
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#555',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  healthFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  teamText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    opacity: 0.8,
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  resultSubtext: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 24,
    marginTop: 'auto',
  },
  attackButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 35,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  attackButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  exitButton: {
    backgroundColor: '#666',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});