import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const goalId = Number(params.id);

  if ("progress" in body && Object.keys(body).length === 1) {
    if (typeof body.progress !== "number") {
      return NextResponse.json({ error: "진행도 값을 입력해주세요." }, { status: 400 });
    }
    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.ownerId !== session.userId) {
      return NextResponse.json({ error: "본인의 목표만 수정할 수 있어요." }, { status: 403 });
    }
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { progress: body.progress },
      include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
    });
    return NextResponse.json(goal);
  }

  const existing = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "본인의 목표만 수정할 수 있어요." }, { status: 403 });
  }

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      title: body.title ?? existing.title,
      target: body.target ?? existing.target,
      startValue: body.startValue ?? existing.startValue,
      unit: body.unit !== undefined ? body.unit : existing.unit,
      category: body.category !== undefined ? body.category : existing.category,
      deadline: body.deadline !== undefined ? body.deadline : existing.deadline,
    },
    include: { owner: { select: { name: true } }, _count: { select: { comments: true } } },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goalId = Number(params.id);
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (goal.ownerId !== session.userId) {
    return NextResponse.json({ error: "본인의 목표만 삭제할 수 있어요." }, { status: 403 });
  }

  await prisma.goal.delete({ where: { id: goalId } });
  return NextResponse.json({ ok: true });
}
