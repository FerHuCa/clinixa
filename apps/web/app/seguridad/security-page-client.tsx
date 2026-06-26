"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Bell, Building2, ClipboardList, Copy, Plus, Send, ShieldCheck, Users, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MarketplaceAdminPanel } from "@/components/marketplace-admin-panel";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { UserMenu } from "@/components/user-menu";
import {
  useHealthHubStore,
  type AuditLog,
  type Clinic,
  type ClinicInvitation,
  type Notification,
  type NotificationPreference,
  type ProfessionalVerificationItem
} from "@/lib/healthhub-store";
import { specialtyLabelFor } from "@/lib/specialty-labels";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action
    .replaceAll("_", " ")
    .replaceAll(".", " / ")
    .replace("appointment", "cita")
    .replace("patient records", "expediente")
    .replace("professional dashboard", "dashboard profesional");
}

function channelLabel(channel: string) {
  if (channel === "email") {
    return "Correo";
  }

  if (channel === "whatsapp") {
    return "WhatsApp";
  }

  if (channel === "sms") {
    return "SMS";
  }

  if (channel === "push") {
    return "Push";
  }

  return channel;
}

function roleLabel(role: string) {
  if (role === "clinic_admin") {
    return "Admin de clínica";
  }

  if (role === "professional") {
    return "Profesional";
  }

  if (role === "patient") {
    return "Paciente";
  }

  return role;
}

