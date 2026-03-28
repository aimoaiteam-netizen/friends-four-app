"use client";

import { useState, useRef, useEffect } from "react";
import { MEMBER_EMOJIS } from "@/lib/constants";

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

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: { name: string };
}

interface GoalCardProps {
  goal: Goal;
  currentUser: string;
  onUpdate: (id: number, patch: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  date_count: { label: "📅 자동", color: "text-blue-400 bg-blue-400/10" },
  infinite_race: { label: "♾️ 레이스", color: "text-orange-400 bg-orange-400/10" },
  numeric: { label: "📊 수치", color: "text-green-400 bg-green-400/10" },
};

function getDday(deadline: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  const days = Math.round(diffMs / 86400000);

  if (days < 0) return { text: "종료", color: "text-gray-500 bg-gray-700" };
  if (days === 0) return { text: "D-Day", color: "text-red-400 bg-red-400/10" };
  if (days <= 7) return { text: `D-${days}`, color: "text-orange-400 bg-orange-400/10" };
  if (days <= 30) return { text: `D-${days}`, color: "text-purple-400 bg-purple-400/10" };

  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  const text = remainDays > 0 ? `${months}개월 ${remainDays}일` : `${months}개월`;
  return { text, color: "text-blue-400 bg-blue-400/10" };
}

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcElapsedDays(from: string | null): number {
  if (!from) return 0;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function calcNumericPercent(goal: Goal, progress: number): number {
  const isDecrease = goal.startValue > goal.target;
  if (isDecrease) {
    const total = goal.startValue - goal.target;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round(((goal.startValue - progress) / total) * 100)));
  }
  const total = goal.target - goal.startValue;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((progress - goal.startValue) / total) * 100)));
}

