'use client';

import { useEffect, useRef } from 'react';

export interface MapPinProps {
  apiKey: string;
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  label: string;
}

let loading: Promise<void> | undefined;

function loadMaps(apiKey: string): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(script);
  });
  return loading;
}

/** A draggable pin. Dragging the pin, or clicking the map, moves the restaurant's location. */
export function MapPin({ apiKey, lat, lng, onChange, label }: MapPinProps) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const latest = useRef({ lat, lng, onChange });

  useEffect(() => {
    latest.current = { lat, lng, onChange };
    if (!marker.current || !map.current || !lat) return;
    const next = new google.maps.LatLng(lat, lng);
    marker.current.setPosition(next);
    map.current.panTo(next);
  }, [lat, lng, onChange]);

  useEffect(() => {
    let cancelled = false;
    void loadMaps(apiKey).then(async () => {
      if (cancelled || !container.current) return;
      const { Map, Marker } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary & { Marker: typeof google.maps.Marker };
      const start = { lat: latest.current.lat || 20.5937, lng: latest.current.lng || 78.9629 };
      map.current = new Map(container.current, { center: start, zoom: latest.current.lat ? 16 : 5, streetViewControl: false, mapTypeControl: false });
      marker.current = new Marker({ position: start, map: map.current, draggable: true });
      marker.current.addListener('dragend', () => {
        const p = marker.current?.getPosition();
        if (p) latest.current.onChange(p.lat(), p.lng());
      });
      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.current?.setPosition(e.latLng);
        latest.current.onChange(e.latLng.lat(), e.latLng.lng());
      });
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return <div ref={container} role="application" aria-label={label} className="h-64 w-full rounded-card border border-line" />;
}
