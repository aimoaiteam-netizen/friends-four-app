import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { MEMBERS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json();

  if (!name || !MEMBERS.includes(name as (typeof MEMBERS)[number])) {
    return NextResponse.json({ error: "허용되지 않은 이름입니다." }, { status: 400 });
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN은 숫자 4자리여야 합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing?.pinHash) {
    return NextResponse.json({ error: "이미 등록된 멤버입니다." }, { status: 409 });
  }

  const registeredCount = await prisma.user.count({ where: { pinHash: { not: null } } });
  if (registeredCount >= 4) {
    return NextResponse.json({ error: "정원(4명)이 가득 찼습니다." }, { status: 403 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const user = existing
    ? await prisma.user.update({ where: { name }, data: { pinHash } })
    : await prisma.user.create({ data: { name, pinHash } });

  const token = await createSession({ userId: user.id, name: user.name });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
