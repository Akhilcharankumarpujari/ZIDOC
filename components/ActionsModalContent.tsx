import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const ImageThumbnail = ({ file }: { file: Models.Document }) => (
  <div className="file-details-thumbnail">
    <Thumbnail type={file.type} extension={file.extension} url={file.url} />
    <div className="flex flex-col">
      <p className="subtitle-2 mb-1">{file.name}</p>
      <FormattedDateTime date={file.$createdAt} className="caption" />
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex">
    <p className="file-details-label text-left">{label}</p>
    <p className="file-details-value text-left">{value}</p>
  </div>
);

export const FileDetails = ({ file }: { file: Models.Document }) => {
  return (
    <>
      <ImageThumbnail file={file} />
      <div className="space-y-4 px-2 pt-2">
        <DetailRow label="Format:" value={file.extension} />
        <DetailRow label="Size:" value={convertFileSize(file.size)} />
        <DetailRow label="Owner:" value={file.owner.fullName} />
        <DetailRow label="Last edit:" value={formatDateTime(file.$updatedAt)} />
      </div>
    </>
  );
};

interface Props {
  file: Models.Document;
  onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
  onRemove: (email: string) => void;
}

export const ShareInput = ({ file, onInputChange, onRemove }: Props) => {
  const [isLinkActive, setIsLinkActive] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLink, setLoadingLink] = useState(true);

  useEffect(() => {
    async function loadLinkDetails() {
      try {
        const res = await fetch(`/api/shared-links?documentId=${file.$id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.token) {
            setIsLinkActive(data.isActive);
            setShareToken(data.token);
            setAllowDownload(data.allowDownload);
            if (data.expiresAt) {
              const date = new Date(data.expiresAt);
              const formattedDate = date.toISOString().slice(0, 16);
              setExpiresAt(formattedDate);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load share settings:", err);
      } finally {
        setLoadingLink(false);
      }
    }
    loadLinkDetails();
  }, [file.$id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shared-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: file.$id,
          isActive: isLinkActive,
          password: linkPassword === "" ? (shareToken ? undefined : null) : linkPassword,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          allowDownload,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareToken(data.token);
        alert("Sharing settings updated successfully!");
      } else {
        alert(data.error || "Failed to update sharing settings.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Shareable link copied to clipboard!");
  };

  return (
    <>
      <ImageThumbnail file={file} />

      <div className="share-wrapper">
        <p className="subtitle-2 pl-1 text-light-100">
          Share file with other users
        </p>
        <Input
          type="email"
          placeholder="Enter email address"
          onChange={(e) => onInputChange(e.target.value.trim().split(","))}
          className="share-input-field"
        />
        <div className="pt-4">
          <div className="flex justify-between">
            <p className="subtitle-2 text-light-100">Shared with</p>
            <p className="subtitle-2 text-light-200">
              {file.users.length} users
            </p>
          </div>

          <ul className="pt-2">
            {file.users.map((email: string) => (
              <li
                key={email}
                className="flex items-center justify-between gap-2"
              >
                <p className="subtitle-2">{email}</p>
                <Button
                  onClick={() => onRemove(email)}
                  className="share-remove-user"
                >
                  <Image
                    src="/assets/icons/remove.svg"
                    alt="Remove"
                    width={24}
                    height={24}
                    className="remove-icon"
                  />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Secure Public Share Link Section */}
      <div className="border-t border-light-300 pt-6 mt-6">
        <p className="subtitle-2 pl-1 text-light-100 mb-3 text-left">
          Secure Public Shareable Link
        </p>

        {loadingLink ? (
          <p className="text-sm text-light-200 pl-1 text-left">Loading link settings...</p>
        ) : (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-light-100">Enable Public Share Link</span>
              <input
                type="checkbox"
                checked={isLinkActive}
                onChange={(e) => setIsLinkActive(e.target.checked)}
                className="h-4 w-4 rounded border-light-300 text-brand focus:ring-brand"
              />
            </div>

            {isLinkActive && (
              <div className="space-y-3 pt-2">
                {shareToken && (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                      className="shad-input text-xs"
                    />
                    <Button onClick={handleCopyLink} className="bg-brand text-white text-xs px-4 rounded-xl">
                      Copy
                    </Button>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-light-100">Set Password Protection (optional)</label>
                  <Input
                    type="password"
                    placeholder="Enter link password (or leave empty)"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="shad-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-light-100">Expiration Date (optional)</label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="shad-input text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-light-100">Allow Downloads</span>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="h-4 w-4 rounded border-light-300 text-brand focus:ring-brand"
                  />
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-brand hover:bg-brand-100 text-white w-full text-sm font-semibold py-2 rounded-xl h-[42px] mt-2"
                >
                  {saving ? "Saving Settings..." : "Save Link Settings"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
