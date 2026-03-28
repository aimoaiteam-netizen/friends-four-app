import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

// One-time migration: convert base64 imageUrl to Vercel Blob URL
// Call: GET /api/migrate-images (requires auth)
// Delete this file after migration is complete.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await prisma.post.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });

  const results: { id: number; status: string; url?: string }[] = [];

  for (const post of posts) {
    if (!post.imageUrl || !post.imageUrl.startsWith("data:")) {
      results.push({ id: post.id, status: "skipped (already URL or null)" });
      continue;
    }

    try {
      const match = post.imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        results.push({ id: post.id, status: "skipped (invalid format)" });
        continue;
      }

      const [, mimeType, b64] = match;
      const buffer = Buffer.from(b64, "base64");
      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];

      const blob = await put(`posts/migrated-${post.id}.${ext}`, buffer, {
        access: "public",
        contentType: mimeType,
      });

      await prisma.post.update({
        where: { id: post.id },
        data: { imageUrl: blob.url },
      });

      results.push({ id: post.id, status: "migrated", url: blob.url });
    } catch (err) {
      results.push({ id: post.id, status: `error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return NextResponse.json({
    total: posts.length,
    migrated: results.filter((r) => r.status === "migrated").length,
    results,
  });
}
