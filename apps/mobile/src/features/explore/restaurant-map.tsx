import type { ExploreRestaurant } from '@datapal/core';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import type { Position } from '@/lib/location';
import { radius } from '@/lib/theme';

export interface RestaurantMapProps {
  restaurants: ExploreRestaurant[];
  position: Position | null;
  onOpen: (id: string) => void;
}

/** Shown only once the maps integration is configured in superadmin. */
export function RestaurantMap({ restaurants, position, onOpen }: RestaurantMapProps) {
  const first = restaurants[0];
  const center = position ?? (first ? { lat: first.lat, lng: first.lng } : { lat: 20.5937, lng: 78.9629 });
  return (
    <MapView style={styles.map} showsUserLocation={position !== null} initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
      {restaurants.map((r) => (
        <Marker key={r.id} coordinate={{ latitude: r.lat, longitude: r.lng }} title={r.name} description={r.address} onCalloutPress={() => onOpen(r.id)} />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { height: 420, borderRadius: radius.card } });
