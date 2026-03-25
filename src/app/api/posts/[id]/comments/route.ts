import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.postComment.findMany({
    where: { postId: Number(params.id), parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, parentId } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });
  }

  if (parentId != null) {
    const parent = await prisma.postComment.findUnique({
      where: { id: parentId },
      select: { postId: true, parentId: true },
    });
    if (!parent || parent.postId !== Number(params.id)) {
      return NextResponse.json({ error: "잘못된 댓글입니다." }, { status: 400 });
    }
    if (parent.parentId != null) {
      return NextResponse.json({ error: "대댓글에는 답글을 달 수 없습니다." }, { status: 400 });
    }
  }

  const comment = await prisma.postComment.create({
    data: {
      content: content.trim(),
      postId: Number(params.id),
      authorId: session.userId,
      parentId: parentId ?? null,
    },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
