import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { z } from "zod";

const updateCollectionSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            requirements: {
              include: {
                submissions: {
                  include: {
                    file: true,
                  },
                  orderBy: { submittedAt: "desc" },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format categories with requirements and submissions details
    const formattedCategories = collection.categories.map((cat) => {
      const formattedRequirements = cat.requirements.map((req) => {
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;

        req.submissions.forEach((sub) => {
          if (sub.status === "Pending") pendingCount++;
          else if (sub.status === "Approved") approvedCount++;
          else if (sub.status === "Rejected") rejectedCount++;
        });

        return {
          id: req.id,
          categoryId: req.categoryId,
          title: req.title,
          description: req.description,
          uploadToken: req.uploadToken,
          deadline: req.deadline,
          allowMultipleFiles: req.allowMultipleFiles,
          maxFileSize: req.maxFileSize,
          acceptedFileTypes: req.acceptedFileTypes,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          submissions: req.submissions,
          submissionsCount: req.submissions.length,
          pendingCount,
          approvedCount,
          rejectedCount,
        };
      });

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        requirements: formattedRequirements,
      };
    });

    return NextResponse.json({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      isActive: collection.isActive,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching collection detail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateCollectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        ...(validation.data.title !== undefined && { title: validation.data.title }),
        ...(validation.data.description !== undefined && { description: validation.data.description }),
        ...(validation.data.isActive !== undefined && { isActive: validation.data.isActive }),
      },
    });

    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
