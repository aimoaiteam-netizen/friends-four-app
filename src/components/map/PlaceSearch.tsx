"use client";

import { useState, useRef, useEffect } from "react";

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typeof kakao === "undefined" || !kakao.maps) return;

      kakao.maps.load(() => {
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(query, (data, status) => {
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
      });
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  function handleSelect(r: SearchResult) {
    onSelect(r);
    setQuery(r.name);
    setShowDropdown(false);
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder="장소 이름 검색 (예: 강남 맛집)"
        className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
        autoFocus
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
