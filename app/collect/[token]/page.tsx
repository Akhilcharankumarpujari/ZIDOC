"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PublicRequirement {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  uploadToken: string;
  deadline: string | null;
  allowMultipleFiles: boolean;
  maxFileSize: number;
  acceptedFileTypes: string[];
}

interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  requirements: PublicRequirement[];
}

interface PublicCollection {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  categories: PublicCategory[];
}

export default function PublicCollectPortal() {
  const { token } = useParams() as { token: string };

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [error, setError] = useState("");
  
  // Step workflow state: 1 = Folder Select, 2 = Form Details & Multi File Uploads, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [selectedCatId, setSelectedCatId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // Record of requirementId -> File Object
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // File input refs map
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function fetchCollectionDetails() {
      try {
        const res = await fetch(`/api/public/collect/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "This document collection is not available.");
        } else {
          setCollection(data);
          // Auto-select first category if available
          if (data.categories && data.categories.length > 0) {
            setSelectedCatId(data.categories[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to connect to server.");
      } finally {
        setLoading(false);
      }
    }

    fetchCollectionDetails();
  }, [token]);

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) {
      setError("Please select a category folder to continue.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFileChange = (reqId: string, file: File | null, req: PublicRequirement) => {
    if (!file) {
      setSelectedFiles((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      setFileErrors((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      return;
    }

    // Validate size
    if (file.size > req.maxFileSize) {
      const maxMb = Math.round(req.maxFileSize / (1024 * 1024));
      setFileErrors((prev) => ({
        ...prev,
        [reqId]: `File exceeds maximum allowed size of ${maxMb}MB.`,
      }));
      return;
    }

    // Validate type/extension
    if (req.acceptedFileTypes.length > 0) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const type = file.type ? file.type.toLowerCase() : "";
      
      const isAccepted = req.acceptedFileTypes.some((accepted) => {
        const acc = accepted.toLowerCase();
        return (
          acc === `.${extension}` ||
          acc === extension ||
          acc === type ||
          (acc.endsWith("/*") && type.startsWith(acc.replace("/*", "")))
        );
      });

      if (!isAccepted) {
        setFileErrors((prev) => ({
          ...prev,
          [reqId]: `Format not allowed. Expected: ${req.acceptedFileTypes.join(", ")}`,
        }));
        return;
      }
    }

    // Valid file
    setFileErrors((prev) => {
      const copy = { ...prev };
      delete copy[reqId];
      return copy;
    });
    setSelectedFiles((prev) => ({
      ...prev,
      [reqId]: file,
    }));
  };

  const handleRemoveFile = (reqId: string) => {
    setSelectedFiles((prev) => {
      const copy = { ...prev };
      delete copy[reqId];
      return copy;
    });
    setFileErrors((prev) => {
      const copy = { ...prev };
      delete copy[reqId];
      return copy;
    });
    if (fileInputRefs.current[reqId]) {
      fileInputRefs.current[reqId]!.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim()) {
      setError("Name and Roll Number are required.");
      return;
    }

    const selectedCategory = collection?.categories.find((c) => c.id === selectedCatId);
    if (!selectedCategory) return;

    // Check that every requirement has a valid file uploaded
    const missingReqs = [];
    for (const req of selectedCategory.requirements) {
      if (!selectedFiles[req.id]) {
        missingReqs.push(req.title);
      }
    }

    if (missingReqs.length > 0) {
      setError(`Please upload all required files. Missing: ${missingReqs.join(", ")}`);
      return;
    }

    if (Object.keys(fileErrors).length > 0) {
      setError("Please fix the file validation errors before submitting.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("studentName", studentName);
      formData.append("studentRollNumber", studentRoll);
      formData.append("studentEmail", studentEmail);
      formData.append("remarks", remarks);
      formData.append("categoryId", selectedCatId);

      // Append files
      Object.entries(selectedFiles).forEach(([reqId, file]) => {
        formData.append(`file_${reqId}`, file);
      });

      const res = await fetch(`/api/public/collect/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit documents.");
      } else {
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      setError("A connection error occurred. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-light-400">
        <Image
          src="/assets/icons/loader-brand.svg"
          alt="loader"
          width={40}
          height={40}
          className="animate-spin"
        />
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-light-400 p-6">
        <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white p-8 shadow-sm border border-light-300 text-center space-y-6">
          <div className="rounded-full bg-red/10 p-5 w-fit mx-auto text-4xl">⚠️</div>
          <h2 className="text-2xl font-bold text-light-100">Portal Inaccessible</h2>
          <p className="text-light-200 body-2">{error}</p>
        </div>
      </div>
    );
  }

  const selectedCategory = collection?.categories.find((c) => c.id === selectedCatId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-light-400 p-6">
      {/* Header */}
      <header className="flex w-full max-w-5xl items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/icons/logo-brand.svg"
            alt="logo"
            width={38}
            height={38}
          />
          <span className="text-2xl font-bold text-brand">ZiDoc</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex w-full max-w-lg flex-col rounded-3xl bg-white p-8 shadow-sm border border-light-300">
        
        {/* STEP 1: Select Category Folder */}
        {step === 1 && (
          <form onSubmit={handleStep1Continue} className="flex flex-col space-y-6">
            <div className="border-b border-light-300 pb-5 text-left">
              <span className="text-[10px] bg-brand/10 text-brand px-3 py-1 rounded-full font-bold uppercase tracking-wider block w-fit mb-2">
                Document Collection
              </span>
              <h2 className="text-xl font-bold text-light-100">{collection?.title}</h2>
              {collection?.description && (
                <p className="text-xs text-light-200 mt-2">{collection.description}</p>
              )}
            </div>

            {error && (
              <div className="bg-red/10 border border-red/20 rounded-2xl p-4 text-sm text-red font-medium text-left">
                {error}
              </div>
            )}

            <div className="space-y-4 text-left">
              <label className="text-sm font-semibold text-light-100">Select Folder / Category</label>
              
              <div className="grid gap-3">
                {collection?.categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:bg-light-400/50 ${
                      selectedCatId === cat.id
                        ? "border-brand bg-brand/5"
                        : "border-light-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="categorySelect"
                      value={cat.id}
                      checked={selectedCatId === cat.id}
                      onChange={() => {
                        setSelectedCatId(cat.id);
                        setError("");
                      }}
                      className="accent-brand h-4 w-4"
                    />
                    <div className="flex-1 text-left">
                      <span className="font-bold text-sm text-light-100 block">{cat.name}</span>
                      {cat.description && (
                        <span className="text-xs text-light-200 block mt-0.5">{cat.description}</span>
                      )}
                      <span className="text-[10px] font-semibold text-light-200 block mt-1">
                        📂 {cat.requirements.length} documents required
                      </span>
                    </div>
                  </label>
                ))}

                {collection?.categories.length === 0 && (
                  <p className="text-xs text-light-200 text-center py-4">No folders available in this collection.</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={collection?.categories.length === 0}
              className="bg-brand hover:bg-brand-100 text-white rounded-full px-8 h-[52px] font-semibold w-full"
            >
              Continue
            </Button>
          </form>
        )}

        {/* STEP 2: Profile details & requirements files */}
        {step === 2 && selectedCategory && (
          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="border-b border-light-300 pb-5 text-left">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
                >
                  ← Go Back
                </button>
              </div>
              <div className="flex gap-2 flex-wrap mb-2">
                <span className="text-[10px] bg-brand/10 text-brand px-3 py-1 rounded-full font-bold uppercase tracking-wider block w-fit">
                  {collection?.title}
                </span>
                <span className="text-[10px] bg-light-300 text-light-200 px-3 py-1 rounded-full font-bold uppercase tracking-wider block w-fit">
                  {selectedCategory.name}
                </span>
              </div>
              <h2 className="text-xl font-bold text-light-100">Upload Folder Documents</h2>
            </div>

            {error && (
              <div className="bg-red/10 border border-red/20 rounded-2xl p-4 text-sm text-red font-medium text-left">
                {error}
              </div>
            )}

            {/* Profile fields */}
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-bold text-light-200 uppercase tracking-wider border-b border-light-300 pb-1">
                Student / Submitter Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-light-100">Your Full Name</label>
                  <Input
                    placeholder="e.g. Akhil Charan"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    className="shad-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-light-100">Roll / ID Number</label>
                  <Input
                    placeholder="e.g. 22BCE1002"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    required
                    className="shad-input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-light-100">Email Address (optional)</label>
                <Input
                  type="email"
                  placeholder="e.g. name@student.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="shad-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-light-100">Remarks / Comments (optional)</label>
                <textarea
                  placeholder="Any extra comments or notes about your submission..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {/* Requirements list */}
            <div className="space-y-4 text-left pt-2">
              <h3 className="text-xs font-bold text-light-200 uppercase tracking-wider border-b border-light-300 pb-1">
                Upload Required Documents
              </h3>

              <div className="space-y-4">
                {selectedCategory.requirements.map((req) => {
                  const file = selectedFiles[req.id];
                  const fileErr = fileErrors[req.id];
                  return (
                    <div key={req.id} className="bg-light-400/30 border border-light-300 rounded-2xl p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-light-100 flex items-center gap-1.5">
                          {req.title}
                          <span className="text-red text-xs">*</span>
                        </h4>
                        {req.description && (
                          <p className="text-xs text-light-200 mt-0.5">{req.description}</p>
                        )}
                        <p className="text-[10px] text-light-200 font-semibold mt-1">
                          Limit: {req.maxFileSize / (1024 * 1024)}MB 
                          {req.acceptedFileTypes.length > 0 && ` | Allowed: ${req.acceptedFileTypes.join(", ")}`}
                        </p>
                      </div>

                      {/* File upload widget */}
                      {!file ? (
                        <div>
                          <input
                            type="file"
                            id={`fileInput_${req.id}`}
                            ref={(el) => {
                              fileInputRefs.current[req.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) => handleFileChange(req.id, e.target.files?.[0] || null, req)}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[req.id]?.click()}
                            className="w-full border border-dashed border-light-300 hover:border-brand bg-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold text-light-200 hover:text-brand transition-all"
                          >
                            <Image src="/assets/icons/upload.svg" alt="upload" width={16} height={16} />
                            Choose Document File
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-white border border-light-300 rounded-xl p-3">
                          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                            <span className="text-lg">📄</span>
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-light-100 truncate w-full" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-light-200 font-semibold">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(req.id)}
                            className="text-xs text-red font-bold hover:underline px-2"
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      {fileErr && (
                        <p className="text-[10px] text-red font-semibold">{fileErr}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              disabled={uploading}
              className="bg-brand hover:bg-brand-100 text-white rounded-full px-8 h-[52px] font-semibold w-full flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={20}
                    height={20}
                    className="animate-spin filter invert"
                  />
                  Uploading documents...
                </>
              ) : (
                "Submit Submissions"
              )}
            </Button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className="rounded-full bg-brand/10 p-5">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-light-100">Documents Uploaded Successfully</h2>
            <p className="text-light-200 body-2 max-w-xs">
              Thank you! All required documents for <span className="font-semibold">{selectedCategory?.name}</span> have been received and are pending review.
            </p>
            <Button
              onClick={() => {
                setStep(1);
                setSelectedFiles({});
                setFileErrors({});
                setStudentName("");
                setStudentRoll("");
                setStudentEmail("");
                setRemarks("");
              }}
              className="bg-brand hover:bg-brand-100 text-white rounded-full px-8 h-[52px] font-semibold"
            >
              Done / Upload Another
            </Button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 border-t border-light-300 text-center">
        <p className="text-xs text-light-200">
          Powered by ZiDoc – Secure Document Management & Verification Platform
        </p>
      </footer>
    </div>
  );
}
