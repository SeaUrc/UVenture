import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from './context/ProfileContext';
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
    '#FF0000': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', // Red team
    '#0000FF': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',  // Blue team
    '#00FF00': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',  // Green team
    '#FFFF00': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', // Yellow team
  };
  return avatarMap[teamColor] || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
};

const BATTLE_COOLDOWN_MINUTES = 5;

export default function BattleArenaScreen() {
  const { id, title, ownerTeam, ownerColor } = useLocalSearchParams();
  const { profileImage } = useProfile();
  const router = useRouter();
  
  // Battle state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [strongestOwnerProfile, setStrongestOwnerProfile] = useState<ProfileData | null>(null);
  const [battleResult, setBattleResult] = useState<string | null>(null);
  
  // Battle timer state
  const [battleTime, setBattleTime] = useState(0);
  
  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  // Cooldown state
  const [cooldownStarted, setCooldownStarted] = useState(false);
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
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      
      const data = await response.json();
      const location = data.data.find((loc: LocationData) => loc.id === parseInt(id as string));
      
      if (location) {
        setLocationData(location);
        // Fetch strongest owner profile
        if (location.strongest_owner_id) {
          fetchStrongestOwnerProfile(location.strongest_owner_id);
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
      const response = await fetch(`${databaseUrl}/api/profile/get_profile?id=${ownerId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const profileData = await response.json();
      setStrongestOwnerProfile(profileData);
    } catch (error) {
      console.error('Error fetching strongest owner profile:', error);
    }
  };

  // Battle timer effect
  useEffect(() => {
    let battleTimer: NodeJS.Timeout;
    
    if (!battleResult) {
      battleTimer = setInterval(() => {
        setBattleTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (battleTimer) {
        clearInterval(battleTimer);
      }
    };
  }, [battleResult]);

  // Cooldown timer effect
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    
    if (cooldownStarted && cooldownTimeLeft > 0) {
      cooldownTimer = setInterval(() => {
        setCooldownTimeLeft(prev => {
          if (prev <= 1) {
            setCooldownStarted(false);
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
  }, [cooldownStarted, cooldownTimeLeft]);

  // Enemy attack interval effect
  useEffect(() => {
    let enemyAttackInterval: NodeJS.Timeout;
    
    if (!battleResult && enemyHealth > 0 && playerHealth > 0) {
      enemyAttackInterval = setInterval(() => {
        enemyAttack();
      }, 800 + Math.random() * 1400);
    }

    return () => {
      if (enemyAttackInterval) {
        clearInterval(enemyAttackInterval);
      }
    };
  }, [battleResult, enemyHealth, playerHealth]);

  const formatBattleTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCooldownTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startCooldown = () => {
    const cooldownSeconds = BATTLE_COOLDOWN_MINUTES * 60;
    setCooldownStarted(true);
    setCooldownTimeLeft(cooldownSeconds);
    storeCooldownData();
  };

  const checkExistingCooldown = async () => {
    try {
      const cooldownKey = `arena_cooldown_${id}`;
      const cooldownData = await AsyncStorage.getItem(cooldownKey);
      
      if (cooldownData) {
        const { cooldownEndTime } = JSON.parse(cooldownData);
        const currentTime = Date.now();
        
        if (currentTime < cooldownEndTime) {
          const timeLeft = Math.ceil((cooldownEndTime - currentTime) / 1000);
          setCooldownStarted(true);
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

  const enemyAttack = () => {
    if (battleResult || playerHealth <= 0 || enemyHealth <= 0) return;

    const enemyDamage = Math.floor(Math.random() * 12) + 3;
    setPlayerHealth(prevHealth => {
      const newPlayerHealth = Math.max(0, prevHealth - enemyDamage);
      
      if (newPlayerHealth <= 0) {
        setBattleResult('defeat');
        submitBattleResult('lose');
        startCooldown();
        Alert.alert('Defeat!', `You were defeated! You must wait ${BATTLE_COOLDOWN_MINUTES} minutes before battling here again.`);
      }
      
      return newPlayerHealth;
    });
  };

  const submitBattleResult = async (result: 'win' | 'lose') => {
    if (!userToken || !id) return;

    try {
      const response = await fetch(`${databaseUrl}/api/interactions/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: parseInt(id as string),
          score: calculateBattleScore(result),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const battleResponse = await response.json();
      
      if (battleResponse.message === 'win' && result === 'win') {
        // Offer to become owner
        Alert.alert(
          'Victory!',
          'You have successfully captured this location! Do you want to become an owner?',
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
      }
    } catch (error) {
      console.error('Error submitting battle result:', error);
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

  const calculateBattleScore = (result: 'win' | 'lose') => {
    // Base score calculation
    let score = 50; // Base score
    
    if (result === 'win') {
      score += 50; // Win bonus
      score += Math.max(0, 30 - battleTime); // Time bonus (faster = more points)
      score += playerHealth; // Health bonus
    } else {
      score = Math.max(10, score - 20); // Minimum score for participation
    }
    
    return score;
  };

  const storeCooldownData = async () => {
    try {
      const cooldownSeconds = BATTLE_COOLDOWN_MINUTES * 60;
      const cooldownEndTime = Date.now() + (cooldownSeconds * 1000);
      const cooldownKey = `arena_cooldown_${id}`;
      
      await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        cooldownEndTime,
        arenaId: id
      }));
    } catch (error) {
      console.error('Error storing cooldown:', error);
    }
  };

  const playerAttack = () => {
    if (battleResult) return;

    const damage = Math.floor(Math.random() * 20) + 10;
    const newEnemyHealth = Math.max(0, enemyHealth - damage);
    setEnemyHealth(newEnemyHealth);

    if (newEnemyHealth <= 0) {
      setBattleResult('victory');
      submitBattleResult('win');
      startCooldown();
    }
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
      <Text style={styles.locationTitle}>
        Battle at {title || locationData?.name || 'Arena'}
      </Text>

      {/* Location Info */}
      {locationData && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationInfoText}>
            Owned by: {locationData.owner_team_name} ({locationData.owner_count} owners)
          </Text>
          <Text style={styles.locationInfoText}>
            Defending Champion: {strongestOwnerProfile?.username || 'Loading...'}
          </Text>
        </View>
      )}

      {/* Battle Timer */}
      {!battleResult && !cooldownStarted && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            Battle Time: {formatBattleTime(battleTime)}
          </Text>
        </View>
      )}

      {/* Cooldown Display */}
      {(cooldownStarted && cooldownTimeLeft > 0) || battleResult === 'cooldown' && (
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
      )}

      {/* Battle Field */}
      {battleResult !== 'cooldown' && (
        <View style={styles.battleField}>
          <View style={styles.playerSide}>
            <Text style={styles.playerName}>You</Text>
            <Image 
              source={profileImage ? { uri: profileImage } : require('../assets/images/icon.png')} 
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
        </View>
      )}

      {/* Battle Result Display */}
      {battleResult && battleResult !== 'cooldown' && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultText, { color: battleResult === 'victory' ? '#4CAF50' : '#F44336' }]}>
            {battleResult === 'victory' ? 'VICTORY!' : 'DEFEAT!'}
          </Text>
          <Text style={styles.resultSubtext}>
            Battle completed in {formatBattleTime(battleTime)}
          </Text>
          <Text style={styles.resultSubtext}>
            Score: {calculateBattleScore(battleResult === 'victory' ? 'win' : 'lose')}
          </Text>
        </View>
      )}

      {/* Battle Controls */}
      <View style={styles.controls}>
        {battleResult || cooldownStarted ? (
          <TouchableOpacity style={styles.exitButton} onPress={exitBattle}>
            <Text style={styles.buttonText}>Exit Battle</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.attackButton} onPress={playerAttack}>
            <Text style={styles.buttonText}>Attack!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#1a1a2e' 
  },
  locationTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 15,
    color: 'white'
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  locationInfoText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 3,
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
    padding: 15,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cooldownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 5,
  },
  cooldownTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 5,
  },
  cooldownMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  battleField: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  enemyImage: {
    width: 120,
    height: 120,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#F44336',
  },
  vsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
    marginHorizontal: 20,
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
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultSubtext: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 3,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 50,
    marginTop: 20,
  },
  attackButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exitButton: {
    backgroundColor: '#666',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});