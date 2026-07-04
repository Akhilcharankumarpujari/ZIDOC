import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import crypto from "crypto";
import { z } from "zod";

const createRequirementSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  allowMultipleFiles: z.boolean().default(false),
  maxFileSize: z.number().default(10485760), // default 10MB
  acceptedFileTypes: z.array(z.string()).default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;
    const body = await req.json();
    const validation = createRequirementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { categoryId, title, description, deadline, allowMultipleFiles, maxFileSize, acceptedFileTypes } = validation.data;

    // Verify category exists and belongs to the collection
    const category = await prisma.category.findFirst({
      where: { id: categoryId, collectionId },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found in this collection" }, { status: 404 });
    }

    // Generate unique upload token (8 bytes hex = 16 characters)
    let uploadToken = "";
    let isUnique = false;
    while (!isUnique) {
      uploadToken = crypto.randomBytes(8).toString("hex").toUpperCase();
      const existing = await prisma.requirement.findUnique({
        where: { uploadToken },
      });
      if (!existing) isUnique = true;
    }

    const deadlineDate = deadline ? new Date(deadline) : null;

    const requirement = await prisma.requirement.create({
      data: {
        categoryId,
        title,
        description: description || null,
        uploadToken,
        deadline: deadlineDate,
        allowMultipleFiles,
        maxFileSize,
        acceptedFileTypes,
      },
    });

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error creating requirement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
