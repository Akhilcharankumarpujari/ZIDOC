"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import FormattedDateTime from "@/components/FormattedDateTime";

interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  requirementsCount: number;
  submissionCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setCreateOpen(false);
        fetchCollections();
      } else {
        alert("Failed to create collection.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred creating collection.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="h1 text-light-100 font-bold">Document Collections</h1>
          <p className="body-2 text-light-200 mt-1">
            Create, manage, and collect documents securely from external users.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand hover:bg-brand-100 text-white rounded-full px-6 py-6 font-semibold flex items-center gap-2">
              <Image
                src="/assets/icons/upload.svg"
                alt="add"
                width={20}
                height={20}
                className="brightness-200"
              />
              Create Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="shad-dialog">
            <form onSubmit={handleCreateCollection}>
              <DialogHeader>
                <DialogTitle className="text-light-100 font-bold">
                  Create Document Collection
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-light-100">
                    Collection Title
                  </label>
                  <Input
                    placeholder="e.g. B.Tech 2026 Marksheets"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="shad-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-light-100">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Provide details about what documents are being collected..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-light-300 bg-white p-4 text-sm text-light-100 placeholder:text-light-200 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full h-[48px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-brand hover:bg-brand-100 text-white rounded-full h-[48px]"
                >
                  {creating ? "Creating..." : "Create Collection"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Image
            src="/assets/icons/loader-brand.svg"
            alt="loader"
            width={40}
            height={40}
            className="animate-spin"
          />
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-light-300 rounded-3xl p-12 shadow-sm">
          <Image
            src="/assets/images/files.png"
            alt="empty state"
            width={200}
            height={200}
            className="opacity-60 mb-6"
          />
          <h2 className="text-xl font-bold text-light-100">No collections found</h2>
          <p className="text-light-200 body-2 max-w-sm mt-2">
            Create your first collection to start requesting documents from students, employees, or clients.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="flex flex-col justify-between bg-white border border-light-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-light-100 truncate max-w-[200px]" title={col.title}>
                    {col.title}
                  </h3>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      col.isActive
                        ? "bg-brand/10 text-brand"
                        : "bg-light-300 text-light-200"
                    }`}
                  >
                    {col.isActive ? "Active" : "Archived"}
                  </span>
                </div>

                <p className="text-sm text-light-200 line-clamp-3 mb-6 min-h-[60px]">
                  {col.description || "No description provided."}
                </p>

                <div className="grid grid-cols-2 gap-4 border-t border-light-300 pt-4 mb-6">
                  <div>
                    <span className="text-xs text-light-200 font-medium">Requirements</span>
                    <p className="text-lg font-bold text-light-100">{col.requirementsCount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-light-200 font-medium">Submissions</span>
                    <p className="text-lg font-bold text-light-100">
                      {col.submissionCount}{" "}
                      {col.pendingCount > 0 && (
                        <span className="text-xs text-red font-medium">
                          ({col.pendingCount} new)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-light-200">
                  Created <FormattedDateTime date={col.createdAt} className="inline-block" />
                </span>

                <Link href={`/collections/${col.id}`} passHref>
                  <Button className="bg-brand/10 hover:bg-brand/20 text-brand rounded-full text-xs px-4 h-9">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
