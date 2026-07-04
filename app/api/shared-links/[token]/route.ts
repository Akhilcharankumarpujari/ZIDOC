import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!sharedLink) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const isExpired = sharedLink.expiresAt ? new Date() > sharedLink.expiresAt : false;

    return NextResponse.json({
      id: sharedLink.id,
      token: sharedLink.token,
      isActive: sharedLink.isActive,
      isExpired,
      requiresPassword: !!sharedLink.password,
      allowDownload: sharedLink.allowDownload,
      expiresAt: sharedLink.expiresAt,
      file: {
        id: sharedLink.file.id,
        name: sharedLink.file.name,
        size: sharedLink.file.size,
        type: sharedLink.file.type,
        extension: sharedLink.file.extension,
      },
    });
  } catch (error) {
    console.error("Error fetching share link public details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
