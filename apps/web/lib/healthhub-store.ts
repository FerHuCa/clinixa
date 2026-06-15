"use client";

import { useEffect, useMemo, useState } from "react";
import { clearDevUserId, clerkEnabled, devAuthEnabled, getAuthHeaders, readDevUserId, setDevUserId } from "@/lib/auth-client";
import {
  appointments as seedAppointments,
  currentUser as seedCurrentUser,
  demoSessions as seedDemoSessions,
  patientRecords as seedPatientRecords,
  patients as seedPatients,
  professionals as seedProfessionals,
  reviews as seedReviews,
  soapNotes as seedSoapNotes,
  type AppointmentMode,
  type AppointmentStatus,
  type PatientStatus,
  type SoapStatus
} from "@/lib/demo-data";

const STORAGE_KEY = "healthhub-mvp-state-v1";
const SESSION_STORAGE_KEY = "healthhub-demo-user-id";
const SESSION_CHANGED_EVENT = "healthhub-session-changed";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5050";

export type Patient = (typeof seedPatients)[number];
// La API expone paymentStatus/paymentProvider en los DTOs de cita; los datos demo
// no los incluyen, por eso son opcionales. Extender el tipo aquí evita aserciones
// locales en los componentes (demo-data.ts no se toca).
export type Appointment = (typeof seedAppointments)[number] & {
  paymentStatus?: string | null;
  paymentProvider?: string | null;
};
export type SoapNote = (typeof seedSoapNotes)[number];
export type Professional = (typeof seedProfessionals)[number];
export type ProfessionalService = Professional["services"][number];
export type ProfessionalAvailability = Professional["availability"][number];
export type ProfessionalReview = (typeof seedReviews)[number];
export type PatientRecord = (typeof seedPatientRecords)[number];
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  primaryRole: string;
  patientId: string | null;
  professionalId: string | null;
  specialty: string | null;
};
export type DemoSession = CurrentUser & { label: string };
export type AuthResponse = {
  token: string;
  expiresAt: string;
  user: CurrentUser;
};
export type AvailableSlot = {
  id: string;
  date: string;
  time: string;
  label: string;
  startsAt: string;
  endsAt: string;
};
export type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId: string | null;
  professionalId: string | null;
  outcome: string;
  createdAt: string;
};
export type ClinicMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  professionalId: string | null;
  status: string;
};
export type Clinic = {
  id: string;
  name: string;
  legalName: string;
  location: string;
  status: string;
  members: ClinicMember[];
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  appointmentId: string | null;
  patientId: string | null;
  professionalId: string | null;
  createdAt: string;
  readAt: string | null;
};
export type ClinicInvitation = {
  id: string;
  clinicId: string;
  email: string;
  fullName: string;
  role: string;
  specialty: string;
  licenseNumber: string;
  status: string;
  token: string;
  invitedByUserId: string;
  expiresAt: string;
  createdAt: string;
};
export type ProfessionalOnboarding = {
  professionalId: string;
  displayName: string;
  status: string;
  profileComplete: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  isPublished: boolean;
  canPublish: boolean;
  missing: string[];
};
export type ConsentDocument = {
  consentType: string;
  title: string;
  version: string;
  required: boolean;
  accepted: boolean;
  acceptedAt: string | null;
};
export type ConsentStatus = {
  completed: boolean;
  privacyVersion: string;
  termsVersion: string;
  documents: ConsentDocument[];
};
export type CheckoutResponse = {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  initPoint: string;
  simulated: boolean;
};
export type ProfessionalVerificationItem = {
  id: string;
  displayName: string;
  specialty: string;
  specialtyLabel: string;
  location: string;
  licenseNumber: string;
  status: string;
  verificationStatus: string;
  licenseVerifiedAt: string | null;
  licenseVerifiedBy: string | null;
  createdAt: string;
};
export type ClinicInvitationDetail = {
  id: string;
  clinicId: string;
  clinicName: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  specialty: string;
  specialtyLabel: string;
  licenseNumber: string;
  status: string;
  requiresAccount: boolean;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
};
export type NotificationPreference = {
  id: string;
  channel: string;
  enabled: boolean;
  appointmentUpdates: boolean;
  clinicUpdates: boolean;
  reminderUpdates: boolean;
};
export type ProfessionalDashboard = {
  professional: Professional;
  appointments: Appointment[];
  scheduledCount: number;
  completedCount: number;
  patientCount: number;
};

