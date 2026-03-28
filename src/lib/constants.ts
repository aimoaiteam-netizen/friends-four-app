export const MEMBERS = ["정원주", "이재원", "조훈경", "한성훈"] as const;
export type MemberName = (typeof MEMBERS)[number];

export const MEMBER_EMOJIS: Record<string, string> = {
  정원주: "🦁",
  이재원: "🐯",
  조훈경: "🐻",
  한성훈: "🦊",
};

export const GOAL_TYPES = [
  { value: "date_count", label: "📅 날짜 카운트", description: "금연 100일처럼 날짜를 세는 목표" },
  { value: "infinite_race", label: "♾️ 무한 레이스", description: "라면 끊기처럼 끝없는 도전" },
  { value: "numeric", label: "📊 수치 목표", description: "체중, 턱걸이 등 숫자로 측정하는 목표" },
] as const;

export type GoalType = (typeof GOAL_TYPES)[number]["value"];

export const GOAL_EMOJIS = ["🎯", "🚭", "🍜", "⚖️", "💪", "💰", "📚", "🏃", "🧘", "🎨", "✨"] as const;

export const PLACE_CATEGORY_EMOJI: Record<string, string> = {
  식당: "🍽️", 카페: "☕", 술집: "🍺", 여행지: "🗺️", 기타: "📍",
};
