"use client";

import { useState, useEffect, useCallback } from "react";
import { consume } from "@/lib/prefetch";
import GoalCard from "./GoalCard";
import { GOAL_CATEGORIES } from "@/lib/constants";

interface Goal {
  id: number;
  title: string;
  type: string;
  progress: number;
  target: number;
  unit: string | null;
  category: string | null;
  deadline: string | null;
  owner: { name: string } | null;
}

export default function GoalsTab({ currentUser }: { currentUser: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "personal", target: "100", unit: "", category: "기타", deadline: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "personal" | "shared">("all");

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      setGoals(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = consume("goals");
    if (cached) { setGoals(cached); setLoading(false); return; }
    fetchGoals();
  }, [fetchGoals]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          target: parseFloat(form.target) || 100,
          unit: form.unit || null,
          category: form.category,
          deadline: form.deadline || null,
        }),
      });
      if (res.ok) {
        setForm({ title: "", type: "personal", target: "100", unit: "", category: "기타", deadline: "" });
        setShowForm(false);
        await fetchGoals();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: number, progress: number) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    }
  }

  const filtered = goals.filter((g) => {
    if (filter === "personal") return g.type === "personal";
    if (filter === "shared") return g.type === "shared";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 필터 탭 */}
      <div className="flex gap-2">
        {(["all", "shared", "personal"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {f === "all" ? "전체" : f === "shared" ? "🤝 공동" : "👤 개인"}
          </button>
        ))}
      </div>

      {/* 목표 추가 폼 */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
        >
          🎯 &nbsp;새 목표 추가하기
        </button>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="목표 이름 (예: 5kg 감량)"
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setForm({ ...form, type: "personal" })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.type === "personal" ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-gray-700 text-gray-400"
              }`}
            >
              👤 개인
            </button>
            <button
              onClick={() => setForm({ ...form, type: "shared" })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.type === "shared" ? "border-yellow-500 bg-yellow-500/20 text-yellow-300" : "border-gray-700 text-gray-400"
              }`}
            >
              🤝 공동
            </button>
          </div>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {GOAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="목표값"
              className="flex-1 bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="단위 (kg, 회...)"
              className="flex-1 bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">
              🗓️ 마감 기한 (선택) — 등록 후 D-day 카운트다운 표시
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !form.title.trim()}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">🎯</p>
          <p>아직 목표가 없어요.</p>
        </div>
      ) : (
        filtered.map((g) => (
          <GoalCard key={g.id} goal={g} onUpdate={handleUpdate} />
        ))
      )}
    </div>
  );
}
