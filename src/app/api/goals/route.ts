import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const goals = await prisma.goal.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    include: { owner: { select: { name: true } } },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, type, target, unit, category, deadline } = await req.json();
  if (!title?.trim() || !type) {
    return NextResponse.json({ error: "제목과 유형을 입력해주세요." }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      title: title.trim(),
      type,
      ownerId: type === "personal" ? session.userId : null,
      target: target ?? 100,
      unit: unit ?? null,
      category: category ?? null,
      deadline: deadline ?? null,
    },
    include: { owner: { select: { name: true } } },
  });
  return NextResponse.json(goal, { status: 201 });
}
