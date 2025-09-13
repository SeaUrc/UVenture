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

// --- MODIFICATION: Define constants for map camera settings ---
const BATTLE_RADIUS = 35;
const MAP_ALTITUDE = 450; // Set a much higher initial elevation (in meters)
const MAP_PITCH = 45; // Set the camera pitch

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
  // const isAnimatingRef = useRef(false);

  // Get stored auth data and check if user is logged in
  useEffect(() => {
    const getAuthData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const id = await AsyncStorage.getItem('userId');
        const storedUsername = await AsyncStorage.getItem('username');
        
        if (!token || !id) {
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
        { text: 'Cancel', style: 'cancel' },
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
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${databaseUrl}/api/locations/get_locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLocations(data.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to load locations from server');
    }
  };

  useEffect(() => {
    if (!userToken || isAuthLoading) return;
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000); // Refresh locations every 30 seconds
    return () => clearInterval(interval);
  }, [userToken, isAuthLoading]);

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

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
  
    if (isFollowingUser) {
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
          // Animate camera without needing the isAnimatingRef
          mapRef.current?.animateCamera({
            center: {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            },
            pitch: MAP_PITCH,
            altitude: MAP_ALTITUDE,
          }, { duration: 1000 });
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

  const handleManualPan = () => {
    // If user is dragging and we are currently following, turn it off.
    if (isFollowingUser) {
      setIsFollowingUser(false);
    }
  };

  // const handleRegionChange = () => {
  //   if (isFollowingUser && !isAnimatingRef.current) {
  //     setIsFollowingUser(false);
  //   }
  // };
  
  const toggleFollowUser = () => {
    // This function enables tracking if it's currently off
    if (!isFollowingUser && location) {
      setIsFollowingUser(true);
      
      mapRef.current?.animateCamera({
        center: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        pitch: MAP_PITCH,
        altitude: MAP_ALTITUDE, 
      }, { duration: 1000 });
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
          { text: 'Cancel', style: 'cancel' },
          { text: 'Battle', style: 'default', onPress: () => handleBattleStart(locationData) },
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
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setIsLoading(false);
    })();
  }, [isAuthLoading]);


  if (isLoading || isAuthLoading) {
    return <ThemedView style={styles.container}><ThemedText>Loading...</ThemedText></ThemedView>;
  }

  if (errorMsg) {
    return <ThemedView style={styles.container}><ThemedText>{errorMsg}</ThemedText></ThemedView>;
  }
  
  if (!location) {
    return <ThemedView style={styles.container}><ThemedText>Getting location...</ThemedText></ThemedView>;
  }


  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialCamera={{
            center: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            pitch: MAP_PITCH,
            heading: 0,
            altitude: MAP_ALTITUDE,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          // --- MODIFICATION: Use the specific onPanDrag event handler ---
          onPanDrag={handleManualPan}
        >
          {/* Markers and other map elements */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
            >
              <View style={styles.userLocationMarker}>
                <Image 
                  source={require('@/assets/images/icon.png')} 
                  style={styles.markerImage}
                />
              </View>
            </Marker>
          )}

{locations.map(locationData => {
            const withinRadius = isWithinBattleRadius(locationData);
            
            return (
              <React.Fragment key={locationData.id}>
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

// Styles remain the same
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
    bottom: 35,
    left: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
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
});