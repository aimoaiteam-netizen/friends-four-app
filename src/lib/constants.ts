export const MEMBERS = ["정원주", "이재원", "조훈경", "한성훈"] as const;
export type MemberName = (typeof MEMBERS)[number];

export const MEMBER_EMOJIS: Record<string, string> = {
  정원주: "🦁",
  이재원: "🐯",
  조훈경: "🐻",
  한성훈: "🦊",
};

export const GOAL_CATEGORIES = [
  { value: "체중", label: "체중감량 🏃" },
  { value: "운동", label: "운동 💪" },
  { value: "저축", label: "저축 💰" },
  { value: "금연", label: "금연 🚭" },
  { value: "독서", label: "독서 📚" },
  { value: "기타", label: "기타 ✨" },
] as const;

export const PLACE_CATEGORY_EMOJI: Record<string, string> = {
  식당: "🍽️", 카페: "☕", 술집: "🍺", 여행지: "🗺️", 기타: "📍",
};
