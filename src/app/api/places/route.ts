import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aggregatePlaceVotes } from "@/lib/placeUtils";

export async function GET() {
  const session = await getSession();
  const places = await prisma.place.findMany({
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { name: true } }, votes: true },
  });
  return NextResponse.json(aggregatePlaceVotes(places, session?.userId ?? null));
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { names } = await req.json().catch(() => ({ names: null }));
  const where = names?.length
    ? { name: { in: names } }
    : { OR: [{ address: null }, { address: "" }] };

  const result = await prisma.place.deleteMany({ where });
  return NextResponse.json({ deleted: result.count });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, category, address, review, rating, visitedAt, latitude, longitude } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "장소 이름을 입력해주세요." }, { status: 400 });
  }
  if (!visitedAt) {
    return NextResponse.json({ error: "방문일을 입력해주세요." }, { status: 400 });
  }

  const place = await prisma.place.create({
    data: {
      name: name.trim(),
      category: category ?? null,
      address: address?.trim() ?? null,
      review: review?.trim() ?? null,
      rating: rating ?? null,
      visitedAt,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      addedById: session.userId,
    },
    include: { addedBy: { select: { name: true } } },
  });
  return NextResponse.json({ ...place, totalUps: 0, totalDowns: 0, myUps: 0, myDowns: 0 }, { status: 201 });
}
