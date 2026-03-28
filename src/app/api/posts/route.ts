import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const rawPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
  });
  const posts = rawPosts.map(({ imageUrl, ...rest }) => ({
    ...rest,
    hasImage: !!imageUrl,
  }));
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, imageUrl } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }

  const created = await prisma.post.create({
    data: { content: content.trim(), imageUrl: imageUrl ?? null, authorId: session.userId },
    include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
  });
  const { imageUrl: _, ...post } = created;
  return NextResponse.json({ ...post, hasImage: !!created.imageUrl }, { status: 201 });
}
