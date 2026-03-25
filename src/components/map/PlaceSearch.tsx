"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface PlaceSearchProps {
  onSelect: (result: SearchResult) => void;
}

export default function PlaceSearch({ onSelect }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [selected, setSelected] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const psRef = useRef<kakao.maps.services.Places | null>(null);

  // SDK 초기화 — 한 번만
  useEffect(() => {
    if (typeof kakao === "undefined" || !kakao.maps) {
      // SDK 스크립트가 아직 로드 안 됐을 수 있으므로 폴링
      const check = setInterval(() => {
        if (typeof kakao !== "undefined" && kakao.maps) {
          clearInterval(check);
          kakao.maps.load(() => {
            psRef.current = new kakao.maps.services.Places();
            setSdkReady(true);
          });
        }
      }, 200);
      return () => clearInterval(check);
    }
    kakao.maps.load(() => {
      psRef.current = new kakao.maps.services.Places();
      setSdkReady(true);
    });
  }, []);

  const search = useCallback((keyword: string) => {
    if (!psRef.current) return;
    psRef.current.keywordSearch(keyword, (data, status) => {
      if (status === "OK") {
        setResults(
          data.slice(0, 5).map((d) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
          }))
        );
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    });
  }, []);

  useEffect(() => {
    if (selected) return;
    if (!query.trim() || query.length < 2 || !sdkReady) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, sdkReady, search, selected]);

  function handleSelect(r: SearchResult) {
    setSelected(true);
    onSelect(r);
    setQuery(r.name);
    setShowDropdown(false);
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(false); }}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={sdkReady ? "장소 이름 검색 (예: 강남 맛집)" : "지도 로딩 중..."}
        disabled={!sdkReady}
        className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
            >
              <p className="text-sm text-white font-medium">{r.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.address}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
