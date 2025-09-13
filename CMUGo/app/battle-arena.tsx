import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from './context/ProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock enemy data
const enemies = [
  { id: 1, name: 'Fire Avatar', strength: 50, image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  { id: 2, name: 'Water Avatar', strength: 45, image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
  { id: 3, name: 'Earth Avatar', strength: 48, image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' },
];

const BATTLE_COOLDOWN_MINUTES = 5;

export default function BattleArenaScreen() {
  const { arenaId, title } = useLocalSearchParams();
  const { profileImage } = useProfile();
  const router = useRouter();
  
  // Battle state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  
  // Battle timer state
  const [battleTime, setBattleTime] = useState(0);
  
  // Cooldown state
  const [cooldownStarted, setCooldownStarted] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  useEffect(() => {
    // Randomly select an enemy when battle starts
    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    setCurrentEnemy(randomEnemy);

    checkExistingCooldown();
  }, []);

  // Battle timer effect
  useEffect(() => {
    let battleTimer;
    
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
  let cooldownTimer;
  
  if (cooldownStarted && cooldownTimeLeft > 0) {
    cooldownTimer = setInterval(() => {
      setCooldownTimeLeft(prev => {
        if (prev <= 1) {
          // Cooldown finished, clean up
          const cooldownKey = `arena_cooldown_${arenaId}`;
          AsyncStorage.removeItem(cooldownKey).catch(console.error);
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
}, [cooldownStarted, cooldownTimeLeft, arenaId]);

  // Enemy attack interval effect
  useEffect(() => {
    let enemyAttackInterval;
    
    if (!battleResult && enemyHealth > 0 && playerHealth > 0) {
      enemyAttackInterval = setInterval(() => {
        enemyAttack();
      }, 800 + Math.random() * 1400); // Random interval between 0.8-2.2 seconds
    }

    return () => {
      if (enemyAttackInterval) {
        clearInterval(enemyAttackInterval);
      }
    };
  }, [battleResult, enemyHealth, playerHealth]);

  const formatBattleTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCooldownTime = (seconds) => {
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
      const cooldownKey = `arena_cooldown_${arenaId}`;
      const cooldownData = await AsyncStorage.getItem(cooldownKey);
      
      if (cooldownData) {
        const { cooldownEndTime } = JSON.parse(cooldownData);
        const currentTime = Date.now();
        
        if (currentTime < cooldownEndTime) {
          // Still on cooldown
          const timeLeft = Math.ceil((cooldownEndTime - currentTime) / 1000);
          setCooldownStarted(true);
          setCooldownTimeLeft(timeLeft);
          setBattleResult('cooldown'); // New battle result state
        } else {
          // Cooldown expired, remove it
          await AsyncStorage.removeItem(cooldownKey);
        }
      }
    } catch (error) {
      console.error('Error checking existing cooldown:', error);
    }
  };

  const enemyAttack = () => {
    if (battleResult || playerHealth <= 0 || enemyHealth <= 0) return;

    const enemyDamage = Math.floor(Math.random() * 12) + 3; // 3-15 damage
    setPlayerHealth(prevHealth => {
      const newPlayerHealth = Math.max(0, prevHealth - enemyDamage);
      
      if (newPlayerHealth <= 0) {
        setBattleResult('defeat');
        submitBattleResult('defeat');
        startCooldown(); // Start cooldown after defeat
        Alert.alert('Defeat!', `You were defeated! You must wait ${BATTLE_COOLDOWN_MINUTES} minutes before battling here again.`);
      }
      
      return newPlayerHealth;
    });
  };

  const submitBattleResult = async (result) => {
    try {
      const response = await fetch(`YOUR_API_URL/arenas/${arenaId}/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: result,
          playerTeam: 'Team Blue', // Get from user profile
          points: result === 'victory' ? 10 : 0,
          battleDuration: battleTime,
        }),
      });
    } catch (error) {
      console.error('Error submitting battle result:', error);
    }
  };

  const storeCooldownData = async () => {
    try {
        const cooldownSeconds = BATTLE_COOLDOWN_MINUTES * 60;
        const cooldownEndTime = Date.now() + (cooldownSeconds * 1000);
        const cooldownKey = `arena_cooldown_${arenaId}`;
        
        // Store locally with consistent key
        await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        cooldownEndTime,
        arenaId
        }));
        
        // Also store on server
        await fetch(`YOUR_API_URL/arenas/${arenaId}/cooldown`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: 'USER_ID',
            cooldownEndTime,
        }),
        });
    } catch (error) {
        console.error('Error storing cooldown:', error);
    }
    };

  const playerAttack = () => {
    if (battleResult) return;

    const damage = Math.floor(Math.random() * 20) + 10; // 10-30 damage
    const newEnemyHealth = Math.max(0, enemyHealth - damage);
    setEnemyHealth(newEnemyHealth);

    if (newEnemyHealth <= 0) {
      setBattleResult('victory');
      submitBattleResult('victory');
      startCooldown(); // Start cooldown after victory
      Alert.alert('Victory!', `You defeated the enemy and earned 10 points for your team! You must wait ${BATTLE_COOLDOWN_MINUTES} minutes before battling here again.`);
      return;
    }
  };

  const exitBattle = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.locationTitle}>
        Battle at {title || 'Arena'}
      </Text>

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

      {/* Battle Field - Hide if on cooldown from start */}
      {battleResult !== 'cooldown' && (
        <View style={styles.battleField}>
          {/* ...existing battle field code... */}
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
            <Text style={styles.enemyName}>{currentEnemy?.name || 'Enemy'}</Text>
            <Image source={{ uri: currentEnemy?.image }} style={styles.enemyImage} />
            <View style={styles.healthBar}>
              <View style={[styles.healthFill, { width: `${enemyHealth}%`, backgroundColor: '#F44336' }]} />
            </View>
            <Text style={styles.healthText}>HP: {enemyHealth}/100</Text>
            <Text style={styles.strengthText}>Strength: {currentEnemy?.strength || 0}</Text>
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
    marginBottom: 20,
    color: 'white'
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