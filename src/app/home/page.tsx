"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import TabNav from "@/components/TabNav";
import FeedTab from "@/components/feed/FeedTab";
import MeetupTab from "@/components/meetup/MeetupTab";
import GoalsTab from "@/components/goals/GoalsTab";
import MapTab from "@/components/map/MapTab";
import ChatTab from "@/components/chat/ChatTab";
import { MEMBER_EMOJIS } from "@/lib/constants";
import { consume, prefetchAll } from "@/lib/prefetch";

type Tab = "feed" | "meetup" | "goals" | "map" | "chat";

const TAB_TITLES: Record<Tab, string> = {
  feed: "피드",
  meetup: "모임",
  goals: "목표",
  map: "지도",
  chat: "채팅",
};

const ALL_TABS: Tab[] = ["feed", "meetup", "goals", "map", "chat"];

function getLastSeen(): Record<Tab, string | null> {
  const result: Record<string, string | null> = {};
  for (const t of ALL_TABS) {
    result[t] = typeof window !== "undefined" ? localStorage.getItem(`tab_seen_${t}`) : null;
  }
  return result as Record<Tab, string | null>;
}

function markSeen(tab: Tab) {
  localStorage.setItem(`tab_seen_${tab}`, new Date().toISOString());
}

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("feed");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Partial<Record<Tab, number>>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<Tab, string | null>>(getLastSeen());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    const seen = getLastSeen();
    const params = new URLSearchParams();
    for (const t of ALL_TABS) {
      if (seen[t]) params.set(t, seen[t]!);
    }
    try {
      const res = await fetch(`/api/unread?${params.toString()}`);
      if (res.ok) setUnreadCounts(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const cached = consume("auth");
    if (cached?.name) {
      setCurrentUser(cached.name);
      return;
    }
    prefetchAll()
      .then(() => {
        const auth = consume("auth");
        if (auth?.name) setCurrentUser(auth.name);
        else router.push("/");
      })
      .catch(() => router.push("/"));
  }, [router]);

  // Mark initial tab as seen + fetch unread on mount
  useEffect(() => {
    if (!currentUser) return;
    markSeen(tab);
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentUser, fetchUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(newTab: Tab) {
    const prevTab = tab;
    setTab(newTab);
    markSeen(newTab);
    setUnreadCounts((prev) => ({ ...prev, [newTab]: 0 }));
    // Update lastSeenMap for the tab we're leaving so red dots work on re-entry
    setLastSeenMap((prev) => ({ ...prev, [prevTab]: new Date().toISOString() }));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col max-w-lg mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{TAB_TITLES[tab]}</h2>
          <div className="relative">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
            >
              <span className="text-xl">{MEMBER_EMOJIS[currentUser] ?? "👤"}</span>
              <span>{currentUser}</span>
            </button>
            {showLogout && (
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={handleLogout}
                  className="block w-full px-5 py-3 text-sm text-red-400 hover:bg-gray-700 text-left whitespace-nowrap"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: tab === "chat" ? "120px" : "80px" }}
        onClick={() => showLogout && setShowLogout(false)}
      >
        <div style={{ display: tab === "feed" ? "block" : "none" }}>
          <FeedTab currentUser={currentUser} lastSeen={lastSeenMap.feed} />
        </div>
        <div style={{ display: tab === "meetup" ? "block" : "none" }}>
          <MeetupTab currentUser={currentUser} lastSeen={lastSeenMap.meetup} />
        </div>
        <div style={{ display: tab === "goals" ? "block" : "none" }}>
          <GoalsTab currentUser={currentUser} lastSeen={lastSeenMap.goals} />
        </div>
        <div style={{ display: tab === "map" ? "block" : "none" }}>
          <MapTab currentUser={currentUser} lastSeen={lastSeenMap.map} />
        </div>
        <div style={{ display: tab === "chat" ? "block" : "none", height: tab === "chat" ? "calc(100vh - 130px)" : undefined }}>
          <ChatTab currentUser={currentUser} lastSeen={lastSeenMap.chat} />
        </div>
      </main>

      <TabNav activeTab={tab} onTabChange={handleTabChange} unreadCounts={unreadCounts} />
    </div>
  );
}
