import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

const databaseUrl = 'http://unrevetted-larue-undeleterious.ngrok-free.app';

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
  strength?: number;
  wins?: number;
  losses?: number;
};

type Sparkle = {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
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
  
  // Animation state
  const [buttonScale] = useState(new Animated.Value(1));
  const [buttonRotation] = useState(new Animated.Value(0));
  
  // Sparkle and button effects state
  const [tapCount, setTapCount] = useState(0);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [sparkleIdCounter, setSparkleIdCounter] = useState(0);
  
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

  // Reset tap count when battle starts/ends
  useEffect(() => {
    if (!battleStarted || battleResult) {
      setTapCount(0);
      setSparkles([]);
    }
  }, [battleStarted, battleResult]);

  // Get button color based on tap count
  const getButtonColor = () => {
    const colors = [
      '#FF5722', // Default orange
      '#FF7043', // Light orange
      '#FF8A65', // Lighter orange
      '#FFB74D', // Yellow-orange
      '#FDD835', // Yellow
      '#CDDC39', // Yellow-green
      '#8BC34A', // Light green
      '#4CAF50', // Green
      '#26A69A', // Teal
      '#29B6F6', // Light blue
      '#42A5F5', // Blue
      '#5C6BC0', // Indigo
      '#7E57C2', // Deep purple
      '#AB47BC', // Purple
      '#EC407A', // Pink
      '#EF5350', // Red
    ];
    
    const colorIndex = Math.min(tapCount, colors.length - 1);
    return colors[colorIndex];
  };

  // Create sparkles
  const createSparkles = (count: number, color: string) => {
    console.log('Creating', count, 'sparkles with color:', color);
    
    const newSparkles: Sparkle[] = [];
    
    for (let i = 0; i < count; i++) {
      // Create variations of the base color for more vibrant effect
      const sparkleColor = getSparkleVariation(color);
      
      const sparkle: Sparkle = {
        id: sparkleIdCounter + i,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(0.5), // Start smaller for pop effect
        color: sparkleColor,
      };
      
      newSparkles.push(sparkle);
      
      // More dramatic animation with gravity and spread
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 1.2; // More spread
      const distance = 50 + Math.random() * 80; // Longer travel distance
      const targetX = Math.cos(angle) * distance + (Math.random() - 0.5) * 30; // Add randomness
      const targetY = Math.sin(angle) * distance + Math.random() * 20 - 40; // Slight upward bias
      
      // Gravity effect - sparkles fall down after initial burst
      const finalY = targetY + 30 + Math.random() * 50;
      
      // Start animations immediately
      Animated.parallel([
        // Initial burst movement
        Animated.sequence([
          Animated.timing(sparkle.x, {
            toValue: targetX,
            duration: 400 + Math.random() * 200,
            useNativeDriver: true,
          }),
          // Slight drift after initial movement
          Animated.timing(sparkle.x, {
            toValue: targetX + (Math.random() - 0.5) * 20,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Y movement with gravity
        Animated.sequence([
          Animated.timing(sparkle.y, {
            toValue: targetY,
            duration: 300 + Math.random() * 200,
            useNativeDriver: true,
          }),
          // Fall down with gravity
          Animated.timing(sparkle.y, {
            toValue: finalY,
            duration: 500 + Math.random() * 300,
            useNativeDriver: true,
          }),
        ]),
        // Scale: dramatic pop then shrink
        Animated.sequence([
          Animated.spring(sparkle.scale, {
            toValue: 1.8 + Math.random() * 0.4, // Bigger initial pop
            tension: 200,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle.scale, {
            toValue: 0,
            duration: 600 + Math.random() * 400,
            useNativeDriver: true,
          }),
        ]),
        // Dramatic fade with flicker
        Animated.sequence([
          Animated.delay(100),
          // Quick flicker effect
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 0.7,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0.8,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
          // Final fade out
          Animated.timing(sparkle.opacity, {
            toValue: 0,
            duration: 500 + Math.random() * 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    
    setSparkleIdCounter(prev => prev + count);
    
    // Add sparkles to state immediately
    setSparkles(prev => {
      console.log('Previous sparkles:', prev.length, 'Adding:', newSparkles.length);
      return [...prev, ...newSparkles];
    });
    
    // Clean up old sparkles after animation
    setTimeout(() => {
      setSparkles(prev => {
        const filtered = prev.filter(s => !newSparkles.some(ns => ns.id === s.id));
        console.log('Cleaning up sparkles, remaining:', filtered.length);
        return filtered;
      });
    }, 1500);
  };
  
  const getSparkleVariation = (baseColor: string) => {
    const variations = {
      '#FF5722': ['#FF6B3D', '#FF8A50', '#FFB74D', '#FF5722', '#FF3D00'], // Orange variations
      '#FF7043': ['#FF8A65', '#FFAB91', '#FFD54F', '#FF9800', '#FF6D00'], // Light orange
      '#FF8A65': ['#FFAB91', '#FFCC80', '#FFE082', '#FFC107', '#FF8F00'], // Lighter orange
      '#FFB74D': ['#FFD54F', '#FFECB3', '#FFF176', '#FFEB3B', '#FFC107'], // Yellow-orange
      '#FDD835': ['#FFEB3B', '#FFF176', '#F9FFA4', '#CCFF90', '#AFD135'], // Yellow
      '#CDDC39': ['#D4E157', '#DCE775', '#E6EE9C', '#8BC34A', '#689F38'], // Yellow-green
      '#8BC34A': ['#9CCC65', '#AED581', '#C8E6C9', '#4CAF50', '#388E3C'], // Light green
      '#4CAF50': ['#66BB6A', '#81C784', '#A5D6A7', '#00E676', '#00C853'], // Green
      '#26A69A': ['#4DB6AC', '#80CBC4', '#B2DFDB', '#1DE9B6', '#00BFA5'], // Teal
      '#29B6F6': ['#4FC3F7', '#81D4FA', '#B3E5FC', '#00E5FF', '#00B0FF'], // Light blue
      '#42A5F5': ['#64B5F6', '#90CAF9', '#BBDEFB', '#2196F3', '#1976D2'], // Blue
      '#5C6BC0': ['#7986CB', '#9FA8DA', '#C5CAE9', '#3F51B5', '#303F9F'], // Indigo
      '#7E57C2': ['#9575CD', '#B39DDB', '#D1C4E9', '#673AB7', '#512DA8'], // Deep purple
      '#AB47BC': ['#BA68C8', '#CE93D8', '#E1BEE7', '#9C27B0', '#7B1FA2'], // Purple
      '#EC407A': ['#F06292', '#F48FB1', '#F8BBD9', '#E91E63', '#C2185B'], // Pink
      '#EF5350': ['#F44336', '#EF5350', '#E57373', '#FFCDD2', '#D32F2F'], // Red
    };
    
    const colorVariations = variations[baseColor] || [baseColor];
    const randomVariation = colorVariations[Math.floor(Math.random() * colorVariations.length)];
    
    // Add neon glow effect by making colors more saturated
    return addNeonGlow(randomVariation);
  };

  const addNeonGlow = (color: string) => {
    // Convert hex to more vibrant/neon version
    const neonColors = {
      '#FF6B3D': '#FF4500', '#FF8A50': '#FF6347', '#FFB74D': '#FFA500',
      '#FF8A65': '#FF7F50', '#FFAB91': '#FFA07A', '#FFD54F': '#FFD700',
      '#FFCC80': '#FFCC00', '#FFE082': '#FFFF00', '#FFC107': '#FFD700',
      '#FFEB3B': '#FFFF32', '#FFF176': '#FFFF66', '#F9FFA4': '#FFFACD',
      '#CCFF90': '#ADFF2F', '#AFD135': '#9ACD32', '#D4E157': '#CDDC39',
      '#DCE775': '#E6FF00', '#E6EE9C': '#F0FFF0', '#8BC34A': '#7CFC00',
      '#689F38': '#6B8E23', '#9CCC65': '#9ACD32', '#AED581': '#98FB98',
      '#C8E6C9': '#90EE90', '#4CAF50': '#32CD32', '#388E3C': '#228B22',
      '#66BB6A': '#00FF7F', '#81C784': '#98FB98', '#A5D6A7': '#AFEEEE',
      '#00E676': '#00FF7F', '#00C853': '#00FF00', '#4DB6AC': '#40E0D0',
      '#80CBC4': '#48D1CC', '#B2DFDB': '#AFEEEE', '#1DE9B6': '#00FFFF',
      '#00BFA5': '#00CED1', '#4FC3F7': '#00BFFF', '#81D4FA': '#87CEEB',
      '#B3E5FC': '#B0E0E6', '#00E5FF': '#00BFFF', '#00B0FF': '#0080FF',
      '#64B5F6': '#4169E1', '#90CAF9': '#87CEFA', '#BBDEFB': '#ADD8E6',
      '#2196F3': '#0080FF', '#1976D2': '#4169E1', '#7986CB': '#6A5ACD',
      '#9FA8DA': '#9370DB', '#C5CAE9': '#DDA0DD', '#3F51B5': '#483D8B',
      '#303F9F': '#4B0082', '#9575CD': '#9370DB', '#B39DDB': '#DA70D6',
      '#D1C4E9': '#DDA0DD', '#673AB7': '#8A2BE2', '#512DA8': '#4B0082',
      '#BA68C8': '#DA70D6', '#CE93D8': '#DDA0DD', '#E1BEE7': '#EE82EE',
      '#9C27B0': '#8B008B', '#7B1FA2': '#800080', '#F06292': '#FF1493',
      '#F48FB1': '#FFB6C1', '#F8BBD9': '#FFC0CB', '#E91E63': '#DC143C',
      '#C2185B': '#B22222', '#F44336': '#FF0000', '#EF5350': '#FF6347',
      '#E57373': '#FA8072', '#FFCDD2': '#FFB6C1', '#D32F2F': '#8B0000',
    };
    
    return neonColors[color] || color;
  };

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
        console.log('User profile loaded:', {
          username: profileData.username,
          strength: profileData.strength || 10
        });
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
          console.log('Strongest owner profile loaded:', {
            username: profileData.username,
            strength: profileData.strength || 10
          });
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
    setTapCount(0);
    setSparkles([]);
  };

  const calculateDamage = (attackerStrength: number, defenderStrength: number): number => {
    // Ensure strength values are within valid range (1-100)
    const validAttackerStrength = Math.max(1, Math.min(100, attackerStrength));
    const validDefenderStrength = Math.max(1, Math.min(100, defenderStrength));
    
    // Calculate strength differential (-99 to +99)
    const strengthDiff = validAttackerStrength - validDefenderStrength;
    
    // Normalize to 0-1 range where:
    // - Attacker 100 vs Defender 1 = 0.99 (near max damage)
    // - Attacker 1 vs Defender 100 = 0.01 (near min damage)
    // - Equal strength = 0.5 (medium damage)
    const normalizedStrength = (strengthDiff + 99) / 198;
    
    // Add randomness (0.3 to 1.0 multiplier)
    const randomFactor = 0.3 + Math.random() * 0.7;
    
    // Calculate final damage (0-4)
    const baseDamage = normalizedStrength * randomFactor * 4;
    
    // Round and ensure it's within 0-4 range
    return Math.max(0, Math.min(4, Math.round(baseDamage)));
  };

  // Attack button animation with sparkles
  const playAttackAnimation = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Increment tap count
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    
    // Get current button color - but use the NEW tap count for color calculation
    const colors = [
      '#FF5722', // Default orange
      '#FF7043', // Light orange
      '#FF8A65', // Lighter orange
      '#FFB74D', // Yellow-orange
      '#FDD835', // Yellow
      '#CDDC39', // Yellow-green
      '#8BC34A', // Light green
      '#4CAF50', // Green
      '#26A69A', // Teal
      '#29B6F6', // Light blue
      '#42A5F5', // Blue
      '#5C6BC0', // Indigo
      '#7E57C2', // Deep purple
      '#AB47BC', // Purple
      '#EC407A', // Pink
      '#EF5350', // Red
    ];
    
    const colorIndex = Math.min(newTapCount - 1, colors.length - 1);
    const currentColor = colors[colorIndex];
    
    console.log('Creating sparkles with color:', currentColor, 'tap count:', newTapCount);
    
    // Create sparkles based on tap count (more taps = more sparkles)
    const sparkleCount = Math.min(3 + Math.floor(newTapCount / 2), 12);
    createSparkles(sparkleCount, currentColor);
    
    // Scale and rotation animation
    Animated.sequence([
      // Scale down and rotate slightly
      Animated.parallel([
        Animated.timing(buttonScale, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonRotation, {
          toValue: -0.1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Scale up and rotate back with bounce
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1.1,
          tension: 150,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(buttonRotation, {
          toValue: 0.1,
          tension: 150,
          friction: 3,
          useNativeDriver: true,
        }),
      ]),
      // Return to normal
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(buttonRotation, {
          toValue: 0,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const playerAttack = () => {
    if (battleResult || !battleStarted) return;

    // Play attack animation and haptic feedback
    playAttackAnimation();

    const userStrength = userProfile?.strength || 10;
    const enemyStrength = strongestOwnerProfile?.strength || 10;
    
    const damage = calculateDamage(userStrength, enemyStrength);
    console.log(`Player attack: User strength ${userStrength} vs Enemy strength ${enemyStrength} = ${damage} damage`);
    
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

    const enemyStrength = strongestOwnerProfile?.strength || 10;
    const userStrength = userProfile?.strength || 10;
    
    const enemyDamage = calculateDamage(enemyStrength, userStrength);
    console.log(`Enemy attack: Enemy strength ${enemyStrength} vs User strength ${userStrength} = ${enemyDamage} damage`);
    
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

  // ... rest of existing functions remain the same ...

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

      console.log('Submitting battle result:', {
        id: id,
        score: battleScore,
        userToken: userToken ? 'present' : 'missing'
      });

      const response = await fetch(`${databaseUrl}/api/interactions/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: parseInt(id as string), // Convert to number
          score: battleScore,
        }),
      });

      console.log('Battle API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Battle API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const battleResponse = await response.json();
      console.log('Battle response data:', battleResponse);
      
      // Refresh location data after battle completion
      console.log('Refreshing location data after battle...');
      await fetchLocationData();
      
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
      
      // More specific error handling
      if (error.message.includes('401')) {
        Alert.alert('Authentication Error', 'Your session has expired. Please log in again.');
      } else if (error.message.includes('400')) {
        Alert.alert('Invalid Request', 'Battle request was invalid. Please try again.');
      } else if (error.message.includes('404')) {
        Alert.alert('Location Not Found', 'This location no longer exists.');
      } else if (error.message.includes('429')) {
        Alert.alert('Too Many Requests', 'Please wait before battling again.');
      } else {
        Alert.alert('Battle Error', `Failed to submit battle result: ${error.message}`);
      }
    }
  };

  const becomeOwner = async (locationName: string) => {
    if (!userToken || !id) return;

    try {
      console.log('Becoming owner of location:', id);
      
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

      // console.log('Become owner response status:', response.status);
      // console.log('Res', response.json());
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Become owner error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Become owner result:', result);
      
      // Refresh location data after becoming owner
      console.log('Refreshing location data after becoming owner...');
      await fetchLocationData();
      
      Alert.alert('Success!', 'You are now an owner of this location!');
    } catch (error) {
      console.error('Error becoming owner:', error);
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

  // Calculate animated transform for attack button
  const animatedButtonStyle = {
    transform: [
      { scale: buttonScale },
      { 
        rotate: buttonRotation.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-5.73deg', '5.73deg'] // -0.1 to 0.1 radians converted to degrees
        })
      }
    ]
  };

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
            </View>

            <Text style={styles.vsText}>VS</Text>

            <View style={styles.enemySide}>
              <Text style={styles.enemyName}>{enemyInfo.name}</Text>
              <Image source={{ uri: enemyInfo.image }} style={styles.enemyImage} />
              <View style={styles.healthBar}>
                <View style={[styles.healthFill, { width: `${enemyHealth}%`, backgroundColor: '#F44336' }]} />
              </View>
              <Text style={styles.healthText}>HP: {enemyHealth}/100</Text>
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
            <Text style={styles.resultSubtext}>
              Total Attacks: {tapCount}
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
          <View style={styles.attackButtonContainer}>
            {/* Debug info */}
            {__DEV__ && (
              <Text style={{ color: 'white', position: 'absolute', top: -30 }}>
                Sparkles: {sparkles.length}, Taps: {tapCount}
              </Text>
            )}
            
            {/* Sparkles with different shapes */}
            {sparkles.map((sparkle, index) => {
              const sparkleShape = index % 4; // 4 different shapes
              return (
                <Animated.View
                  key={sparkle.id}
                  style={[
                    styles.sparkle,
                    sparkleShape === 0 && styles.sparkleCircle,
                    sparkleShape === 1 && styles.sparkleSquare,
                    sparkleShape === 2 && styles.sparkleDiamond,
                    sparkleShape === 3 && styles.sparkleStar,
                    {
                      backgroundColor: sparkle.color,
                      shadowColor: sparkle.color,
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 8,
                      transform: [
                        { translateX: sparkle.x },
                        { translateY: sparkle.y },
                        { scale: sparkle.scale },
                        { rotate: `${index * 45}deg` }, // Different rotation for each sparkle
                      ],
                      opacity: sparkle.opacity,
                    },
                  ]}
                />
              );
            })}
            
            {/* Attack Button */}
            <Animated.View style={animatedButtonStyle}>
              <TouchableOpacity 
                style={[
                  styles.attackButton,
                  { 
                    backgroundColor: getButtonColor(),
                    shadowColor: getButtonColor(),
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }
                ]} 
                onPress={playerAttack}
                activeOpacity={0.8}
              >
                <Text style={styles.attackButtonText}>Attack!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
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
    paddingTop: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
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
    minHeight: 160,
    paddingVertical: 24,
  },
  combatArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    minHeight: 180,
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
    padding: 12,
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