"use client";

import { useEffect, useRef } from "react";

interface PlaceMarker {
  id: number;
  name: string;
  category: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  totalUps: number;
  totalDowns: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  식당: "🍽️", 카페: "☕", 술집: "🍺", 여행지: "🗺️", 기타: "📍"
};

export default function MapView({ places }: { places: PlaceMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || typeof kakao === "undefined") return;

    kakao.maps.load(() => {
      const center = new kakao.maps.LatLng(37.5665, 126.978);
      const map = new kakao.maps.Map(containerRef.current!, { center, level: 12 });
      mapRef.current = map;

      updateMarkers(map, places);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    updateMarkers(mapRef.current, places);
  }, [places]);

  function updateMarkers(map: kakao.maps.Map, places: PlaceMarker[]) {
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (places.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();
    let openInfoWindow: kakao.maps.InfoWindow | null = null;

    places.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.latitude, p.longitude);
      bounds.extend(pos);

      const marker = new kakao.maps.Marker({ map, position: pos, title: p.name });
      markersRef.current.push(marker);

      const emoji = CATEGORY_EMOJI[p.category ?? "기타"] ?? "📍";
      const stars = p.rating ? "⭐".repeat(p.rating) : "";
      const votes = `👍${p.totalUps} 👎${p.totalDowns}`;
      const content = `<div style="padding:8px 12px;font-size:13px;line-height:1.5;min-width:140px;color:#111">
        <b>${emoji} ${p.name}</b><br/>
        ${stars ? stars + "<br/>" : ""}
        <span style="color:#666;font-size:11px">${votes}</span>
      </div>`;

      const infoWindow = new kakao.maps.InfoWindow({ content });

      kakao.maps.event.addListener(marker, "click", () => {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        openInfoWindow = infoWindow;
      });
    });

    map.setBounds(bounds);
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-gray-700"
      style={{ height: "calc(100vh - 280px)", minHeight: "300px" }}
    />
  );
}
