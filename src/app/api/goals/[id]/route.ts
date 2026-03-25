import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const goalId = Number(params.id);

  // progress만 업데이트하는 경우
  if ("progress" in body && Object.keys(body).length === 1) {
    if (typeof body.progress !== "number") {
      return NextResponse.json({ error: "진행도 값을 입력해주세요." }, { status: 400 });
    }
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { progress: body.progress },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json(goal);
  }

  // 전체 수정 — 본인만 가능
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
    include: { owner: { select: { name: true } } },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id: Number(params.id) } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (goal.ownerId !== session.userId) {
    return NextResponse.json({ error: "본인의 목표만 삭제할 수 있어요." }, { status: 403 });
  }

  await prisma.goal.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
