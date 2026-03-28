"use client";

import { useState, useEffect, useCallback } from "react";
import { consume } from "@/lib/prefetch";
import GoalCard from "./GoalCard";
import { GOAL_TYPES, GOAL_EMOJIS, MEMBER_EMOJIS } from "@/lib/constants";

interface Goal {
  id: number;
  title: string;
  emoji: string;
  goalType: string;
  status: string;
  ownerId: number | null;
  owner: { name: string } | null;
  startDate: string | null;
  targetDays: number | null;
  bestRecord: number;
  raceStartDate: string | null;
  startValue: number;
  progress: number;
  target: number;
  unit: string | null;
  step: number | null;
  deadline: string | null;
  completedAt: string | null;
  _count: { comments: number };
  createdAt: string;
}

type SubTab = "active" | "record";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function GoalsTab({ currentUser }: { currentUser: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("active");
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    emoji: "🎯",
    isShared: false,
    startDate: todayStr(),
    targetDays: "100",
    startValue: "0",
    target: "100",
    unit: "",
    step: "1",
    deadline: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = useCallback(async (status?: string) => {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await fetch(`/api/goals${query}`);
      if (res.ok) setGoals(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = consume("goals");
    if (cached) {
      setGoals(cached);
      setLoading(false);
      return;
    }
    fetchGoals();
  }, [fetchGoals]);

  // Refetch when switching tabs
  useEffect(() => {
    if (subTab === "active") {
      fetchGoals("active");
    } else {
      fetchGoals("completed,abandoned");
    }
  }, [subTab, fetchGoals]);

  const defaultForm = {
    title: "",
    emoji: "🎯",
    isShared: false,
    startDate: todayStr(),
    targetDays: "100",
    startValue: "0",
    target: "100",
    unit: "",
    step: "1",
    deadline: "",
  };

  function resetForm() {
    setForm(defaultForm);
    setSelectedType(null);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!form.title.trim() || !selectedType) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        emoji: form.emoji,
        goalType: selectedType,
        isShared: form.isShared,
      };

      if (selectedType === "date_count") {
        body.startDate = form.startDate || todayStr();
        body.targetDays = parseInt(form.targetDays) || 100;
      } else if (selectedType === "infinite_race") {
        body.startDate = form.startDate || todayStr();
      } else if (selectedType === "numeric") {
        body.startValue = parseFloat(form.startValue) || 0;
        body.target = parseFloat(form.target) || 100;
        body.unit = form.unit || null;
        body.step = parseFloat(form.step) || 1;
        body.deadline = form.deadline || null;
      }

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        await fetchGoals("active");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }

  // Record tab stats
  const recordGoals = goals.filter((g) => g.status === "completed" || g.status === "abandoned");
  const completedCount = goals.filter((g) => g.status === "completed").length;
  const abandonedCount = goals.filter((g) => g.status === "abandoned").length;
  const bestRaceGoal = goals.reduce<Goal | null>((best, g) => {
    if (g.bestRecord > 0 && (!best || g.bestRecord > best.bestRecord)) return g;
    return best;
  }, null);

  return (
    <div className="space-y-4">
      {/* 서브탭 */}
      <div className="flex bg-gray-800 rounded-xl p-1">
        {([
          { key: "active" as SubTab, label: "진행중" },
          { key: "record" as SubTab, label: "기록" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              subTab === key
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "active" ? (
        <>
          {/* 목표 추가 버튼/폼 */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
            >
              🎯 &nbsp;새 목표 추가하기
            </button>
          ) : (
            <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
              {/* Step 1: Goal type selection */}
              {!selectedType ? (
                <div className="space-y-2">
                  <p className="text-gray-300 text-sm font-medium">목표 유형을 선택하세요</p>
                  {GOAL_TYPES.map((gt) => (
                    <button
                      key={gt.value}
                      onClick={() => setSelectedType(gt.value)}
                      className="w-full text-left p-3 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors"
                    >
                      <p className="text-white text-sm font-medium">{gt.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{gt.description}</p>
                    </button>
                  ))}
                  <button
                    onClick={resetForm}
                    className="w-full py-2 rounded-xl border border-gray-600 text-gray-400 text-sm mt-1"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Type badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300">
                      {GOAL_TYPES.find((t) => t.value === selectedType)?.label}
                    </span>
                    <button
                      onClick={() => setSelectedType(null)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      유형 변경
                    </button>
                  </div>

                  {/* Title */}
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="목표 이름 (예: 금연 100일)"
                    className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  />

                  {/* Emoji picker */}
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5 font-medium">이모지</label>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setForm({ ...form, emoji: e })}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                            form.emoji === e
                              ? "bg-purple-500/30 ring-1 ring-purple-500"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Personal / Shared toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm({ ...form, isShared: false })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        !form.isShared
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-gray-700 text-gray-400"
                      }`}
                    >
                      👤 개인
                    </button>
                    <button
                      onClick={() => setForm({ ...form, isShared: true })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        form.isShared
                          ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                          : "border-gray-700 text-gray-400"
                      }`}
                    >
                      🤝 공동
                    </button>
                  </div>

                  {/* Type-specific fields */}
                  {selectedType === "date_count" && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-gray-400 text-xs mb-1 font-medium">시작일</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-gray-400 text-xs mb-1 font-medium">목표 일수</label>
                        <input
                          type="number"
                          value={form.targetDays}
                          onChange={(e) => setForm({ ...form, targetDays: e.target.value })}
                          placeholder="100"
                          className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === "infinite_race" && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1 font-medium">시작일</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {selectedType === "numeric" && (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1 font-medium">시작값</label>
                          <input
                            type="number"
                            value={form.startValue}
                            onChange={(e) => setForm({ ...form, startValue: e.target.value })}
                            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1 font-medium">목표값</label>
                          <input
                            type="number"
                            value={form.target}
                            onChange={(e) => setForm({ ...form, target: e.target.value })}
                            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1 font-medium">단위</label>
                          <input
                            value={form.unit}
                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            placeholder="kg, 회..."
                            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1 font-medium">증감 단위</label>
                          <input
                            type="number"
                            value={form.step}
                            onChange={(e) => setForm({ ...form, step: e.target.value })}
                            placeholder="1"
                            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1 font-medium">🗓️ 마감 기한 (선택)</label>
                        <input
                          type="date"
                          value={form.deadline}
                          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                          className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
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
            </div>
          )}

          {/* Active goals list */}
          {loading ? (
            <div className="text-center text-gray-500 py-8">불러오는 중...</div>
          ) : goals.filter((g) => g.status === "active").length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-3">🎯</p>
              <p>아직 진행중인 목표가 없어요.</p>
            </div>
          ) : (
            goals
              .filter((g) => g.status === "active")
              .map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  currentUser={currentUser}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
          )}
        </>
      ) : (
        /* Record tab */
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-2xl font-bold text-green-400">{completedCount}</p>
              <p className="text-xs text-gray-500 mt-1">달성</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-2xl font-bold text-red-400">{abandonedCount}</p>
              <p className="text-xs text-gray-500 mt-1">실패</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-2xl font-bold text-yellow-400">
                {bestRaceGoal ? `${bestRaceGoal.bestRecord}일` : "-"}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {bestRaceGoal ? bestRaceGoal.title : "최장 레이스"}
              </p>
            </div>
          </div>

          {/* Record list */}
          {loading ? (
            <div className="text-center text-gray-500 py-8">불러오는 중...</div>
          ) : recordGoals.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-3">📋</p>
              <p>아직 기록이 없어요.</p>
            </div>
          ) : (
            recordGoals.map((g) => {
              const isCompleted = g.status === "completed";
              const startStr = g.startDate || g.raceStartDate || g.createdAt;
              const endStr = g.completedAt || g.createdAt;
              const start = new Date(startStr);
              const end = new Date(endStr);
              const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

              return (
                <div
                  key={g.id}
                  className={`bg-gray-800 rounded-2xl p-4 border-l-4 ${
                    isCompleted ? "border-l-green-500" : "border-l-red-500"
                  } border border-gray-700`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.emoji}</span>
                      <div>
                        <p className="text-white font-medium text-sm">{g.title}</p>
                        <p className="text-gray-500 text-xs">
                          {g.owner ? `${MEMBER_EMOJIS[g.owner.name] ?? "👤"} ${g.owner.name}` : "🤝 공동"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        isCompleted
                          ? "text-green-400 bg-green-400/10"
                          : "text-red-400 bg-red-400/10"
                      }`}
                    >
                      {isCompleted ? "달성" : "실패"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      {start.toLocaleDateString("ko-KR")} ~ {end.toLocaleDateString("ko-KR")}
                    </span>
                    <span>{days}일</span>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
