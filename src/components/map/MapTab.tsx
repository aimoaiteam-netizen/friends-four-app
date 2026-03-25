"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { consume } from "@/lib/prefetch";
import { MEMBER_EMOJIS, PLACE_CATEGORY_EMOJI } from "@/lib/constants";
import PlaceSearch from "./PlaceSearch";
import MapView from "./MapView";

interface Place {
  id: number;
  name: string;
  category: string | null;
  address: string | null;
  review: string | null;
  rating: number | null;
  visitedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  addedBy: { name: string };
  totalUps: number;
  totalDowns: number;
  myUps: number;
  myDowns: number;
}

const PLACE_CATEGORIES = ["식당", "카페", "술집", "여행지", "기타"];
type SortBy = "newest" | "date" | "popularity";
type ViewMode = "map" | "list";

const today = () => new Date().toISOString().slice(0, 10);

export default function MapTab({ currentUser }: { currentUser: string }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "식당", address: "", review: "", rating: "4", visitedAt: today(),
    latitude: null as number | null, longitude: null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // Vote debounce
  const pendingVotes = useRef<Record<number, { ups: number; downs: number }>>({});
  const timers = useRef<Record<number, NodeJS.Timeout>>({});

  const fetchPlaces = useCallback(async () => {
    try {
      const res = await fetch("/api/places");
      setPlaces(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = consume("places");
    if (cached) { setPlaces(cached); setLoading(false); return; }
    fetchPlaces();
  }, [fetchPlaces]);

  const sortedPlaces = useMemo(() => {
    const sorted = [...places];
    switch (sortBy) {
      case "date":
        return sorted.sort((a, b) => (b.visitedAt ?? "").localeCompare(a.visitedAt ?? ""));
      case "popularity":
        return sorted.sort((a, b) => (b.totalUps - b.totalDowns) - (a.totalUps - a.totalDowns));
      default:
        return sorted;
    }
  }, [places, sortBy]);

  const placesWithCoords = useMemo(
    () => sortedPlaces.filter((p) => p.latitude != null && p.longitude != null) as (Place & { latitude: number; longitude: number })[],
    [sortedPlaces]
  );

  async function handleCreate() {
    if (!form.name.trim() || !form.visitedAt) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          address: form.address || null,
          review: form.review || null,
          rating: parseInt(form.rating),
          visitedAt: form.visitedAt,
          latitude: form.latitude,
          longitude: form.longitude,
        }),
      });
      if (res.ok) {
        const p = await res.json();
        setPlaces((prev) => [p, ...prev]);
        setForm({ name: "", category: "식당", address: "", review: "", rating: "4", visitedAt: today(), latitude: null, longitude: null });
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function flushVotes(placeId: number) {
    const pending = pendingVotes.current[placeId];
    if (!pending) return;
    delete pendingVotes.current[placeId];
    if (pending.ups > 0) {
      await fetch(`/api/places/${placeId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "up", count: pending.ups }),
      });
    }
    if (pending.downs > 0) {
      await fetch(`/api/places/${placeId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "down", count: pending.downs }),
      });
    }
  }

  function handleVote(placeId: number, type: "up" | "down") {
    const place = places.find((p) => p.id === placeId);
    if (!place) return;
    const pending = pendingVotes.current[placeId] ?? { ups: 0, downs: 0 };
    const myTotal = place.myUps + place.myDowns + pending.ups + pending.downs;
    if (myTotal >= 100) return;

    setPlaces((prev) => prev.map((p) => {
      if (p.id !== placeId) return p;
      return {
        ...p,
        totalUps: p.totalUps + (type === "up" ? 1 : 0),
        totalDowns: p.totalDowns + (type === "down" ? 1 : 0),
        myUps: p.myUps + (type === "up" ? 1 : 0),
        myDowns: p.myDowns + (type === "down" ? 1 : 0),
      };
    }));

    if (!pendingVotes.current[placeId]) pendingVotes.current[placeId] = { ups: 0, downs: 0 };
    pendingVotes.current[placeId][type === "up" ? "ups" : "downs"]++;
    clearTimeout(timers.current[placeId]);
    timers.current[placeId] = setTimeout(() => flushVotes(placeId), 300);
  }

  const stars = (rating: number) => "⭐".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <div className="space-y-3">
      {/* 장소 추가 버튼/폼 */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
        >
          📍 &nbsp;장소 추가하기
        </button>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
          <PlaceSearch
            onSelect={(r) => {
              setForm({ ...form, name: r.name, address: r.address, latitude: r.lat, longitude: r.lng });
            }}
          />
          <div className="flex gap-2 flex-wrap">
            {PLACE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, category: c })}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                  form.category === c ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-gray-700 text-gray-400"
                }`}
              >
                {PLACE_CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
          {form.address && (
            <p className="text-xs text-gray-400 px-1">📍 {form.address}</p>
          )}
          <textarea
            value={form.review}
            onChange={(e) => setForm({ ...form, review: e.target.value })}
            placeholder="한줄평 (선택)"
            rows={2}
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none resize-none"
          />
          <div className="flex gap-2 items-center">
            <span className="text-gray-400 text-sm">별점:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setForm({ ...form, rating: String(n) })}
                className={`text-xl transition-transform active:scale-110 ${parseInt(form.rating) >= n ? "opacity-100" : "opacity-30"}`}
              >
                ⭐
              </button>
            ))}
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">방문일</label>
            <input
              type="date"
              value={form.visitedAt}
              onChange={(e) => setForm({ ...form, visitedAt: e.target.value })}
              required
              className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm">취소</button>
            <button
              onClick={handleCreate}
              disabled={submitting || !form.name.trim() || !form.visitedAt}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 뷰 토글 + 정렬 */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-800 rounded-xl p-0.5 border border-gray-700">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-400"}`}
          >
            목록
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "map" ? "bg-purple-600 text-white" : "text-gray-400"}`}
          >
            지도
          </button>
        </div>
        <div className="flex gap-1 ml-auto">
          {([["newest", "최신순"], ["date", "방문일순"], ["popularity", "인기순"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${sortBy === key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      ) : places.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">🗺️</p>
          <p>아직 방문한 장소가 없어요.</p>
          <p className="text-sm mt-1">대항해시대처럼 지도를 채워나가요!</p>
        </div>
      ) : viewMode === "map" ? (
        <div>
          {placesWithCoords.length > 0 ? (
            <MapView places={placesWithCoords} />
          ) : (
            <div className="text-center text-gray-500 py-12 bg-gray-800 rounded-2xl border border-gray-700">
              <p className="text-3xl mb-2">🗺️</p>
              <p className="text-sm">위치가 등록된 장소가 없어요.</p>
              <p className="text-xs mt-1 text-gray-600">장소 추가 시 검색하면 위치가 자동 등록돼요.</p>
            </div>
          )}
          {sortedPlaces.length > placesWithCoords.length && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              위치 미등록 장소 {sortedPlaces.length - placesWithCoords.length}개는 목록에서 확인하세요.
            </p>
          )}
        </div>
      ) : (
        sortedPlaces.map((place) => {
          const total = place.totalUps + place.totalDowns;
          const upPercent = total > 0 ? Math.round((place.totalUps / total) * 100) : 50;

          return (
            <div key={place.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLACE_CATEGORY_EMOJI[place.category ?? "기타"] ?? "📍"}</span>
                    <h3 className="text-white font-semibold">{place.name}</h3>
                  </div>
                  {place.address && (
                    <p className="text-gray-500 text-xs mt-0.5 ml-7">{place.address}</p>
                  )}
                </div>
                <div className="text-right">
                  {place.rating && <p className="text-sm">{stars(place.rating)}</p>}
                  {place.visitedAt && <p className="text-gray-500 text-xs mt-0.5">{place.visitedAt}</p>}
                </div>
              </div>
              {place.review && (
                <p className="text-gray-300 text-sm mt-2 ml-7 italic">&ldquo;{place.review}&rdquo;</p>
              )}
              <p className="text-gray-600 text-xs mt-2 ml-7">
                {MEMBER_EMOJIS[place.addedBy.name]} {place.addedBy.name}
              </p>

              {/* 투표 */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(place.id, "up")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-all active:scale-125 select-none bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  >
                    👍 {place.totalUps}
                  </button>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-150"
                      style={{ width: `${total > 0 ? upPercent : 50}%` }}
                    />
                  </div>
                  <button
                    onClick={() => handleVote(place.id, "down")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-all active:scale-125 select-none bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    👎 {place.totalDowns}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
