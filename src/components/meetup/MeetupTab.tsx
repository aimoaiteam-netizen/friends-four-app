"use client";

import { useState, useEffect, useCallback } from "react";
import MeetupCard from "./MeetupCard";

interface Vote {
  id: number;
  date: string;
  user: { name: string };
}

interface Meetup {
  id: number;
  title: string;
  description: string | null;
  proposedDates: string;
  votes: Vote[];
  status: string;
  confirmedDate: string | null;
  createdAt: string;
}

export default function MeetupTab({ currentUser }: { currentUser: string }) {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchMeetups = useCallback(async () => {
    try {
      const res = await fetch("/api/meetups");
      setMeetups(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetups(); }, [fetchMeetups]);

  function addDate() {
    if (dateInput && !dates.includes(dateInput)) {
      setDates((prev) => [...prev, dateInput].sort());
      setDateInput("");
    }
  }

  async function handleCreate() {
    if (!title.trim() || dates.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, proposedDates: dates }),
      });
      if (res.ok) {
        const m = await res.json();
        setMeetups((prev) => [m, ...prev]);
        setTitle(""); setDescription(""); setDates([]); setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(meetupId: number, date: string) {
    const res = await fetch(`/api/meetups/${meetupId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMeetups((prev) => prev.map((m) => (m.id === meetupId ? updated : m)));
    }
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
        >
          📅 &nbsp;새 모임 제안하기
        </button>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="모임 이름 (예: 4월 번개)"
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            autoFocus
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            className="w-full bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={addDate}
              className="px-4 py-2 rounded-xl bg-purple-600/30 text-purple-300 text-sm hover:bg-purple-600/50"
            >
              + 추가
            </button>
          </div>
          {dates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1 text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded-lg"
                >
                  {d}
                  <button onClick={() => setDates((prev) => prev.filter((x) => x !== d))} className="text-purple-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setTitle(""); setDescription(""); setDates([]); }}
              className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !title.trim() || dates.length === 0}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? "만드는 중..." : "만들기"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      ) : meetups.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">📅</p>
          <p>아직 모임 계획이 없어요.</p>
        </div>
      ) : (
        meetups.map((m) => (
          <MeetupCard key={m.id} meetup={m} currentUser={currentUser} onVote={handleVote} />
        ))
      )}
    </div>
  );
}
