import crypto from "node:crypto";

const API_BASE_URL = process.env.HEALTHHUB_API_BASE_URL ?? "http://127.0.0.1:5050";
const MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "dev-webhook-secret";

function mercadoPagoSignature(dataId, requestId, secret) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { body, response, status: response.status };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function login(email) {
  const result = await request("/api/auth/login", {
    body: JSON.stringify({ email, password: "healthhub123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  assert(result.status === 200, `login ${email} esperaba 200 y devolvio ${result.status}`);
  assert(result.body?.token, `login ${email} no devolvio token`);
  assert(result.body?.expiresAt, `login ${email} no devolvio expiresAt`);
  return result.body;
}

function nextWeekdayDate(weekday, offsetWeeks = 8) {
  const now = new Date();
  const currentWeekday = now.getDay() === 0 ? 7 : now.getDay();
  const daysUntil = (weekday - currentWeekday + 7) % 7 || 7;
  const candidate = new Date(now);
  candidate.setDate(now.getDate() + daysUntil + offsetWeeks * 7);
  return [
    candidate.getFullYear(),
    String(candidate.getMonth() + 1).padStart(2, "0"),
    String(candidate.getDate()).padStart(2, "0")
  ].join("-");
}

async function main() {
  const health = await request("/health");
  assert(health.status === 200, `health esperaba 200 y devolvio ${health.status}`);
  assert(health.body?.database === "connected", "health no reporta PostgreSQL conectado");

  const patientAuth = await login("ana.martinez@example.com");
  const otherPatientAuth = await login("carlos.ruiz@example.com");
  const professionalAuth = await login("laura.vega@healthhub.demo");
  const clinicAdminAuth = await login("admin.clinica@healthhub.demo");

  const refreshed = await request("/api/auth/refresh", {
    headers: { Authorization: `Bearer ${patientAuth.token}` },
    method: "POST"
  });
  assert(refreshed.status === 200, `refresh esperaba 200 y devolvio ${refreshed.status}`);
  assert(refreshed.body?.token && refreshed.body.token !== patientAuth.token, "refresh no roto el token");

  const dashboard = await request("/api/professional-portal/dashboard", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(dashboard.status === 200, `dashboard esperaba 200 y devolvio ${dashboard.status}`);
  assert(dashboard.body?.professional?.id === "pro-laura-vega", "dashboard no pertenece a Laura Vega");

  const clinics = await request("/api/clinics", {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` }
  });
  assert(clinics.status === 200, `clinicas admin esperaba 200 y devolvio ${clinics.status}`);
  assert(clinics.body?.some((clinic) => clinic.id === "clinic-bienestar-integral"), "clinicas no incluye clinica demo");

  const inviteEmail = `qa.${Date.now()}@healthhub.demo`;
  const invitation = await request("/api/clinics/clinic-bienestar-integral/invitations", {
    body: JSON.stringify({
      email: inviteEmail,
      fullName: "Profesional QA",
      licenseNumber: "QA-12345",
      role: "professional",
      specialty: "doctor"
    }),
    headers: {
      Authorization: `Bearer ${clinicAdminAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(invitation.status === 201, `invitacion esperaba 201 y devolvio ${invitation.status}`);
  assert(invitation.body?.email === inviteEmail, "invitacion no devolvio email esperado");

  const invitations = await request("/api/clinics/clinic-bienestar-integral/invitations", {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` }
  });
  assert(invitations.status === 200, `lista invitaciones esperaba 200 y devolvio ${invitations.status}`);
  assert(invitations.body?.some((item) => item.email === inviteEmail), "lista invitaciones no incluye invitacion QA");

  assert(invitation.body?.token, "invitacion no devolvio token de un solo uso");
  const inviteToken = invitation.body.token;

  const inviteDetail = await request(`/api/clinic-invitations/${inviteToken}`);
  assert(inviteDetail.status === 200, `detalle invitacion esperaba 200 y devolvio ${inviteDetail.status}`);
  assert(inviteDetail.body?.requiresAccount === true, "detalle invitacion deberia requerir cuenta nueva");
  assert(inviteDetail.body?.clinicId === "clinic-bienestar-integral", "detalle invitacion no devolvio clinica esperada");

  const remind = await request(`/api/clinic-invitations/${invitation.body.id}/remind`, {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` },
    method: "POST"
  });
  assert(remind.status === 200, `recordatorio invitacion esperaba 200 y devolvio ${remind.status}`);

  const shortPassword = await request(`/api/clinic-invitations/${inviteToken}/accept`, {
    body: JSON.stringify({ password: "123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(shortPassword.status === 400, `aceptar con password corta esperaba 400 y devolvio ${shortPassword.status}`);

  const accepted = await request(`/api/clinic-invitations/${inviteToken}/accept`, {
    body: JSON.stringify({ password: "healthhub123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(accepted.status === 200, `aceptar invitacion esperaba 200 y devolvio ${accepted.status}`);
  assert(accepted.body?.token, "aceptar invitacion no devolvio token de sesion");
  assert(accepted.body?.user?.professionalId, "aceptar invitacion no creo perfil profesional");

  const newProfessionalToken = accepted.body.token;
  const newProfessionalId = accepted.body.user.professionalId;

  const acceptedMe = await request("/api/me", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(acceptedMe.status === 200, `me tras aceptar esperaba 200 y devolvio ${acceptedMe.status}`);
  assert(acceptedMe.body?.email === inviteEmail, "sesion tras aceptar no corresponde al invitado");

  const newAccountLogin = await login(inviteEmail);
  assert(newAccountLogin.user?.email === inviteEmail, "login con la cuenta creada por invitacion fallo");

  const reAccept = await request(`/api/clinic-invitations/${inviteToken}/accept`, {
    body: JSON.stringify({ password: "healthhub123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(reAccept.status === 409, `re-aceptar invitacion esperaba 409 y devolvio ${reAccept.status}`);

  const clinicsAfterAccept = await request("/api/clinics", {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` }
  });
  const bienestarClinic = clinicsAfterAccept.body?.find((clinic) => clinic.id === "clinic-bienestar-integral");
  assert(
    bienestarClinic?.members?.some((member) => member.email === inviteEmail),
    "la clinica no incluye al profesional que acepto la invitacion"
  );

  // Onboarding: el profesional recien creado nace en borrador y no debe poder publicarse aun.
  const onboardingStart = await request("/api/professional-portal/onboarding", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(onboardingStart.status === 200, `onboarding inicial esperaba 200 y devolvio ${onboardingStart.status}`);
  assert(onboardingStart.body?.isPublished === false, "profesional nuevo no deberia estar publicado");
  assert(onboardingStart.body?.canPublish === false, "profesional nuevo no deberia poder publicar sin datos");

  const newProfessionalSearchBefore = await request("/api/professionals");
  assert(
    !newProfessionalSearchBefore.body?.some((item) => item.id === newProfessionalId),
    "profesional en borrador no deberia aparecer en busqueda publica"
  );

  const earlyPublish = await request("/api/professional-portal/publish", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` },
    method: "POST"
  });
  assert(earlyPublish.status === 400, `publicar incompleto esperaba 400 y devolvio ${earlyPublish.status}`);

  const profileUpdate = await request("/api/professional-portal/profile", {
    body: JSON.stringify({
      appointmentMode: "online",
      basePrice: 800,
      bio: "Profesional de prueba con biografia suficiente para publicar el perfil.",
      displayName: "Profesional QA Onboarding",
      location: "CDMX",
      specialty: "doctor"
    }),
    headers: {
      Authorization: `Bearer ${newProfessionalToken}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(profileUpdate.status === 200, `actualizar perfil esperaba 200 y devolvio ${profileUpdate.status}`);

  const onboardingService = await request("/api/professional-portal/services", {
    body: JSON.stringify({
      description: "Servicio creado durante onboarding automatizado.",
      durationMinutes: 45,
      mode: "online",
      name: "Consulta inicial QA",
      price: 800
    }),
    headers: {
      Authorization: `Bearer ${newProfessionalToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(onboardingService.status === 201, `servicio onboarding esperaba 201 y devolvio ${onboardingService.status}`);

  const onboardingAvailability = await request("/api/professional-portal/availability", {
    body: JSON.stringify({ endsAt: "13:00", startsAt: "09:00", weekday: 2 }),
    headers: {
      Authorization: `Bearer ${newProfessionalToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(onboardingAvailability.status === 201, `disponibilidad onboarding esperaba 201 y devolvio ${onboardingAvailability.status}`);

  // Con perfil/servicio/disponibilidad completos, la cedula sin verificar sigue bloqueando la publicacion.
  const onboardingUnverified = await request("/api/professional-portal/onboarding", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(onboardingUnverified.body?.canPublish === false, "profesional sin cedula verificada no deberia poder publicar");

  const masterAuth = await login("master@healthhub.demo");
  const verified = await request(`/api/professionals/${newProfessionalId}/verification`, {
    body: JSON.stringify({ reason: "Verificacion automatizada QA", status: "verified" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(verified.status === 200, `verificar cedula esperaba 200 y devolvio ${verified.status}`);

  const onboardingReady = await request("/api/professional-portal/onboarding", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(onboardingReady.body?.canPublish === true, "profesional completo y verificado deberia poder publicar");

  const published = await request("/api/professional-portal/publish", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` },
    method: "POST"
  });
  assert(published.status === 200, `publicar perfil esperaba 200 y devolvio ${published.status}`);
  assert(published.body?.status === "active", "publicar no dejo el perfil activo");

  const newProfessionalSearchAfter = await request("/api/professionals");
  assert(
    newProfessionalSearchAfter.body?.some((item) => item.id === newProfessionalId),
    "profesional publicado deberia aparecer en busqueda publica"
  );

  // Cola de verificacion de cedulas (solo internal_admin).
  const queueNoAuth = await request("/api/admin/professionals");
  assert(queueNoAuth.status === 401, `cola de verificacion sin sesion esperaba 401 y devolvio ${queueNoAuth.status}`);

  const queueDenied = await request("/api/admin/professionals", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(queueDenied.status === 403, `cola de verificacion para profesional esperaba 403 y devolvio ${queueDenied.status}`);

  const queue = await request("/api/admin/professionals", {
    headers: { Authorization: `Bearer ${masterAuth.token}` }
  });
  assert(queue.status === 200, `cola de verificacion esperaba 200 y devolvio ${queue.status}`);
  assert(Array.isArray(queue.body), "cola de verificacion no devolvio arreglo");
  const queuedProfessional = queue.body.find((item) => item.id === newProfessionalId);
  assert(queuedProfessional, "cola de verificacion no incluye al profesional QA");
  assert(queuedProfessional.verificationStatus === "verified", "el profesional QA deberia estar verificado en la cola");
  assert(queuedProfessional.licenseNumber !== undefined, "cola de verificacion no expone la cedula");

  // Revocar la verificacion regresa el perfil a onboarding y lo saca de la busqueda publica.
  const revokedVerification = await request(`/api/professionals/${newProfessionalId}/verification`, {
    body: JSON.stringify({ reason: "Rechazo automatizado QA", status: "rejected" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(revokedVerification.status === 200, `rechazar verificacion esperaba 200 y devolvio ${revokedVerification.status}`);
  assert(revokedVerification.body?.verificationStatus === "rejected", "rechazo no actualizo verificationStatus");
  assert(revokedVerification.body?.status === "onboarding", "rechazo no regreso el perfil a onboarding");

  const searchAfterRejection = await request("/api/professionals");
  assert(
    !searchAfterRejection.body?.some((item) => item.id === newProfessionalId),
    "profesional rechazado no deberia aparecer en busqueda publica"
  );

  const revokeInviteEmail = `qa.revoke.${Date.now()}@healthhub.demo`;
  const revokeInvitation = await request("/api/clinics/clinic-bienestar-integral/invitations", {
    body: JSON.stringify({
      email: revokeInviteEmail,
      fullName: "Profesional Revocado",
      licenseNumber: "QA-REV",
      role: "professional",
      specialty: "psychologist"
    }),
    headers: {
      Authorization: `Bearer ${clinicAdminAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(revokeInvitation.status === 201, `invitacion revocable esperaba 201 y devolvio ${revokeInvitation.status}`);

  const revoked = await request(`/api/clinic-invitations/${revokeInvitation.body.id}/revoke`, {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` },
    method: "PATCH"
  });
  assert(revoked.status === 200, `revocar invitacion esperaba 200 y devolvio ${revoked.status}`);
  assert(revoked.body?.status === "revoked", "revocar no cambio el estado de la invitacion");

  const acceptRevoked = await request(`/api/clinic-invitations/${revokeInvitation.body.token}/accept`, {
    body: JSON.stringify({ password: "healthhub123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(acceptRevoked.status === 409, `aceptar invitacion revocada esperaba 409 y devolvio ${acceptRevoked.status}`);

  const deniedClinics = await request("/api/clinics", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(deniedClinics.status === 403, `clinicas paciente esperaba 403 y devolvio ${deniedClinics.status}`);

  const preferences = await request("/api/notification-preferences", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(preferences.status === 200, `preferencias esperaba 200 y devolvio ${preferences.status}`);
  assert(preferences.body?.some((item) => item.channel === "app"), "preferencias no incluye app");
  assert(preferences.body?.some((item) => item.channel === "email"), "preferencias no incluye email");
  assert(preferences.body?.some((item) => item.channel === "whatsapp"), "preferencias no incluye whatsapp");

  const emailPreference = await request("/api/notification-preferences/email", {
    body: JSON.stringify({
      appointmentUpdates: true,
      clinicUpdates: false,
      enabled: true,
      reminderUpdates: true
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(emailPreference.status === 200, `preferencia email esperaba 200 y devolvio ${emailPreference.status}`);
  assert(emailPreference.body?.enabled === true, "preferencia email no quedo activa");

  const qaService = await request("/api/professional-portal/services", {
    body: JSON.stringify({
      description: "Servicio creado por prueba automatizada.",
      durationMinutes: 45,
      mode: "online",
      name: `Servicio QA ${Date.now()}`,
      price: 1234
    }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(qaService.status === 201, `servicio profesional esperaba 201 y devolvio ${qaService.status}`);

  const updatedService = await request(`/api/professional-portal/services/${qaService.body.id}`, {
    body: JSON.stringify({
      description: "Servicio actualizado por prueba automatizada.",
      durationMinutes: 50,
      mode: "hybrid",
      name: qaService.body.name,
      price: 1300
    }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(updatedService.status === 200, `actualizar servicio esperaba 200 y devolvio ${updatedService.status}`);
  assert(updatedService.body?.price === 1300, "actualizar servicio no cambio precio");

  const qaAvailability = await request("/api/professional-portal/availability", {
    body: JSON.stringify({
      endsAt: "08:00",
      startsAt: "07:00",
      weekday: 4
    }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(qaAvailability.status === 201, `disponibilidad esperaba 201 y devolvio ${qaAvailability.status}`);

  const updatedAvailability = await request(`/api/professional-portal/availability/${qaAvailability.body.id}`, {
    body: JSON.stringify({
      endsAt: "08:30",
      startsAt: "07:30",
      weekday: 4
    }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(updatedAvailability.status === 200, `actualizar disponibilidad esperaba 200 y devolvio ${updatedAvailability.status}`);
  assert(updatedAvailability.body?.startsAt === "07:30", "actualizar disponibilidad no cambio hora inicio");

  const slots = await request("/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-seguimiento");
  assert(slots.status === 200, `slots esperaba 200 y devolvio ${slots.status}`);
  assert(Array.isArray(slots.body), "slots no devolvio arreglo");

  const unavailable = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: nextWeekdayDate(2, 10),
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada fuera de disponibilidad",
      time: "08:00",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(unavailable.status === 400, `fuera de disponibilidad esperaba 400 y devolvio ${unavailable.status}`);

  const testDate = nextWeekdayDate(1, 12 + Math.floor(Date.now() % 20));
  const created = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: testDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de traslape base",
      time: "09:10",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(created.status === 201 || created.status === 409, `cita base esperaba 201/409 y devolvio ${created.status}`);

  const overlap = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: testDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de traslape",
      time: "09:30",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(overlap.status === 409, `traslape esperaba 409 y devolvio ${overlap.status}`);

  const workflowDate = nextWeekdayDate(1, 40 + Math.floor(Date.now() % 100));
  const workflowAppointment = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: workflowDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de flujo cancel/reprogramar",
      time: "09:00",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(workflowAppointment.status === 201, `cita workflow esperaba 201 y devolvio ${workflowAppointment.status}`);

  const deniedCancel = await request(`/api/appointments/${workflowAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Intento no autorizado" }),
    headers: {
      Authorization: `Bearer ${otherPatientAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(deniedCancel.status === 403, `cancelacion ajena esperaba 403 y devolvio ${deniedCancel.status}`);

  const deniedStatus = await request(`/api/appointments/${workflowAppointment.body.id}/status`, {
    body: JSON.stringify({ reason: "Intento paciente", status: "confirmed" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(deniedStatus.status === 403, `estado por paciente esperaba 403 y devolvio ${deniedStatus.status}`);

  const confirmed = await request(`/api/appointments/${workflowAppointment.body.id}/status`, {
    body: JSON.stringify({ reason: "Confirmacion automatizada", status: "confirmed" }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(confirmed.status === 200, `confirmacion esperaba 200 y devolvio ${confirmed.status}`);
  assert(confirmed.body?.status === "confirmed", "confirmacion no actualizo status");

  const patientNotifications = await request("/api/notifications", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(patientNotifications.status === 200, `notificaciones esperaba 200 y devolvio ${patientNotifications.status}`);
  assert(Array.isArray(patientNotifications.body), "notificaciones no devolvio arreglo");
  assert(
    patientNotifications.body.some((notification) => notification.type === "appointment_status"),
    "notificaciones no incluye cambio de estado"
  );

  const firstUnread = patientNotifications.body.find((notification) => notification.status === "unread");
  if (firstUnread) {
    const markedRead = await request(`/api/notifications/${firstUnread.id}/read`, {
      headers: { Authorization: `Bearer ${refreshed.body.token}` },
      method: "PATCH"
    });
    assert(markedRead.status === 200, `marcar notificacion esperaba 200 y devolvio ${markedRead.status}`);
    assert(markedRead.body?.status === "read", "notificacion no quedo leida");
  }

  const rescheduled = await request(`/api/appointments/${workflowAppointment.body.id}/reschedule`, {
    body: JSON.stringify({
      date: workflowDate,
      reason: "Prueba automatizada de reprogramacion",
      time: "10:00"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(rescheduled.status === 200, `reprogramacion esperaba 200 y devolvio ${rescheduled.status}`);
  assert(rescheduled.body?.time === "10:00", "reprogramacion no actualizo la hora");

  const cancelled = await request(`/api/appointments/${workflowAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Prueba automatizada de cancelacion" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(cancelled.status === 200, `cancelacion esperaba 200 y devolvio ${cancelled.status}`);
  assert(cancelled.body?.status === "cancelled", "cancelacion no actualizo status");

  const auditLogs = await request("/api/audit-logs?patientId=ana-martinez", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(auditLogs.status === 200, `audit logs esperaba 200 y devolvio ${auditLogs.status}`);
  assert(Array.isArray(auditLogs.body), "audit logs no devolvio arreglo");
  assert(auditLogs.body.some((log) => log.action === "appointment.cancel"), "audit logs no incluye cancelacion");

  // --- Pagos con Mercado Pago (A1) ---

  const paymentAppointment = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: workflowDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de pago",
      time: "09:00",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(paymentAppointment.status === 201, `cita de pago esperaba 201 y devolvio ${paymentAppointment.status}`);

  const checkoutNoAuth = await request(`/api/appointments/${paymentAppointment.body.id}/checkout`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    method: "POST"
  });
  assert(checkoutNoAuth.status === 401, `checkout sin sesion esperaba 401 y devolvio ${checkoutNoAuth.status}`);

  const checkoutDenied = await request(`/api/appointments/${paymentAppointment.body.id}/checkout`, {
    headers: {
      Authorization: `Bearer ${otherPatientAuth.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
    method: "POST"
  });
  assert(checkoutDenied.status === 403, `checkout de cita ajena esperaba 403 y devolvio ${checkoutDenied.status}`);

  const checkout = await request(`/api/appointments/${paymentAppointment.body.id}/checkout`, {
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
    method: "POST"
  });
  assert(checkout.status === 200, `checkout esperaba 200 y devolvio ${checkout.status}`);
  assert(checkout.body?.paymentId, "checkout no devolvio paymentId");
  assert(checkout.body?.status === "pending", `checkout esperaba pago pending y devolvio ${checkout.body?.status}`);
  assert(checkout.body?.initPoint, "checkout no devolvio initPoint");

  const checkoutRepeat = await request(`/api/appointments/${paymentAppointment.body.id}/checkout`, {
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
    method: "POST"
  });
  assert(checkoutRepeat.status === 200, `checkout repetido esperaba 200 y devolvio ${checkoutRepeat.status}`);
  assert(checkoutRepeat.body?.paymentId === checkout.body.paymentId, "checkout repetido creo un pago duplicado");

  const providerPaymentId = `qa-mp-${Date.now()}`;
  const webhookRequestId = `qa-req-${Date.now()}`;

  const webhookBadSignature = await request("/api/webhooks/mercadopago", {
    body: JSON.stringify({
      type: "payment",
      data: { id: providerPaymentId, status: "approved", external_reference: checkout.body.paymentId }
    }),
    headers: {
      "Content-Type": "application/json",
      "x-request-id": webhookRequestId,
      "x-signature": "ts=1,v1=firma-invalida"
    },
    method: "POST"
  });
  assert(webhookBadSignature.status === 401, `webhook con firma invalida esperaba 401 y devolvio ${webhookBadSignature.status}`);

  const webhookApproved = await request("/api/webhooks/mercadopago", {
    body: JSON.stringify({
      type: "payment",
      data: { id: providerPaymentId, status: "approved", external_reference: checkout.body.paymentId }
    }),
    headers: {
      "Content-Type": "application/json",
      "x-request-id": webhookRequestId,
      "x-signature": mercadoPagoSignature(providerPaymentId, webhookRequestId, MERCADOPAGO_WEBHOOK_SECRET)
    },
    method: "POST"
  });
  assert(webhookApproved.status === 200, `webhook aprobado esperaba 200 y devolvio ${webhookApproved.status}`);
  assert(webhookApproved.body?.processed === true, "webhook aprobado no proceso el pago");
  assert(webhookApproved.body?.status === "approved", `webhook aprobado esperaba approved y devolvio ${webhookApproved.body?.status}`);

  const paidAppointments = await request("/api/appointments", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(paidAppointments.status === 200, `citas tras pago esperaba 200 y devolvio ${paidAppointments.status}`);
  const paidAppointment = paidAppointments.body.find((appointment) => appointment.id === paymentAppointment.body.id);
  assert(paidAppointment?.status === "confirmed", "la cita pagada no quedo confirmada via webhook");

  const webhookRepeat = await request("/api/webhooks/mercadopago", {
    body: JSON.stringify({
      type: "payment",
      data: { id: providerPaymentId, status: "approved", external_reference: checkout.body.paymentId }
    }),
    headers: {
      "Content-Type": "application/json",
      "x-request-id": webhookRequestId,
      "x-signature": mercadoPagoSignature(providerPaymentId, webhookRequestId, MERCADOPAGO_WEBHOOK_SECRET)
    },
    method: "POST"
  });
  assert(webhookRepeat.status === 200, `webhook repetido esperaba 200 y devolvio ${webhookRepeat.status}`);
  assert(webhookRepeat.body?.processed === false, "webhook repetido no deberia reprocesar un pago aprobado");

  const checkoutAfterPaid = await request(`/api/appointments/${paymentAppointment.body.id}/checkout`, {
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
    method: "POST"
  });
  assert(checkoutAfterPaid.status === 400, `checkout de cita ya pagada esperaba 400 y devolvio ${checkoutAfterPaid.status}`);

  const paymentCleanup = await request(`/api/appointments/${paymentAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Limpieza de prueba automatizada de pago" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(paymentCleanup.status === 200, `limpieza de cita de pago esperaba 200 y devolvio ${paymentCleanup.status}`);
  assert(paymentCleanup.body?.status === "cancelled", "cita cancelada con pago aprobado esperaba status cancelled");
  // ponytail: el reembolso solo se resuelve localmente en modo simulado. Con un access token
  // real de MP, RefundPaymentAsync llama a la API y MP rechaza el pago sintetico de prueba
  // (404 resource not found), por lo que el status queda "approved" — esperado, no un bug.
  // Validar el refund real requiere un pago MP real (ver siguientes pasos en seguimiento-proyecto.md).
  if (checkout.body?.simulated) {
    assert(paymentCleanup.body?.paymentStatus === "refunded", `cancelacion de cita pagada esperaba paymentStatus refunded y devolvio ${paymentCleanup.body?.paymentStatus}`);
  } else {
    console.log("  (refund omitido: credenciales MP reales — el pago sintetico de prueba no existe en MP)");
  }

  // Idempotencia de reembolso: cancelar de nuevo debe fallar con 400 (ya esta cancelada), no doble refund.
  const paymentCleanupRepeat = await request(`/api/appointments/${paymentAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Intento de doble cancelacion" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(paymentCleanupRepeat.status === 400, `doble cancelacion esperaba 400 y devolvio ${paymentCleanupRepeat.status}`);

  const adminAuditLogs = await request("/api/audit-logs", {
    headers: { Authorization: `Bearer ${clinicAdminAuth.token}` }
  });
  assert(adminAuditLogs.status === 200, `audit logs admin esperaba 200 y devolvio ${adminAuditLogs.status}`);
  assert(Array.isArray(adminAuditLogs.body), "audit logs admin no devolvio arreglo");

  const consentToken = refreshed.body.token;

  const consentUnauthorized = await request("/api/me/consent");
  assert(consentUnauthorized.status === 401, `consent sin token esperaba 401 y devolvio ${consentUnauthorized.status}`);

  const consentStatus = await request("/api/me/consent", {
    headers: { Authorization: `Bearer ${consentToken}` }
  });
  assert(consentStatus.status === 200, `consent status esperaba 200 y devolvio ${consentStatus.status}`);
  assert(Array.isArray(consentStatus.body?.documents) && consentStatus.body.documents.length === 3, "consent status no devolvio 3 documentos requeridos");
  assert(consentStatus.body.documents.every((doc) => doc.required === true), "consent status: todos los documentos deben ser requeridos");

  const consentEmpty = await request("/api/me/consent", {
    body: JSON.stringify({ accepted: [] }),
    headers: { Authorization: `Bearer ${consentToken}`, "Content-Type": "application/json" },
    method: "POST"
  });
  assert(consentEmpty.status === 400, `consent vacio esperaba 400 y devolvio ${consentEmpty.status}`);

  const consentRecord = await request("/api/me/consent", {
    body: JSON.stringify({ accepted: ["privacy_notice", "terms_of_service", "health_data_processing"] }),
    headers: { Authorization: `Bearer ${consentToken}`, "Content-Type": "application/json" },
    method: "POST"
  });
  assert(consentRecord.status === 200, `registrar consentimiento esperaba 200 y devolvio ${consentRecord.status}`);
  assert(consentRecord.body?.completed === true, "registrar consentimiento no marco completed=true");

  const consentReread = await request("/api/me/consent", {
    headers: { Authorization: `Bearer ${consentToken}` }
  });
  assert(consentReread.status === 200, `consent relectura esperaba 200 y devolvio ${consentReread.status}`);
  assert(consentReread.body?.completed === true, "consent relectura deberia seguir completed=true");
  assert(consentReread.body.documents.every((doc) => doc.accepted === true && doc.acceptedAt), "consent relectura: todos los documentos deben quedar aceptados con fecha");

  // --- Marketplace Mercado Pago (Fase 7) ---

  // (a) Connect exige sesion de profesional.
  const marketplaceConnectNoAuth = await request("/api/professional-marketplace/connect");
  assert(marketplaceConnectNoAuth.status === 401, `connect sin sesion esperaba 401 y devolvio ${marketplaceConnectNoAuth.status}`);

  // (b) Flujo OAuth simulado: connect entrega authorizationUrl con code y state firmado.
  const marketplaceConnect = await request("/api/professional-marketplace/connect", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(marketplaceConnect.status === 200, `connect esperaba 200 y devolvio ${marketplaceConnect.status}`);
  assert(marketplaceConnect.body?.authorizationUrl, "connect no devolvio authorizationUrl");
  assert(marketplaceConnect.body?.redirectUri, "connect no devolvio redirectUri");

  const authorizationUrl = new URL(marketplaceConnect.body.authorizationUrl);
  const connectCode = authorizationUrl.searchParams.get("code");
  const connectState = authorizationUrl.searchParams.get("state");
  assert(connectCode === "sim-auth-code", `connect modo simulado esperaba code sim-auth-code y devolvio ${connectCode}`);
  assert(connectState, "connect no incluyo state en authorizationUrl");

  const marketplaceCallback = await request("/api/professional-marketplace/callback", {
    body: JSON.stringify({ code: connectCode, state: connectState }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(marketplaceCallback.status === 201, `callback marketplace esperaba 201 y devolvio ${marketplaceCallback.status}`);

  const marketplaceStatusPending = await request("/api/professional-marketplace/status", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(marketplaceStatusPending.status === 200, `status marketplace esperaba 200 y devolvio ${marketplaceStatusPending.status}`);
  assert(marketplaceStatusPending.body?.status === "pending", `status tras callback esperaba pending y devolvio ${marketplaceStatusPending.body?.status}`);

  // (c) Tamper determinista del state: el formato es professionalId|timestamp|firma.
  // Sustituimos el professionalId por otro id SIN tocar la firma; la firma deja de coincidir y debe dar 400.
  const decodedState = Buffer.from(connectState, "base64").toString("utf8");
  const stateParts = decodedState.split("|");
  assert(stateParts.length === 3, `state esperaba formato professionalId|timestamp|firma y tenia ${stateParts.length} partes`);
  const tamperedDecoded = ["pro-intruso", stateParts[1], stateParts[2]].join("|");
  const tamperedState = Buffer.from(tamperedDecoded, "utf8").toString("base64");

  const marketplaceCallbackTampered = await request("/api/professional-marketplace/callback", {
    body: JSON.stringify({ code: connectCode, state: tamperedState }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(marketplaceCallbackTampered.status === 400, `callback con state alterado esperaba 400 y devolvio ${marketplaceCallbackTampered.status}`);

  // (d) Lista de pendientes y permisos: master ve a Laura; el paciente recibe 403.
  const marketplacePending = await request("/api/admin/marketplace/pending", {
    headers: { Authorization: `Bearer ${masterAuth.token}` }
  });
  assert(marketplacePending.status === 200, `pending marketplace esperaba 200 y devolvio ${marketplacePending.status}`);
  assert(Array.isArray(marketplacePending.body), "pending marketplace no devolvio arreglo");
  assert(
    marketplacePending.body.some((item) => item.id === "pro-laura-vega"),
    "pending marketplace no incluye a pro-laura-vega"
  );

  const marketplacePendingDenied = await request("/api/admin/marketplace/pending", {
    headers: { Authorization: `Bearer ${patientAuth.token}` }
  });
  assert(marketplacePendingDenied.status === 403, `pending marketplace para paciente esperaba 403 y devolvio ${marketplacePendingDenied.status}`);

  // (e) Verify: status invalido rechazado; verified deja a Laura con comision > 0.
  const marketplaceVerifyInvalid = await request("/api/admin/marketplace/professionals/pro-laura-vega/verify", {
    body: JSON.stringify({ status: "no-valido" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(marketplaceVerifyInvalid.status === 400, `verify con status invalido esperaba 400 y devolvio ${marketplaceVerifyInvalid.status}`);

  const marketplaceVerify = await request("/api/admin/marketplace/professionals/pro-laura-vega/verify", {
    body: JSON.stringify({ status: "verified" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(marketplaceVerify.status === 200, `verify marketplace esperaba 200 y devolvio ${marketplaceVerify.status}`);

  const marketplaceStatusVerified = await request("/api/professional-marketplace/status", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(marketplaceStatusVerified.status === 200, `status tras verify esperaba 200 y devolvio ${marketplaceStatusVerified.status}`);
  assert(marketplaceStatusVerified.body?.status === "verified", `status tras verify esperaba verified y devolvio ${marketplaceStatusVerified.body?.status}`);
  assert(
    marketplaceStatusVerified.body?.commissionPercentage > 0,
    `status tras verify esperaba commissionPercentage > 0 y devolvio ${marketplaceStatusVerified.body?.commissionPercentage}`
  );

  // (f) Checkout con split + webhook: cita futura con servicio con precio de Laura, pago como paciente y webhook approved.
  const marketplaceDate = nextWeekdayDate(1, 60 + Math.floor(Date.now() % 80));
  const marketplaceAppointment = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: marketplaceDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de checkout marketplace",
      time: "09:00",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(marketplaceAppointment.status === 201, `cita marketplace esperaba 201 y devolvio ${marketplaceAppointment.status}`);

  const marketplaceCheckout = await request(`/api/appointments/${marketplaceAppointment.body.id}/checkout`, {
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(marketplaceCheckout.status === 200, `checkout marketplace esperaba 200 y devolvio ${marketplaceCheckout.status}`);
  assert(marketplaceCheckout.body?.paymentId, "checkout marketplace no devolvio paymentId");
  assert(marketplaceCheckout.body?.simulated === true, "checkout marketplace esperaba simulated=true");

  const marketplaceProviderPaymentId = `qa-mp-split-${Date.now()}`;
  const marketplaceWebhookRequestId = `qa-mp-split-req-${Date.now()}`;
  const marketplaceWebhook = await request("/api/webhooks/mercadopago", {
    body: JSON.stringify({
      type: "payment",
      data: { id: marketplaceProviderPaymentId, status: "approved", external_reference: marketplaceCheckout.body.paymentId }
    }),
    headers: {
      "Content-Type": "application/json",
      "x-request-id": marketplaceWebhookRequestId,
      "x-signature": mercadoPagoSignature(marketplaceProviderPaymentId, marketplaceWebhookRequestId, MERCADOPAGO_WEBHOOK_SECRET)
    },
    method: "POST"
  });
  assert(marketplaceWebhook.status === 200, `webhook marketplace esperaba 200 y devolvio ${marketplaceWebhook.status}`);
  assert(marketplaceWebhook.body?.processed === true, "webhook marketplace no proceso el pago");

  const marketplacePaidAppointments = await request("/api/appointments", {
    headers: { Authorization: `Bearer ${refreshed.body.token}` }
  });
  assert(marketplacePaidAppointments.status === 200, `citas tras pago marketplace esperaba 200 y devolvio ${marketplacePaidAppointments.status}`);
  const marketplacePaidAppointment = marketplacePaidAppointments.body.find(
    (appointment) => appointment.id === marketplaceAppointment.body.id
  );
  assert(marketplacePaidAppointment?.status === "confirmed", "la cita marketplace pagada no quedo confirmada via webhook");

  // (g) Limpieza: cancelar la cita QA. Laura queda verified (estado correcto y re-ejecutable).
  const marketplaceCleanup = await request(`/api/appointments/${marketplaceAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Limpieza de prueba automatizada de marketplace" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(marketplaceCleanup.status === 200, `limpieza de cita marketplace esperaba 200 y devolvio ${marketplaceCleanup.status}`);
  assert(marketplaceCleanup.body?.paymentStatus === "refunded", `cancelacion marketplace esperaba paymentStatus refunded y devolvio ${marketplaceCleanup.body?.paymentStatus}`);

  // --- Cobro en efectivo, estado de cuenta y suscripcion (Top-5 UX) ---

  // (a) Cita nueva para el flujo de efectivo; el DTO ya expone paymentStatus/paymentProvider.
  const cashDate = nextWeekdayDate(1, 150 + Math.floor(Date.now() % 60));
  const cashAppointment = await request("/api/appointments", {
    body: JSON.stringify({
      createdByUserId: "usr-ana-martinez",
      date: cashDate,
      mode: "online",
      patientId: "ana-martinez",
      professionalId: "pro-laura-vega",
      professionalServiceId: "svc-laura-seguimiento",
      reason: "Prueba automatizada de cobro en efectivo",
      time: "09:00",
      type: "Seguimiento nutricional"
    }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(cashAppointment.status === 201, `cita de efectivo esperaba 201 y devolvio ${cashAppointment.status}`);
  assert(cashAppointment.body?.paymentStatus === "none", `cita nueva esperaba paymentStatus none y devolvio ${cashAppointment.body?.paymentStatus}`);
  assert(cashAppointment.body?.paymentProvider === null, `cita nueva esperaba paymentProvider null y devolvio ${cashAppointment.body?.paymentProvider}`);

  // (b) Permisos del registro de efectivo: sin sesion 401, otro profesional 403, paciente 403.
  const cashNoAuth = await request(`/api/appointments/${cashAppointment.body.id}/cash-payment`, {
    method: "POST"
  });
  assert(cashNoAuth.status === 401, `efectivo sin sesion esperaba 401 y devolvio ${cashNoAuth.status}`);

  const cashDeniedProfessional = await request(`/api/appointments/${cashAppointment.body.id}/cash-payment`, {
    headers: { Authorization: `Bearer ${newProfessionalToken}` },
    method: "POST"
  });
  assert(cashDeniedProfessional.status === 403, `efectivo en cita ajena esperaba 403 y devolvio ${cashDeniedProfessional.status}`);

  const cashDeniedPatient = await request(`/api/appointments/${cashAppointment.body.id}/cash-payment`, {
    headers: { Authorization: `Bearer ${otherPatientAuth.token}` },
    method: "POST"
  });
  assert(cashDeniedPatient.status === 403, `efectivo por paciente esperaba 403 y devolvio ${cashDeniedPatient.status}`);

  // (c) El profesional dueno registra el efectivo: pago approved sin comision y cita confirmada.
  const cashRegistered = await request(`/api/appointments/${cashAppointment.body.id}/cash-payment`, {
    headers: { Authorization: `Bearer ${professionalAuth.token}` },
    method: "POST"
  });
  assert(cashRegistered.status === 200, `registrar efectivo esperaba 200 y devolvio ${cashRegistered.status}`);
  assert(cashRegistered.body?.paymentId, "registrar efectivo no devolvio paymentId");
  assert(cashRegistered.body?.provider === "cash", `registrar efectivo esperaba provider cash y devolvio ${cashRegistered.body?.provider}`);
  assert(cashRegistered.body?.status === "approved", `registrar efectivo esperaba approved y devolvio ${cashRegistered.body?.status}`);
  assert(cashRegistered.body?.appointment?.status === "confirmed", "registrar efectivo no confirmo la cita programada");
  assert(cashRegistered.body?.appointment?.paymentStatus === "approved", "la cita no expone paymentStatus approved tras el efectivo");
  assert(cashRegistered.body?.appointment?.paymentProvider === "cash", "la cita no expone paymentProvider cash tras el efectivo");

  // (d) Idempotencia: un segundo registro sobre la misma cita es 400.
  const cashRepeat = await request(`/api/appointments/${cashAppointment.body.id}/cash-payment`, {
    headers: { Authorization: `Bearer ${professionalAuth.token}` },
    method: "POST"
  });
  assert(cashRepeat.status === 400, `efectivo repetido esperaba 400 y devolvio ${cashRepeat.status}`);

  // (e) Estado de cuenta del mes: solo para profesionales, con summary consistente.
  const paymentsDenied = await request("/api/professional-portal/payments", {
    headers: { Authorization: `Bearer ${otherPatientAuth.token}` }
  });
  assert(paymentsDenied.status === 403, `estado de cuenta para paciente esperaba 403 y devolvio ${paymentsDenied.status}`);

  const paymentsBadMonth = await request("/api/professional-portal/payments?month=2026-13", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(paymentsBadMonth.status === 400, `estado de cuenta con mes invalido esperaba 400 y devolvio ${paymentsBadMonth.status}`);

  const paymentsList = await request("/api/professional-portal/payments", {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(paymentsList.status === 200, `estado de cuenta esperaba 200 y devolvio ${paymentsList.status}`);
  assert(Array.isArray(paymentsList.body?.items), "estado de cuenta no devolvio items");
  assert(/^\d{4}-\d{2}$/.test(paymentsList.body?.month ?? ""), "estado de cuenta no devolvio month YYYY-MM");

  const cashItem = paymentsList.body.items.find((item) => item.paymentId === cashRegistered.body.paymentId);
  assert(cashItem, "estado de cuenta no incluye el pago en efectivo recien registrado");
  assert(cashItem.provider === "cash" && cashItem.status === "approved", "el pago en efectivo no aparece como cash/approved");
  assert(cashItem.commissionAmount === 0, `efectivo esperaba comision 0 y devolvio ${cashItem.commissionAmount}`);
  assert(cashItem.netAmount === cashItem.grossAmount, "efectivo esperaba neto igual a bruto");
  assert(cashItem.patientName === "Ana Martinez" || cashItem.patientName.length > 0, "el item de efectivo no trae paciente");

  const paymentsSummary = paymentsList.body.summary;
  assert(paymentsSummary?.count >= 1, "summary esperaba count >= 1");
  assert(
    Math.abs(paymentsSummary.netTotal - (paymentsSummary.grossTotal - paymentsSummary.commissionTotal)) < 0.01,
    "summary: netTotal debe ser grossTotal - commissionTotal"
  );
  assert(paymentsSummary.cashTotal >= cashItem.netAmount, "summary: cashTotal no incluye el efectivo registrado");
  assert(
    Math.abs(paymentsSummary.cashTotal + paymentsSummary.onlineTotal - paymentsSummary.netTotal) < 0.01,
    "summary: cashTotal + onlineTotal debe ser netTotal"
  );

  // (f) Suscripcion: trial de 14 dias desde la creacion de la cuenta (profesional QA recien creado).
  const subscriptionNoAuth = await request("/api/professional-portal/subscription");
  assert(subscriptionNoAuth.status === 401, `suscripcion sin sesion esperaba 401 y devolvio ${subscriptionNoAuth.status}`);

  const subscriptionDenied = await request("/api/professional-portal/subscription", {
    headers: { Authorization: `Bearer ${otherPatientAuth.token}` }
  });
  assert(subscriptionDenied.status === 403, `suscripcion para paciente esperaba 403 y devolvio ${subscriptionDenied.status}`);

  const subscription = await request("/api/professional-portal/subscription", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(subscription.status === 200, `suscripcion esperaba 200 y devolvio ${subscription.status}`);
  assert(subscription.body?.status === "trial", `profesional recien creado esperaba trial y devolvio ${subscription.body?.status}`);
  assert(
    subscription.body?.daysLeft >= 13 && subscription.body?.daysLeft <= 14,
    `trial recien iniciado esperaba daysLeft 13-14 y devolvio ${subscription.body?.daysLeft}`
  );
  assert(subscription.body?.trialStartedAt && subscription.body?.trialEndsAt, "suscripcion no devolvio fechas de trial");
  assert(subscription.body?.interestRegisteredAt === null, "profesional recien creado no deberia tener interes registrado");
  assert(Array.isArray(subscription.body?.plans) && subscription.body.plans.length === 2, "suscripcion esperaba 2 planes");

  const planBasico = subscription.body.plans.find((plan) => plan.name === "Básico");
  const planPro = subscription.body.plans.find((plan) => plan.name === "Pro");
  assert(planBasico?.monthlyPrice === 399 && planBasico?.currency === "MXN", "plan Básico esperaba $399 MXN");
  assert(planPro?.monthlyPrice === 699 && planPro?.currency === "MXN", "plan Pro esperaba $699 MXN");
  assert(planBasico.features.length > 0 && planPro.features.length > 0, "los planes deben incluir features");

  // (g) Interes de compra: primera llamada lo registra; la segunda es idempotente.
  const interest = await request("/api/professional-portal/subscription/interest", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` },
    method: "POST"
  });
  assert(interest.status === 200, `registrar interes esperaba 200 y devolvio ${interest.status}`);
  assert(interest.body?.interestRegisteredAt, "registrar interes no devolvio interestRegisteredAt");

  const interestRepeat = await request("/api/professional-portal/subscription/interest", {
    headers: { Authorization: `Bearer ${newProfessionalToken}` },
    method: "POST"
  });
  assert(interestRepeat.status === 200, `interes repetido esperaba 200 y devolvio ${interestRepeat.status}`);
  assert(
    interestRepeat.body?.interestRegisteredAt === interest.body.interestRegisteredAt,
    "interes repetido no deberia cambiar interestRegisteredAt"
  );

  // (h) Los internal_admin reciben la notificacion de interes.
  const masterNotifications = await request("/api/notifications", {
    headers: { Authorization: `Bearer ${masterAuth.token}` }
  });
  assert(masterNotifications.status === 200, `notificaciones master esperaba 200 y devolvio ${masterNotifications.status}`);
  assert(
    masterNotifications.body?.some((notification) => notification.type === "subscription_interest"),
    "internal_admin no recibio la notificacion subscription_interest"
  );

  // (i) Limpieza: cancelar la cita de efectivo (el pago aprobado queda como historial contable).
  const cashCleanup = await request(`/api/appointments/${cashAppointment.body.id}/cancel`, {
    body: JSON.stringify({ reason: "Limpieza de prueba automatizada de efectivo" }),
    headers: {
      Authorization: `Bearer ${refreshed.body.token}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  assert(cashCleanup.status === 200, `limpieza de cita de efectivo esperaba 200 y devolvio ${cashCleanup.status}`);
  assert(cashCleanup.body?.paymentStatus === "approved", "la cita cancelada deberia conservar paymentStatus approved");

  // ── AUDIT #5: Recetas legales (cédula + ruta + PDF) ───────────────────────────────────
  // (a) Guard: profesional verificado NO médico (nutritionist = laura.vega) → 403 al emitir receta.
  const rxForbiddenNutritionist = await request("/api/prescriptions", {
    body: JSON.stringify({
      patientId: "ana-martinez",
      medicationName: "Amoxicilina 500 mg",
      dosage: "1 cápsula",
      frequency: "Cada 8 horas",
      duration: "7 días",
      route: "Oral",
      instructions: "Tomar con alimentos",
      refills: 0
    }),
    headers: {
      Authorization: `Bearer ${professionalAuth.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(
    rxForbiddenNutritionist.status === 403,
    `emitir receta como nutriologo esperaba 403 y devolvio ${rxForbiddenNutritionist.status}`
  );

  // (b) Crear paciente QA para el médico recién creado (newProfessionalToken es doctor verificado).
  const rxPatientEmail = `qa.rxpat.${Date.now()}@example.com`;
  const rxPatient = await request("/api/patients", {
    body: JSON.stringify({
      fullName: "Paciente Receta QA",
      age: 35,
      email: rxPatientEmail,
      phone: "+521234567890",
      focus: "Medicina general",
      mainReason: "Prueba receta automatizada"
    }),
    headers: {
      Authorization: `Bearer ${newProfessionalToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(rxPatient.status === 201, `crear paciente QA esperaba 201 y devolvio ${rxPatient.status}`);
  const rxPatientId = rxPatient.body?.id;
  assert(rxPatientId, "crear paciente QA no devolvio id");

  // (c) Médico verificado crea receta con cédula + vía de administración.
  const rxCreate = await request("/api/prescriptions", {
    body: JSON.stringify({
      patientId: rxPatientId,
      medicationName: "Amoxicilina 500 mg",
      dosage: "1 cápsula",
      frequency: "Cada 8 horas",
      duration: "7 días",
      route: "Oral",
      instructions: "Tomar con alimentos",
      refills: 0,
      patientIdentifier: "01/01/1989"
    }),
    headers: {
      Authorization: `Bearer ${newProfessionalToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  assert(rxCreate.status === 201, `crear receta como doctor esperaba 201 y devolvio ${rxCreate.status}`);
  const rxId = rxCreate.body?.id;
  assert(rxId, "crear receta no devolvio id");
  assert(rxCreate.body?.prescriberLicense && rxCreate.body.prescriberLicense !== "",
    "crear receta no estampo cedula profesional (prescriberLicense vacio)");
  assert(rxCreate.body?.prescriberName && rxCreate.body.prescriberName !== "",
    "crear receta no estampo nombre del prescriptor");
  assert(rxCreate.body?.route === "Oral", `crear receta esperaba route=Oral y devolvio ${rxCreate.body?.route}`);
  assert(rxCreate.body?.patientFullName && rxCreate.body.patientFullName !== "",
    "crear receta no estampo nombre del paciente");

  // (d) Endpoint PDF devuelve bytes no vacíos con Content-Type application/pdf.
  const rxPdfResponse = await fetch(`${API_BASE_URL}/api/prescriptions/${rxId}/pdf`, {
    headers: { Authorization: `Bearer ${newProfessionalToken}` }
  });
  assert(rxPdfResponse.status === 200, `GET pdf esperaba 200 y devolvio ${rxPdfResponse.status}`);
  const rxPdfContentType = rxPdfResponse.headers.get("content-type") ?? "";
  assert(
    rxPdfContentType.startsWith("application/pdf"),
    `GET pdf esperaba content-type application/pdf y devolvio ${rxPdfContentType}`
  );
  const rxPdfBytes = await rxPdfResponse.arrayBuffer();
  assert(rxPdfBytes.byteLength > 1024, `GET pdf esperaba PDF no vacio (>1024 bytes) y devolvio ${rxPdfBytes.byteLength} bytes`);
  // El PDF debe contener la cédula profesional en texto plano (QuestPDF embebe texto)
  const rxPdfText = new TextDecoder("latin1").decode(rxPdfBytes);
  assert(
    rxPdfText.includes(rxCreate.body.prescriberLicense),
    "GET pdf no contiene la cedula profesional en el contenido del archivo"
  );

  // (e) Otro profesional (no propietario) intenta descargar el PDF → 403.
  const rxPdfForbidden = await request(`/api/prescriptions/${rxId}/pdf`, {
    headers: { Authorization: `Bearer ${professionalAuth.token}` }
  });
  assert(
    rxPdfForbidden.status === 403,
    `GET pdf de otro profesional esperaba 403 y devolvio ${rxPdfForbidden.status}`
  );
  // ── FIN AUDIT #5 ───────────────────────────────────────────────────────────────────────

  console.log("API tests passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
