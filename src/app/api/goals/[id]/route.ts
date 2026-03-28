import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function canModify(goal: { ownerId: number | null }, sessionUserId: number): boolean {
  // Shared goal (ownerId null): any authenticated user can modify
  if (goal.ownerId === null) return true;
  // Personal goal: only owner
  return goal.ownerId === sessionUserId;
}

function daysBetween(dateStr: string, now: Date): number {
  const start = new Date(dateStr);
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const goalId = Number(params.id);

  const existing = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canModify(existing, session.userId)) {
    return NextResponse.json({ error: "본인의 목표만 수정할 수 있어요." }, { status: 403 });
  }

  // Action: reset (infinite race "다시 도전")
  if (body.action === "reset") {
    const now = new Date();
    const streak = existing.raceStartDate ? daysBetween(existing.raceStartDate, now) : 0;
    const newBest = streak > existing.bestRecord ? streak : existing.bestRecord;
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        bestRecord: newBest,
        raceStartDate: now.toISOString().split("T")[0],
      },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    });
    return NextResponse.json(goal);
  }

  // Action: abandon (infinite race "포기")
  if (body.action === "abandon") {
    const now = new Date();
    const streak = existing.raceStartDate ? daysBetween(existing.raceStartDate, now) : 0;
    const newBest = streak > existing.bestRecord ? streak : existing.bestRecord;
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        bestRecord: newBest,
        status: "abandoned",
        completedAt: now,
      },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    });
    return NextResponse.json(goal);
  }

  // Action: complete (date count complete)
  if (body.action === "complete") {
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    });
    return NextResponse.json(goal);
  }

  // Progress update (numeric goal)
  if ("progress" in body) {
    if (typeof body.progress !== "number") {
      return NextResponse.json({ error: "진행도 값을 입력해주세요." }, { status: 400 });
    }
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { progress: body.progress },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    });
    return NextResponse.json(goal);
  }

  return NextResponse.json({ error: "유효하지 않은 요청이에요." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goalId = Number(params.id);
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Shared goals cannot be deleted
  if (goal.ownerId === null) {
    return NextResponse.json({ error: "공동 목표는 삭제할 수 없어요." }, { status: 403 });
  }

  if (goal.ownerId !== session.userId) {
    return NextResponse.json({ error: "본인의 목표만 삭제할 수 있어요." }, { status: 403 });
  }

  await prisma.goal.delete({ where: { id: goalId } });
  return NextResponse.json({ ok: true });
}
