import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { z } from "zod";
import crypto from "crypto";

const createCollectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
      where: { ownerId: currentUser.$id },
      include: {
        categories: {
          include: {
            requirements: {
              include: {
                submissions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response with aggregate statistics
    const formattedCollections = collections.map((col) => {
      let requirementsCount = 0;
      let submissionCount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      col.categories.forEach((cat) => {
        requirementsCount += cat.requirements.length;
        cat.requirements.forEach((req) => {
          submissionCount += req.submissions.length;
          req.submissions.forEach((sub) => {
            if (sub.status === "Pending") pendingCount++;
            else if (sub.status === "Approved") approvedCount++;
            else if (sub.status === "Rejected") rejectedCount++;
          });
        });
      });

      return {
        id: col.id,
        title: col.title,
        description: col.description,
        isActive: col.isActive,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
        requirementsCount,
        submissionCount,
        pendingCount,
        approvedCount,
        rejectedCount,
      };
    });

    return NextResponse.json(formattedCollections);
  } catch (error) {
    console.error("Error listing collections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createCollectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { title, description } = validation.data;

    const collection = await prisma.collection.create({
      data: {
        title,
        description: description || null,
        ownerId: currentUser.$id,
        collectionToken: crypto.randomBytes(8).toString("hex").toUpperCase(),
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
