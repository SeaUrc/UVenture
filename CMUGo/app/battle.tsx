import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

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
  team: string;
  image: string;
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
const BATTLE_COOLDOWN_MINUTES = 5;

export default function BattleScreen() {
  const { id, latitude, longitude, title, description, ownerTeam, ownerColor } = useLocalSearchParams();
  const router = useRouter();

  // Battle data
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [strongestOwnerProfile, setStrongestOwnerProfile] = useState<ProfileData | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [enemyTeamName, setEnemyTeamName] = useState<string | null>(null);
  
  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Battle eligibility state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [isUserStrongestOwner, setIsUserStrongestOwner] = useState(false);
  const [canBattle, setCanBattle] = useState(true);
  const [userJoinedTeam, setUserJoinedTeam] = useState(false);

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
      checkExistingCooldown();
      checkUserOwnership();
    }
  }, [id, userToken, userId]);

  // Check if user joined the team (same team as location owner but can still join)
  useEffect(() => {
    if (locationData && userProfile) {
      const sameTeam = userProfile.team === locationData.owner_team.toString();
      const notStrongestOwner = locationData.strongest_owner_id !== userId;
      const canJoinLocation = locationData.can_join;
      
      // User is considered to have "joined the team" if they're on the same team 
      // as the owner but can still join (meaning they joined recently)
      setUserJoinedTeam(sameTeam && notStrongestOwner && canJoinLocation);
    } else {
      setUserJoinedTeam(false);
    }
  }, [locationData, userProfile, userId]);

  // Check if user is an owner of this location
  const checkUserOwnership = async () => {
    if (!userToken || !userId || !id) return;

    try {
      const response = await fetch(`${databaseUrl}/api/interactions/check_ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          location_id: parseInt(id as string),
        }),
      });

      if (response.ok) {
        const ownershipData = await response.json();
        setIsUserOwner(ownershipData.is_owner || false);
        
        if (ownershipData.is_owner) {
          setCanBattle(false);
        }
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsUserOwner(false);
    }
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
        setUserProfile(profileData);
        
        // Fetch team name if user has a team
        if (profileData.team) {
          await fetchTeamName(profileData.team);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch team name by team ID
  const fetchTeamName = async (teamId: string | number) => {
    try {
      const response = await fetch(`${databaseUrl}/api/teams/get_team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(teamId.toString()),
        }),
      });

      if (response.ok) {
        const teamData = await response.json();
        setUserTeamName(teamData.name);
      }
    } catch (error) {
      console.error('Error fetching team name:', error);
      setUserTeamName(null);
    }
  };

  // Fetch enemy team name by team ID
  const fetchEnemyTeamName = async (teamId: string | number) => {
    try {
      const response = await fetch(`${databaseUrl}/api/teams/get_team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(teamId.toString()),
        }),
      });

      if (response.ok) {
        const teamData = await response.json();
        setEnemyTeamName(teamData.name);
      }
    } catch (error) {
      console.error('Error fetching enemy team name:', error);
      setEnemyTeamName(null);
    }
  };

  // Fetch location data from database
  const fetchLocationData = async () => {
    try {
      console.log('Fetching location data for ID:', id);
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      
      const data = await response.json();
      const location = data.data.find((loc: LocationData) => loc.id === parseInt(id as string));
      
      if (location) {
        setLocationData(location);
        
        // Check if user is the strongest owner
        if (userId && location.strongest_owner_id === userId) {
          setIsUserStrongestOwner(true);
          setCanBattle(false);
        }
        
        // Fetch strongest owner profile if it exists and it's not the current user
        if (location.strongest_owner_id && location.strongest_owner_id > 0 && location.strongest_owner_id !== userId) {
          await fetchStrongestOwnerProfile(location.strongest_owner_id);
        } else {
          setStrongestOwnerProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
      Alert.alert('Error', 'Failed to load battle data');
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
          
          // Fetch enemy team name if strongest owner has a team
          if (profileData.team) {
            await fetchEnemyTeamName(profileData.team);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching strongest owner profile:', error);
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
          setCanBattle(false);
        } else {
          await AsyncStorage.removeItem(cooldownKey);
        }
      }
    } catch (error) {
      console.error('Error checking existing cooldown:', error);
    }
  };

  // Cooldown timer effect
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    
    if (cooldownActive && cooldownTimeLeft > 0) {
      cooldownTimer = setInterval(() => {
        setCooldownTimeLeft(prev => {
          if (prev <= 1) {
            setCooldownActive(false);
            setCanBattle(!isUserOwner && !isUserStrongestOwner);
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
  }, [cooldownActive, cooldownTimeLeft, isUserOwner, isUserStrongestOwner]);

  const formatCooldownTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const enterBattleArena = () => {
    if (cooldownActive) {
      Alert.alert('Cooldown Active', `You must wait ${formatCooldownTime(cooldownTimeLeft)} before battling here again.`);
      return;
    }

    if (isUserOwner) {
      Alert.alert('Cannot Battle', 'You cannot battle at a location you already own!');
      return;
    }

    if (isUserStrongestOwner) {
      Alert.alert('Cannot Battle', 'You are the current defending champion of this location!');
      return;
    }

    // Navigate to battle arena with all necessary data
    router.push({
      pathname: '/battle-arena',
      params: {
        id: id,
        title: locationData?.name || title,
        ownerTeam: locationData?.owner_team_name || ownerTeam,
        ownerColor: locationData?.owner_team_color || ownerColor,
        latitude: latitude,
        longitude: longitude,
      },
    });
  };

  const exitScreen = () => {
    router.back();
  };

  // Get display info for both fighters
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.username,
        image: userProfile.image 
          ? `data:image/png;base64,${userProfile.image}` 
          : null,
        team: userTeamName || userProfile.team, // Use team name if available, fall back to team ID
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
        team: enemyTeamName || strongestOwnerProfile.team, // Use enemy team name if available, fall back to team ID
      };
    }

    return {
      name: locationData?.owner_team_name || 'Defending Team',
      image: getEnemyAvatar(locationData?.owner_team_color || '#FF0000'),
      team: locationData?.owner_team_name || 'Unknown Team',
    };
  };

  const userInfo = getUserDisplayInfo();
  const enemyInfo = getEnemyDisplayInfo();

  // Determine battle button state
  const getBattleButtonInfo = () => {
    if (cooldownActive) {
      return { text: `Battle Unavailable - ${formatCooldownTime(cooldownTimeLeft)}`, disabled: true };
    }
    if (isUserOwner) {
      return { text: 'You Own This Location', disabled: true };
    }
    if (isUserStrongestOwner) {
      return { text: 'You Are Defending Champion', disabled: true };
    }
    // Check if user joined the team (can join their own team's location)
    if (userJoinedTeam) {
      return { text: 'Join Your Team First', disabled: true };
    }
    // Check if user is on the same team as the current owner (but can't join)
    if (userProfile && locationData && userProfile.team === locationData.owner_team.toString()) {
      return { text: 'Your Team Controls This Location', disabled: true };
    }
    return { text: 'Enter Battle Arena', disabled: false };
  };

  const battleButtonInfo = getBattleButtonInfo();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Battle Challenge</Text>
        
        {/* Location Info */}
        <View style={styles.locationCard}>
          <Text style={styles.locationName}>{locationData?.name || title}</Text>
          {locationData && (
            <>
              <Text style={styles.locationDetail}>
                Current Owner: {locationData.owner_team_name}
              </Text>
              <Text style={styles.locationDetail}>
                Defending Champion: {
                  isUserStrongestOwner 
                    ? 'You!' 
                    : strongestOwnerProfile?.username || 'No current champion'
                }
              </Text>
              
              {/* Defender count display */}
              <View style={styles.defenderCountContainer}>
                <Text style={styles.defenderCountLabel}>Defenders</Text>
                <Text style={styles.defenderCountValue}>{Math.max(0, (locationData.owner_count || 0) - 1)}</Text>
                <Text style={styles.defenderCountSubtext}>
                  protecting this location
                </Text>
                {userJoinedTeam && (
                  <Text style={styles.joinAvailableText}>
                    ✨ You can join this defense team!
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Battle Preview */}
        <View style={styles.battlePreview}>
          <Text style={styles.battleTitle}>
            {isUserOwner || isUserStrongestOwner ? 'Location Status' : 'Battle Preview'}
          </Text>
          
          <View style={styles.fightCard}>
            {isUserStrongestOwner ? (
              /* Champion Mode - Show only user profile */
              <View style={styles.championDisplay}>
                <View style={styles.fighterSide}>
                  <Image 
                    source={
                      userInfo.image 
                        ? { uri: userInfo.image }
                        : require('../assets/images/icon.png')
                    } 
                    style={styles.fighterImage} 
                  />
                  <Text style={styles.fighterName}>{userInfo.name}</Text>
                  <Text style={styles.fighterTeam}>{userInfo.team}</Text>
                </View>
                <Text style={styles.championText}>👑 Current Champion</Text>
              </View>
            ) : (
              /* Battle Mode - Show both fighters */
              <>
                {/* User Side */}
                <View style={styles.fighterSide}>
                  <Image 
                    source={
                      userInfo.image 
                        ? { uri: userInfo.image }
                        : require('../assets/images/icon.png')
                    } 
                    style={styles.fighterImage} 
                  />
                  <Text style={styles.fighterName}>{userInfo.name}</Text>
                  <Text style={styles.fighterTeam}>{userInfo.team}</Text>
                </View>

                <Text style={styles.vsText}>VS</Text>

                {/* Enemy Side */}
                <View style={styles.fighterSide}>
                  <Image 
                    source={{ uri: enemyInfo.image }} 
                    style={styles.fighterImage} 
                  />
                  <Text style={styles.fighterName}>{enemyInfo.name}</Text>
                  <Text style={styles.fighterTeam}>{enemyInfo.team}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Status Messages */}
        {cooldownActive && cooldownTimeLeft > 0 ? (
          <View style={styles.cooldownContainer}>
            <Text style={styles.cooldownTitle}>Battle Cooldown Active</Text>
            <Text style={styles.cooldownTime}>
              {formatCooldownTime(cooldownTimeLeft)}
            </Text>
            <Text style={styles.cooldownMessage}>
              Time remaining before you can battle here again
            </Text>
          </View>
        ) : isUserOwner && !isUserStrongestOwner ? (
          <View style={styles.ownerContainer}>
            <Text style={styles.ownerTitle}>🏆 You Own This Location</Text>
            <Text style={styles.ownerMessage}>
              You cannot battle at locations you already own. Defend it from other challengers!
            </Text>
          </View>
        ) : isUserStrongestOwner ? (
          <View style={styles.championContainer}>
            <Text style={styles.championTitle}>👑 You Are The Champion</Text>
            <Text style={styles.championMessage}>
              You are the defending champion of this location. Wait for challengers to come to you!
            </Text>
          </View>
        ) : (
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Challenge the defending champion to capture this location!
              {'\n\n'}Tap "Enter Battle Arena" to begin combat.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Battle Controls - Fixed at bottom */}
      <View style={styles.controls}>
        {/* Battle Button */}
        <TouchableOpacity 
          style={[
            styles.battleButton, 
            battleButtonInfo.disabled && styles.battleButtonDisabled
          ]} 
          onPress={enterBattleArena}
          disabled={battleButtonInfo.disabled}
        >
          <Text style={styles.battleButtonText}>
            {battleButtonInfo.text}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={exitScreen}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60, // Safe area padding
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  locationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  locationDetail: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 5,
  },
  battlePreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  battleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  fightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighterSide: {
    alignItems: 'center',
    flex: 1,
  },
  fighterImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 10,
  },
  fighterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  fighterTeam: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 5,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginHorizontal: 20,
  },
  cooldownContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#F44336',
    marginBottom: 30,
  },
  cooldownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  cooldownTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  cooldownMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  ownerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 30,
  },
  ownerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  ownerMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  championContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginBottom: 30,
  },
  championTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  championMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  battleButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    minWidth: 200,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  battleButtonDisabled: {
    backgroundColor: '#666666',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  battleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 120,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  defenderCountContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  defenderCountLabel: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  defenderCountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 2,
  },
  defenderCountSubtext: {
    fontSize: 11,
    color: '#CCC',
    textAlign: 'center',
    opacity: 0.8,
  },
  joinAvailableText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  }, championDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  championText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 15,
  },
});