// Estado de cuenta mensual del profesional (GET /api/professional-portal/payments).
export type ProfessionalPaymentItem = {
  paymentId: string;
  appointmentId: string;
  createdAt: string;
  appointmentDate: string;
  patientName: string;
  serviceName: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  provider: string;
  status: string;
};
export type ProfessionalPaymentsSummary = {
  grossTotal: number;
  commissionTotal: number;
  netTotal: number;
  cashTotal: number;
  onlineTotal: number;
  count: number;
};
export type ProfessionalPayments = {
  month: string;
  items: ProfessionalPaymentItem[];
  summary: ProfessionalPaymentsSummary;
};
// Resultado de registrar un cobro en efectivo (POST /api/appointments/{id}/cash-payment).
export type CashPaymentResult = {
  paymentId: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  appointment: Appointment;
};
// Trial y planes del piloto (GET /api/professional-portal/subscription).
export type SubscriptionPlan = {
  name: string;
  monthlyPrice: number;
  currency: string;
  features: string[];
};
export type SubscriptionStatus = {
  trialStartedAt: string;
  trialEndsAt: string;
  daysLeft: number;
  status: "trial" | "expired";
  interestRegisteredAt: string | null;
  plans: SubscriptionPlan[];
};

export type MarketplaceStatus = "not_connected" | "pending" | "verified" | "rejected";

export type ProfessionalMarketplaceStatus = {
  status: MarketplaceStatus;
  email: string | null;
  connectedAt: string | null;
  verifiedAt: string | null;
  tokenExpiresAt: string | null;
  commissionPercentage: number;
};

export type MarketplaceConnect = {
  authorizationUrl: string;
  redirectUri: string;
};

export type MarketplacePendingItem = {
  id: string;
  displayName: string;
  email: string;
  mercadoPagoStatus: string;
  verificationStatus: string;
  connectedAt: string | null;
};
export type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refills: number;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
};

type HealthHubState = {
  patients: Patient[];
  appointments: Appointment[];
  soapNotes: SoapNote[];
  professionals: Professional[];
  reviews: ProfessionalReview[];
  patientRecords: PatientRecord[];
  currentUser: CurrentUser;
  demoSessions: DemoSession[];
};

type ApiStatus = "loading" | "connected" | "fallback" | "session-error";

// Identidad "sin resolver": se usa cuando hay credenciales presentes pero /api/me
// fallo. No es Ana (seed): primaryRole "guest" no cae en ningun menu ni redirect
// (ver app-shell getNavItems/getHomeHref y page.tsx), y fullName vacio evita mostrar
// un nombre equivocado. Mantiene currentUser no-null para los consumidores existentes.
const guestUser: CurrentUser = {
  id: "",
  fullName: "",
  email: "",
  primaryRole: "guest",
  patientId: null,
  professionalId: null,
  specialty: null
};

// hasRealCredentials: hay credencial dev (cookie/localStorage) o Clerk habilitado.
// Para Clerk basta clerkEnabled: no intentamos detectar sesion activa desde el store.
function hasRealCredentials() {
  return Boolean(readDevUserId()) || clerkEnabled;
}

// Dedupe a nivel modulo de /api/me: TODAS las instancias del hook comparten una
// sola promesa de resolucion de identidad, evitando la ventana donde un componente
// monta con seed/stale mientras otro ya resolvio la identidad real.
let sessionPromise: Promise<CurrentUser | null> | null = null;

function resolveSessionOnce(): Promise<CurrentUser | null> {
  if (!sessionPromise) {
    sessionPromise = apiGet<CurrentUser>("/api/me").catch(() => null);
  }

  return sessionPromise;
}

// invalidateSession: limpia el dedupe para forzar una nueva resolucion. Se invoca
// cuando la sesion cambia (login, setDemoSession, logout, refreshSession).
function invalidateSession() {
  sessionPromise = null;
}

type NewPatientInput = {
  fullName: string;
  age: number;
  email: string;
  phone: string;
  focus: string;
  mainReason: string;
};

type NewAppointmentInput = {
  patientId: string;
  date: string;
  time: string;
  duration?: string;
  type?: string;
  reason: string;
  professionalId?: string;
  professionalServiceId?: string;
  mode?: AppointmentMode;
  createdByUserId?: string;
};

type NewSoapNoteInput = {
  patientId: string;
  title: string;
  date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: SoapStatus;
  aiGenerated: boolean;
};

const initialState: HealthHubState = {
  patients: seedPatients,
  appointments: seedAppointments,
  soapNotes: seedSoapNotes,
  professionals: seedProfessionals,
  reviews: seedReviews,
  patientRecords: seedPatientRecords,
  currentUser: seedCurrentUser,
  demoSessions: seedDemoSessions
};

const statusLabels: Record<PatientStatus | AppointmentStatus | SoapStatus, string> = {
  active: "Activo",
  pending: "Pendiente",
  paused: "Pausado",
  scheduled: "Programada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
  draft: "Borrador",
  finalized: "Finalizada"
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base: string, existingIds: string[]) {
  const safeBase = base || "registro";
  let candidate = safeBase;
  let index = 2;

  while (existingIds.includes(candidate)) {
    candidate = `${safeBase}-${index}`;
    index += 1;
  }

  return candidate;
}

