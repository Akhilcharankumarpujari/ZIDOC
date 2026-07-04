import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { z } from "zod";

const reviewSubmissionSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  remarks: z.string().optional().nullable(),
});

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
    const validation = reviewSubmissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        requirement: {
          include: {
            category: {
              include: {
                collection: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.requirement.category.collection.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, remarks } = validation.data;

    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        remarks: remarks || null,
        reviewedAt: new Date(),
        reviewedBy: currentUser.fullName,
      },
    });

    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error("Error reviewing submission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
