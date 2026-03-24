import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.goalComment.findMany({
    where: { goalId: Number(params.id) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });
  }

  const comment = await prisma.goalComment.create({
    data: { content: content.trim(), goalId: Number(params.id), authorId: session.userId },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
