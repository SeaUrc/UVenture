import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Platform, Alert, Image, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Battle radius in meters
const BATTLE_RADIUS = 50;
const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

export default function TabTwoScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navigation = useNavigation();
  const router = useRouter();

  // Updated state for real location data
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  
  // Map following state
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const mapRef = useRef<MapView>(null);
  const isAnimatingRef = useRef(false);

  // Get stored auth data and check if user is logged in
  useEffect(() => {
    const getAuthData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const id = await AsyncStorage.getItem('userId');
        const storedUsername = await AsyncStorage.getItem('username');
        
        if (!token || !id) {
          // No authentication data, redirect to login
          router.replace('/login');
          return;
        }

        setUserToken(token);
        setUserId(id ? parseInt(id) : null);
        setUsername(storedUsername);
      } catch (error) {
        console.error('Error getting auth data:', error);
        router.replace('/login');
      } finally {
        setIsAuthLoading(false);
      }
    };
    getAuthData();
  }, []);

  // Logout function
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userToken', 'userId', 'username']);
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  // Fetch locations from database
  useEffect(() => {
    if (!userToken || isAuthLoading) return;

    const fetchLocations = async () => {
      try {
        console.log('Fetching locations from database...');
        const response = await fetch(`${databaseUrl}/api/locations/get_locations`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // console.log('Fetched locations:', data.data);
        setLocations(data.data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        Alert.alert('Error', 'Failed to load locations from server');
      }
    };

    fetchLocations();
  }, [userToken, isAuthLoading]);

  // ...existing code... (keep all the other functions unchanged)
  const handleBattleStart = async (locationData: LocationData) => {
    if (!userToken) {
      Alert.alert('Authentication Required', 'Please log in to battle for locations');
      return;
    }

    router.push({
      pathname: '/battle',
      params: {
        id: locationData.id.toString(),
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        title: locationData.name,
        description: `Owned by ${locationData.owner_team_name}`,
        ownerTeam: locationData.owner_team_name,
        ownerColor: locationData.owner_team_color,
      },
    });
  };

  // Battle function that uses the API
  const handleBattle = async (locationData: LocationData, score: number = 100) => {
    if (!userToken) {
      Alert.alert('Error', 'You must be logged in to battle');
      return;
    }

    try {
      const response = await fetch(`${databaseUrl}/api/interactions/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: locationData.id,
          score: score,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.message === 'win') {
        Alert.alert(
          'Victory!', 
          `You have successfully captured ${locationData.name}!`,
          [
            {
              text: 'Become Owner',
              onPress: () => becomeOwner(locationData.id),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Defeat', `You were defeated at ${locationData.name}. Train harder and try again!`);
      }

      // Refresh locations after battle
      setTimeout(() => {
        fetchLocations();
      }, 1000);

    } catch (error) {
      console.error('Battle error:', error);
      Alert.alert('Error', 'Battle failed. Please try again.');
    }
  };

  // Become owner function
  const becomeOwner = async (locationId: number) => {
    if (!userToken) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      const response = await fetch(`${databaseUrl}/api/interactions/become_owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          id: locationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      Alert.alert('Success', 'You are now an owner of this location!');
      
      // Refresh locations
      setTimeout(() => {
        fetchLocations();
      }, 1000);

    } catch (error) {
      console.error('Become owner error:', error);
      Alert.alert('Error', 'Failed to become owner. Please try again.');
    }
  };

  // Refresh locations function
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      const data = await response.json();
      setLocations(data.data || []);
    } catch (error) {
      console.error('Error refreshing locations:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [])

  useEffect(() => {
  let locationSubscription: Location.LocationSubscription | null = null;

  if (isFollowingUser && location) {
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (newLocation) => {
        setLocation(newLocation);
        isAnimatingRef.current = true;
        
        mapRef.current?.animateToRegion({
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }, 1000);
        
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 1100);
      }
    ).then(subscription => {
      locationSubscription = subscription;
    });
  }

  return () => {
    if (locationSubscription) {
      locationSubscription.remove();
    }
  };
}, [isFollowingUser]);

const handleRegionChange = () => {
  if (isFollowingUser && !isAnimatingRef.current) {
    setIsFollowingUser(false);
  }
};

const toggleFollowUser = () => {
  if (!isFollowingUser && location) {
    setIsFollowingUser(true);
    isAnimatingRef.current = true;
    
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    }, 1000);
    
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 1100);
  } else {
    setIsFollowingUser(!isFollowingUser);
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const isWithinBattleRadius = (locationData: LocationData): boolean => {
  if (!location) return false;
  
  const distance = calculateDistance(
    location.coords.latitude,
    location.coords.longitude,
    locationData.latitude,
    locationData.longitude
  );
  
  return distance <= BATTLE_RADIUS;
};

const handleMarkerPress = (locationData: LocationData) => {
  const withinRadius = isWithinBattleRadius(locationData);
  
  if (withinRadius) {
    Alert.alert(
      locationData.name,
      `Owned by: ${locationData.owner_team_name}\nOwners: ${locationData.owner_count}\n\n✅ You are within battle range!`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Battle',
          style: 'default',
          onPress: () => handleBattleStart(locationData),
        },
      ],
      { cancelable: true }
    );
  } else {
    const distance = calculateDistance(
      location!.coords.latitude,
      location!.coords.longitude,
      locationData.latitude,
      locationData.longitude
    );
    
    Alert.alert(
      locationData.name,
      `Owned by: ${locationData.owner_team_name}\nOwners: ${locationData.owner_count}\n\n❌ You are ${Math.round(distance)}m away. Get within ${BATTLE_RADIUS}m to battle!`,
      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  }
};

  useEffect(() => {
    if (isAuthLoading) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setLocation(currentLocation);
        setErrorMsg(null);
      } catch (error) {
        setErrorMsg('Error getting location: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthLoading]);

  // ...existing code... (keep all other functions the same)

  // Don't render anything while checking authentication
  if (isAuthLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
          Loading...
        </ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
          Loading Map...
        </ThemedText>
      </ThemedView>
    );
  }

  if (errorMsg) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
            Explore
          </ThemedText>
          {username && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
      </ThemedView>
    );
  }

  if (!location) {
    return (
      <ThemedView style={styles.container}>
        {/* <View style={styles.header}>
          <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
            Explore
          </ThemedText>
          {username && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </TouchableOpacity>
          )}
        </View> */}
        <ThemedText style={styles.errorText}>Unable to get your location</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* <View style={styles.header}>
        <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
          Explore
        </ThemedText>
        {username && (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        )}
      </View> */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 40.4433,
            longitude: location?.coords.longitude || -79.9436,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onRegionChangeComplete={handleRegionChange}
        >
          {/* User location marker */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
              description="Your current location"
            >
              <View style={styles.userLocationMarker}>
                <Image 
                  source={require('@/assets/images/icon.png')} 
                  style={styles.markerImage}
                  resizeMode="cover"
                />
              </View>
            </Marker>
          )}

          {/* Database locations with team colors and images */}
          {locations.map(locationData => {
            const withinRadius = isWithinBattleRadius(locationData);
            
            return (
              <React.Fragment key={locationData.id}>
                {/* Battle radius circle */}
                {withinRadius && (
                  <Circle
                    center={{
                      latitude: locationData.latitude,
                      longitude: locationData.longitude,
                    }}
                    radius={BATTLE_RADIUS}
                    strokeColor="#00FF00"
                    fillColor="rgba(0, 255, 0, 0.1)"
                    strokeWidth={2}
                  />
                )}
                
                {/* Location marker with team color border */}
                <Marker
                  coordinate={{
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                  }}
                  title={`${locationData.name} | ${locationData.owner_team_name}`}
                  onPress={() => handleMarkerPress(locationData)}
                >
                  <View style={[
                    styles.customMarker,
                    { borderColor: withinRadius ? '#00FF00' : locationData.owner_team_color },
                    withinRadius && styles.markerInRange
                  ]}>
                    {locationData.image ? (
                      <Image 
                        source={{ uri: locationData.image }}
                        style={styles.markerImage}
                        resizeMode="cover"
                        onError={(e) => console.log("❌ Image failed", e.nativeEvent)}
                      />
                    ) : (
                      <Image 
                        source={require('@/assets/images/react-logo.png')}
                        style={styles.markerImage}
                        resizeMode="cover"
                        onLoad={() => console.log("✅ Image loaded successfully")}
                      />
                    )}
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Custom follow user button */}
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowingUser && styles.followButtonActive
          ]}
          onPress={toggleFollowUser}
        >
          <View style={styles.followButtonIcon}>
            <Image 
              source={require('@/assets/images/favicon.png')} 
              style={[
                styles.followButtonImage,
                { tintColor: isFollowingUser ? '#fff' : '#007AFF' }
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>


    </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({

  
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  markerInRange: {
    borderWidth: 4,
  },
  userLocationMarker: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
  followButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  followButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  followButtonIcon: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonImage: {
    width: 20,
    height: 20,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  refreshButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});