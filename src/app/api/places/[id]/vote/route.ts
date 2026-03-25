import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, count } = await req.json();
  if (!["up", "down"].includes(type) || typeof count !== "number" || count < 1) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const placeId = Number(params.id);

  const existing = await prisma.placeVote.findUnique({
    where: { placeId_userId: { placeId, userId: session.userId } },
  });

  const currentUps = existing?.ups ?? 0;
  const currentDowns = existing?.downs ?? 0;
  const total = currentUps + currentDowns;
  const remaining = Math.max(0, 100 - total);
  const actualCount = Math.min(count, remaining);

  if (actualCount === 0) {
    return NextResponse.json({ error: "최대 100회까지만 투표할 수 있어요." }, { status: 400 });
  }

  await prisma.placeVote.upsert({
    where: { placeId_userId: { placeId, userId: session.userId } },
    create: {
      placeId,
      userId: session.userId,
      ups: type === "up" ? actualCount : 0,
      downs: type === "down" ? actualCount : 0,
    },
    update: {
      ups: type === "up" ? currentUps + actualCount : currentUps,
      downs: type === "down" ? currentDowns + actualCount : currentDowns,
    },
  });

  const allVotes = await prisma.placeVote.findMany({ where: { placeId } });
  const ups = allVotes.reduce((s, v) => s + v.ups, 0);
  const downs = allVotes.reduce((s, v) => s + v.downs, 0);
  const myVote = allVotes.find((v) => v.userId === session.userId);

  return NextResponse.json({
    ups,
    downs,
    myUps: myVote?.ups ?? 0,
    myDowns: myVote?.downs ?? 0,
  });
}
