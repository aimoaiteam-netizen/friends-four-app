"use client";

import { useState, useRef } from "react";
import { MEMBER_EMOJIS } from "@/lib/constants";

interface Goal {
  id: number;
  title: string;
  type: string;
  direction: string;
  startValue: number;
  progress: number;
  target: number;
  unit: string | null;
  category: string | null;
  deadline: string | null;
  owner: { name: string } | null;
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
  onUpdate: (id: number, progress: number) => void;
  onDelete: (id: number) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  체중: "⚖️", 운동: "💪", 저축: "💰", 금연: "🚭", 독서: "📚", 기타: "✨",
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
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function calcPercent(goal: Goal, progress: number): number {
  const dir = goal.direction ?? "increase";
  if (dir === "decrease") {
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
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const percent = calcPercent(goal, localProgress);
  const emoji = goal.category ? CATEGORY_EMOJI[goal.category] ?? "🎯" : "🎯";
  const dday = goal.deadline ? getDday(goal.deadline) : null;
  const isOwner = goal.owner?.name === currentUser;
  const dir = goal.direction ?? "increase";
  const sliderMin = dir === "decrease" ? goal.target : goal.startValue;
  const sliderMax = dir === "decrease" ? goal.startValue : goal.target;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalProgress(parseFloat(e.target.value));
  }

  function handleSliderCommit() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onUpdate(goal.id, localProgress);
    }, 300);
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

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 border ${goal.type === "shared" ? "border-yellow-500/30" : "border-gray-700"}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-white font-medium text-sm">{goal.title}</p>
            {goal.owner && (
              <p className="text-gray-500 text-xs">
                {MEMBER_EMOJIS[goal.owner.name]} {goal.owner.name}
              </p>
            )}
            {goal.type === "shared" && (
              <p className="text-yellow-500 text-xs">🤝 공동 목표</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dday && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${dday.color}`}>
              {dday.text}
            </span>
          )}
          {isOwner && (
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

      {/* 진행도 슬라이더 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {localProgress.toFixed(localProgress % 1 === 0 ? 0 : 1)}{goal.unit ?? ""}
            {dir === "decrease" ? " → " : " / "}
            {goal.target}{goal.unit ?? ""}
          </span>
          <span className={`text-xs font-semibold ${percent >= 100 ? "text-green-400" : "text-purple-400"}`}>
            {percent >= 100 ? "🎉 달성!" : `${percent}%`}
          </span>
        </div>

        <div className="relative mb-1">
          <div className="w-full bg-gray-700 rounded-full h-2 absolute top-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className={`h-2 rounded-full transition-all ${percent >= 100 ? "bg-green-400" : "bg-purple-500"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={Math.max(0.1, Math.abs(sliderMax - sliderMin) / 100)}
            value={localProgress}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="relative w-full h-4 opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>

      {/* 댓글 토글 버튼 */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={toggleComments}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          💬 댓글 {commentsLoaded ? comments.length : ""}
          <span className="text-gray-600">{showComments ? "▲" : "▼"}</span>
        </button>

        {showComments && (
          <div className="mt-3 space-y-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-600">아직 댓글이 없어요.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <span className="text-sm flex-shrink-0">{MEMBER_EMOJIS[c.author.name] ?? "👤"}</span>
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
                onKeyDown={(e) => { if (e.key === "Enter") handleCommentSend(); }}
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
