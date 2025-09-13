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

const BATTLE_COOLDOWN_MINUTES = 5;

export default function BattleScreen() {
  const { id, latitude, longitude, title, description, ownerTeam, ownerColor } = useLocalSearchParams();
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
  
  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Cooldown state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

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
    if (id && userToken) {
      fetchLocationData();
      checkExistingCooldown();
    }
  }, [id, userToken]);

  // Fetch location data from database
  const fetchLocationData = async () => {
    try {
      console.log('Fetching location data for ID:', id);
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      
      const data = await response.json();
      console.log('All locations data:', data);
      
      const location = data.data.find((loc: LocationData) => loc.id === parseInt(id as string));
      console.log('Found location:', location);
      
      if (location) {
        setLocationData(location);
        console.log('Strongest owner ID:', location.strongest_owner_id);
        
        // Fetch strongest owner profile if it exists
        if (location.strongest_owner_id && location.strongest_owner_id > 0) {
          await fetchStrongestOwnerProfile(location.strongest_owner_id);
        } else {
          console.log('No strongest owner ID found');
          setStrongestOwnerProfile(null);
        }
      } else {
        console.error('Location not found with ID:', id);
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
      Alert.alert('Error', 'Failed to load battle data');
    }
  };

  // Fetch strongest owner profile
  const fetchStrongestOwnerProfile = async (ownerId: number) => {
    try {
      console.log('Fetching profile for owner ID:', ownerId);
      
      const response = await fetch(`${databaseUrl}/api/profile/get_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ownerId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile fetch error:', response.status, errorText);
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const profileData = await response.json();
      console.log('Fetched profile data:', profileData);
      
      if (profileData && profileData.username) {
        setStrongestOwnerProfile(profileData);
      } else {
        console.log('Invalid profile data received:', profileData);
        setStrongestOwnerProfile(null);
      }
    } catch (error) {
      console.error('Error fetching strongest owner profile:', error);
      // Don't show alert for profile fetch errors, just log them
      setStrongestOwnerProfile(null);
    }
  };

  // Check for existing cooldown
  const checkExistingCooldown = async () => {
    try {
      const cooldownKey = `battle_cooldown_${id}`;
      const cooldownData = await AsyncStorage.getItem(cooldownKey);
      
      if (cooldownData) {
        const { cooldownEndTime } = JSON.parse(cooldownData);
        const currentTime = Date.now();
        
        if (currentTime < cooldownEndTime) {
          const timeLeft = Math.ceil((cooldownEndTime - currentTime) / 1000);
          setCooldownActive(true);
          setCooldownTimeLeft(timeLeft);
          setBattleResult('cooldown');
        } else {
          await AsyncStorage.removeItem(cooldownKey);
        }
      }
    } catch (error) {
      console.error('Error checking existing cooldown:', error);
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

  // Cooldown timer effect
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    
    if (cooldownActive && cooldownTimeLeft > 0) {
      cooldownTimer = setInterval(() => {
        setCooldownTimeLeft(prev => {
          if (prev <= 1) {
            setCooldownActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownTimer) {
        clearInterval(cooldownTimer);
      }
    };
  }, [cooldownActive, cooldownTimeLeft]);

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

  const startBattle = () => {
    if (cooldownActive) {
      Alert.alert('Cooldown Active', `You must wait ${formatCooldownTime(cooldownTimeLeft)} before battling here again.`);
      return;
    }

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

  const submitBattleResult = async (result: 'win' | 'lose') => {
    if (!userToken || !id) return;

    try {
      const battleScore = calculateBattleScore(result);
      
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
            },
            {
              text: 'Become Owner',
              onPress: () => becomeOwner(),
            },
          ]
        );
      } else if (result === 'win') {
        Alert.alert('Close Victory!', 'You won the battle but the location remains contested. Great effort!');
      } else {
        Alert.alert(
          'Defeat',
          `You were defeated at ${locationData?.name || 'the location'}. Train harder and try again in ${BATTLE_COOLDOWN_MINUTES} minutes!`
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
    const cooldownSeconds = BATTLE_COOLDOWN_MINUTES * 60;
    setCooldownActive(true);
    setCooldownTimeLeft(cooldownSeconds);
    storeCooldownData();
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
    } catch (error) {
      console.error('Error storing cooldown:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCooldownTime = (seconds: number) => {
    return formatTime(seconds);
  };

  const exitBattle = () => {
    router.back();
  };

  // Get enemy display info
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

  const enemyInfo = getEnemyDisplayInfo();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Battle at {title || locationData?.name}</Text>
      
      {/* Location Info */}
      {locationData && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationInfoText}>
            Owned by: {locationData.owner_team_name} ({locationData.owner_count} owners)
          </Text>
          <Text style={styles.locationInfoText}>
            Defending Champion: {strongestOwnerProfile?.username || 'No current champion'}
          </Text>
          {strongestOwnerProfile && (
            <Text style={styles.locationInfoText}>
              Champion Team: {strongestOwnerProfile.team}
            </Text>
          )}
        </View>
      )}

      {/* Battle Timer */}
      {battleStarted && !battleResult && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            Battle Time: {formatTime(battleTime)}
          </Text>
        </View>
      )}

      {/* Cooldown Display */}
      {(cooldownActive && cooldownTimeLeft > 0) || battleResult === 'cooldown' ? (
        <View style={styles.cooldownContainer}>
          <Text style={styles.cooldownTitle}>Battle Cooldown Active</Text>
          <Text style={styles.cooldownTime}>
            {formatCooldownTime(cooldownTimeLeft)}
          </Text>
          <Text style={styles.cooldownMessage}>
            {battleResult === 'cooldown' 
              ? 'You are still on cooldown from a previous battle'
              : 'Time remaining before you can battle here again'
            }
          </Text>
        </View>
      ) : (
        /* Battle Field */
        <View style={styles.battleField}>
          {!battleStarted && !battleResult && (
            <View style={styles.startContainer}>
              <Text style={styles.instructions}>
                Engage in combat with the defending champion!{'\n'}
                Tap the Attack button to deal damage.{'\n'}
                Defeat your opponent to capture this location!
              </Text>
              <TouchableOpacity style={styles.startButton} onPress={startBattle}>
                <Text style={styles.startButtonText}>Start Battle</Text>
              </TouchableOpacity>
            </View>
          )}

          {battleStarted && (
            <>
              <View style={styles.playerSide}>
                <Text style={styles.playerName}>You</Text>
                <Image 
                  source={require('../assets/images/icon.png')} 
                  style={styles.playerImage} 
                />
                <View style={styles.healthBar}>
                  <View style={[styles.healthFill, { width: `${playerHealth}%`, backgroundColor: '#4CAF50' }]} />
                </View>
                <Text style={styles.healthText}>HP: {playerHealth}/100</Text>
              </View>

              <Text style={styles.vsText}>VS</Text>

              <View style={styles.enemySide}>
                <Text style={styles.enemyName}>{enemyInfo.name}</Text>
                <Image source={{ uri: enemyInfo.image }} style={styles.enemyImage} />
                <View style={styles.healthBar}>
                  <View style={[styles.healthFill, { width: `${enemyHealth}%`, backgroundColor: '#F44336' }]} />
                </View>
                <Text style={styles.healthText}>HP: {enemyHealth}/100</Text>
                <Text style={styles.strengthText}>Team: {enemyInfo.team}</Text>
              </View>
            </>
          )}

          {/* Battle Result Display */}
          {battleResult && battleResult !== 'cooldown' && (
            <View style={styles.resultContainer}>
              <Text style={[styles.resultText, { color: battleResult === 'victory' ? '#4CAF50' : '#F44336' }]}>
                {battleResult === 'victory' ? 'VICTORY!' : 'DEFEAT!'}
              </Text>
              <Text style={styles.resultSubtext}>
                Battle completed in {formatTime(battleTime)}
              </Text>
              <Text style={styles.resultSubtext}>
                Score: {calculateBattleScore(battleResult === 'victory' ? 'win' : 'lose')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Battle Controls */}
      <View style={styles.controls}>
        {battleResult || cooldownActive || !battleStarted ? (
          <TouchableOpacity style={styles.exitButton} onPress={exitBattle}>
            <Text style={styles.exitButtonText}>Exit Battle</Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  locationInfoText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  cooldownContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  cooldownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  cooldownTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  cooldownMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  battleField: {
    flex: 1,
    justifyContent: 'center',
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
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
  },
  startButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  enemySide: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
  },
  enemyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#F44336',
  },
  playerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  enemyImage: {
    width: 100,
    height: 100,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#F44336',
  },
  vsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  healthBar: {
    width: 120,
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  healthFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  strengthText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 5,
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultSubtext: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 5,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 30,
    marginTop: 20,
  },
  attackButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  attackButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  exitButton: {
    backgroundColor: '#666',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  exitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});