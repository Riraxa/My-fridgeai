"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { User, Pencil, Check, X } from "lucide-react";
import ImageCropperModal from "@/app/components/ImageCropperModal";

interface ProfileSectionProps {
  displaySession: Session;
  updateSession: (data: any) => Promise<Session | null>;
}

export default function ProfileSection({ displaySession, updateSession }: ProfileSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (data: { name?: string; image?: string }) => {
    try {
      const res = await fetch("/api/account/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("更新に失敗しました。");

      await updateSession({
        ...displaySession,
        user: {
          ...displaySession.user,
          ...data,
        },
      });

      toast.success("プロフィールを更新しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました。");
    }
  };

  const saveName = async () => {
    setIsSavingName(true);
    await handleUpdateProfile({ name: tempName });
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("画像サイズは2MB以下にしてください。");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();

    reader.onloadend = () => {
      try {
        const base64String = reader.result as string;
        if (!base64String?.startsWith("data:image/")) {
          throw new Error("画像の読み込みに失敗しました");
        }
        setSelectedImage(base64String);
        setShowCropper(true);
      } catch (error) {
        console.error("Image processing error:", error);
        toast.error("画像の処理に失敗しました。別の画像をお試しください。");
      } finally {
        setIsUploadingImage(false);
      }
    };

    reader.onerror = () => {
      toast.error("画像の読み込みに失敗しました。別の画像をお試しください。");
      setIsUploadingImage(false);
    };

    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: string) => {
    setShowCropper(false);
    setSelectedImage("");
    await handleUpdateProfile({ image: croppedImage });
  };

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">アカウント情報</h2>

      <div className="card">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
              >
                {displaySession.user?.image ? (
                  <Image
                    src={displaySession.user.image}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User style={{ color: "var(--color-text-secondary)" }} />
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full shadow-lg border hover:scale-110 transition-transform"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
                title="アイコンを変更"
              >
                <Pencil size={12} style={{ color: "var(--color-text-secondary)" }} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-2 py-1 flex-1 outline-none text-sm"
                      style={{
                        background: "var(--surface-bg)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--surface-border)",
                        borderRadius: "0.25rem",
                      }}
                      placeholder="名前を入力"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                    />
                    <button
                      onClick={saveName}
                      disabled={isSavingName}
                      className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-lg truncate">
                      {displaySession.user?.name ?? "未設定"}
                    </div>
                    <button
                      onClick={() => {
                        setTempName(displaySession.user?.name ?? "");
                        setIsEditingName(true);
                      }}
                      className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {displaySession.user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageCropperModal
        isOpen={showCropper}
        imageSrc={selectedImage}
        onClose={() => {
          setShowCropper(false);
          setSelectedImage("");
        }}
        onCrop={handleCropComplete}
      />
    </section>
  );
}