function initialsFromName(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function readStoredState(): HealthHubState {
  if (typeof window === "undefined") {
    return initialState;
  }

  const rawState = window.localStorage.getItem(STORAGE_KEY);

  if (!rawState) {
    return initialState;
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<HealthHubState>;

    // Identidad: NO confiar en parsed.currentUser cuando hay credenciales presentes
    // (la identidad activa se resuelve via /api/me deduplicado). Sin credencial alguna
    // (prototipo puro sin API) se permite la identidad almacenada o el seed demo.
    const storedUser = parsed.currentUser && typeof parsed.currentUser === "object" ? (parsed.currentUser as CurrentUser) : seedCurrentUser;

    return {
      patients: Array.isArray(parsed.patients) ? parsed.patients : seedPatients,
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : seedAppointments,
      soapNotes: Array.isArray(parsed.soapNotes) ? parsed.soapNotes : seedSoapNotes,
      professionals: Array.isArray(parsed.professionals) ? parsed.professionals : seedProfessionals,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : seedReviews,
      patientRecords: Array.isArray(parsed.patientRecords) ? parsed.patientRecords : seedPatientRecords,
      currentUser: hasRealCredentials() ? guestUser : storedUser,
      demoSessions: Array.isArray(parsed.demoSessions) ? parsed.demoSessions : seedDemoSessions
    };
  } catch {
    return initialState;
  }
}

function readSelectedUserId() {
  if (typeof window === "undefined") {
    return seedCurrentUser.id;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY) || seedCurrentUser.id;
}

function persistUserRole(role: string) {
  if (typeof window === "undefined") {
    return;
  }

  const date = new Date();
  date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
  document.cookie = `healthhub-user-role=${role}; path=/; expires=${date.toUTCString()}`;
}

function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("healthhub-auth-token");
  window.localStorage.removeItem("healthhub-auth-expires-at");
  document.cookie = "healthhub-user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
}

function persistSelectedUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, userId);
}

function persistState(state: HealthHubState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function broadcastCurrentUser(user: CurrentUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<CurrentUser>(SESSION_CHANGED_EVENT, { detail: user }));
}

function mergePortalAppointments(appointments: Appointment[], portalAppointments: Appointment[]) {
  const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]));

  for (const appointment of portalAppointments) {
    appointmentsById.set(appointment.id, {
      ...appointmentsById.get(appointment.id),
      ...appointment
    });
  }

  return Array.from(appointmentsById.values());
}

class ApiError extends Error {
  errors: string[];
  status: number;

  constructor(status: number, errors: string[]) {
    super(errors.join(" "));
    this.errors = errors;
    this.status = status;
  }
}

async function apiGet<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw await createApiError(response, `GET ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...authHeaders,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw await createApiError(response, `POST ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiPostEmpty(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await getAuthHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw await createApiError(response, `POST ${path} failed with ${response.status}`);
  }
}

