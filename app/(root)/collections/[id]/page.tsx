"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import FormattedDateTime from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import { convertFileSize } from "@/lib/utils";

interface FileObject {
  id: string;
  name: string;
  originalName: string;
  type: string;
  extension: string;
  size: number;
  storageKey: string;
}

interface Submission {
  id: string;
  requirementId: string;
  fileId: string;
  studentName: string;
  studentRollNumber: string;
  studentEmail: string | null;
  remarks: string | null;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  file: FileObject;
}

interface Requirement {
  id: string;
  title: string;
  description: string | null;
  uploadToken: string;
  deadline: string | null;
  allowMultipleFiles: boolean;
  maxFileSize: number;
  acceptedFileTypes: string[];
  createdAt: string;
  updatedAt: string;
  submissions: Submission[];
  submissionsCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

interface CollectionDetail {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  requirements: Requirement[];
}

export default function CollectionDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requirements" | "submissions">("requirements");

  // Create Requirement modal states
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqDeadline, setReqDeadline] = useState("");
  const [reqMaxMb, setReqMaxMb] = useState(10);
  const [reqFileTypes, setReqFileTypes] = useState<string[]>([]);
  const [creatingReq, setCreatingReq] = useState(false);

  // Edit Requirement modal states
  const [editReqOpen, setEditReqOpen] = useState(false);
  const [editingReqId, setEditingReqId] = useState("");
  const [editReqTitle, setEditReqTitle] = useState("");
  const [editReqDesc, setEditReqDesc] = useState("");
  const [editReqDeadline, setEditReqDeadline] = useState("");
  const [editReqMaxMb, setEditReqMaxMb] = useState(10);
  const [editReqFileTypes, setEditReqFileTypes] = useState<string[]>([]);
  const [updatingReq, setUpdatingReq] = useState(false);

  // Edit Collection state
  const [editColOpen, setEditColOpen] = useState(false);
  const [editColTitle, setEditColTitle] = useState("");
  const [editColDesc, setEditColDesc] = useState("");
  const [updatingCol, setUpdatingCol] = useState(false);

  // Submissions search & filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Submission review modal states
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const fetchCollectionDetail = async () => {
    try {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) {
        router.push("/collections");
        return;
      }
      const data = await res.json();
      setCollection(data);
      setEditColTitle(data.title);
      setEditColDesc(data.description || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionDetail();
  }, [id]);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setCreatingReq(true);

    const payload = {
      title: reqTitle,
      description: reqDesc || null,
      deadline: reqDeadline ? new Date(reqDeadline).toISOString() : null,
      maxFileSize: reqMaxMb * 1024 * 1024,
      acceptedFileTypes: reqFileTypes,
    };

    try {
      const res = await fetch(`/api/collections/${id}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setReqTitle("");
        setReqDesc("");
        setReqDeadline("");
        setReqMaxMb(10);
        setReqFileTypes([]);
        setReqModalOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to add requirement.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingReq(false);
    }
  };

  const handleOpenEditRequirement = (req: Requirement) => {
    setEditingReqId(req.id);
    setEditReqTitle(req.title);
    setEditReqDesc(req.description || "");
    setEditReqDeadline(req.deadline ? new Date(req.deadline).toISOString().slice(0, 16) : "");
    setEditReqMaxMb(Math.round(req.maxFileSize / (1024 * 1024)));
    setEditReqFileTypes(req.acceptedFileTypes);
    setEditReqOpen(true);
  };

  const handleUpdateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingReq(true);

    const payload = {
      title: editReqTitle,
      description: editReqDesc || null,
      deadline: editReqDeadline ? new Date(editReqDeadline).toISOString() : null,
      maxFileSize: editReqMaxMb * 1024 * 1024,
      acceptedFileTypes: editReqFileTypes,
    };

    try {
      const res = await fetch(`/api/collections/${id}/requirements/${editingReqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditReqOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to update requirement.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingReq(false);
    }
  };

  const handleDeleteRequirement = async (reqId: string) => {
    if (!confirm("Are you sure you want to delete this requirement? All uploads submitted under this requirement will be permanently lost.")) return;
    try {
      const res = await fetch(`/api/collections/${id}/requirements/${reqId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCollectionDetail();
      } else {
        alert("Failed to delete requirement.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCol(true);

    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editColTitle, description: editColDesc }),
      });

      if (res.ok) {
        setEditColOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to update collection.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCol(false);
    }
  };

  const toggleCollectionArchive = async () => {
    if (!collection) return;
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !collection.isActive }),
      });
      if (res.ok) {
        fetchCollectionDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCollection = async () => {
    if (!confirm("Are you sure you want to delete this entire collection? This action is permanent and deletes all requirements and submitted documents.")) return;
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/collections");
      } else {
        alert("Failed to delete collection.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmission = async (status: "Approved" | "Rejected") => {
    if (!activeSubmission) return;
    setReviewing(true);

    try {
      const res = await fetch(`/api/submissions/${activeSubmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks: reviewRemarks }),
      });

      if (res.ok) {
        setReviewOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to review submission.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const uploadUrl = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(uploadUrl);
    alert("Upload link copied to clipboard!");
  };

  const getFilteredSubmissions = () => {
    if (!collection) return [];
    let allSubs: Submission[] = [];
    collection.requirements.forEach((req) => {
      req.submissions.forEach((sub) => {
        allSubs.push(sub);
      });
    });

    return allSubs.filter((sub) => {
      const matchSearch =
        sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.studentRollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.studentEmail && sub.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchFilter = statusFilter === "All" || sub.status === statusFilter;

      return matchSearch && matchFilter;
    });
  };

  const toggleFileType = (type: string) => {
    setReqFileTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleEditFileType = (type: string) => {
    setEditReqFileTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
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

  if (!collection) return null;

  const totalSubmissions = collection.requirements.reduce((acc, req) => acc + req.submissionsCount, 0);
  const totalPending = collection.requirements.reduce((acc, req) => acc + req.pendingCount, 0);
  const totalApproved = collection.requirements.reduce((acc, req) => acc + req.approvedCount, 0);
  const totalRejected = collection.requirements.reduce((acc, req) => acc + req.rejectedCount, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Title section with Settings Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-light-300 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="h1 text-light-100 font-bold">{collection.title}</h1>
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                collection.isActive ? "bg-brand/10 text-brand" : "bg-light-300 text-light-200"
              }`}
            >
              {collection.isActive ? "Active" : "Archived"}
            </span>
          </div>
          <p className="body-2 text-light-200 mt-2 max-w-2xl">{collection.description || "No description."}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={editColOpen} onOpenChange={setEditColOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full px-4 h-10 text-xs font-semibold">
                Edit Details
              </Button>
            </DialogTrigger>
            <DialogContent className="shad-dialog">
              <form onSubmit={handleUpdateCollection}>
                <DialogHeader>
                  <DialogTitle className="text-light-100 font-bold">Edit Collection Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-6">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-light-100">Collection Title</label>
                    <Input
                      value={editColTitle}
                      onChange={(e) => setEditColTitle(e.target.value)}
                      required
                      className="shad-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-light-100">Description</label>
                    <textarea
                      value={editColDesc}
                      onChange={(e) => setEditColDesc(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <DialogFooter className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setEditColOpen(false)} className="rounded-full h-[48px]">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatingCol} className="bg-brand text-white rounded-full h-[48px]">
                    {updatingCol ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={toggleCollectionArchive}
            className="rounded-full px-4 h-10 text-xs font-semibold"
          >
            {collection.isActive ? "Archive" : "Unarchive"}
          </Button>

          <Button
            onClick={handleDeleteCollection}
            className="bg-red hover:bg-red/90 text-white rounded-full px-4 h-10 text-xs font-semibold"
          >
            Delete Collection
          </Button>
        </div>
      </div>

      {/* Aggregate Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm">
          <span className="text-xs text-light-200 font-semibold block mb-1">Total Requirements</span>
          <span className="text-2xl font-bold text-light-100">{collection.requirements.length}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm">
          <span className="text-xs text-light-200 font-semibold block mb-1">Pending Submissions</span>
          <span className="text-2xl font-bold text-amber-500">{totalPending}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm">
          <span className="text-xs text-light-200 font-semibold block mb-1">Approved Documents</span>
          <span className="text-2xl font-bold text-brand">{totalApproved}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm">
          <span className="text-xs text-light-200 font-semibold block mb-1">Rejected Submissions</span>
          <span className="text-2xl font-bold text-red">{totalRejected}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-light-300 mb-8">
        <button
          onClick={() => setActiveTab("requirements")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "requirements" ? "border-brand text-brand" : "border-transparent text-light-200"
          }`}
        >
          Requirements Management
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "submissions" ? "border-brand text-brand" : "border-transparent text-light-200"
          }`}
        >
          Submissions Log ({totalSubmissions})
        </button>
      </div>

      {/* TAB 1: Requirements Dashboard */}
      {activeTab === "requirements" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-light-100">Document Requirements</h2>

            <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand text-white rounded-full text-xs font-semibold px-4 h-9">
                  + Add Requirement
                </Button>
              </DialogTrigger>
              <DialogContent className="shad-dialog">
                <form onSubmit={handleCreateRequirement}>
                  <DialogHeader>
                    <DialogTitle className="text-light-100 font-bold">Add Requirement Document</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-light-100">Requirement Name</label>
                      <Input
                        placeholder="e.g. 1st Year Marksheet, PAN Card, Resume"
                        value={reqTitle}
                        onChange={(e) => setReqTitle(e.target.value)}
                        required
                        className="shad-input"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-light-100">Description (optional)</label>
                      <textarea
                        placeholder="Provide details or upload instructions for the submitter..."
                        value={reqDesc}
                        onChange={(e) => setReqDesc(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-light-100">Deadline (optional)</label>
                        <Input
                          type="datetime-local"
                          value={reqDeadline}
                          onChange={(e) => setReqDeadline(e.target.value)}
                          className="shad-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-light-100">Max File Size (MB)</label>
                        <Input
                          type="number"
                          value={reqMaxMb}
                          onChange={(e) => setReqMaxMb(parseInt(e.target.value) || 1)}
                          min={1}
                          required
                          className="shad-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-light-100 block">Accepted Formats</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {["PDF", "PNG", "JPEG", "DOCX", "ZIP"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleFileType(type)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              reqFileTypes.includes(type)
                                ? "bg-brand/10 border-brand text-brand"
                                : "bg-white border-light-300 text-light-200 hover:bg-light-400"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setReqModalOpen(false)} className="rounded-full h-[48px]">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingReq} className="bg-brand text-white rounded-full h-[48px]">
                      {creatingReq ? "Adding..." : "Add Requirement"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {collection.requirements.length === 0 ? (
            <div className="bg-white border border-light-300 rounded-3xl p-12 text-center shadow-sm">
              <p className="text-light-200 body-2">No required documents added to this collection yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {collection.requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-light-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                >
                  <div className="flex-1 space-y-2 text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-bold text-light-100">{req.title}</h3>
                      {req.deadline && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          new Date() > new Date(req.deadline) ? "bg-red/10 text-red" : "bg-brand/10 text-brand"
                        }`}>
                          Deadline: <FormattedDateTime date={req.deadline} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-light-200 line-clamp-2">{req.description || "No description."}</p>
                    <div className="flex items-center gap-4 text-[11px] text-light-200 pt-1 font-medium">
                      <span>Max Size: {req.maxFileSize / (1024 * 1024)}MB</span>
                      {req.acceptedFileTypes.length > 0 && (
                        <span>Formats: {req.acceptedFileTypes.join(", ")}</span>
                      )}
                    </div>
                  </div>

                  {/* Submission statistics & copy portal links */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="text-left sm:text-right space-y-1 min-w-[120px]">
                      <span className="text-xs text-light-200 font-semibold">Submissions</span>
                      <p className="text-base font-bold text-light-100">
                        {req.submissionsCount} Uploaded
                      </p>
                      <div className="flex gap-2 text-[10px] text-light-200 mt-1">
                        <span className="text-amber-500">{req.pendingCount} pending</span>
                        <span>•</span>
                        <span className="text-brand">{req.approvedCount} approved</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleCopyLink(req.uploadToken)}
                        className="bg-brand text-white text-xs font-semibold px-4 h-9 rounded-full"
                      >
                        Copy Upload Link
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEditRequirement(req)}
                        className="h-9 w-9 rounded-full p-0 flex items-center justify-center border-light-300"
                      >
                        <Image src="/assets/icons/edit.svg" alt="edit" width={18} height={18} />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteRequirement(req.id)}
                        className="h-9 w-9 rounded-full p-0 flex items-center justify-center border-light-300 text-red"
                      >
                        <Image src="/assets/icons/delete.svg" alt="delete" width={18} height={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submissions Review Log */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {/* Filters & Searches */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search by student name, roll number, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shad-input"
              />
            </div>

            <div className="flex gap-2">
              {["All", "Pending", "Approved", "Rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === status
                      ? "bg-brand/10 border-brand text-brand"
                      : "bg-white border-light-300 text-light-200 hover:bg-light-400"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Submissions Table List */}
          {getFilteredSubmissions().length === 0 ? (
            <div className="bg-white border border-light-300 rounded-3xl p-12 text-center shadow-sm">
              <p className="text-light-200 body-2">No submissions found matching the criteria.</p>
            </div>
          ) : (
            <div className="bg-white border border-light-300 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-light-100">
                  <thead className="bg-light-400 text-xs font-semibold text-light-200 border-b border-light-300 uppercase">
                    <tr>
                      <th className="px-6 py-4">Student Details</th>
                      <th className="px-6 py-4">Required Document</th>
                      <th className="px-6 py-4">File Submitted</th>
                      <th className="px-6 py-4">Submitted At</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-300">
                    {getFilteredSubmissions().map((sub) => {
                      const req = collection.requirements.find((r) => r.id === sub.requirementId);
                      return (
                        <tr key={sub.id} className="hover:bg-light-400/50">
                          <td className="px-6 py-4">
                            <div className="font-bold">{sub.studentName}</div>
                            <div className="text-xs text-light-200">{sub.studentRollNumber}</div>
                            {sub.studentEmail && (
                              <div className="text-[10px] text-light-200">{sub.studentEmail}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold">{req?.title || "Unknown"}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Thumbnail type={sub.file.type} extension={sub.file.extension} className="!h-6 !w-6" />
                              <span className="truncate max-w-[150px]" title={sub.file.name}>
                                {sub.file.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <FormattedDateTime date={sub.submittedAt} className="text-xs" />
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-semibold inline-block ${
                                sub.status === "Pending"
                                  ? "bg-amber-100 text-amber-600"
                                  : sub.status === "Approved"
                                  ? "bg-brand/10 text-brand"
                                  : "bg-red/10 text-red"
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              onClick={() => {
                                setActiveSubmission(sub);
                                setReviewRemarks(sub.remarks || "");
                                setReviewOpen(true);
                              }}
                              className="bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold px-4 h-8 rounded-full"
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Requirement Modal Dialog */}
      <Dialog open={editReqOpen} onOpenChange={setEditReqOpen}>
        <DialogContent className="shad-dialog">
          <form onSubmit={handleUpdateRequirement}>
            <DialogHeader>
              <DialogTitle className="text-light-100 font-bold">Edit Requirement Settings</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Requirement Name</label>
                <Input
                  value={editReqTitle}
                  onChange={(e) => setEditReqTitle(e.target.value)}
                  required
                  className="shad-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-light-100">Description (optional)</label>
                <textarea
                  value={editReqDesc}
                  onChange={(e) => setEditReqDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-light-100">Deadline (optional)</label>
                  <Input
                    type="datetime-local"
                    value={editReqDeadline}
                    onChange={(e) => setEditReqDeadline(e.target.value)}
                    className="shad-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-light-100">Max File Size (MB)</label>
                  <Input
                    type="number"
                    value={editReqMaxMb}
                    onChange={(e) => setEditReqMaxMb(parseInt(e.target.value) || 1)}
                    min={1}
                    required
                    className="shad-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-light-100 block">Accepted Formats</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["PDF", "PNG", "JPEG", "DOCX", "ZIP"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEditFileType(type)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        editReqFileTypes.includes(type)
                          ? "bg-brand/10 border-brand text-brand"
                          : "bg-white border-light-300 text-light-200 hover:bg-light-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditReqOpen(false)} className="rounded-full h-[48px]">
                Cancel
              </Button>
              <Button type="submit" disabled={updatingReq} className="bg-brand text-white rounded-full h-[48px]">
                {updatingReq ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submission Review Modal Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="shad-dialog max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-light-100 font-bold">Review Submission Document</DialogTitle>
          </DialogHeader>

          {activeSubmission && (
            <div className="space-y-6 py-4 text-left">
              {/* Submitter Details */}
              <div className="bg-light-400/50 rounded-2xl p-4 border border-light-300">
                <h4 className="text-xs font-bold text-light-200 uppercase mb-3">Submitter Profile</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-light-200 font-medium block">Full Name</span>
                    <span className="font-semibold text-light-100">{activeSubmission.studentName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-light-200 font-medium block">Roll / ID Number</span>
                    <span className="font-semibold text-light-100">{activeSubmission.studentRollNumber}</span>
                  </div>
                  {activeSubmission.studentEmail && (
                    <div className="col-span-2">
                      <span className="text-xs text-light-200 font-medium block">Email Address</span>
                      <span className="font-semibold text-light-100">{activeSubmission.studentEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submitted File Details & Preview Action */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-light-200 uppercase">Uploaded Document</h4>
                <div className="flex items-center justify-between bg-white border border-light-300 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Thumbnail type={activeSubmission.file.type} extension={activeSubmission.file.extension} className="!h-10 !w-10" />
                    <div>
                      <p className="text-sm font-semibold text-light-100 truncate max-w-[200px]" title={activeSubmission.file.name}>
                        {activeSubmission.file.name}
                      </p>
                      <p className="text-xs text-light-200">{convertFileSize(activeSubmission.file.size)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/api/files/${activeSubmission.fileId}/view`} target="_blank">
                      <Button variant="outline" className="text-xs font-semibold px-4 h-9 rounded-full">
                        Preview
                      </Button>
                    </Link>
                    <Link href={`/api/files/${activeSubmission.fileId}/download`}>
                      <Button className="bg-brand text-white text-xs font-semibold px-4 h-9 rounded-full">
                        Download
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Remarks/Status Update Action Forms */}
              <div className="space-y-4 pt-2 border-t border-light-300">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-light-100">Review Remarks / Feedback</label>
                  <textarea
                    placeholder="Provide optional feedback or reason for rejection..."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleReviewSubmission("Rejected")}
                    disabled={reviewing}
                    className="bg-red hover:bg-red/90 text-white rounded-full flex-1 h-[48px]"
                  >
                    Reject Submission
                  </Button>
                  <Button
                    onClick={() => handleReviewSubmission("Approved")}
                    disabled={reviewing}
                    className="bg-brand hover:bg-brand-100 text-white rounded-full flex-1 h-[48px]"
                  >
                    Approve Submission
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
