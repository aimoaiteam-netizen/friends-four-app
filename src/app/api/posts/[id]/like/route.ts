import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id: Number(params.id) } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const likedBy: string[] = JSON.parse(post.likedBy);
  const alreadyLiked = likedBy.includes(session.name);
  const updated = alreadyLiked
    ? likedBy.filter((n) => n !== session.name)
    : [...likedBy, session.name];

  const updatedPost = await prisma.post.update({
    where: { id: Number(params.id) },
    data: { likedBy: JSON.stringify(updated) },
    include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
  });
  const { imageUrl: _, ...postLite } = updatedPost;
  return NextResponse.json({ ...postLite, hasImage: !!updatedPost.imageUrl });
}
