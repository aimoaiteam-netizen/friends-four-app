import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MEMBERS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");

  if (!name || !MEMBERS.includes(name as (typeof MEMBERS)[number])) {
    return NextResponse.json({ error: "허용되지 않은 이름입니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { name } });
  return NextResponse.json({ hasPin: !!user?.pinHash });
}
