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
  categoryId: string;
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  requirements: Requirement[];
}

interface CollectionDetail {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  collectionToken: string;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}

export default function CollectionDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requirements" | "submissions">("requirements");

  // Expand/collapse category states
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Category creation states
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Rename Category states
  const [editCatOpen, setEditCatOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState("");
  const [editCatName, setEditCatName] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");
  const [updatingCat, setUpdatingCat] = useState(false);

  // Requirement creation states
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [targetCatId, setTargetCatId] = useState("");
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqDeadline, setReqDeadline] = useState("");
  const [reqMaxMb, setReqMaxMb] = useState(10);
  const [reqFileTypes, setReqFileTypes] = useState<string[]>([]);
  const [creatingReq, setCreatingReq] = useState(false);

  // Edit/Move Requirement states
  const [editReqOpen, setEditReqOpen] = useState(false);
  const [editingReqId, setEditingReqId] = useState("");
  const [editReqTitle, setEditReqTitle] = useState("");
  const [editReqDesc, setEditReqDesc] = useState("");
  const [editReqDeadline, setEditReqDeadline] = useState("");
  const [editReqMaxMb, setEditReqMaxMb] = useState(10);
  const [editReqFileTypes, setEditReqFileTypes] = useState<string[]>([]);
  const [editReqCatId, setEditReqCatId] = useState("");
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCreatingCat(true);

    try {
      const res = await fetch(`/api/collections/${id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });

      if (res.ok) {
        setCatName("");
        setCatDesc("");
        setCatModalOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to create category.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingCat(false);
    }
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || "");
    setEditCatOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCat(true);

    try {
      const res = await fetch(`/api/collections/${id}/categories/${editingCatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCatName, description: editCatDesc }),
      });

      if (res.ok) {
        setEditCatOpen(false);
        fetchCollectionDetail();
      } else {
        alert("Failed to update category.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Are you sure you want to delete this category? All requirements and document submissions under this category will be permanently lost.")) return;
    try {
      const res = await fetch(`/api/collections/${id}/categories/${catId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCollectionDetail();
      } else {
        alert("Failed to delete category.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !targetCatId) return;
    setCreatingReq(true);

    const payload = {
      categoryId: targetCatId,
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
    setEditReqCatId(req.categoryId);
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
      categoryId: editReqCatId,
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

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
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

  // Aggregate stats across nested categories
  let totalRequirements = 0;
  let totalSubmissions = 0;
  let totalPending = 0;
  let totalApproved = 0;
  let totalRejected = 0;

  collection.categories.forEach((cat) => {
    totalRequirements += cat.requirements.length;
    cat.requirements.forEach((req) => {
      totalSubmissions += req.submissionsCount;
      totalPending += req.pendingCount;
      totalApproved += req.approvedCount;
      totalRejected += req.rejectedCount;
    });
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Title section with Settings Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-light-300 pb-6 mb-8">
        <div className="text-left">
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
          <div className="flex items-center gap-2 mt-4 bg-light-400/50 border border-light-300 rounded-2xl p-3 w-fit">
            <span className="text-xs font-bold text-light-100">Collection Link:</span>
            <span className="text-xs font-semibold text-brand select-all">
              {typeof window !== "undefined" ? `${window.location.origin}/collect/${collection.collectionToken}` : `/collect/${collection.collectionToken}`}
            </span>
            <Button
              onClick={() => {
                const url = `${window.location.origin}/collect/${collection.collectionToken}`;
                navigator.clipboard.writeText(url);
                alert("Collection upload portal link copied to clipboard!");
              }}
              className="bg-brand hover:bg-brand-100 text-white rounded-full text-[10px] font-bold px-3 h-6 ml-2"
            >
              Copy Link
            </Button>
          </div>
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
                  <div className="space-y-1 text-left">
                    <label className="text-sm font-semibold text-light-100">Collection Title</label>
                    <Input
                      value={editColTitle}
                      onChange={(e) => setEditColTitle(e.target.value)}
                      required
                      className="shad-input"
                    />
                  </div>

                  <div className="space-y-1 text-left">
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
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm text-left">
          <span className="text-xs text-light-200 font-semibold block mb-1">Total Requirements</span>
          <span className="text-2xl font-bold text-light-100">{totalRequirements}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm text-left">
          <span className="text-xs text-light-200 font-semibold block mb-1">Pending Submissions</span>
          <span className="text-2xl font-bold text-amber-500">{totalPending}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm text-left">
          <span className="text-xs text-light-200 font-semibold block mb-1">Approved Documents</span>
          <span className="text-2xl font-bold text-brand">{totalApproved}</span>
        </div>
        <div className="bg-white border border-light-300 rounded-3xl p-5 shadow-sm text-left">
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
            <h2 className="text-lg font-bold text-light-100">Document Folders & Requirements</h2>

            <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand text-white rounded-full text-xs font-semibold px-4 h-9">
                  + Add Category Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="shad-dialog">
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle className="text-light-100 font-bold">Add Category Folder</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-6">
                    <div className="space-y-1 text-left">
                      <label className="text-sm font-semibold text-light-100">Folder Name</label>
                      <Input
                        placeholder="e.g. 1st Year, PAN & KYC, onboarding"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        required
                        className="shad-input"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-sm font-semibold text-light-100">Description (optional)</label>
                      <textarea
                        placeholder="Provide details about documents in this category..."
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <DialogFooter className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)} className="rounded-full h-[48px]">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingCat} className="bg-brand text-white rounded-full h-[48px]">
                      {creatingCat ? "Creating..." : "Create Folder"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {collection.categories.length === 0 ? (
            <div className="bg-white border border-light-300 rounded-3xl p-12 text-center shadow-sm">
              <p className="text-light-200 body-2">No categories added to this collection yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {collection.categories.map((cat) => {
                const isCollapsed = !!collapsedCategories[cat.id];
                return (
                  <div key={cat.id} className="bg-white border border-light-300 rounded-3xl overflow-hidden shadow-sm">
                    {/* Category Folder Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-light-400/30 border-b border-light-300">
                      <div className="flex items-center gap-3 cursor-pointer flex-1 text-left" onClick={() => toggleCategoryCollapse(cat.id)}>
                        <span className="text-xl">{isCollapsed ? "📁" : "📂"}</span>
                        <div>
                          <h3 className="text-base font-bold text-light-100 flex items-center gap-2">
                            {cat.name}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-light-300 text-light-200">
                              {cat.requirements.length} required
                            </span>
                          </h3>
                          {cat.description && (
                            <p className="text-xs text-light-200 mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setTargetCatId(cat.id);
                            setReqModalOpen(true);
                          }}
                          className="bg-brand text-white text-xs font-semibold px-3 h-8 rounded-full"
                        >
                          + Add Requirement
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-light-300"
                        >
                          <Image src="/assets/icons/edit.svg" alt="edit" width={16} height={16} />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-light-300 text-red"
                        >
                          <Image src="/assets/icons/delete.svg" alt="delete" width={16} height={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Requirements List (Collapsible) */}
                    {!isCollapsed && (
                      <div className="p-5 divide-y divide-light-300">
                        {cat.requirements.length === 0 ? (
                          <p className="text-xs text-light-200 py-4 text-center">No requirements in this category.</p>
                        ) : (
                          cat.requirements.map((req) => (
                            <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 first:pt-0 last:pb-0">
                              <div className="text-left space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-light-100">{req.title}</h4>
                                  {req.deadline && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                      new Date() > new Date(req.deadline) ? "bg-red/10 text-red" : "bg-brand/10 text-brand"
                                    }`}>
                                      Deadline: <FormattedDateTime date={req.deadline} />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-light-200">{req.description || "No description."}</p>
                                <div className="flex items-center gap-3 text-[10px] text-light-200 font-semibold">
                                  <span>Limit: {req.maxFileSize / (1024 * 1024)}MB</span>
                                  {req.acceptedFileTypes.length > 0 && (
                                    <span>Formats: {req.acceptedFileTypes.join(", ")}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-left sm:text-right space-y-1 min-w-[100px]">
                                  <p className="text-sm font-bold text-light-100">{req.submissionsCount} Uploaded</p>
                                  <p className="text-[10px] text-light-200">
                                    <span className="text-amber-500 font-semibold">{req.pendingCount} pending</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleOpenEditRequirement(req)}
                                    className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-light-300"
                                  >
                                    <Image src="/assets/icons/edit.svg" alt="edit" width={16} height={16} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeleteRequirement(req.id)}
                                    className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-light-300 text-red"
                                  >
                                    <Image src="/assets/icons/delete.svg" alt="delete" width={16} height={16} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submissions reviews */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {/* Search bar & filter states */}
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

          {/* Grouped Submissions Log by Category folders */}
          <div className="space-y-6">
            {collection.categories.map((cat) => {
              // Get submissions under this category matching search/filter
              const catSubmissions = cat.requirements.flatMap((req) =>
                req.submissions.filter((sub) => {
                  const matchSearch =
                    sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sub.studentRollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (sub.studentEmail && sub.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()));

                  const matchFilter = statusFilter === "All" || sub.status === statusFilter;
                  return matchSearch && matchFilter;
                })
              );

              if (catSubmissions.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white border border-light-300 rounded-3xl overflow-hidden shadow-sm">
                  {/* Category Section header */}
                  <div className="p-4 bg-light-400/20 border-b border-light-300 flex items-center gap-2 text-left">
                    <span className="text-lg">📁</span>
                    <span className="font-bold text-light-100 text-sm uppercase">{cat.name} Submissions</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-light-100">
                      <thead className="bg-light-400/50 text-[10px] font-semibold text-light-200 border-b border-light-300 uppercase">
                        <tr>
                          <th className="px-6 py-3">Student Details</th>
                          <th className="px-6 py-3">Requirement</th>
                          <th className="px-6 py-3">File Submitted</th>
                          <th className="px-6 py-3">Submitted At</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-300">
                        {catSubmissions.map((sub) => {
                          const req = cat.requirements.find((r) => r.id === sub.requirementId);
                          return (
                            <tr key={sub.id} className="hover:bg-light-400/30">
                              <td className="px-6 py-4">
                                <div className="font-bold">{sub.studentName}</div>
                                <div className="text-xs text-light-200">{sub.studentRollNumber}</div>
                                {sub.studentEmail && (
                                  <div className="text-[10px] text-light-200">{sub.studentEmail}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 font-semibold">{req?.title}</td>
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
              );
            })}

            {totalSubmissions > 0 && getFilteredSubmissions().length === 0 && (
              <div className="bg-white border border-light-300 rounded-3xl p-12 text-center shadow-sm">
                <p className="text-light-200 body-2">No submissions matched your search or filters.</p>
              </div>
            )}

            {totalSubmissions === 0 && (
              <div className="bg-white border border-light-300 rounded-3xl p-12 text-center shadow-sm">
                <p className="text-light-200 body-2">No documents have been uploaded to this collection yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper function to get flat list of filtered submissions for length checks */}
      {(() => {
        const getFilteredSubmissions = () => {
          let allSubs: Submission[] = [];
          collection.categories.forEach((cat) => {
            cat.requirements.forEach((req) => {
              req.submissions.forEach((sub) => {
                allSubs.push(sub);
              });
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
        return null;
      })()}

      {/* Edit Category Modal Dialog */}
      <Dialog open={editCatOpen} onOpenChange={setEditCatOpen}>
        <DialogContent className="shad-dialog">
          <form onSubmit={handleUpdateCategory}>
            <DialogHeader>
              <DialogTitle className="text-light-100 font-bold">Edit Category Folder</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100">Folder Name</label>
                <Input
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  required
                  className="shad-input"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100">Description</label>
                <textarea
                  value={editCatDesc}
                  onChange={(e) => setEditCatDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditCatOpen(false)} className="rounded-full h-[48px]">
                Cancel
              </Button>
              <Button type="submit" disabled={updatingCat} className="bg-brand text-white rounded-full h-[48px]">
                {updatingCat ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Requirement Modal Dialog */}
      <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
        <DialogContent className="shad-dialog">
          <form onSubmit={handleCreateRequirement}>
            <DialogHeader>
              <DialogTitle className="text-light-100 font-bold">Add Requirement Document</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100">Target Category Folder</label>
                <select
                  value={targetCatId}
                  onChange={(e) => setTargetCatId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select a category...</option>
                  {collection.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100">Requirement Name</label>
                <Input
                  placeholder="e.g. 1st Year Marksheet, PAN Card, Resume"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  required
                  className="shad-input"
                />
              </div>

              <div className="space-y-1 text-left">
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
                <div className="space-y-1 text-left">
                  <label className="text-sm font-semibold text-light-100">Deadline (optional)</label>
                  <Input
                    type="datetime-local"
                    value={reqDeadline}
                    onChange={(e) => setReqDeadline(e.target.value)}
                    className="shad-input"
                  />
                </div>
                <div className="space-y-1 text-left">
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

              <div className="space-y-2 text-left">
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

      {/* Edit/Move Requirement Modal Dialog */}
      <Dialog open={editReqOpen} onOpenChange={setEditReqOpen}>
        <DialogContent className="shad-dialog">
          <form onSubmit={handleUpdateRequirement}>
            <DialogHeader>
              <DialogTitle className="text-light-100 font-bold">Edit Requirement Settings</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100 font-bold">Category Folder (Move Requirement)</label>
                <select
                  value={editReqCatId}
                  onChange={(e) => setEditReqCatId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
                >
                  {collection.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100 font-bold">Requirement Name</label>
                <Input
                  value={editReqTitle}
                  onChange={(e) => setEditReqTitle(e.target.value)}
                  required
                  className="shad-input"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-sm font-semibold text-light-100 font-bold">Description (optional)</label>
                <textarea
                  value={editReqDesc}
                  onChange={(e) => setEditReqDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-sm font-semibold text-light-100 font-bold">Deadline (optional)</label>
                  <Input
                    type="datetime-local"
                    value={editReqDeadline}
                    onChange={(e) => setEditReqDeadline(e.target.value)}
                    className="shad-input"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-sm font-semibold text-light-100 font-bold">Max File Size (MB)</label>
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

              <div className="space-y-2 text-left">
                <label className="text-sm font-semibold text-light-100 font-bold block">Accepted Formats</label>
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
