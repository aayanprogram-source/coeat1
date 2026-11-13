import * as Location from 'expo-location';

export interface Position {
  lat: number;
  lng: number;
}

export async function locationGranted(): Promise<boolean> {
  return (await Location.getForegroundPermissionsAsync()).granted;
}

export async function requestLocation(): Promise<boolean> {
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/** The current position, or null when permission is missing or the position cannot be read. */
export async function currentPosition(): Promise<Position | null> {
  if (!(await locationGranted())) return null;
  try {
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch {
    return null;
  }
}
