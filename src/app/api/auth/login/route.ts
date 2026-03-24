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

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user?.pinHash) {
    return NextResponse.json({ error: "등록되지 않은 멤버입니다." }, { status: 404 });
  }

  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "PIN이 틀렸습니다." }, { status: 401 });
  }

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
