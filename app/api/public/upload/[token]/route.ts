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

    const requirement = await prisma.requirement.findUnique({
      where: { uploadToken: token },
      include: {
        category: {
          include: {
            collection: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json({ error: "Upload link not found" }, { status: 404 });
    }

    if (!requirement.category.collection.isActive) {
      return NextResponse.json({ error: "This document collection has been deactivated or archived." }, { status: 403 });
    }

    const isExpired = requirement.deadline ? new Date() > requirement.deadline : false;

    return NextResponse.json({
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      uploadToken: requirement.uploadToken,
      deadline: requirement.deadline,
      isExpired,
      allowMultipleFiles: requirement.allowMultipleFiles,
      maxFileSize: requirement.maxFileSize,
      acceptedFileTypes: requirement.acceptedFileTypes,
      collectionTitle: requirement.category.collection.title,
      categoryName: requirement.category.name,
    });
  } catch (error) {
    console.error("Error fetching public requirement details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const requirement = await prisma.requirement.findUnique({
      where: { uploadToken: token },
      include: {
        category: {
          include: {
            collection: true,
          },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json({ error: "Upload link not found" }, { status: 404 });
    }

    if (!requirement.category.collection.isActive) {
      return NextResponse.json({ error: "This collection is inactive." }, { status: 403 });
    }

    if (requirement.deadline && new Date() > requirement.deadline) {
      return NextResponse.json({ error: "This upload link has expired (deadline passed)." }, { status: 410 });
    }

    const formData = await req.formData();
    const studentName = formData.get("studentName") as string;
    const studentRollNumber = formData.get("studentRollNumber") as string;
    const studentEmail = formData.get("studentEmail") as string;
    const remarks = formData.get("remarks") as string;
    const file = formData.get("file") as File;

    if (!studentName || !studentRollNumber || !file) {
      return NextResponse.json({ error: "Student Name, Roll Number, and File are required fields." }, { status: 400 });
    }

    // Validate file size
    if (file.size > requirement.maxFileSize) {
      const maxMb = Math.round(requirement.maxFileSize / (1024 * 1024));
      return NextResponse.json({ error: `File exceeds maximum allowed size of ${maxMb}MB.` }, { status: 400 });
    }

    // Validate file type
    const fileTypeInfo = getFileType(file.name);
    if (requirement.acceptedFileTypes.length > 0) {
      const ext = `.${fileTypeInfo.extension.toLowerCase()}`;
      const type = file.type ? file.type.toLowerCase() : "";
      
      const isAccepted = requirement.acceptedFileTypes.some((accepted) => {
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
          error: `File type not allowed. Accepted types: ${requirement.acceptedFileTypes.join(", ")}`,
        }, { status: 400 });
      }
    }

    // Process file upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate a unique storage key
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const storageKey = `submissions/${requirement.category.collectionId}/${requirement.id}/${uniqueId}-${file.name}`;
    
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
        ownerId: requirement.category.collection.ownerId,
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

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      fileName: dbFile.name,
    });
  } catch (error) {
    console.error("Failed to process public upload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
