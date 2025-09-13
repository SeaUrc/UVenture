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
  can_join: boolean;
};

type ProfileData = {
  username: string;
  team: number;
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
const getEnemyAvatar = (teamId: string | number) => {
  const avatarMap: { [key: string]: string } = {
    '1': '../assets/images/cmulogos/scs.png',    // Team 1
    '2': '../assets/images/cmulogos/cit.png',    // Team 2  
    '3': '../assets/images/cmulogos/dietrich.png',    // Team 3
    '4': '../assets/images/cmulogos/cfa.png',    // Team 4
    '5': '../assets/images/cmulogos/mcs.jpg',    // Team 5
    '6': '../assets/images/cmulogos/tepper.jpg',    // Team 6  
    '7': '../assets/images/cmulogos/bxa.jpeg',    // Team 7
    '8': '../assets/images/cmulogos/is.png',    // Team 8
  };
  return avatarMap[String(teamId)] || '../assets/images/icon.png';
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
  
  // Join arena state
  const [canJoinArena, setCanJoinArena] = useState(false);
  const [hasJoinedArena, setHasJoinedArena] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const [buttonPadding, setButtonPadding] = useState({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
});


  const [buttonPosition] = useState({
  x: new Animated.Value(0),
  y: new Animated.Value(0)
});
const [isButtonMoving, setIsButtonMoving] = useState(false);

// Add this function to start button movement when battle begins
const startButtonMovement = () => {
  setIsButtonMoving(true);
  animateButtonMovement();
};


// Add this function to handle the slow button movement
const animateButtonMovement = () => {
  if (!battleStarted || battleResult) {
    setIsButtonMoving(false);
    return;
  }

  // Generate random padding values to move the button around
  const maxPadding = 80; // Maximum pixels to move in any direction
  const randomTop = Math.floor(Math.random() * maxPadding);
  const randomRight = Math.floor(Math.random() * maxPadding);
  const randomBottom = Math.floor(Math.random() * maxPadding);
  const randomLeft = Math.floor(Math.random() * maxPadding);

  setButtonPadding({
    top: randomTop,
    right: randomRight,
    bottom: randomBottom,
    left: randomLeft
  });

  // Continue moving if battle is still active
  if (battleStarted && !battleResult) {
    setTimeout(() => animateButtonMovement(), 1000 + Math.random() * 2000); // Random pause 1-3 seconds
  }
};

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

  // Check if user can join arena when location data or user profile changes
  useEffect(() => {
    if (locationData && userProfile) {
      // User can join if:
      // 1. Their team owns the location
      // 2. They're not already the strongest owner  
      // 3. The location allows joining (can_join is true)
      const sameTeam = locationData.owner_team === userProfile.team;
      const notStrongestOwner = locationData.strongest_owner_id !== userId;
      const canJoinLocation = locationData.can_join;
      
      setCanJoinArena(sameTeam && notStrongestOwner && canJoinLocation);
      setHasJoinedArena(!notStrongestOwner); // If they are the strongest owner, they've "joined"
    } else {
      setCanJoinArena(false);
      setHasJoinedArena(false);
    }
  }, [locationData, userProfile, userId]);

  // Reset tap count when battle starts/ends
  useEffect(() => {
    if (!battleStarted || battleResult) {
      setTapCount(0);
      setSparkles([]);
    }
  }, [battleStarted, battleResult]);

  // Handle joining the arena
  const handleJoinArena = async () => {
    if (!userToken || !id || isJoining) return;
    
    setIsJoining(true);
    
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

      if (response.ok) {
        // Success - refresh location data to show updated owner count
        await fetchLocationData();
        setHasJoinedArena(true);
        Alert.alert('Success!', 'You have joined the arena as a defender!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to join arena');
      }
    } catch (error) {
      console.error('Error joining arena:', error);
      Alert.alert('Error', 'Failed to join arena. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Get button color based on tap coun

  // Create sparkles
  const createSparkles = (count: number, baseColor: string) => {
  console.log('Creating', count, 'sparkles with color wave from:', baseColor);
  
  const newSparkles: Sparkle[] = [];
  
  // Realistic soldering spark colors - orange/red spectrum
  const getRealisticSparkColor = () => {
    const sparkColors = [
      '#FF4500', // Orange red
      '#FF6347', // Tomato
      '#FF7F50', // Coral
      '#FF8C00', // Dark orange
      '#FFA500', // Orange
      '#FFB347', // Peach
      '#FF6B35', // Red orange
      '#FF4500', // Orange red
      '#FF2D00', // Red orange
      '#FF1A00', // Bright red
      '#FF0000', // Pure red
      '#FF3300', // Bright red
    ];
    
    return sparkColors[Math.floor(Math.random() * sparkColors.length)];
  };
  
  // Create many more sparks
  const sparkCount = Math.min(5 + Math.floor(tapCount * 2), 15);
  
  for (let i = 0; i < sparkCount; i++) {
    const sparkleColor = getRealisticSparkColor();
    
    const sparkle: Sparkle = {
      id: sparkleIdCounter + i,
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0.1),
      color: sparkleColor,
    };
    
    newSparkles.push(sparkle);
    
    // Create water spray pattern with more horizontal momentum
    const angle = (Math.PI * 2 * Math.random());
    const angleVariation = (Math.random() - 0.5) * 0.6; // Increased variation
    const finalAngle = angle + angleVariation;
    
    // Increased horizontal distance, still more vertical
    const baseDistance = 40 + Math.random() * 100; // 40-140px from center
    const targetX = Math.cos(finalAngle) * baseDistance * 0.6; // Increased horizontal (was 0.3)
    const targetY = Math.sin(finalAngle) * baseDistance * 1.2; // Slightly less vertical (was 1.5)
    
    // Water spray fall
    const gravityY = targetY + 50 + Math.random() * 80;
    
    Animated.parallel([
      // X movement - increased horizontal momentum
      Animated.sequence([
        // More horizontal drift
        Animated.timing(sparkle.x, {
          toValue: targetX * 0.7, // Increased from 0.5
          duration: 80, // Faster initial movement
          useNativeDriver: true,
        }),
        // Continue with more horizontal momentum
        Animated.timing(sparkle.x, {
          toValue: targetX,
          duration: 120, // Faster
          useNativeDriver: true,
        }),
        // Final drift with more horizontal spread
        Animated.timing(sparkle.x, {
          toValue: targetX + (Math.random() - 0.5) * 20, // Increased from 10
          duration: 350, // Faster
          useNativeDriver: true,
        }),
      ]),
      // Y movement - water spray pattern
      Animated.sequence([
        // Initial upward burst (like water spray)
        Animated.timing(sparkle.y, {
          toValue: targetY * 0.4,
          duration: 80,
          useNativeDriver: true,
        }),
        // Peak height
        Animated.timing(sparkle.y, {
          toValue: targetY * 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        // Gravity fall
        Animated.timing(sparkle.y, {
          toValue: gravityY,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Scale animation - smaller sparks with aura effect
      Animated.sequence([
        Animated.spring(sparkle.scale, {
          toValue: 0.6 + Math.random() * 0.3,
          tension: 400,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle.scale, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Opacity - bright flash with aura effect
      Animated.sequence([
        // Initial bright flash
        Animated.timing(sparkle.opacity, {
          toValue: 1,
          duration: 30,
          useNativeDriver: true,
        }),
        // Flicker effect with aura
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 0.4,
              duration: 20,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 25,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0.6,
              duration: 15,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0.9,
              duration: 20,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
        // Final fade
        Animated.timing(sparkle.opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }
  
  setSparkleIdCounter(prev => prev + sparkCount);
  setSparkles(prev => [...prev, ...newSparkles]);
  
  setTimeout(() => {
    setSparkles(prev => 
      prev.filter(s => !newSparkles.some(ns => ns.id === s.id))
    );
  }, 1000);
};

// Update button color progression
const getButtonColor = () => {
  const colors = [
    // Yellow phase (taps 0-9)
    '#FFFF00', '#FFFA00', '#FFF500', '#FFF000', '#FFEB00',
    '#FFE600', '#FFE100', '#FFDC00', '#FFD700', '#FFD200',
    // Orange phase (taps 10-19)
    '#FFCD00', '#FFC800', '#FFC300', '#FFBE00', '#FFB900',
    '#FFB400', '#FFAF00', '#FFAA00', '#FFA500', '#FFA000',
    // Red phase (taps 20+)
    '#FF9B00', '#FF9600', '#FF9100', '#FF8C00', '#FF8700',
    '#FF8200', '#FF7D00', '#FF7800', '#FF7300', '#FF6E00',
    '#FF6900', '#FF6400', '#FF5F00', '#FF5A00', '#FF5500',
    '#FF5000', '#FF4B00', '#FF4600', '#FF4100', '#FF3C00',
    '#FF3700', '#FF3200', '#FF2D00', '#FF2800', '#FF2300',
    '#FF1E00', '#FF1900', '#FF1400', '#FF0F00', '#FF0A00', '#FF0000'
  ];
  
  const colorIndex = Math.min(tapCount, colors.length - 1);
  return colors[colorIndex];
};

const addNeonIntensity = (color: string) => {
  // Convert colors to super bright neon versions
  const neonIntensity = {
    '#FF4500': '#FF3300', // Bright red-orange
    '#FF6600': '#FF4400', // Electric orange
    '#FF8800': '#FF6600', // Neon orange
    '#FFAA00': '#FF8800', // Bright yellow-orange
    '#FFCC00': '#FFAA00', // Electric yellow
    '#FFDD00': '#FFCC00', // Neon yellow
    '#FFEE00': '#FFDD00', // Bright yellow
    '#FFFF00': '#FFFF00', // Pure yellow
    '#FFFF66': '#FFFF33', // Light neon yellow
    '#FFFF99': '#FFFF66', // Pale neon yellow
    '#FFFFCC': '#FFFF99', // White-yellow
    '#FFFFFF': '#FFFFFF', // Pure white
    '#00FFFF': '#00DDFF', // Electric cyan
    '#0099FF': '#0077FF', // Neon blue
    '#6600FF': '#4400FF', // Electric purple
    '#FF00FF': '#DD00FF', // Neon magenta
    '#FF0080': '#FF0066', // Electric pink
    '#FF0040': '#FF0033', // Neon red-pink
    '#FF0000': '#FF0000', // Pure red
  };
  
  return neonIntensity[color] || color;
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
    
    // Start button movement after a brief delay
    setTimeout(() => {
        startButtonMovement();
    }, 100);
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
  
  // Tap count multiplier - scales damage based on how many taps player has made
  // More taps = higher damage multiplier (1.0 to 3.0x)
  const tapMultiplier = Math.min(1 + (tapCount * 0.1), 3.0); // 10% increase per tap, max 3x
  
  // Add randomness (0.3 to 1.0 multiplier)
  const randomFactor = 0.3 + Math.random() * 0.7;
  
  // Calculate final damage (0-12 with tap scaling)
  const baseDamage = normalizedStrength * randomFactor * 4 * tapMultiplier;
  
  // Round and ensure it's within reasonable range (0-12)
  return Math.max(0, Math.min(12, Math.round(baseDamage)));
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
    const tapMultiplier = Math.min(1 + (tapCount * 0.1), 3.0);
    
    console.log(`Player attack: User strength ${userStrength} vs Enemy strength ${enemyStrength} = ${damage} damage (${tapCount} taps, ${tapMultiplier.toFixed(1)}x multiplier)`);
    
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
            router.back();
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
    // Reset to root and prevent iOS swipe back by going to a fresh tab navigation
    if (router.canGoBack()) {
      router.dismissAll();
    }
    // Use setTimeout to ensure dismissAll completes before navigation
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 50);
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
        : getEnemyAvatar(strongestOwnerProfile.team), 
      team: strongestOwnerProfile.team,
    };
  }
  
  return {
    name: locationData?.owner_team_name || 'Enemy Team',
    image: getEnemyAvatar(locationData?.owner_team || '1'), 
    team: locationData?.owner_team_name || 'Unknown Team',
  };
};

  const userInfo = getUserDisplayInfo();
  const enemyInfo = getEnemyDisplayInfo();

  // Calculate animated transform for attack button
  const animatedButtonStyle = {
  transform: [
    { translateX: buttonPosition.x },
    { translateY: buttonPosition.y },
    { scale: buttonScale },
    { 
      rotate: buttonRotation.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-5.73deg', '5.73deg']
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
          </View>
        )}
      </View>

      {/* Battle Controls */}
      <View style={styles.controls}>
        {/* Join Arena Button - Show when user can join */}
        {canJoinArena && !hasJoinedArena && !battleStarted && (
          <TouchableOpacity 
            style={[styles.joinButton, isJoining && styles.joinButtonDisabled]} 
            onPress={handleJoinArena}
            disabled={isJoining}
          >
            <Text style={styles.joinButtonText}>
              {isJoining ? 'Joining...' : 'Join Arena'}
            </Text>
          </TouchableOpacity>
        )}
        
        {battleResult || !battleStarted ? (
          <TouchableOpacity style={styles.exitButton} onPress={exitBattle}>
            <Text style={styles.exitButtonText}>Exit Arena</Text>
          </TouchableOpacity>
        ) : (
          <View style={[
  styles.attackButtonContainer,
  {
    paddingTop: buttonPadding.top,
    paddingRight: buttonPadding.right,
    paddingBottom: buttonPadding.bottom,
    paddingLeft: buttonPadding.left,
  }
]}>
        
    
            {/* Sparkles with realistic soldering effects and aura */}
            {sparkles.map((sparkle, index) => {
              const sparkType = index % 5;
              const randomRotation = Math.random() * 360;
              
              return (
                <Animated.View
                  key={sparkle.id}
                  style={[
                    sparkType === 0 ? styles.sparkDot : 
                    sparkType === 1 ? styles.sparkLine : 
                    sparkType === 2 ? styles.sparkSlash : 
                    sparkType === 3 ? styles.sparkBackslash : 
                    styles.sparkCross,
                    {
                      backgroundColor: sparkle.color,
                      shadowColor: sparkle.color,
                      shadowOpacity: 1, // Full opacity for aura effect
                      shadowRadius: 20, // Large aura radius
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 30, // High elevation for Android
                      borderWidth: 0.5,
                      borderColor: sparkle.color,
                      transform: [
                        { translateX: sparkle.x },
                        { translateY: sparkle.y },
                        { scale: sparkle.scale },
                        { rotate: `${randomRotation}deg` },
                      ],
                      opacity: sparkle.opacity,
                    },
                  ]}
                >
                  {/* Inner glow effect for aura */}
                  <Animated.View
                    style={[
                      styles.sparkAura,
                      {
                        backgroundColor: sparkle.color,
                        opacity: sparkle.opacity.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.3],
                        }),
                        transform: [{ scale: sparkle.scale }],
                      },
                    ]}
                  />
                </Animated.View>
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
                    transform: [
                        { scale: buttonScale._value || 1 },
                        { 
                            rotate: `${(buttonRotation._value || 0) * 5.73}deg`
                        }
                    ]
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
    minHeight: 150,
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
  width: 120, // Make it circular
  height: 120, // Same width and height
  borderRadius: 60, // Half of width/height for perfect circle
  shadowColor: '#FF5722',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 12,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: 'rgba(255, 255, 255, 0.3)',
},
attackButtonText: {
  color: '#FFFFFF',
  fontSize: 18, // Slightly smaller to fit in circle
  fontWeight: 'bold',
  textAlign: 'center',
  letterSpacing: 1,
},
attackButtonContainer: {
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  width: 300, // Larger area for movement
  height: 300, // Larger area for movement
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
  joinButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
  },
  joinButtonDisabled: {
    backgroundColor: '#666',
    shadowColor: '#666',
    opacity: 0.7,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
sparkle: {
  position: 'absolute',
  width: 8,
  height: 8,
  zIndex: 1000,
  borderRadius: 4,
},
sparkleCircle: {
  borderRadius: 50,
},
sparkleSquare: {
  borderRadius: 2,
},
sparkleDiamond: {
  borderRadius: 0,
  transform: [{ rotate: '45deg' }],
},
sparkleStar: {
  borderRadius: 0,
  width: 6,
  height: 6,
},
fireSparkle: {
  position: 'absolute',
  width: 12,
  height: 12,
  zIndex: 1000,
  borderRadius: 0, // Sharp edges like fire sparks
  // Create sharp diamond/star shape
},
innerGlow: {
  position: 'absolute',
  width: 6,
  height: 6,
  top: 3,
  left: 3,
  borderRadius: 0,
},
sparkLine: {
  position: 'absolute',
  width: 16,
  height: 3,
  zIndex: 1000,
  borderRadius: 1,
},
sparkSlash: {
  position: 'absolute',
  width: 16,
  height: 3,
  zIndex: 1000,
  borderRadius: 1,
},
sparkBackslash: {
  position: 'absolute',
  width: 16,
  height: 3,
  zIndex: 1000,
  borderRadius: 1,
},
sparkCross: {
  position: 'absolute',
  width: 12,
  height: 3,
  zIndex: 1000,
  borderRadius: 1,
},
innerGlowLine: {
  position: 'absolute',
  width: 12,
  height: 2,
  top: 0.5,
  left: 2,
  borderRadius: 1,
},
innerGlowSlash: {
  position: 'absolute',
  width: 12,
  height: 2,
  top: 0.5,
  left: 2,
  borderRadius: 1,
},
innerGlowBackslash: {
  position: 'absolute',
  width: 12,
  height: 2,
  top: 0.5,
  left: 2,
  borderRadius: 1,
},
innerGlowCross: {
  position: 'absolute',
  width: 8,
  height: 2,
  top: 0.5,
  left: 2,
  borderRadius: 1,
},
// Soldering-style spark shapes
sparkDot: {
  position: 'absolute',
  width: 2,
  height: 2,
  zIndex: 1000,
  borderRadius: 1,
},
sparkLine: {
  position: 'absolute',
  width: 6,
  height: 1,
  zIndex: 1000,
  borderRadius: 0.5,
},
sparkSlash: {
  position: 'absolute',
  width: 5,
  height: 1,
  zIndex: 1000,
  borderRadius: 0.5,
},
sparkBackslash: {
  position: 'absolute',
  width: 5,
  height: 1,
  zIndex: 1000,
  borderRadius: 0.5,
},
sparkCross: {
  position: 'absolute',
  width: 4,
  height: 1,
  zIndex: 1000,
  borderRadius: 0.5,
},
sparkStar: {
  position: 'absolute',
  width: 6,
  height: 6,
  zIndex: 1000,
  borderRadius: 0,
},
// Aura effect for sparks
sparkAura: {
  position: 'absolute',
  width: 8,
  height: 8,
  borderRadius: 4,
  top: -3,
  left: -3,
  zIndex: 999,
},
});