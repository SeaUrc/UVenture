import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        Alert.alert(
          'Victory!',
          `You captured ${locationData?.name || 'the location'}! Do you want to become an owner?`,
          [
            {
              text: 'No Thanks',
              style: 'cancel',
              onPress: () => {
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 1000);
              }
            },
            {
              text: 'Become Owner',
              onPress: async () => {
                await becomeOwner();
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 1500);
              },
            },
          ]
        );
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

  const becomeOwner = async () => {
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

      Alert.alert('Success!', 'You are now an owner of this location!');
    } catch (error) {
      console.error('Error becoming owner:', error);
      Alert.alert('Error', 'Failed to become owner of this location.');
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
      <Text style={styles.title}>Battle Arena</Text>
      <Text style={styles.subtitle}>{title || locationData?.name}</Text>

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
            <Text style={styles.instructions}>
              Battle with the defending champion!{'\n'}
              Tap the Attack button to deal damage.{'\n'}
              Defeat them to capture this location!
            </Text>
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
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 50, // Add top padding for safe area
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  battleField: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400, // Ensure minimum height
    paddingVertical: 20,
  },
  combatArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 200,
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  enemySide: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4CAF50',
    textAlign: 'center',
  },
  enemyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#F44336',
    textAlign: 'center',
  },
  playerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  enemyImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  healthBar: {
    width: 100,
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#555',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  teamText: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginHorizontal: 10,
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    marginTop: 'auto', // Push to bottom
  },
  attackButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  exitButton: {
    backgroundColor: '#666',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});