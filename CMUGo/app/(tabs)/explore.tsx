import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Platform, Alert, Image, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '@/constants/theme';

type CustomMarker = {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  occupant: string;
  image?: any; // For custom marker image
};

const initMarkers: CustomMarker[] = [
  {
    id: 1,
    latitude: 40.4433,
    longitude: -79.9436,
    title: 'Purnell Gym',
    description: 'Catch a Pokémon here!',
    occupant: 'MCS',
    image: require('@/assets/images/icon.png'), // Using your app icon
  },
  {
    id: 2,
    latitude: 40.4440,
    longitude: -79.9420,
    title: 'ABP',
    description: 'Another spot!',
    occupant: 'SCS',
    image: require('@/assets/images/react-logo.png'), // Using React logo
  },
];

// Battle radius in meters
const BATTLE_RADIUS = 50; // 50 eters
const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

export default function TabTwoScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const router = useRouter();

  // Example markers (can be fetched from API or state)
  const [markers, setMarkers] = useState<CustomMarker[]>(initMarkers);
  
  // New state for map following
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const mapRef = useRef<MapView>(null);
  const isAnimatingRef = useRef(false); // Track if we're programmatically animating


  useEffect(() => {
    console.log('Test markers');
    fetch(databaseUrl)
      .then(response => response.json())
      .then(data => {
        console.log('data', data);
      })
      .catch(error => {
        console.error('Error fetching markers:', error);
      });
  }, []);

  const handleMarkerPress = (marker: CustomMarker) => {
    router.push({
      pathname: '/battle',
      params: {
        id: marker.id.toString(),
        latitude: marker.latitude.toString(),
        longitude: marker.longitude.toString(),
        title: marker.title,
        description: marker.description,
      },
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        setLocation(currentLocation);
        setErrorMsg(null);
      } catch (error) {
        setErrorMsg('Error getting location: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

<<<<<<< HEAD
=======
  // Watch user location when following
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    if (isFollowingUser && location) {
      // Start watching location changes
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (newLocation) => {
          setLocation(newLocation);
          // Set animation flag for programmatic movement
          isAnimatingRef.current = true;
          
          // Animate to new location
          mapRef.current?.animateToRegion({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          }, 1000);
          
          // Reset animation flag after animation completes
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

  // Handle map region change (when user manually moves map)
  const handleRegionChange = () => {
    // Only set to false if it's not a programmatic animation
    if (isFollowingUser && !isAnimatingRef.current) {
      setIsFollowingUser(false);
    }
  };

  // Toggle follow user mode
  const toggleFollowUser = () => {
    if (!isFollowingUser && location) {
      // Set following state immediately
      setIsFollowingUser(true);
      
      // Set animation flag
      isAnimatingRef.current = true;
      
      // Recenter map on user
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      }, 1000);
      
      // Reset animation flag after animation completes
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 1100); // Slightly longer than animation duration
    } else {
      setIsFollowingUser(!isFollowingUser);
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Check if user is within battle radius of a marker
  const isWithinBattleRadius = (marker: CustomMarker): boolean => {
    if (!location) return false;
    
    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      marker.latitude,
      marker.longitude
    );
    
    return distance <= BATTLE_RADIUS;
  };

  const handleMarkerPress = (marker: CustomMarker) => {
    const withinRadius = isWithinBattleRadius(marker);
    
    if (withinRadius) {
      // User is within range - show battle option
      Alert.alert(
        marker.title,
        `${marker.description}\nOccupant: ${marker.occupant}\n\n✅ You are within battle range!`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Battle',
            style: 'default',
            onPress: () => handleBattle(marker),
          },
        ],
        { cancelable: true }
      );
    } else {
      // User is not within range
      const distance = calculateDistance(
        location!.coords.latitude,
        location!.coords.longitude,
        marker.latitude,
        marker.longitude
      );
      
      Alert.alert(
        marker.title,
        `${marker.description}\nOccupant: ${marker.occupant}\n\n❌ You are ${Math.round(distance)}m away. Get within ${BATTLE_RADIUS}m to battle!`,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  };

  const handleBattle = (marker: CustomMarker) => {
    // Dummy battle function
    Alert.alert(
      'Battle Started!',
      `You are now battling at ${marker.title}!\n\nOpponent: ${marker.occupant}\n\nThis is a dummy battle function.`,
      [
        {
          text: 'OK',
          onPress: () => {
            // You can add more battle logic here
            console.log(`Battle completed at ${marker.title}`);
          },
        },
      ]
    );
  };

>>>>>>> 64703673a557ab6de77d32d71ea8fcfc943b5087
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
        <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
          Explore
        </ThemedText>
        <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
      </ThemedView>
    );
  }

  if (!location) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
          Explore
        </ThemedText>
        <ThemedText style={styles.errorText}>Unable to get your location</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
        Explore
      </ThemedText>
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
          showsMyLocationButton={false} // Hide default button since we have custom one
          onRegionChangeComplete={handleRegionChange}
        >
          {/* User location marker with custom image */}
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

          {/* Custom markers with images and battle radius circles */}
          {markers.map(marker => {
            const withinRadius = isWithinBattleRadius(marker);
            
            return (
              <React.Fragment key={marker.id}>
                {/* Battle radius circle - only show when user is within range */}
                {withinRadius && (
                  <Circle
                    center={{
                      latitude: marker.latitude,
                      longitude: marker.longitude,
                    }}
                    radius={BATTLE_RADIUS}
                    strokeColor="#00FF00"
                    fillColor="rgba(0, 255, 0, 0.1)"
                    strokeWidth={2}
                  />
                )}
                
                {/* Marker */}
                <Marker
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                  }}
                  title={marker.title + ' | ' + marker.occupant}
                  onPress={() => handleMarkerPress(marker)}
                >
                  <View style={[
                    styles.customMarker,
                    withinRadius && styles.markerInRange
                  ]}>
                    <Image 
                      source={marker.image} 
                      style={styles.markerImage}
                      resizeMode="cover"
                    />
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
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
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
    borderColor: '#00FF00', // Green border when in range
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
  
  // New styles for follow button
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
});