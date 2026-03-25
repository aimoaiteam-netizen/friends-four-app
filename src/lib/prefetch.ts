/* eslint-disable @typescript-eslint/no-explicit-any */
const cache: Record<string, any> = {};

export async function prefetchAll() {
  const res = await fetch("/api/init");
  if (!res.ok) throw new Error("unauthorized");
  const data = await res.json();
  cache.auth = data.auth;
  cache.posts = data.posts;
  cache.meetups = data.meetups;
  cache.goals = data.goals;
  cache.places = data.places;
  cache.messages = data.messages;
}

export function consume(key: string) {
  const data = cache[key] ?? null;
  delete cache[key];
  return data;
}