async function apiPatch<T>(path: string, body: unknown) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...authHeaders,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  if (!response.ok) {
    throw await createApiError(response, `PATCH ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function createApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as { errors?: string[] };
    const errors = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors : [fallbackMessage];
    return new ApiError(response.status, errors);
  } catch {
    return new ApiError(response.status, [fallbackMessage]);
  }
}

function createLocalPatient(input: NewPatientInput, patients: Patient[]) {
  const patientId = uniqueId(slugify(input.fullName), patients.map((patient) => patient.id));

  return {
    id: patientId,
    fullName: input.fullName,
    initials: initialsFromName(input.fullName),
    status: "active",
    statusLabel: statusLabels.active,
    age: input.age,
    email: input.email,
    phone: input.phone,
    focus: input.focus,
    mainReason: input.mainReason,
    riskLevel: "Por evaluar",
    nextAppointment: "Sin cita",
    lastSession: "Sin historial",
    progress: "Paciente creado desde el prototipo MVP.",
    professional: "Profesional asignado"
  } satisfies Patient;
}

function createLocalAppointment(input: NewAppointmentInput, patient: Patient) {
  const professional = seedProfessionals.find((item) => item.id === input.professionalId);
  const service = professional?.services.find((item) => item.id === input.professionalServiceId);

  return {
    id: `apt-${Date.now()}`,
    patientId: patient.id,
    patientName: patient.fullName,
    professionalId: professional?.id ?? "",
    professionalServiceId: service?.id ?? "",
    professionalName: professional?.displayName ?? "Profesional por asignar",
    specialtyLabel: professional?.specialtyLabel ?? "Salud",
    date: input.date,
    time: input.time,
    duration: service ? `${service.durationMinutes} min` : input.duration ?? "",
    type: service?.name ?? input.type ?? "",
    mode: input.mode ?? service?.mode ?? "in_person",
    status: "scheduled",
    statusLabel: statusLabels.scheduled,
    reason: input.reason
  } satisfies Appointment;
}

function createLocalSoapNote(input: NewSoapNoteInput, patient: Patient) {
  return {
    id: `soap-${Date.now()}`,
    patientId: patient.id,
    patientName: patient.fullName,
    appointmentId: null,
    date: input.date,
    title: input.title,
    status: input.status,
    statusLabel: statusLabels[input.status],
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
    aiGenerated: input.aiGenerated
  } satisfies SoapNote;
}

export function useHealthHubStore() {
  const [state, setState] = useState<HealthHubState>(initialState);
  const [ready, setReady] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(async () => {
      if (cancelled) {
        return;
      }

      const storedState = readStoredState();
      const selectedUserId = readSelectedUserId();

      if (devAuthEnabled && !clerkEnabled && !readDevUserId()) {
        setDevUserId(selectedUserId);
      }

      setState(storedState);

      // PASO 1 — Identidad: se resuelve via /api/me deduplicado a nivel modulo.
      // Si falla con credenciales presentes NO se cae a Ana (seed): se declara
      // session-error y se conserva guestUser. Sin credencial alguna (prototipo
      // puro sin API) se permite el seed demo.
      const resolvedUser = await resolveSessionOnce();

      if (cancelled) {
        return;
      }

      const credentials = hasRealCredentials();
      let sessionFailed = false;
      let identityUser: CurrentUser;

      if (resolvedUser) {
        identityUser = resolvedUser;
      } else if (credentials) {
        // Credenciales presentes pero /api/me fallo: identidad sin resolver.
        identityUser = guestUser;
        sessionFailed = true;
      } else {
        // Modo prototipo puro sin API: el seed demo (Ana) es la unica identidad.
        identityUser = storedState.currentUser;
      }

      setState((current) => ({ ...current, currentUser: identityUser }));

      // PASO 2 — Datos: se piden en paralelo y se mergea lo que llego. Un fallo
      // parcial NO descarta la identidad real; solo marca apiStatus="fallback".
      const demoSessionsRequest = devAuthEnabled
        ? apiGet<DemoSession[]>("/api/demo-sessions")
        : Promise.resolve(seedDemoSessions);

      const [patientsResult, appointmentsResult, soapNotesResult, professionalsResult, demoSessionsResult, portalAppointmentsResult, patientRecordsResult] =
        await Promise.allSettled([
          apiGet<Patient[]>("/api/patients"),
          apiGet<Appointment[]>("/api/appointments"),
          apiGet<SoapNote[]>("/api/soap-notes"),
          apiGet<Professional[]>("/api/professionals"),
          demoSessionsRequest,
          apiGet<Appointment[]>("/api/patient-portal/appointments"),
          apiGet<PatientRecord[]>("/api/patient-portal/records")
        ]);

      if (cancelled) {
        return;
      }

      const professionals = professionalsResult.status === "fulfilled" ? professionalsResult.value : null;
      const reviewGroups = professionals
        ? await Promise.allSettled(professionals.map((professional) => apiGet<ProfessionalReview[]>(`/api/professionals/${professional.id}/reviews`)))
        : [];

      if (cancelled) {
        return;
      }

      // Merge: cada dato exitoso reemplaza el seed/stored; los fallidos se conservan
      // del estado previo (seed o lo guardado), sin afectar la identidad.
      const baseAppointments = appointmentsResult.status === "fulfilled" ? appointmentsResult.value : storedState.appointments;
      const portalAppointments = portalAppointmentsResult.status === "fulfilled" ? portalAppointmentsResult.value : [];
      const reviews = professionals
        ? reviewGroups.filter((group): group is PromiseFulfilledResult<ProfessionalReview[]> => group.status === "fulfilled").flatMap((group) => group.value)
        : storedState.reviews;

      const mergedState: HealthHubState = {
        patients: patientsResult.status === "fulfilled" ? patientsResult.value : storedState.patients,
        appointments: mergePortalAppointments(baseAppointments, portalAppointments),
        soapNotes: soapNotesResult.status === "fulfilled" ? soapNotesResult.value : storedState.soapNotes,
        professionals: professionals ?? storedState.professionals,
        reviews,
        patientRecords: patientRecordsResult.status === "fulfilled" ? patientRecordsResult.value : storedState.patientRecords,
        currentUser: identityUser,
        demoSessions: demoSessionsResult.status === "fulfilled" ? demoSessionsResult.value : storedState.demoSessions
      };

      setState(mergedState);
      persistState(mergedState);

      // apiStatus refleja datos: connected si todo llego, fallback si algun dato
      // fallo. La identidad fallida se reporta aparte con session-error.
      const dataResults = [patientsResult, appointmentsResult, soapNotesResult, professionalsResult, demoSessionsResult, portalAppointmentsResult, patientRecordsResult];
      const dataFailed = dataResults.some((result) => result.status === "rejected");

      if (sessionFailed) {
        setApiStatus("session-error");
      } else if (dataFailed) {
        setApiStatus("fallback");
      } else {
        setApiStatus("connected");
      }

      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  useEffect(() => {
    function synchronizeSession(event: Event) {
      const user = (event as CustomEvent<CurrentUser>).detail;

      if (!user) {
        return;
      }

      setState((current) => {
        const nextState = { ...current, currentUser: user };
        persistState(nextState);
        return nextState;
      });
    }

    window.addEventListener(SESSION_CHANGED_EVENT, synchronizeSession);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, synchronizeSession);
  }, []);

  const actions = useMemo(
    () => ({
      async addPatient(input: NewPatientInput) {
        let newPatient: Patient;

        try {
          newPatient = await apiPost<Patient>("/api/patients", input);
          setApiStatus("connected");
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
            throw error;
          }

          newPatient = createLocalPatient(input, state.patients);
          setApiStatus("fallback");
        }

        setState((current) => {
          const nextState = {
            ...current,
            patients: [newPatient, ...current.patients.filter((patient) => patient.id !== newPatient.id)]
          };

          persistState(nextState);

          return nextState;
        });

        return newPatient;
      },
      async addAppointment(input: NewAppointmentInput) {
        const patient = state.patients.find((item) => item.id === input.patientId);

        if (!patient) {
          return null;
        }

        let newAppointment: Appointment;

        try {
          newAppointment = await apiPost<Appointment>("/api/appointments", input);
          setApiStatus("connected");
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
            throw error;
          }

          newAppointment = createLocalAppointment(input, patient);
          setApiStatus("fallback");
        }

        setState((current) => {
          const nextState = {
            ...current,
            appointments: [newAppointment, ...current.appointments.filter((appointment) => appointment.id !== newAppointment.id)],
            patients: current.patients.map((item) =>
              item.id === patient.id ? { ...item, nextAppointment: `${input.date} ${input.time}` } : item
            )
          };

          persistState(nextState);

          return nextState;
        });

        return newAppointment;
      },
      async startAppointmentCheckout(appointmentId: string) {
        const checkout = await apiPost<CheckoutResponse>(`/api/appointments/${appointmentId}/checkout`, {});
        setApiStatus("connected");
        return checkout;
      },
      async cancelAppointment(appointmentId: string, reason: string) {
        const updatedAppointment = await apiPatch<Appointment>(`/api/appointments/${appointmentId}/cancel`, { reason });

        setState((current) => {
          const nextState = {
            ...current,
            appointments: current.appointments.map((appointment) => (appointment.id === updatedAppointment.id ? updatedAppointment : appointment))
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return updatedAppointment;
      },
      async rescheduleAppointment(appointmentId: string, date: string, time: string, reason: string) {
        const updatedAppointment = await apiPatch<Appointment>(`/api/appointments/${appointmentId}/reschedule`, { date, reason, time });

        setState((current) => {
          const nextState = {
            ...current,
            appointments: current.appointments.map((appointment) => (appointment.id === updatedAppointment.id ? updatedAppointment : appointment))
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return updatedAppointment;
      },
      async updateAppointmentStatus(appointmentId: string, status: "confirmed" | "completed" | "no_show", reason: string) {
        const updatedAppointment = await apiPatch<Appointment>(`/api/appointments/${appointmentId}/status`, { reason, status });

        setState((current) => {
          const nextState = {
            ...current,
            appointments: current.appointments.map((appointment) => (appointment.id === updatedAppointment.id ? updatedAppointment : appointment))
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return updatedAppointment;
      },
      async login(email: string, password: string) {
        const auth = await apiPost<AuthResponse>("/api/auth/login", { email, password });
        invalidateSession();
        setDevUserId(auth.user.id);
        persistSelectedUserId(auth.user.id);
        persistUserRole(auth.user.primaryRole);

        const [patientPortalAppointments, patientRecords] = await Promise.all([
          apiGet<Appointment[]>("/api/patient-portal/appointments"),
          apiGet<PatientRecord[]>("/api/patient-portal/records")
        ]);

        setState((current) => {
          const nextState = {
            ...current,
            appointments: mergePortalAppointments(current.appointments, patientPortalAppointments),
            currentUser: auth.user,
            patientRecords
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        broadcastCurrentUser(auth.user);
        return auth.user;
      },
      async refreshSession() {
        // Invalida el dedupe y vuelve a resolver: la nueva identidad pasa a ser la
        // compartida por todas las instancias del hook.
        invalidateSession();
        const user = await apiGet<CurrentUser>("/api/me");
        sessionPromise = Promise.resolve(user);
        persistSelectedUserId(user.id);
        persistUserRole(user.primaryRole);

        setState((current) => {
          const nextState = {
            ...current,
            currentUser: user
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        broadcastCurrentUser(user);
        return user;
      },
      async updateAccountProfile(input: { fullName: string; role?: string }) {
        const user = await apiPatch<CurrentUser>("/api/me", input);
        sessionPromise = Promise.resolve(user);
        persistUserRole(user.primaryRole);

        setState((current) => {
          const nextState = {
            ...current,
            currentUser: user
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        broadcastCurrentUser(user);
        return user;
      },
      async logout() {
        invalidateSession();
        clearDevUserId();
        clearAuthToken();
        persistSelectedUserId(seedCurrentUser.id);

        const fallbackUser = state.demoSessions.find((session) => session.id === seedCurrentUser.id) ?? seedCurrentUser;
        setState((current) => {
          const nextState = {
            ...current,
            currentUser: fallbackUser
          };

          persistState(nextState);

          return nextState;
        });

        broadcastCurrentUser(fallbackUser);
        return fallbackUser;
      },
      async setDemoSession(userId: string) {
        if (!devAuthEnabled) {
          throw new Error("El acceso de desarrollo no esta habilitado.");
        }

        invalidateSession();
        clearAuthToken();
        setDevUserId(userId);
        persistSelectedUserId(userId);

        try {
          const [currentUser, patientPortalAppointments, patientRecords] = await Promise.all([
            apiGet<CurrentUser>("/api/me"),
            apiGet<Appointment[]>("/api/patient-portal/appointments"),
            apiGet<PatientRecord[]>("/api/patient-portal/records")
          ]);
          sessionPromise = Promise.resolve(currentUser);

          setState((current) => {
            const nextState = {
              ...current,
              appointments: mergePortalAppointments(current.appointments, patientPortalAppointments),
              currentUser,
              patientRecords
            };

            persistState(nextState);

            return nextState;
          });
          setApiStatus("connected");
          broadcastCurrentUser(currentUser);
          return currentUser;
        } catch {
          const fallbackUser = state.demoSessions.find((session) => session.id === userId) ?? seedCurrentUser;
          setState((current) => {
            const nextState = {
              ...current,
              currentUser: fallbackUser
            };

            persistState(nextState);

            return nextState;
          });
          setApiStatus("fallback");
          broadcastCurrentUser(fallbackUser);
          return fallbackUser;
        }
      },
      async loadProfessionalDashboard() {
        try {
          const dashboard = await apiGet<ProfessionalDashboard>("/api/professional-portal/dashboard");
          setApiStatus("connected");
          return dashboard;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return null;
        }
      },
      async loadProfessionalPayments(month?: string) {
        const query = month ? `?month=${encodeURIComponent(month)}` : "";

        try {
          const payments = await apiGet<ProfessionalPayments>(`/api/professional-portal/payments${query}`);
          setApiStatus("connected");
          return payments;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return null;
        }
      },
      async registerCashPayment(appointmentId: string) {
        const result = await apiPost<CashPaymentResult>(`/api/appointments/${appointmentId}/cash-payment`, {});

        setState((current) => {
          const nextState = {
            ...current,
            appointments: current.appointments.map((appointment) =>
              appointment.id === result.appointment.id ? result.appointment : appointment
            )
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return result;
      },
      async loadSubscription() {
        // Carga silenciosa: el banner de trial del shell no debe romper la página ni
        // marcar "modo demostración" si este endpoint falla; simplemente no se muestra.
        try {
          const subscription = await apiGet<SubscriptionStatus>("/api/professional-portal/subscription");
          setApiStatus("connected");
          return subscription;
        } catch {
          return null;
        }
      },
      async registerSubscriptionInterest() {
        const subscription = await apiPost<SubscriptionStatus>("/api/professional-portal/subscription/interest", {});
        setApiStatus("connected");
        return subscription;
      },
      async loadMarketplaceStatus() {
        const status = await apiGet<ProfessionalMarketplaceStatus>("/api/professional-marketplace/status");
        setApiStatus("connected");
        return status;
      },
      async connectMarketplace() {
        const connect = await apiGet<MarketplaceConnect>("/api/professional-marketplace/connect");
        setApiStatus("connected");
        return connect;
      },
      async loadMarketplacePending() {
        try {
          const pending = await apiGet<MarketplacePendingItem[]>("/api/admin/marketplace/pending");
          setApiStatus("connected");
          return pending;
        } catch (error) {
          // 403 (clinic_admin sin clinica, etc.) se maneja en silencio sin romper la pagina.
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async verifyMarketplaceProfessional(professionalId: string, status: "verified" | "rejected") {
        await apiPatch<{ status: string; message: string }>(
          `/api/admin/marketplace/professionals/${professionalId}/verify`,
          { status }
        );
        setApiStatus("connected");
      },
      async loadAvailableSlots(professionalId: string, serviceId: string) {
        try {
          const slots = await apiGet<AvailableSlot[]>(
            `/api/professionals/${professionalId}/available-slots?serviceId=${encodeURIComponent(serviceId)}`
          );
          setApiStatus("connected");
          return slots;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
            return [];
          }

          setApiStatus("fallback");
          return [];
        }
      },
      async createProfessionalService(input: {
        name: string;
        description: string;
        durationMinutes: number;
        price: number;
        mode: string;
      }) {
        const service = await apiPost<ProfessionalService>("/api/professional-portal/services", input);

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((professional) =>
              professional.id === current.currentUser.professionalId
                ? { ...professional, services: [...professional.services.filter((item) => item.id !== service.id), service] }
                : professional
            )
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return service;
      },
      async updateProfessionalService(
        serviceId: string,
        input: {
          name: string;
          description: string;
          durationMinutes: number;
          price: number;
          mode: string;
        }
      ) {
        const service = await apiPatch<ProfessionalService>(`/api/professional-portal/services/${serviceId}`, input);

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((professional) =>
              professional.id === current.currentUser.professionalId
                ? { ...professional, services: professional.services.map((item) => (item.id === service.id ? service : item)) }
                : professional
            )
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return service;
      },
      async createProfessionalAvailability(input: { weekday: number; startsAt: string; endsAt: string }) {
        const availability = await apiPost<ProfessionalAvailability>("/api/professional-portal/availability", input);

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((professional) =>
              professional.id === current.currentUser.professionalId
                ? { ...professional, availability: [...professional.availability.filter((item) => item.id !== availability.id), availability] }
                : professional
            )
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return availability;
      },
      async updateProfessionalAvailability(availabilityId: string, input: { weekday: number; startsAt: string; endsAt: string }) {
        const availability = await apiPatch<ProfessionalAvailability>(`/api/professional-portal/availability/${availabilityId}`, input);

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((professional) =>
              professional.id === current.currentUser.professionalId
                ? {
                    ...professional,
                    availability: professional.availability.map((item) => (item.id === availability.id ? availability : item))
                  }
                : professional
            )
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return availability;
      },
      async loadAuditLogs(patientId?: string) {
        const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
        try {
          const logs = await apiGet<AuditLog[]>(`/api/audit-logs${query}`);
          setApiStatus("connected");
          return logs;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async loadClinicInvitations(clinicId: string) {
        try {
          const invitations = await apiGet<ClinicInvitation[]>(`/api/clinics/${clinicId}/invitations`);
          setApiStatus("connected");
          return invitations;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async createClinicInvitation(
        clinicId: string,
        input: {
          email: string;
          fullName: string;
          role: string;
          specialty: string;
          licenseNumber: string;
        }
      ) {
        const invitation = await apiPost<ClinicInvitation>(`/api/clinics/${clinicId}/invitations`, input);
        setApiStatus("connected");
        return invitation;
      },
      async loadClinicInvitation(token: string) {
        const invitation = await apiGet<ClinicInvitationDetail>(`/api/clinic-invitations/${encodeURIComponent(token)}`);
        setApiStatus("connected");
        return invitation;
      },
      async acceptClinicInvitation(token: string, input: { password?: string; fullName?: string }) {
        const auth = await apiPost<AuthResponse>(`/api/clinic-invitations/${encodeURIComponent(token)}/accept`, input);
        sessionPromise = Promise.resolve(auth.user);
        if (devAuthEnabled && !readDevUserId()) {
          setDevUserId(auth.user.id);
        }
        persistSelectedUserId(auth.user.id);
        persistUserRole(auth.user.primaryRole);

        setState((current) => {
          const nextState = {
            ...current,
            currentUser: auth.user
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        broadcastCurrentUser(auth.user);
        return auth.user;
      },
      async revokeClinicInvitation(invitationId: string) {
        const invitation = await apiPatch<ClinicInvitation>(`/api/clinic-invitations/${invitationId}/revoke`, {});
        setApiStatus("connected");
        return invitation;
      },
      async remindClinicInvitation(invitationId: string) {
        const invitation = await apiPost<ClinicInvitation>(`/api/clinic-invitations/${invitationId}/remind`, {});
        setApiStatus("connected");
        return invitation;
      },
      async loadProfessionalOnboarding() {
        try {
          const onboarding = await apiGet<ProfessionalOnboarding>("/api/professional-portal/onboarding");
          setApiStatus("connected");
          return onboarding;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return null;
        }
      },
      async updateProfessionalProfile(input: {
        displayName: string;
        bio: string;
        location: string;
        specialty: string;
        appointmentMode: string;
        basePrice: number;
        timezone?: string;
        whatsappNumber?: string;
        licenseNumber?: string;
      }) {
        const professional = await apiPatch<Professional>("/api/professional-portal/profile", input);

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((item) => (item.id === professional.id ? professional : item))
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return professional;
      },
      async publishProfessional() {
        const professional = await apiPost<Professional>("/api/professional-portal/publish", {});

        setState((current) => {
          const nextState = {
            ...current,
            professionals: current.professionals.map((item) => (item.id === professional.id ? professional : item))
          };

          persistState(nextState);

          return nextState;
        });
        setApiStatus("connected");
        return professional;
      },
      async loadConsent() {
        try {
          const status = await apiGet<ConsentStatus>("/api/me/consent");
          setApiStatus("connected");
          return status;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return null;
        }
      },
      async recordConsent(accepted: string[]) {
        const status = await apiPost<ConsentStatus>("/api/me/consent", { accepted });
        setApiStatus("connected");
        return status;
      },
      async loadVerificationQueue(verificationStatus?: string) {
        const query = verificationStatus ? `?verificationStatus=${encodeURIComponent(verificationStatus)}` : "";
        try {
          const queue = await apiGet<ProfessionalVerificationItem[]>(`/api/admin/professionals${query}`);
          setApiStatus("connected");
          return queue;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async updateProfessionalVerification(professionalId: string, status: "verified" | "rejected" | "pending", reason: string) {
        const updated = await apiPatch<Professional>(`/api/professionals/${professionalId}/verification`, { reason, status });
        setApiStatus("connected");
        return updated;
      },
      async loadClinics() {
        try {
          const clinics = await apiGet<Clinic[]>("/api/clinics");
          setApiStatus("connected");
          return clinics;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async loadNotifications(status?: string) {
        const query = status ? `?status=${encodeURIComponent(status)}` : "";
        try {
          const notifications = await apiGet<Notification[]>(`/api/notifications${query}`);
          setApiStatus("connected");
          return notifications;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async markNotificationRead(notificationId: string) {
        const notification = await apiPatch<Notification>(`/api/notifications/${notificationId}/read`, {});
        setApiStatus("connected");
        return notification;
      },
      async loadNotificationPreferences() {
        try {
          const preferences = await apiGet<NotificationPreference[]>("/api/notification-preferences");
          setApiStatus("connected");
          return preferences;
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
          } else {
            setApiStatus("fallback");
          }

          return [];
        }
      },
      async updateNotificationPreference(
        channel: string,
        input: {
          enabled: boolean;
          appointmentUpdates: boolean;
          clinicUpdates: boolean;
          reminderUpdates: boolean;
        }
      ) {
        const preference = await apiPatch<NotificationPreference>(`/api/notification-preferences/${channel}`, input);
        setApiStatus("connected");
        return preference;
      },
      async addSoapNote(input: NewSoapNoteInput) {
        const patient = state.patients.find((item) => item.id === input.patientId);

        if (!patient) {
          return null;
        }

        let newNote: SoapNote;

        try {
          newNote = await apiPost<SoapNote>("/api/soap-notes", {
            ...input,
            appointmentId: null
          });
          setApiStatus("connected");
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) {
            setApiStatus("connected");
            throw error;
          }

          newNote = createLocalSoapNote(input, patient);
          setApiStatus("fallback");
        }

        setState((current) => {
          const nextState = {
            ...current,
            soapNotes: [newNote, ...current.soapNotes.filter((note) => note.id !== newNote.id)],
            patients: current.patients.map((item) =>
              item.id === patient.id ? { ...item, progress: input.assessment || item.progress, lastSession: input.date } : item
            )
          };

          persistState(nextState);

          return nextState;
        });

        return newNote;
      },
      async loadPrescriptions(patientId?: string) {
        const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
        const prescriptions = await apiGet<Prescription[]>(`/api/prescriptions${query}`);
        setApiStatus("connected");
        return prescriptions;
      },
      async createPrescription(data: {
        patientId: string;
        medicationName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
        refills: number;
        expiresAt?: string;
      }) {
        const prescription = await apiPost<Prescription>("/api/prescriptions", data);
        setApiStatus("connected");
        return prescription;
      },
      resetDemoState() {
        invalidateSession();
        setState(initialState);
        clearAuthToken();
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }),
    [state.demoSessions, state.patients]
  );

  return {
    ...state,
    apiBaseUrl: API_BASE_URL,
    apiStatus,
    // sessionError: hay credenciales pero /api/me fallo; la identidad quedo sin
    // resolver (guest). Los gates de navegacion deben no-op y mostrar un aviso.
    sessionError: apiStatus === "session-error",
    ready,
    ...actions
  };
}
