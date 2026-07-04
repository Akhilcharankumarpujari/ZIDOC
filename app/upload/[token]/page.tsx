"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PublicRequirement {
  id: string;
  title: string;
  description: string | null;
  uploadToken: string;
  deadline: string | null;
  isExpired: boolean;
  allowMultipleFiles: boolean;
  maxFileSize: number;
  acceptedFileTypes: string[];
  collectionTitle: string;
}

export default function PublicUploadPage() {
  const { token } = useParams() as { token: string };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState<PublicRequirement | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchRequirementDetails() {
      try {
        const res = await fetch(`/api/public/upload/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "This upload link is inactive or expired.");
        } else {
          setRequirement(data);
          if (data.isExpired) {
            setError("This upload deadline has passed. Uploads are closed.");
          }
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while loading this link.");
      } finally {
        setLoading(false);
      }
    }
    fetchRequirementDetails();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setError("");

      // Validate max file size
      if (requirement && file.size > requirement.maxFileSize) {
        const maxMb = Math.round(requirement.maxFileSize / (1024 * 1024));
        setError(`File exceeds maximum size of ${maxMb}MB.`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validate file extension/type
      if (requirement && requirement.acceptedFileTypes.length > 0) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const mimeType = file.type ? file.type.toLowerCase() : "";
        const isAccepted = requirement.acceptedFileTypes.some((accepted) => {
          const acc = accepted.toLowerCase().replace(".", "");
          return (
            acc === extension ||
            acc === mimeType ||
            (acc.endsWith("/*") && mimeType.startsWith(acc.replace("/*", "")))
          );
        });

        if (!isAccepted) {
          setError(`File format not accepted. Allowed formats: ${requirement.acceptedFileTypes.join(", ")}`);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !requirement) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("studentName", studentName);
    formData.append("studentRollNumber", studentRoll);
    formData.append("studentEmail", studentEmail);
    formData.append("remarks", remarks);
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api/public/upload/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to upload document.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-light-400">
        <Image
          src="/assets/icons/loader-brand.svg"
          alt="loader"
          width={50}
          height={50}
          className="animate-spin"
        />
        <p className="mt-4 text-light-100 subtitle-1">Loading upload portal...</p>
      </div>
    );
  }

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

      {/* Main Upload Form */}
      <main className="flex w-full max-w-lg flex-col rounded-3xl bg-white p-8 shadow-sm border border-light-300">
        {success ? (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className="rounded-full bg-brand/10 p-5">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-light-100">Document Uploaded Successfully</h2>
            <p className="text-light-200 body-2 max-w-xs">
              Thank you! Your submission for <span className="font-semibold">{requirement?.title}</span> has been received and is pending review.
            </p>
            <Button
              onClick={() => {
                setSuccess(false);
                setStudentName("");
                setStudentRoll("");
                setStudentEmail("");
                setRemarks("");
                setSelectedFile(null);
              }}
              className="bg-brand hover:bg-brand-100 text-white rounded-full px-8 h-[52px]"
            >
              Upload Another File
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            {/* Requirement Context Panel */}
            <div className="border-b border-light-300 pb-5 text-left">
              <span className="text-[10px] bg-brand/10 text-brand px-3 py-1 rounded-full font-bold uppercase tracking-wider block w-fit mb-2">
                {requirement?.collectionTitle}
              </span>
              <h2 className="text-xl font-bold text-light-100">{requirement?.title}</h2>
              {requirement?.description && (
                <p className="text-xs text-light-200 mt-2">{requirement.description}</p>
              )}

              {requirement?.deadline && (
                <p className="text-[10px] text-red font-semibold mt-2">
                  * Submission Deadline: {new Date(requirement.deadline).toLocaleString()}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red/10 border border-red/20 rounded-2xl p-4 text-sm text-red font-medium text-left">
                {error}
              </div>
            )}

            {/* Input fields */}
            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Your Full Name</label>
                <Input
                  placeholder="e.g. Akhil Charan"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  className="shad-input"
                  disabled={!!error && !requirement}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Roll Number / ID Number</label>
                <Input
                  placeholder="e.g. 23981A4911"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  required
                  className="shad-input"
                  disabled={!!error && !requirement}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Email Address (optional)</label>
                <Input
                  type="email"
                  placeholder="e.g. student@gmail.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="shad-input"
                  disabled={!!error && !requirement}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Remarks / Notes (optional)</label>
                <textarea
                  placeholder="Add any notes or comments about your upload..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={!!error && !requirement}
                />
              </div>

              {/* Styled File Upload Input Container */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100 block mb-1">Select Document</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-light-300 rounded-3xl p-6 bg-light-400/50 hover:bg-light-400 transition-all cursor-pointer relative">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                    disabled={!!error && !requirement}
                  />
                  <Image
                    src="/assets/icons/upload.svg"
                    alt="upload"
                    width={40}
                    height={40}
                    className="opacity-40 mb-3"
                  />
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-brand truncate max-w-[250px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-light-200 mt-1">
                        {convertFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-light-100">Click or Drag & Drop File</p>
                      <p className="text-xs text-light-200 mt-1">
                        {requirement
                          ? `Max Size: ${requirement.maxFileSize / (1024 * 1024)}MB. Allowed: ${
                              requirement.acceptedFileTypes.length > 0
                                ? requirement.acceptedFileTypes.join(", ")
                                : "Any format"
                            }`
                          : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={uploading || (!!error && !requirement)}
              className="bg-brand hover:bg-brand-100 text-white rounded-full h-[52px] w-full font-semibold"
            >
              {uploading ? "Uploading Document..." : "Submit Document"}
            </Button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-light-200">
        ZiDoc © {new Date().getFullYear()} — Secure Document Collection Platform
      </footer>
    </div>
  );
}
