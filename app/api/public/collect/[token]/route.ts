import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/services/storage";
import { getFileType } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const collection = await prisma.collection.findUnique({
      where: { collectionToken: token },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            requirements: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (!collection.isActive) {
      return NextResponse.json({ error: "This document collection has been deactivated or archived." }, { status: 403 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error fetching public collection details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const collection = await prisma.collection.findUnique({
      where: { collectionToken: token },
      include: {
        categories: {
          include: {
            requirements: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (!collection.isActive) {
      return NextResponse.json({ error: "This collection is inactive." }, { status: 403 });
    }

    const formData = await req.formData();
    const studentName = formData.get("studentName") as string;
    const studentRollNumber = formData.get("studentRollNumber") as string;
    const studentEmail = formData.get("studentEmail") as string;
    const remarks = formData.get("remarks") as string;
    const categoryId = formData.get("categoryId") as string;

    if (!studentName || !studentRollNumber || !categoryId) {
      return NextResponse.json({ error: "Student Name, Roll Number, and Folder are required fields." }, { status: 400 });
    }

    const selectedCategory = collection.categories.find(c => c.id === categoryId);
    if (!selectedCategory) {
      return NextResponse.json({ error: "Selected folder category is invalid for this collection." }, { status: 400 });
    }

    const requirements = selectedCategory.requirements;
    if (requirements.length === 0) {
      return NextResponse.json({ error: "This folder does not contain any document requirements." }, { status: 400 });
    }

    // Step 1: Pre-validation of files (check file size, type, and optional/required state)
    // We expect files under keys: `file_${req.id}`
    const filesToUpload: { reqId: string; file: File; requirement: typeof requirements[0] }[] = [];

    for (const req of requirements) {
      const file = formData.get(`file_${req.id}`) as File;
      if (!file || file.size === 0) {
        // Validation: By default, we expect all documents in the category to be uploaded.
        return NextResponse.json({ error: `Please select a file to upload for requirement: "${req.title}"` }, { status: 400 });
      }

      // Validate deadline
      if (req.deadline && new Date() > req.deadline) {
        return NextResponse.json({ error: `The deadline for "${req.title}" has passed.` }, { status: 410 });
      }

      // Validate file size
      if (file.size > req.maxFileSize) {
        const maxMb = Math.round(req.maxFileSize / (1024 * 1024));
        return NextResponse.json({ error: `File for "${req.title}" exceeds maximum allowed size of ${maxMb}MB.` }, { status: 400 });
      }

      // Validate file type
      const fileTypeInfo = getFileType(file.name);
      if (req.acceptedFileTypes.length > 0) {
        const ext = `.${fileTypeInfo.extension.toLowerCase()}`;
        const type = file.type ? file.type.toLowerCase() : "";

        const isAccepted = req.acceptedFileTypes.some((accepted) => {
          const acc = accepted.toLowerCase();
          return (
            acc === ext ||
            acc === fileTypeInfo.extension.toLowerCase() ||
            acc === type ||
            (acc.endsWith("/*") && type.startsWith(acc.replace("/*", "")))
          );
        });

        if (!isAccepted) {
          return NextResponse.json({
            error: `File type not allowed for "${req.title}". Accepted types: ${req.acceptedFileTypes.join(", ")}`,
          }, { status: 400 });
        }
      }

      filesToUpload.push({ reqId: req.id, file, requirement: req });
    }

    // Step 2: Perform uploads and database writes
    const submissionResults = [];

    for (const uploadItem of filesToUpload) {
      const { file, requirement } = uploadItem;
      const fileTypeInfo = getFileType(file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Generate a unique storage key
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const storageKey = `submissions/${collection.id}/${requirement.id}/${uniqueId}-${file.name}`;
      
      // Upload to storage
      await storageService.uploadFile(buffer, storageKey, file.type || "application/octet-stream");

      // Save metadata to file table
      const dbFile = await prisma.file.create({
        data: {
          name: file.name,
          originalName: file.name,
          type: fileTypeInfo.type,
          extension: fileTypeInfo.extension,
          size: file.size,
          storageKey,
          ownerId: collection.ownerId,
        },
      });

      // Create Submission record
      const submission = await prisma.submission.create({
        data: {
          requirementId: requirement.id,
          fileId: dbFile.id,
          studentName,
          studentRollNumber,
          studentEmail: studentEmail || null,
          remarks: remarks || null,
          status: "Pending",
        },
      });

      submissionResults.push({
        submissionId: submission.id,
        requirementTitle: requirement.title,
        fileName: dbFile.name,
      });
    }

    return NextResponse.json({
      success: true,
      submissions: submissionResults,
    });
  } catch (error) {
    console.error("Failed to process public collect upload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
