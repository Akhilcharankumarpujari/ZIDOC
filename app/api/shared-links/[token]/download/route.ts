import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/services/storage";
import { comparePassword } from "@/lib/services/password";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password") || "";

    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!sharedLink || !sharedLink.isActive) {
      return new Response("Share link inactive or not found", { status: 404 });
    }

    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return new Response("Share link has expired", { status: 410 });
    }

    if (!sharedLink.allowDownload) {
      return new Response("Downloads are not allowed for this link", { status: 403 });
    }

    // Verify password if protected
    if (sharedLink.password) {
      const isValid = await comparePassword(password, sharedLink.password);
      if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Increment download count
    await prisma.sharedLink.update({
      where: { id: sharedLink.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Stream the file
    const s3Object = await storageService.getFileStream(sharedLink.file.storageKey);

    if (!s3Object.Body) {
      return new Response("File content is empty", { status: 404 });
    }

    const response = new NextResponse(s3Object.Body as any, {
      status: 200,
    });

    response.headers.set("Content-Type", s3Object.ContentType || "application/octet-stream");
    response.headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(sharedLink.file.name)}"`);
    if (s3Object.ContentLength) {
      response.headers.set("Content-Length", s3Object.ContentLength.toString());
    }

    return response;
  } catch (error) {
    console.error("Error downloading shared file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
