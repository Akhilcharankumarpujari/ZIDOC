import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { hashPassword } from "@/lib/services/password";
import crypto from "crypto";
import { z } from "zod";

const createShareLinkSchema = z.object({
  documentId: z.string(),
  isActive: z.boolean().default(true),
  password: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  allowDownload: z.boolean().default(true),
});

// GET: Retrieve the existing shared link details for a document
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const file = await prisma.file.findUnique({
      where: { id: documentId },
    });

    if (!file) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (file.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sharedLink = await prisma.sharedLink.findFirst({
      where: { documentId },
    });

    return NextResponse.json(sharedLink || { isActive: false });
  } catch (error) {
    console.error("Error fetching share link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create or update a shared link for a document
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createShareLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { documentId, isActive, password, expiresAt, allowDownload } = validation.data;

    const file = await prisma.file.findUnique({
      where: { id: documentId },
    });

    if (!file) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (file.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if shared link already exists
    let sharedLink = await prisma.sharedLink.findFirst({
      where: { documentId },
    });

    let hashedPassword = undefined;
    if (password !== undefined) {
      if (password === null || password === "") {
        hashedPassword = null; // Clear password protection
      } else {
        hashedPassword = await hashPassword(password);
      }
    }

    const expiresDate = expiresAt ? new Date(expiresAt) : null;

    if (sharedLink) {
      // Update existing shared link
      sharedLink = await prisma.sharedLink.update({
        where: { id: sharedLink.id },
        data: {
          isActive,
          allowDownload,
          expiresAt: expiresDate,
          ...(hashedPassword !== undefined && { password: hashedPassword }),
        },
      });
    } else {
      // Create new shared link
      const token = crypto.randomBytes(16).toString("hex");
      sharedLink = await prisma.sharedLink.create({
        data: {
          token,
          documentId,
          createdBy: currentUser.$id,
          isActive,
          allowDownload,
          expiresAt: expiresDate,
          password: hashedPassword || null,
        },
      });
    }

    return NextResponse.json(sharedLink);
  } catch (error) {
    console.error("Error creating/updating share link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
