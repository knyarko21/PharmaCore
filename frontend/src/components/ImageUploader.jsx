
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import api from "../services/api";

// ======================================================
// ImageUploader
// ======================================================
//
// Props:
//   value    - current image URL (string)
//   onChange - called with the new URL after upload or removal
//   label    - optional field label
// ======================================================

const ImageUploader = ({
  value,
  onChange,
  label = "Medicine Image"
}) => {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be smaller than 3 MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post(
        "/uploads/medicine-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Upload failed."
        );
      }

      onChange(response.data.url);
    } catch (uploadError) {
      console.error("Image upload error:", uploadError);

      setError(
        uploadError.response?.data?.message ||
          uploadError.message ||
          "Unable to upload image."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setError("");
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
          <img
            src={value}
            alt="Medicine preview"
            className="h-40 w-full object-contain p-4"
          />

          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/60 text-zinc-300 transition hover:bg-rose-500/20 hover:text-rose-300"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-black/20 text-zinc-500 transition hover:border-violet-500/30 hover:bg-violet-500/[0.04] hover:text-violet-300 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus size={24} />
              <span className="text-xs font-medium">
                Click to upload an image
              </span>
              <span className="text-[10px] text-zinc-600">
                JPEG, PNG, WebP, or GIF · max 3 MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
};

export default ImageUploader;