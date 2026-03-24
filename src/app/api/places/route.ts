import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const places = await prisma.place.findMany({
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { name: true } } },
  });
  return NextResponse.json(places);
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
  return NextResponse.json(place, { status: 201 });
}
