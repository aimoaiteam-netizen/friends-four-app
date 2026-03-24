import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "날짜를 선택해주세요." }, { status: 400 });

  const meetup = await prisma.meetup.findUnique({ where: { id: Number(params.id) } });
  if (!meetup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existingVote = await prisma.meetupVote.findUnique({
    where: { meetupId_userId_date: { meetupId: Number(params.id), userId: session.userId, date } },
  });

  if (existingVote) {
    await prisma.meetupVote.delete({ where: { id: existingVote.id } });
  } else {
    await prisma.meetupVote.create({
      data: { meetupId: Number(params.id), userId: session.userId, date },
    });
  }

  const updated = await prisma.meetup.findUnique({
    where: { id: Number(params.id) },
    include: { votes: { include: { user: { select: { name: true } } } } },
  });
  return NextResponse.json(updated);
}
