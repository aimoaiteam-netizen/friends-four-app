import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
      include: { owner: { select: { name: true } } },
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

  const places = rawPlaces.map((p) => {
    const totalUps = p.votes.reduce((s, v) => s + v.ups, 0);
    const totalDowns = p.votes.reduce((s, v) => s + v.downs, 0);
    const myVote = p.votes.find((v) => v.userId === session.userId);
    const { votes: _, ...rest } = p;
    return { ...rest, totalUps, totalDowns, myUps: myVote?.ups ?? 0, myDowns: myVote?.downs ?? 0 };
  });

  return NextResponse.json({
    auth: { userId: session.userId, name: session.name },
    posts,
    meetups,
    goals,
    places,
    messages,
  });
}
