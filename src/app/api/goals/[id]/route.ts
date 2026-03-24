import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { progress } = await req.json();
  if (typeof progress !== "number") {
    return NextResponse.json({ error: "진행도 값을 입력해주세요." }, { status: 400 });
  }

  const goal = await prisma.goal.update({
    where: { id: Number(params.id) },
    data: { progress: Math.max(0, progress) },
    include: { owner: { select: { name: true } } },
  });
  return NextResponse.json(goal);
}
