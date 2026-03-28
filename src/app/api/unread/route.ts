import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const feedSeen = sp.get("feed");
  const meetupSeen = sp.get("meetup");
  const goalsSeen = sp.get("goals");
  const mapSeen = sp.get("map");
  const chatSeen = sp.get("chat");

  const gt = (iso: string | null) =>
    iso ? { createdAt: { gt: new Date(iso) } } : undefined;

  const [feedPosts, feedComments, meetups, goals, goalComments, places, messages] =
    await Promise.all([
      feedSeen ? prisma.post.count({ where: gt(feedSeen) }) : Promise.resolve(0),
      feedSeen ? prisma.postComment.count({ where: gt(feedSeen) }) : Promise.resolve(0),
      meetupSeen ? prisma.meetup.count({ where: gt(meetupSeen) }) : Promise.resolve(0),
      goalsSeen ? prisma.goal.count({ where: gt(goalsSeen) }) : Promise.resolve(0),
      goalsSeen ? prisma.goalComment.count({ where: gt(goalsSeen) }) : Promise.resolve(0),
      mapSeen ? prisma.place.count({ where: gt(mapSeen) }) : Promise.resolve(0),
      chatSeen ? prisma.message.count({ where: gt(chatSeen) }) : Promise.resolve(0),
    ]);

  return NextResponse.json({
    feed: feedPosts + feedComments,
    meetup: meetups,
    goals: goals + goalComments,
    map: places,
    chat: messages,
  });
}
