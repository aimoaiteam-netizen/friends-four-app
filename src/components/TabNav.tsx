"use client";

type Tab = "feed" | "meetup" | "goals" | "map" | "chat";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCounts?: Partial<Record<Tab, number>>;
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "feed", icon: "🏠", label: "피드" },
  { id: "meetup", icon: "📅", label: "모임" },
  { id: "goals", icon: "🎯", label: "목표" },
  { id: "map", icon: "🗺️", label: "지도" },
  { id: "chat", icon: "💬", label: "채팅" },
];

export default function TabNav({ activeTab, onTabChange, unreadCounts = {} }: TabNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-bottom z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map((tab) => {
          const count = unreadCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-3 px-4 flex-1 transition-colors ${
                activeTab === tab.id
                  ? "text-purple-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="relative text-xl mb-0.5">
                {tab.icon}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="w-1 h-1 rounded-full bg-purple-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
