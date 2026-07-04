import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { z } from "zod";

const updateRequirementSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  allowMultipleFiles: z.boolean().optional(),
  maxFileSize: z.number().optional(),
  acceptedFileTypes: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId, reqId } = await params;
    const body = await req.json();
    const validation = updateRequirementSchema.safeParse(body);
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

    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
    });

    if (!requirement || requirement.collectionId !== collectionId) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const { title, description, deadline, allowMultipleFiles, maxFileSize, acceptedFileTypes } = validation.data;
    const deadlineDate = deadline === null ? null : deadline !== undefined ? new Date(deadline) : undefined;

    const updatedRequirement = await prisma.requirement.update({
      where: { id: reqId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(deadlineDate !== undefined && { deadline: deadlineDate }),
        ...(allowMultipleFiles !== undefined && { allowMultipleFiles }),
        ...(maxFileSize !== undefined && { maxFileSize }),
        ...(acceptedFileTypes !== undefined && { acceptedFileTypes }),
      },
    });

    return NextResponse.json(updatedRequirement);
  } catch (error) {
    console.error("Error updating requirement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId, reqId } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
    });

    if (!requirement || requirement.collectionId !== collectionId) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    await prisma.requirement.delete({
      where: { id: reqId },
    });

    return NextResponse.json({ message: "Requirement deleted successfully" });
  } catch (error) {
    console.error("Error deleting requirement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