export default function GoalCard({ goal, currentUser, onUpdate, onDelete }: GoalCardProps) {
  const [localProgress, setLocalProgress] = useState(goal.progress);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = goal.owner?.name === currentUser;
  const isShared = !goal.owner;
  const canControl = isOwner || isShared;
  const typeBadge = TYPE_BADGES[goal.goalType] ?? TYPE_BADGES.numeric;

  // Sync localProgress when goal prop changes
  useEffect(() => {
    setLocalProgress(goal.progress);
  }, [goal.progress]);

  // Auto-complete check for date_count
  useEffect(() => {
    if (goal.goalType === "date_count" && goal.status === "active" && goal.startDate && goal.targetDays) {
      const elapsed = calcElapsedDays(goal.startDate);
      if (elapsed >= goal.targetDays) {
        onUpdate(goal.id, { action: "complete" });
      }
    }
  }, [goal.goalType, goal.status, goal.startDate, goal.targetDays, goal.id, onUpdate]);

  function handleNumericStep(delta: number) {
    if (!canControl) return;
    const step = goal.step ?? 1;
    const newVal = localProgress + delta * step;
    setLocalProgress(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(goal.id, { progress: newVal });
    }, 400);
  }

  function handleEditSubmit() {
    const val = parseFloat(editValue);
    if (!isNaN(val)) {
      setLocalProgress(val);
      onUpdate(goal.id, { progress: val });
    }
    setEditing(false);
  }

  async function toggleComments() {
    setShowComments((prev) => !prev);
    if (!commentsLoaded) {
      const res = await fetch(`/api/goals/${goal.id}/comments`);
      setComments(await res.json());
      setCommentsLoaded(true);
    }
  }

  async function handleCommentSend() {
    if (!commentInput.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentInput("");
      }
    } finally {
      setSendingComment(false);
    }
  }

  function handleDelete() {
    if (confirm("정말 삭제할까요?")) {
      onDelete(goal.id);
    }
    setShowMenu(false);
  }

  // Render type-specific body
  function renderBody() {
    if (goal.goalType === "date_count") {
      return renderDateCount();
    }
    if (goal.goalType === "infinite_race") {
      return renderInfiniteRace();
    }
    return renderNumeric();
  }

  function renderDateCount() {
    const elapsed = calcElapsedDays(goal.startDate);
    const targetDays = goal.targetDays ?? 100;
    const percent = Math.min(100, Math.round((elapsed / targetDays) * 100));
    const remaining = Math.max(0, targetDays - elapsed);

    return (
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold text-white">{elapsed}</span>
            <span className="text-gray-500 text-lg ml-1">/ {targetDays}일</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            percent >= 100 ? "text-green-400 bg-green-400/10" : "text-purple-400 bg-purple-400/10"
          }`}>
            {percent >= 100 ? "🎉 달성!" : `D-${remaining}`}
          </span>
        </div>
        <ProgressBar percent={percent} />
      </div>
    );
  }

  function renderInfiniteRace() {
    const streak = calcElapsedDays(goal.raceStartDate);
    const best = goal.bestRecord;
    const percent = best > 0 ? Math.min(100, Math.round((streak / best) * 100)) : (streak > 0 ? 50 : 0);

    return (
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold text-white">{streak}</span>
            <span className="text-gray-500 text-lg ml-1">일째</span>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-lg text-yellow-400 bg-yellow-400/10">
            🏆 최장 {best}일
          </span>
        </div>
        <ProgressBar percent={percent} color="bg-orange-500" />

        {/* Surrender button */}
        {canControl && (
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setShowSurrenderModal(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              🏳️ 항복!
            </button>
          </div>
        )}

        {/* Surrender modal */}
        {showSurrenderModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-xs border border-gray-700 space-y-3">
              <p className="text-white font-medium text-center">
                {streak}일 연속 도전 중이에요
              </p>
              <p className="text-gray-400 text-sm text-center">어떻게 할까요?</p>
              <button
                onClick={() => {
                  onUpdate(goal.id, { action: "reset" });
                  setShowSurrenderModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
              >
                🔄 다시 도전
              </button>
              <button
                onClick={() => {
                  onUpdate(goal.id, { action: "abandon" });
                  setShowSurrenderModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
              >
                🚪 포기
              </button>
              <button
                onClick={() => setShowSurrenderModal(false)}
                className="w-full py-2 rounded-xl border border-gray-600 text-gray-400 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderNumeric() {
    const percent = calcNumericPercent(goal, localProgress);
    const isDecrease = goal.startValue > goal.target;
    const dday = goal.deadline ? getDday(goal.deadline) : null;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Minus button */}
            {canControl && (
              <button
                onClick={() => handleNumericStep(isDecrease ? 1 : -1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-colors"
              >
                −
              </button>
            )}

            {/* Current value */}
            {editing ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); }}
                className="w-20 bg-gray-700 rounded-lg px-2 py-1 text-center text-xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  if (!canControl) return;
                  setEditValue(String(localProgress));
                  setEditing(true);
                }}
                className="text-2xl font-bold text-white"
              >
                {localProgress % 1 === 0 ? localProgress : localProgress.toFixed(1)}
                {goal.unit && <span className="text-gray-500 text-sm ml-1">{goal.unit}</span>}
              </button>
            )}

            {/* Plus button */}
            {canControl && (
              <button
                onClick={() => handleNumericStep(isDecrease ? -1 : 1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dday && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${dday.color}`}>
                {dday.text}
              </span>
            )}
            <span className={`text-xs font-semibold ${percent >= 100 ? "text-green-400" : "text-purple-400"}`}>
              {percent >= 100 ? "🎉 달성!" : `${percent}%`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">
            목표: {goal.target}{goal.unit ?? ""}
          </span>
        </div>
        <ProgressBar percent={percent} />
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 rounded-2xl p-4 border ${
        isShared ? "border-yellow-500/30" : "border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{goal.emoji}</span>
          <div>
            <p className="text-white font-medium text-sm">{goal.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {goal.owner ? (
                <span className="text-gray-500 text-xs">
                  {MEMBER_EMOJIS[goal.owner.name] ?? "👤"} {goal.owner.name}
                </span>
              ) : (
                <span className="text-yellow-500 text-xs">🤝 공동 목표</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${typeBadge.color}`}>
            {typeBadge.label}
          </span>
          {canControl && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-600 hover:text-gray-400 text-sm px-1"
              >
                ⋮
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-xl shadow-xl overflow-hidden z-50">
                  <button
                    onClick={handleDelete}
                    className="block w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-600 text-left whitespace-nowrap"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Type-specific body */}
      {renderBody()}

      {/* Comments */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={toggleComments}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          💬 댓글 {commentsLoaded ? comments.length : goal._count.comments}
          <span className="text-gray-600">{showComments ? "▲" : "▼"}</span>
        </button>

        {showComments && (
          <div className="mt-3 space-y-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-600">아직 댓글이 없어요.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <span className="text-sm flex-shrink-0">
                    {MEMBER_EMOJIS[c.author.name] ?? "👤"}
                  </span>
                  <div>
                    <span className="text-xs text-gray-400 font-medium">{c.author.name}</span>
                    <span className="text-xs text-gray-600 ml-1">{timeStr(c.createdAt)}</span>
                    <p className="text-xs text-gray-200 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2 pt-1">
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommentSend();
                }}
                placeholder="댓글 입력..."
                className="flex-1 bg-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={handleCommentSend}
                disabled={sendingComment || !commentInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs"
              >
                전송
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ percent, color = "bg-purple-500" }: { percent: number; color?: string }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${percent >= 100 ? "bg-green-400" : color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}
