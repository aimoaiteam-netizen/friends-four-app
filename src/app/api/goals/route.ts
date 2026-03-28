import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const where = statusParam
    ? { status: { in: statusParam.split(",").map((s) => s.trim()) } }
    : undefined;

  const goals = await prisma.goal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, emoji, goalType, startDate, targetDays, startValue, target, unit, step, deadline, isShared } =
    await req.json();

  if (!title?.trim() || !goalType) {
    return NextResponse.json({ error: "제목과 목표 유형을 입력해주세요." }, { status: 400 });
  }

  const ownerId = isShared ? null : session.userId;

  if (goalType === "date_count") {
    if (!startDate || !targetDays) {
      return NextResponse.json({ error: "시작일과 목표 일수를 입력해주세요." }, { status: 400 });
    }
    const goal = await prisma.goal.create({
      data: {
        title: title.trim(),
        emoji: emoji || "🎯",
        goalType,
        ownerId,
        startDate,
        targetDays,
      },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json(goal, { status: 201 });
  }

  if (goalType === "infinite_race") {
    if (!startDate) {
      return NextResponse.json({ error: "시작일을 입력해주세요." }, { status: 400 });
    }
    const goal = await prisma.goal.create({
      data: {
        title: title.trim(),
        emoji: emoji || "🔥",
        goalType,
        ownerId,
        startDate,
        raceStartDate: startDate,
        bestRecord: 0,
      },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json(goal, { status: 201 });
  }

  if (goalType === "numeric") {
    if (!title?.trim() || startValue == null || target == null) {
      return NextResponse.json({ error: "제목, 시작값, 목표값을 입력해주세요." }, { status: 400 });
    }
    const sv = startValue ?? 0;
    const goal = await prisma.goal.create({
      data: {
        title: title.trim(),
        emoji: emoji || "📊",
        goalType,
        ownerId,
        startValue: sv,
        progress: sv,
        target,
        unit: unit ?? null,
        step: step ?? null,
        deadline: deadline ?? null,
      },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json(goal, { status: 201 });
  }

  return NextResponse.json({ error: "유효하지 않은 목표 유형이에요." }, { status: 400 });
}
