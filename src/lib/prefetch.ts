/* eslint-disable @typescript-eslint/no-explicit-any */
const cache: Record<string, any> = {};

export async function prefetchAll() {
  const keys = ["auth", "posts", "meetups", "goals", "places", "messages"];
  const urls = [
    "/api/auth/me",
    "/api/posts",
    "/api/meetups",
    "/api/goals",
    "/api/places",
    "/api/messages",
  ];
  const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
  keys.forEach((k, i) => { cache[k] = results[i]; });
}

export async function prefetchTabs() {
  const keys = ["posts", "meetups", "goals", "places", "messages"];
  const urls = ["/api/posts", "/api/meetups", "/api/goals", "/api/places", "/api/messages"];
  const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
  keys.forEach((k, i) => { cache[k] = results[i]; });
}

export function consume(key: string) {
  const data = cache[key] ?? null;
  delete cache[key];
  return data;
}
