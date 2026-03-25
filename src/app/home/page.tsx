"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TabNav from "@/components/TabNav";
import FeedTab from "@/components/feed/FeedTab";
import MeetupTab from "@/components/meetup/MeetupTab";
import GoalsTab from "@/components/goals/GoalsTab";
import MapTab from "@/components/map/MapTab";
import ChatTab from "@/components/chat/ChatTab";
import { MEMBER_EMOJIS } from "@/lib/constants";

type Tab = "feed" | "meetup" | "goals" | "map" | "chat";

const TAB_TITLES: Record<Tab, string> = {
  feed: "피드",
  meetup: "모임",
  goals: "목표",
  map: "지도",
  chat: "채팅",
};

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("feed");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setCurrentUser(d.name);
        else router.push("/");
      })
      .catch(() => router.push("/"));
  }, [router]);

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
          <FeedTab currentUser={currentUser} />
        </div>
        <div style={{ display: tab === "meetup" ? "block" : "none" }}>
          <MeetupTab currentUser={currentUser} />
        </div>
        <div style={{ display: tab === "goals" ? "block" : "none" }}>
          <GoalsTab currentUser={currentUser} />
        </div>
        <div style={{ display: tab === "map" ? "block" : "none" }}>
          <MapTab currentUser={currentUser} />
        </div>
        <div style={{ display: tab === "chat" ? "block" : "none", height: tab === "chat" ? "calc(100vh - 130px)" : undefined }}>
          <ChatTab currentUser={currentUser} />
        </div>
      </main>

      <TabNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
