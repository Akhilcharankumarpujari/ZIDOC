import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/services/password";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { password } = body;

    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
    });

    if (!sharedLink || !sharedLink.isActive) {
      return NextResponse.json({ error: "Share link inactive or not found" }, { status: 404 });
    }

    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    if (sharedLink.password) {
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 401 });
      }

      const isValid = await comparePassword(password, sharedLink.password);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying share link password:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
