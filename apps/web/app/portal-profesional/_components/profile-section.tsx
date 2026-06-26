"use client";

import { MapPin, Save, Stethoscope } from "lucide-react";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { SPECIALTY_OPTIONS } from "@/lib/specialty-labels";
import { useHealthHubStore } from "@/lib/healthhub-store";
import type { Professional } from "@/lib/healthhub-store";

type ProfileDraft = {
  displayName: string;
  bio: string;
  location: string;
  specialty: string;
  appointmentMode: string;
  basePrice: number;
  whatsappNumber: string;
  licenseNumber: string;
};

type Props = {
  professional: Professional;
  profileDraft: ProfileDraft;
  profileSaving: boolean;
  profileMessage: { kind: "success" | "error"; text: string } | null;
  avatarFile: File | null;
  avatarPreview: string | null;
  avatarUploading: boolean;
  avatarMessage: { kind: "success" | "error"; text: string } | null;
  onProfileDraftChange: (updater: (current: ProfileDraft | null) => ProfileDraft | null) => void;
  onSaveProfile: () => void;
  onAvatarFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadAvatar: () => void;
};

export function ProfileSection({
  avatarFile,
  avatarMessage,
  avatarPreview,
  avatarUploading,
  onAvatarFileChange,
  onProfileDraftChange,
  onSaveProfile,
  onUploadAvatar,
  profileDraft,
  profileMessage,
  profileSaving,
  professional,
}: Props) {
  const { apiBaseUrl } = useHealthHubStore();

  return (
    <Panel title="Perfil profesional">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
              <Stethoscope size={20} />
            </div>
            <div>
              <p className="font-semibold">{professional.displayName}</p>
              <p className="mt-1 text-sm text-slate-500">{professional.specialtyLabel}</p>
              <p className="mt-1 text-xs text-slate-500">
                Cédula {professional.licenseNumber || "sin registrar"} ·{" "}
                {professional.verificationStatus === "verified"
                  ? "Verificada"
                  : professional.verificationStatus === "rejected"
                    ? "Rechazada"
                    : "En revisión"}
              </p>
            </div>
          </div>
          <StatusPill
            label={professional.status === "active" ? "Publicado" : "Borrador"}
            status={professional.status === "active" ? "active" : "pending"}
          />
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Nombre para mostrar</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, displayName: event.target.value } : current))}
            value={profileDraft.displayName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Biografía</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, bio: event.target.value } : current))}
            placeholder="Cuenta tu enfoque, experiencia y a quién ayudas."
            value={profileDraft.bio}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Ubicación</span>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <MapPin size={16} className="text-primary" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, location: event.target.value } : current))}
              placeholder="Colonia, ciudad"
              value={profileDraft.location}
            />
          </div>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase text-slate-600">Especialidad</span>
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
              onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, specialty: event.target.value } : current))}
              value={profileDraft.specialty}
            >
              {SPECIALTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-slate-600">Modalidad</span>
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
              onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, appointmentMode: event.target.value } : current))}
              value={profileDraft.appointmentMode}
            >
              <option value="hybrid">Híbrido</option>
              <option value="online">En línea</option>
              <option value="in_person">Presencial</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Precio base (MXN)</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            min={0}
            onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, basePrice: Number(event.target.value) } : current))}
            type="number"
            value={profileDraft.basePrice}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Cédula profesional</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, licenseNumber: event.target.value } : current))}
            placeholder="Ej. 12345678"
            value={profileDraft.licenseNumber}
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Requerida para publicar tu perfil. Se mostrará en tu página pública para que los pacientes puedan verificarla.
          </span>
        </label>

        <div className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Foto de perfil</span>
          <div className="mt-2 flex items-start gap-4">
            {/* Avatar actual o preview */}
            {avatarPreview ?? (professional.profilePhotoUrl ? (professional.profilePhotoUrl.startsWith("/") ? `${apiBaseUrl}${professional.profilePhotoUrl}` : professional.profilePhotoUrl) : null) ? (
              <img
                alt="Foto de perfil"
                className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                src={
                  avatarPreview ??
                  (professional.profilePhotoUrl.startsWith("/")
                    ? `${apiBaseUrl}${professional.profilePhotoUrl}`
                    : professional.profilePhotoUrl)
                }
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg font-semibold text-primary">
                {(professional.displayName ?? "")
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word[0] ?? "")
                  .join("")
                  .toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-teal-200 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
                onChange={onAvatarFileChange}
                type="file"
              />
              <span className="block text-xs leading-5 text-slate-500">
                JPG, PNG o WEBP, máx 2 MB. Tu foto aparecerá en tu perfil público.
              </span>
              {avatarFile ? (
                <button
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={avatarUploading}
                  onClick={onUploadAvatar}
                  type="button"
                >
                  {avatarUploading ? "Subiendo..." : "Subir foto"}
                </button>
              ) : null}
              {avatarMessage ? (
                <p
                  className={
                    avatarMessage.kind === "success"
                      ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800"
                      : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  }
                >
                  {avatarMessage.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">WhatsApp de contacto</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => onProfileDraftChange((current) => (current ? { ...current, whatsappNumber: event.target.value } : current))}
            placeholder="+52 55 0000 0000"
            type="tel"
            value={profileDraft.whatsappNumber}
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            La comunicación realizada mediante WhatsApp ocurre fuera de Clinixa y no forma parte
            automáticamente del expediente clínico. Registra en la plataforma la información clínicamente relevante.
          </span>
        </label>

        <button
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={profileSaving}
          onClick={onSaveProfile}
          type="button"
        >
          <Save size={16} />
          {profileSaving ? "Guardando..." : "Guardar perfil"}
        </button>

        {profileMessage ? (
          <p
            className={
              profileMessage.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {profileMessage.text}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
