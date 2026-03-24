import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const meetups = await prisma.meetup.findMany({
    orderBy: { createdAt: "desc" },
    include: { votes: { include: { user: { select: { name: true } } } } },
  });
  return NextResponse.json(meetups);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, proposedDates } = await req.json();
  if (!title?.trim() || !Array.isArray(proposedDates) || proposedDates.length === 0) {
    return NextResponse.json({ error: "제목과 날짜를 입력해주세요." }, { status: 400 });
  }

  const meetup = await prisma.meetup.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      proposedDates: JSON.stringify(proposedDates),
    },
    include: { votes: { include: { user: { select: { name: true } } } } },
  });
  return NextResponse.json(meetup, { status: 201 });
}
