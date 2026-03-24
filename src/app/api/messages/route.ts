import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");
  const messages = await prisma.message.findMany({
    where: since ? { id: { gt: Number(since) } } : undefined,
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
    take: 100,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { content: content.trim(), authorId: session.userId },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(message, { status: 201 });
}
