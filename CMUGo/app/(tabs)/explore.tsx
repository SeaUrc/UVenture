import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type CustomMarker = {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
};

export default function TabTwoScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Example markers (can be fetched from API or state)
  const [markers, setMarkers] = useState<CustomMarker[]>([
    {
      id: 1,
      latitude: 40.4433,
      longitude: -79.9436,
      title: 'PokéStop 1',
      description: 'Catch a Pokémon here!',
    },
    {
      id: 2,
      latitude: 40.4440,
      longitude: -79.9420,
      title: 'PokéStop 2',
      description: 'Another spot!',
    },
  ]);

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

  const handleMarkerPress = (marker: CustomMarker) => {
    Alert.alert(marker.title, marker.description);
  };

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
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You are here"
            description="Your current location"
          />
          {markers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.title}
              description={marker.description}
              onPress={() => handleMarkerPress(marker)}
            />
          ))}
        </MapView>
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
    marginTop:  20,
      },
});