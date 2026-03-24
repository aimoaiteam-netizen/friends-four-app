"use client";

import { useState, useEffect, useCallback } from "react";
import { MEMBER_EMOJIS } from "@/lib/constants";

interface Place {
  id: number;
  name: string;
  category: string | null;
  address: string | null;
  review: string | null;
  rating: number | null;
  visitedAt: string | null;
  addedBy: { name: string };
}

const PLACE_CATEGORIES = ["식당", "카페", "술집", "여행지", "기타"];

export default function MapTab({ currentUser }: { currentUser: string }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "식당", address: "", review: "", rating: "4", visitedAt: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlaces = useCallback(async () => {
    try {
      const res = await fetch("/api/places");
      setPlaces(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  async function handleCreate() {
    if (!form.name.trim()) return;
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
          visitedAt: form.visitedAt || null,
        }),
      });
      if (res.ok) {
        const p = await res.json();
        setPlaces((prev) => [p, ...prev]);
        setForm({ name: "", category: "식당", address: "", review: "", rating: "4", visitedAt: "" });
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const stars = (rating: number) => "⭐".repeat(rating) + "☆".repeat(5 - rating);

  const CATEGORY_EMOJI: Record<string, string> = {
    식당: "🍽️", 카페: "☕", 술집: "🍺", 여행지: "🗺️", 기타: "📍"
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
        >
          📍 &nbsp;장소 추가하기
        </button>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="장소 이름"
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            autoFocus
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
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="주소 (선택)"
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none"
          />
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
          <input
            type="date"
            value={form.visitedAt}
            onChange={(e) => setForm({ ...form, visitedAt: e.target.value })}
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm">취소</button>
            <button
              onClick={handleCreate}
              disabled={submitting || !form.name.trim()}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      ) : places.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">🗺️</p>
          <p>아직 방문한 장소가 없어요.</p>
          <p className="text-sm mt-1">대항해시대처럼 지도를 채워나가요!</p>
        </div>
      ) : (
        places.map((place) => (
          <div key={place.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_EMOJI[place.category ?? "기타"] ?? "📍"}</span>
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
              <p className="text-gray-300 text-sm mt-2 ml-7 italic">"{place.review}"</p>
            )}
            <p className="text-gray-600 text-xs mt-2 ml-7">
              {MEMBER_EMOJIS[place.addedBy.name]} {place.addedBy.name}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
