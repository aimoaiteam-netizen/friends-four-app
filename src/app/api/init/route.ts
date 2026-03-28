import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aggregatePlaceVotes } from "@/lib/placeUtils";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [posts, meetups, goals, rawPlaces, messages] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
    prisma.meetup.findMany({
      orderBy: { createdAt: "desc" },
      include: { votes: { include: { user: { select: { name: true } } } } },
    }),
    prisma.goal.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
    prisma.place.findMany({
      orderBy: { createdAt: "desc" },
      include: { addedBy: { select: { name: true } }, votes: true },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const places = aggregatePlaceVotes(rawPlaces, session.userId);
  return NextResponse.json({
    auth: { userId: session.userId, name: session.name },
    posts,
    meetups,
    goals,
    places,
    messages,
  });
}
