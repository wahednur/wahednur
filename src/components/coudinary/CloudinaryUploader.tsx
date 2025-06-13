"use client";

import {
  CldUploadWidget,
  CloudinaryUploadWidgetInfo,
  CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import Image from "next/image";
import { useState } from "react";

interface CloudinaryUploaderProps {
  onUpload: (url: string, publicId: string) => void;
  folder?: string;
  buttonText?: string;
}

export default function CloudinaryUploader({
  onUpload,
  folder = "uploads",
  buttonText = "Upload Image",
}: CloudinaryUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleUploadSuccess = (
    results: CloudinaryUploadWidgetResults | undefined
  ) => {
    if (results?.event !== "success") return;

    // Type guard to ensure info exists and is the expected type
    if (!results.info || typeof results.info === "string") return;

    const info = results.info as CloudinaryUploadWidgetInfo;
    const uploadedUrl = info.secure_url;
    const publicId = info.public_id;

    if (!uploadedUrl || !publicId) return;

    setPreviewUrl(uploadedUrl);
    onUpload(uploadedUrl, publicId);
  };

  return (
    <div className="space-y-4">
      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
        options={{
          folder,
          multiple: false,
          maxFiles: 1,
          sources: ["local", "url", "camera"],
        }}
        onSuccess={handleUploadSuccess}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="btn btn-filled"
          >
            {buttonText}
          </button>
        )}
      </CldUploadWidget>

      {previewUrl && (
        <div className="w-40 h-40 border rounded-md overflow-hidden">
          <Image
            src={previewUrl}
            alt="Uploaded preview"
            width={400}
            height={400}
            className="object-cover w-full h-full"
            priority={false}
          />
        </div>
      )}
    </div>
  );
}
