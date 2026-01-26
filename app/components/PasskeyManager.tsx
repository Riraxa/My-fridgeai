//app/components/PasskeyManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/app/components/ui/button";
import PasskeyButton from "./PasskeyButton";

interface PasskeyInfo {
  id: string;
  name: string | null;
  createdAt: string;
  userAgent: string | null;
  transports: string | null;
}

/**
 * Generate a display name based on userAgent or transports
 */
function generateDisplayName(passkey: PasskeyInfo): string {
  if (passkey.name) return passkey.name;

  const ua = passkey.userAgent?.toLowerCase() ?? "";
  let transports: string[] = [];
  try {
    if (passkey.transports) {
      transports = JSON.parse(passkey.transports);
    }
  } catch {
    // ignore
  }

  // Check for platform/device hints
  if (ua.includes("windows")) {
    if (ua.includes("edge")) return "Windows Hello (Edge)";
    if (ua.includes("chrome")) return "Windows Hello (Chrome)";
    if (ua.includes("firefox")) return "Windows Hello (Firefox)";
    return "Windows Hello";
  }
  if (ua.includes("iphone")) {
    if (ua.includes("safari")) return "iPhone (Safari)";
    return "iPhone";
  }
  if (ua.includes("ipad")) {
    if (ua.includes("safari")) return "iPad (Safari)";
    return "iPad";
  }
  if (ua.includes("mac")) {
    if (ua.includes("safari")) return "Mac (Safari)";
    if (ua.includes("chrome")) return "Mac (Chrome)";
    return "Mac";
  }
  if (ua.includes("android")) {
    if (ua.includes("chrome")) return "Android (Chrome)";
    return "Android";
  }

  // Check transports
  if (transports.includes("usb")) return "セキュリティキー (USB)";
  if (transports.includes("nfc")) return "セキュリティキー (NFC)";
  if (transports.includes("ble")) return "セキュリティキー (Bluetooth)";
  if (transports.includes("internal")) return "内蔵認証器";

  return "不明なデバイス";
}

export default function PasskeyManager() {
  const { data: session } = useSession();
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<PasskeyInfo | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // After-registration modal
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [newPasskeyId, setNewPasskeyId] = useState<string | null>(null);
  const [newPasskeyName, setNewPasskeyName] = useState("");

  // Googleログインユーザーかチェック
  const isGoogleUser = session?.user?.accounts?.some(
    (account) => account.provider === "google",
  );

  const fetchPasskeys = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/webauthn/passkeys");
      const data = await res.json();
      if (data.ok && data.passkeys) {
        setPasskeys(data.passkeys);
      } else {
        setError(data.message || "パスキーの取得に失敗しました");
      }
    } catch {
      setError("パスキーの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/webauthn/passkeys/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirm(null);
      } else {
        setError(data.message || "削除に失敗しました");
      }
    } catch {
      setError("削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/webauthn/passkeys/${renameModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const data = await res.json();
      if (data.ok && data.passkey) {
        setPasskeys((prev) =>
          prev.map((p) => (p.id === data.passkey.id ? data.passkey : p)),
        );
        setRenameModal(null);
        setRenameValue("");
      } else {
        setError(data.message || "名前の変更に失敗しました");
      }
    } catch {
      setError("名前の変更に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAfterRegistrationRename = async () => {
    if (!newPasskeyId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/webauthn/passkeys/${newPasskeyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPasskeyName }),
      });
      const data = await res.json();
      if (data.ok && data.passkey) {
        setPasskeys((prev) =>
          prev.map((p) => (p.id === data.passkey.id ? data.passkey : p)),
        );
      }
    } catch {
      // Ignore, naming is optional
    } finally {
      setShowNamingModal(false);
      setNewPasskeyId(null);
      setNewPasskeyName("");
      setActionLoading(false);
    }
  };

  // Callback when PasskeyButton successfully registers
  const onRegistrationSuccess = () => {
    // Refresh list to get new passkey
    fetchPasskeys().then(() => {
      // Find the newest passkey (assuming it's the first after refresh with desc order)
      // We'll show naming modal for it
      setTimeout(() => {
        if (passkeys.length > 0 || true) {
          // Re-fetch to ensure we have the list
          fetch("/api/auth/webauthn/passkeys")
            .then((r) => r.json())
            .then((data) => {
              if (data.ok && data.passkeys && data.passkeys.length > 0) {
                const newest = data.passkeys[0];
                setNewPasskeyId(newest.id);
                setShowNamingModal(true);
              }
            });
        }
      }, 500);
    });
  };

  // Googleログインユーザーの場合はパスキー設定を表示しない
  if (isGoogleUser) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">パスキー設定</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Googleアカウントでログインしているため、パスキー設定は不要です。Google側のセキュリティ設定をご利用ください。
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">パスキー設定</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">パスキー設定</h3>
      <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
        パスワードの代わりに、指紋認証や顔認証で安全にログインできます。
      </p>

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {passkeys.length === 0 ? (
        <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
          このアカウントでは、まだパスキーが登録されていません。
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => {
                      setRenameModal(passkey);
                      setRenameValue(passkey.name || "");
                    }}
                    title="クリックして名前を変更"
                  >
                    {generateDisplayName(passkey)}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      登録日：
                      {new Date(passkey.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(passkey.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2"
                    >
                      削除
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration button */}
      <div className="pt-2">
        <PasskeyButton onSuccess={onRegistrationSuccess} />
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="modal-card relative w-full max-w-sm p-6">
            <h4 className="text-lg font-bold mb-2">パスキーを削除しますか？</h4>
            <p className="text-sm mb-4">
              この操作は取り消せません。
              <br />
              このデバイスからのパスキーログインはできなくなります。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
              >
                {actionLoading ? "削除中..." : "削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="modal-card relative w-full max-w-sm p-6">
            <h4 className="text-lg font-bold mb-4">パスキーの名前を変更</h4>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="例：自分のノートPC"
              className="w-full p-2 border rounded mb-4 bg-transparent text-gray-900 border-gray-300 dark:text-gray-200 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameModal(null);
                  setRenameValue("");
                }}
                disabled={actionLoading}
              >
                キャンセル
              </Button>
              <Button onClick={handleRename} disabled={actionLoading}>
                {actionLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* After-registration naming modal */}
      {showNamingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="modal-card relative w-full max-w-sm p-6">
            <h4 className="text-lg font-bold mb-2">
              パスキーの登録が完了しました！
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              このパスキーに名前を付けてください（任意）
            </p>
            <input
              type="text"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder="例：自分のノートPC、iPhone"
              className="w-full p-2 border rounded mb-4 bg-transparent text-gray-900 border-gray-300 dark:text-gray-200 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNamingModal(false);
                  setNewPasskeyId(null);
                  setNewPasskeyName("");
                }}
                disabled={actionLoading}
              >
                スキップ
              </Button>
              <Button
                onClick={handleAfterRegistrationRename}
                disabled={actionLoading || !newPasskeyName.trim()}
              >
                {actionLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
