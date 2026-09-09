"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 ml-1 text-[11px] font-medium uppercase tracking-wide text-[#7a7a7a] dark:text-[#cccccc]">
        {label}
      </p>
      <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
        {children}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, update } = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [name, setName] = useState(session?.user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const image = session?.user?.image || null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSrc(reader.result);
        setCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (blob: Blob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Gagal upload foto profil");
        return false;
      }

      await update({ image: data.image });
      toast.success("Foto profil diperbarui");
      return true;
    } catch {
      toast.error("Gagal upload foto profil");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    const ok = await uploadAvatar(blob);
    if (ok) {
      setCropOpen(false);
      setCropSrc(null);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus foto profil");
      } else {
        await update({ image: null });
        toast.success("Foto profil dihapus");
      }
    } catch {
      toast.error("Gagal menghapus foto profil");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan nama");
      } else {
        await update({ name: name.trim() });
        toast.success("Nama sapaan diperbarui");
      }
    } catch {
      toast.error("Gagal menyimpan nama");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      toast.error("Password saat ini wajib diisi");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Gagal mengganti password");
      } else {
        toast.success("Password berhasil diganti");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Gagal mengganti password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-4">
        <Section label="Foto Profil">
          <div className="flex flex-col items-center gap-4 px-4 py-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#0066cc]/10 ring-1 ring-[#f0f0f0] dark:bg-[#2997ff]/15 dark:ring-white/10"
              aria-label="Ubah foto profil"
            >
              {image ? (
                <Image
                  src={image}
                  alt={session?.user?.name || "Avatar"}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[#0066cc] dark:text-[#2997ff]">
                  {(session?.user?.name || "U").charAt(0)?.toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Ganti Foto
              </Button>
              {image && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={uploading}
                  onClick={handleRemoveImage}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  Hapus
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </Section>

        <Section label="Profil">
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Sapaan</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama yang tampil di home"
              />
              <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Nama ini tampil sebagai sapaan di beranda.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
                readOnly
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={savingName}
              onClick={handleSaveName}
            >
              {savingName ? "Menyimpan..." : "Simpan Nama"}
            </Button>
          </div>
        </Section>

        <Section label="Ganti Password">
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password saat ini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={savingPassword}
              onClick={handleSavePassword}
            >
              {savingPassword ? "Menyimpan..." : "Ganti Password"}
            </Button>
          </div>
        </Section>
      </div>

      <AvatarCropDialog
        key={cropSrc ?? "idle"}
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={() => {
          setCropOpen(false);
          setCropSrc(null);
        }}
        onConfirm={handleCropConfirm}
      />
    </AppShell>
  );
}
