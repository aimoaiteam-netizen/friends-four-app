import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const places = await prisma.place.findMany({
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { name: true } }, votes: true },
  });

  const result = places.map((p) => {
    const totalUps = p.votes.reduce((s, v) => s + v.ups, 0);
    const totalDowns = p.votes.reduce((s, v) => s + v.downs, 0);
    const myVote = session ? p.votes.find((v) => v.userId === session.userId) : null;
    const { votes: _, ...rest } = p;
    return { ...rest, totalUps, totalDowns, myUps: myVote?.ups ?? 0, myDowns: myVote?.downs ?? 0 };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, category, address, review, rating, visitedAt } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "장소 이름을 입력해주세요." }, { status: 400 });
  }

  const place = await prisma.place.create({
    data: {
      name: name.trim(),
      category: category ?? null,
      address: address?.trim() ?? null,
      review: review?.trim() ?? null,
      rating: rating ?? null,
      visitedAt: visitedAt ?? null,
      addedById: session.userId,
    },
    include: { addedBy: { select: { name: true } } },
  });
  return NextResponse.json({ ...place, totalUps: 0, totalDowns: 0, myUps: 0, myDowns: 0 }, { status: 201 });
}
