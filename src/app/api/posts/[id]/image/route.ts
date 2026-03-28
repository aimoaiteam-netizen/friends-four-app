import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: Number(params.id) },
    select: { imageUrl: true },
  });

  if (!post?.imageUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // base64 data URL → binary image response
  const match = post.imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    const [, mimeType, b64] = match;
    const buffer = Buffer.from(b64, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // If it's already a URL (after future Blob migration), redirect
  return NextResponse.redirect(post.imageUrl);
}
