"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Thumbnail from "@/components/Thumbnail";
import { convertFileSize } from "@/lib/utils";

interface ShareDetails {
  isActive: boolean;
  isExpired: boolean;
  requiresPassword: boolean;
  allowDownload: boolean;
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export default function PublicSharePage() {
  const { token } = useParams() as { token: string };
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ShareDetails | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function fetchShareDetails() {
      try {
        const res = await fetch(`/api/shared-links/${token}`);
        if (!res.ok) {
          setError("This link is invalid, inactive, or has expired.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!data.isActive || data.isExpired) {
          setError("This link is inactive or has expired.");
        } else {
          setDetails(data);
          if (!data.requiresPassword) {
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while loading this link.");
      } finally {
        setLoading(false);
      }
    }
    fetchShareDetails();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");

    try {
      const res = await fetch(`/api/shared-links/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Incorrect password. Please try again.");
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify password. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    if (!details) return;
    const downloadUrl = `/api/shared-links/${token}/download?password=${encodeURIComponent(password)}`;
    window.open(downloadUrl, "_blank");
  };

  const handlePreview = () => {
    if (!details) return;
    const viewUrl = `/api/shared-links/${token}/view?password=${encodeURIComponent(password)}`;
    window.open(viewUrl, "_blank");
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
        <p className="mt-4 text-light-100 subtitle-1">Loading shared document...</p>
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

      {/* Main Card */}
      <main className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl bg-white p-8 shadow-sm border border-light-300">
        {error && !details && (
          <div className="flex flex-col items-center text-center space-y-4">
            <Image
              src="/assets/icons/info.svg"
              alt="error"
              width={64}
              height={64}
              className="opacity-50"
            />
            <h2 className="text-xl font-bold text-light-100">Access Denied</h2>
            <p className="text-light-200 body-2">{error}</p>
          </div>
        )}

        {details && !isAuthenticated && (
          <form onSubmit={handlePasswordSubmit} className="flex w-full flex-col space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="rounded-full bg-brand/10 p-4">
                <Image
                  src="/assets/icons/info.svg"
                  alt="lock"
                  width={36}
                  height={36}
                />
              </div>
              <h2 className="text-xl font-bold text-light-100">Password Protected</h2>
              <p className="text-light-200 body-2">
                This document requires a password to view or download.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shad-input"
                required
              />
              {error && <p className="text-red font-medium text-sm">*{error}</p>}
            </div>

            <Button
              type="submit"
              className="bg-brand hover:bg-brand-100 text-white rounded-full h-[52px] w-full"
              disabled={verifying}
            >
              {verifying ? "Verifying..." : "Access Document"}
            </Button>
          </form>
        )}

        {details && isAuthenticated && (
          <div className="flex w-full flex-col items-center text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-brand/5 border border-brand/10">
                <Thumbnail
                  type={details.file.type}
                  extension={details.file.extension}
                  className="!h-12 !w-12"
                />
              </div>
              <h2 className="text-lg font-bold text-light-100 truncate max-w-xs" title={details.file.name}>
                {details.file.name}
              </h2>
              <div className="flex items-center gap-3 text-light-200 text-sm">
                <span className="uppercase">{details.file.extension}</span>
                <span>•</span>
                <span>{convertFileSize(details.file.size)}</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                onClick={handlePreview}
                className="bg-brand/10 hover:bg-brand/20 text-brand rounded-full h-[52px] w-full"
              >
                Preview Document
              </Button>

              {details.allowDownload ? (
                <Button
                  onClick={handleDownload}
                  className="bg-brand hover:bg-brand-100 text-white rounded-full h-[52px] w-full"
                >
                  Download Document
                </Button>
              ) : (
                <p className="text-xs text-light-200 mt-2">
                  * Download permission is disabled by the owner.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-light-200">
        ZiDoc © {new Date().getFullYear()} — Secure Document Management Platform
      </footer>
    </div>
  );
}