export function SecurityPageClient() {
  const {
    createClinicInvitation,
    currentUser,
    loadAuditLogs,
    loadClinicInvitations,
    loadClinics,
    loadNotificationPreferences,
    loadNotifications,
    markNotificationRead,
    loadVerificationQueue,
    ready,
    remindClinicInvitation,
    revokeClinicInvitation,
    updateNotificationPreference,
    updateProfessionalVerification
  } = useHealthHubStore();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [invitations, setInvitations] = useState<ClinicInvitation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [invitationForm, setInvitationForm] = useState({
    email: "",
    fullName: "",
    licenseNumber: "",
    role: "professional",
    specialty: "nutritionist"
  });
  const [securityAction, setSecurityAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [verificationQueue, setVerificationQueue] = useState<ProfessionalVerificationItem[]>([]);
  const [verificationFilter, setVerificationFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [rejectingId, setRejectingId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const isInternalAdmin = currentUser.primaryRole === "internal_admin";

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      loadAuditLogs(),
      loadClinics(),
      loadNotifications(),
      loadNotificationPreferences(),
      isInternalAdmin ? loadVerificationQueue("pending") : Promise.resolve([])
    ])
      .then(async ([nextAuditLogs, nextClinics, nextNotifications, nextPreferences, nextQueue]) => {
        if (cancelled) {
          return;
        }

        setAuditLogs(nextAuditLogs);
        setClinics(nextClinics);
        setNotifications(nextNotifications);
        setPreferences(nextPreferences);
        setVerificationQueue(nextQueue);

        if (nextClinics[0]) {
          const nextInvitations = await loadClinicInvitations(nextClinics[0].id);

          if (!cancelled) {
            setInvitations(nextInvitations);
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, isInternalAdmin, loadAuditLogs, loadClinicInvitations, loadClinics, loadNotificationPreferences, loadNotifications, loadVerificationQueue, ready]);

  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;
  const deniedCount = auditLogs.filter((log) => log.outcome === "denied").length;
  const memberCount = useMemo(() => new Set(clinics.flatMap((clinic) => clinic.members.map((member) => member.userId))).size, [clinics]);

  async function markRead(notification: Notification) {
    if (notification.status === "read") {
      return;
    }

    const updated = await markNotificationRead(notification.id);
    setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function createInvitation() {
    const clinic = clinics[0];

    if (!clinic) {
      return;
    }

    setSecurityAction("invitation");

    try {
      const invitation = await createClinicInvitation(clinic.id, invitationForm);
      setInvitations((current) => [invitation, ...current.filter((item) => item.id !== invitation.id)]);
      setInvitationForm({ email: "", fullName: "", licenseNumber: "", role: "professional", specialty: "nutritionist" });
    } finally {
      setSecurityAction("");
    }
  }

  function invitationLink(token: string) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/aceptar-invitacion?token=${encodeURIComponent(token)}`;
  }

  function expiresSoon(invitation: ClinicInvitation) {
    if (invitation.status !== "pending") {
      return false;
    }

    const remainingMs = Date.parse(invitation.expiresAt) - now;
    return remainingMs > 0 && remainingMs <= 3 * 24 * 60 * 60 * 1000;
  }

  async function copyInvitationLink(invitation: ClinicInvitation) {
    setSecurityAction(`copy-${invitation.id}`);

    try {
      await navigator.clipboard.writeText(invitationLink(invitation.token));
    } catch {
      // Clipboard may be unavailable; the link is still visible to copy manually.
    } finally {
      setSecurityAction("");
    }
  }

  async function remindInvitation(invitationId: string) {
    setSecurityAction(`remind-${invitationId}`);

    try {
      const updated = await remindClinicInvitation(invitationId);
      setInvitations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setSecurityAction("");
    }
  }

  async function revokeInvitation(invitationId: string) {
    setSecurityAction(`revoke-${invitationId}`);

    try {
      const updated = await revokeClinicInvitation(invitationId);
      setInvitations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setSecurityAction("");
    }
  }

  async function changeVerificationFilter(next: "pending" | "verified" | "rejected" | "all") {
    setVerificationFilter(next);
    const queue = await loadVerificationQueue(next === "all" ? undefined : next);
    setVerificationQueue(queue);
  }

  async function applyVerification(item: ProfessionalVerificationItem, status: "verified" | "rejected", reason: string) {
    setSecurityAction(`verify-${item.id}`);

    try {
      await updateProfessionalVerification(item.id, status, reason);
      const queue = await loadVerificationQueue(verificationFilter === "all" ? undefined : verificationFilter);
      setVerificationQueue(queue);
      setRejectingId("");
      setRejectReason("");
    } finally {
      setSecurityAction("");
    }
  }

  function verificationStatusLabel(status: string) {
    if (status === "verified") {
      return "Verificada";
    }

    if (status === "rejected") {
      return "Rechazada";
    }

    return "Pendiente";
  }

  async function togglePreference(preference: NotificationPreference, field: keyof Omit<NotificationPreference, "id" | "channel">) {
    setSecurityAction(`${preference.channel}-${field}`);
    const updatedInput = {
      appointmentUpdates: preference.appointmentUpdates,
      clinicUpdates: preference.clinicUpdates,
      enabled: preference.enabled,
      reminderUpdates: preference.reminderUpdates,
      [field]: !preference[field]
    };

    try {
      const updated = await updateNotificationPreference(preference.channel, updatedInput);
      setPreferences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setSecurityAction("");
    }
  }

  if (currentUser.primaryRole !== "clinic_admin" && currentUser.primaryRole !== "internal_admin") {
    return (
      <AppShell>
        <PageHeader
          action={<UserMenu fullName={currentUser.fullName} />}
          description="Bitácora, permisos por rol y avisos operativos."
          title="Seguridad"
        />
        <div className="px-5 py-6 lg:px-8">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No tienes acceso a esta sección. Solo administradores de clínica y el administrador maestro pueden revisar la seguridad.
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Bitacora, permisos por rol y avisos operativos."
        title="Seguridad"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {loading ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">Cargando seguridad...</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail="Eventos visibles para tu rol" icon={ClipboardList} label="Auditoría" value={`${auditLogs.length}`} />
          <StatCard detail="Pendientes de revisar" icon={Bell} label="Notificaciones" value={`${unreadCount}`} />
          <StatCard detail="Miembros activos" icon={Users} label="Equipo de la clínica" value={`${memberCount}`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <Panel title="Permisos por clínica">
              <div className="divide-y divide-border">
                {clinics.length > 0 ? (
                  clinics.map((clinic) => (
                    <div className="space-y-4 p-4" key={clinic.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="font-semibold">{clinic.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{clinic.location}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {clinic.members.map((member) => (
                          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-slate-50 px-3 py-2" key={member.id}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{member.fullName}</p>
                              <p className="truncate text-xs text-slate-500">{member.email}</p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-primary">{roleLabel(member.role)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-slate-500">Sin alcance de clínica para esta cuenta.</div>
                )}
              </div>
            </Panel>

            <Panel title="Notificaciones">
              <div className="divide-y divide-border">
                {notifications.length > 0 ? (
                  notifications.slice(0, 8).map((notification) => (
                    <button
                      className="block w-full p-4 text-left transition hover:bg-slate-50"
                      key={notification.id}
                      onClick={() => markRead(notification)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{notification.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{notification.body}</p>
                        </div>
                        <StatusPill label={notification.status === "unread" ? "Nueva" : "Leída"} status={notification.status === "unread" ? "pending" : "active"} />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm text-slate-500">Sin notificaciones para esta cuenta.</div>
                )}
              </div>
            </Panel>

            <Panel title="Invitaciones">
              <div className="divide-y divide-border">
                <div className="space-y-3 p-4">
                  <input
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(event) => setInvitationForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Nombre completo"
                    value={invitationForm.fullName}
                  />
                  <input
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(event) => setInvitationForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="correo@clinica.com"
                    type="email"
                    value={invitationForm.email}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setInvitationForm((current) => ({ ...current, specialty: event.target.value }))}
                      value={invitationForm.specialty}
                    >
                      <option value="doctor">Medicina</option>
                      <option value="psychologist">Psicología</option>
                      <option value="physiotherapist">Fisioterapia</option>
                      <option value="nutritionist">Nutrición</option>
                      <option value="other">Salud</option>
                    </select>
                    <input
                      className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setInvitationForm((current) => ({ ...current, licenseNumber: event.target.value }))}
                      placeholder="Cédula"
                      value={invitationForm.licenseNumber}
                    />
                  </div>
                  <button
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={securityAction === "invitation"}
                    onClick={createInvitation}
                    type="button"
                  >
                    <Plus size={16} />
                    Invitar
                  </button>
                </div>
                {invitations.length > 0 ? (
                  invitations.slice(0, 5).map((invitation) => (
                    <div className="space-y-3 p-4" key={invitation.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{invitation.fullName}</p>
                          <p className="mt-1 text-sm text-slate-500">{invitation.email}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusPill
                            label={
                              invitation.status === "pending"
                                ? "Pendiente"
                                : invitation.status === "accepted"
                                  ? "Aceptada"
                                  : invitation.status === "revoked"
                                    ? "Revocada"
                                    : "Expirada"
                            }
                            status={invitation.status === "pending" ? "pending" : invitation.status === "accepted" ? "active" : "cancelled"}
                          />
                          {expiresSoon(invitation) ? (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Por vencer</span>
                          ) : null}
                        </div>
                      </div>
                      {invitation.status === "pending" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                            disabled={securityAction === `copy-${invitation.id}`}
                            onClick={() => copyInvitationLink(invitation)}
                            type="button"
                          >
                            <Copy size={13} />
                            Copiar enlace
                          </button>
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                            disabled={securityAction === `remind-${invitation.id}`}
                            onClick={() => remindInvitation(invitation.id)}
                            type="button"
                          >
                            <Send size={13} />
                            Reenviar
                          </button>
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50"
                            disabled={securityAction === `revoke-${invitation.id}`}
                            onClick={() => revokeInvitation(invitation.id)}
                            type="button"
                          >
                            <X size={13} />
                            Revocar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-slate-500">Sin invitaciones recientes.</div>
                )}
              </div>
            </Panel>

            <Panel title="Preferencias">
              <div className="divide-y divide-border">
                {preferences.map((preference) => (
                  <div className="space-y-3 p-4" key={preference.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{channelLabel(preference.channel)}</p>
                      <button
                        className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                        disabled={securityAction === `${preference.channel}-enabled`}
                        onClick={() => togglePreference(preference, "enabled")}
                        type="button"
                      >
                        {preference.enabled ? "Activo" : "Pausado"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        ["appointmentUpdates", "Citas"],
                        ["clinicUpdates", "Clínica"],
                        ["reminderUpdates", "Recordatorios"]
                      ].map(([field, label]) => (
                        <button
                          className="rounded-md border border-border bg-slate-50 px-3 py-1.5 text-slate-700 disabled:opacity-50"
                          disabled={securityAction === `${preference.channel}-${field}`}
                          key={field}
                          onClick={() => togglePreference(preference, field as keyof Omit<NotificationPreference, "id" | "channel">)}
                          type="button"
                        >
                          {preference[field as keyof Omit<NotificationPreference, "id" | "channel">] ? label : `${label} off`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <MarketplaceAdminPanel />

            {isInternalAdmin ? (() => {
              const pendingCount = verificationQueue.filter((item) => item.verificationStatus === "pending").length;
              return (
                <Panel title={pendingCount > 0 ? `Verificación de cédulas · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : "Verificación de cédulas"}>
                  <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
                    {([["pending", "Pendientes"], ["verified", "Verificadas"], ["rejected", "Rechazadas"], ["all", "Todas"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${verificationFilter === value ? "bg-primary text-white" : "border border-border bg-slate-50 text-slate-600 hover:border-slate-300"}`}
                        onClick={() => changeVerificationFilter(value)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="divide-y divide-border">
                    {verificationQueue.length > 0 ? (
                      verificationQueue.map((item) => (
                        <div className="space-y-3 p-4" key={item.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{item.displayName}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {specialtyLabelFor(item.specialty)} · {item.location || "Sin ubicación"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Cédula: <span className="font-medium text-slate-700">{item.licenseNumber || "No capturada"}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.email || "Sin correo"} · Registrado {formatDate(item.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <StatusPill
                                label={verificationStatusLabel(item.verificationStatus)}
                                status={item.verificationStatus === "verified" ? "active" : item.verificationStatus === "rejected" ? "cancelled" : "pending"}
                              />
                              {item.verificationStatus === "verified" && item.licenseVerifiedAt ? (
                                <span className="text-xs text-slate-600">{formatDate(item.licenseVerifiedAt)}</span>
                              ) : null}
                            </div>
                          </div>
                          {item.verificationStatus !== "verified" ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  className="flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                                  disabled={securityAction === `verify-${item.id}`}
                                  onClick={() => applyVerification(item, "verified", "Cédula validada manualmente por el administrador.")}
                                  type="button"
                                >
                                  <BadgeCheck size={13} />
                                  {securityAction === `verify-${item.id}` ? "Guardando..." : "Verificar"}
                                </button>
                                {item.verificationStatus !== "rejected" ? (
                                  <button
                                    className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50"
                                    disabled={securityAction === `verify-${item.id}`}
                                    onClick={() => setRejectingId((current) => (current === item.id ? "" : item.id))}
                                    type="button"
                                  >
                                    <X size={13} />
                                    Rechazar
                                  </button>
                                ) : null}
                              </div>
                              {rejectingId === item.id ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-xs outline-none focus:border-rose-300"
                                    onChange={(event) => setRejectReason(event.target.value)}
                                    placeholder="Motivo del rechazo (obligatorio)"
                                    value={rejectReason}
                                  />
                                  <button
                                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                    disabled={!rejectReason.trim() || securityAction === `verify-${item.id}`}
                                    onClick={() => applyVerification(item, "rejected", rejectReason.trim())}
                                    type="button"
                                  >
                                    Confirmar rechazo
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">
                        {verificationFilter === "pending" ? "No hay cédulas pendientes de revisión." : "Sin profesionales en este estado."}
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })() : null}

            <Panel title="Bitácora de auditoría">
            <div className="divide-y divide-border">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div className="grid gap-3 p-4 md:grid-cols-[180px_1fr_auto]" key={log.id}>
                    <div className="text-sm text-slate-500">{formatDate(log.createdAt)}</div>
                    <div className="min-w-0">
                      <p className="font-medium capitalize">{actionLabel(log.action)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {log.resourceType} · {log.resourceId}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Actor: {roleLabel(log.actorRole)} {log.actorUserId ? `· ${log.actorUserId}` : ""}
                      </p>
                    </div>
                    <StatusPill label={log.outcome === "denied" ? "Denegado" : "Correcto"} status={log.outcome === "denied" ? "cancelled" : "completed"} />
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-slate-500">Sin eventos visibles para esta cuenta.</div>
              )}
            </div>
          </Panel>
          </div>
        </div>

        {deniedCount > 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <ShieldCheck size={18} />
            {deniedCount} evento(s) denegado(s) detectados en la bitácora visible.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
