export type PatientStatus = "active" | "pending" | "paused";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type SoapStatus = "draft" | "finalized";
export type Specialty = "doctor" | "psychologist" | "physiotherapist" | "nutritionist" | "other";
export type AppointmentMode = "in_person" | "online" | "hybrid";

export const currentUser = {
  id: "usr-ana-martinez",
  fullName: "Ana Martinez",
  email: "ana.martinez@example.com",
  primaryRole: "patient",
  patientId: "ana-martinez",
  professionalId: null,
  specialty: null
};

export const demoSessions = [
  {
    id: "usr-ana-martinez",
    fullName: "Ana Martinez",
    email: "ana.martinez@example.com",
    primaryRole: "patient",
    patientId: "ana-martinez",
    professionalId: null,
    label: "Paciente · Ana Martinez",
    specialty: null
  },
  {
    id: "usr-carlos-ruiz",
    fullName: "Carlos Ruiz",
    email: "carlos.ruiz@example.com",
    primaryRole: "patient",
    patientId: "carlos-ruiz",
    professionalId: null,
    label: "Paciente · Carlos Ruiz",
    specialty: null
  },
  {
    id: "usr-sofia-leon",
    fullName: "Sofia Leon",
    email: "sofia.leon@example.com",
    primaryRole: "patient",
    patientId: "sofia-leon",
    professionalId: null,
    label: "Paciente · Sofia Leon",
    specialty: null
  },
  {
    id: "usr-laura-vega",
    fullName: "Dra. Laura Vega",
    email: "laura.vega@healthhub.demo",
    primaryRole: "professional",
    patientId: null,
    professionalId: "pro-laura-vega",
    label: "Profesional · Dra. Laura Vega",
    specialty: "nutritionist"
  },
  {
    id: "usr-clinic-admin",
    fullName: "Admin Clínica Bienestar",
    email: "admin.clinica@healthhub.demo",
    primaryRole: "clinic_admin",
    patientId: null,
    professionalId: null,
    label: "Admin clínica · Admin Clínica Bienestar",
    specialty: null
  }
];

export const professionals = [
  {
    id: "pro-laura-vega",
    displayName: "Dra. Laura Vega",
    specialty: "nutritionist" as Specialty,
    specialtyLabel: "Nutrición",
    bio: "Nutrióloga clínica enfocada en cambios sostenibles, salud metabólica y acompañamiento continuo.",
    location: "Roma Norte, CDMX",
    appointmentMode: "hybrid" as AppointmentMode,
    basePrice: 950,
    status: "active",
    verificationStatus: "verified",
    licenseNumber: "NUT-49201",
    whatsappNumber: "+525511112222",
    nextAvailable: "Lunes 09:00",
    averageRating: 5,
    reviewCount: 2,
    services: [
      {
        id: "svc-laura-inicial",
        name: "Consulta nutricional inicial",
        description: "Evaluación completa, objetivos y primer plan de acción.",
        durationMinutes: 60,
        price: 950,
        mode: "online" as AppointmentMode
      },
      {
        id: "svc-laura-seguimiento",
        name: "Seguimiento nutricional",
        description: "Ajuste de plan y revision de adherencia.",
        durationMinutes: 50,
        price: 700,
        mode: "hybrid" as AppointmentMode
      }
    ],
    availability: [
      { id: "av-laura-1", weekday: 1, weekdayLabel: "Lunes", startsAt: "09:00", endsAt: "13:00" },
      { id: "av-laura-2", weekday: 3, weekdayLabel: "Miércoles", startsAt: "16:00", endsAt: "20:00" }
    ],
    slug: "dra-laura-vega-a1b2c3",
    profilePhotoUrl: ""
  },
  {
    id: "pro-miguel-torres",
    displayName: "Dr. Miguel Torres",
    specialty: "physiotherapist" as Specialty,
    specialtyLabel: "Fisioterapia",
    bio: "Fisioterapeuta deportivo con foco en dolor lumbar, movilidad y regreso progresivo a actividad.",
    location: "Del Valle, CDMX",
    appointmentMode: "in_person" as AppointmentMode,
    basePrice: 780,
    status: "active",
    verificationStatus: "verified",
    licenseNumber: "FIS-11872",
    whatsappNumber: "+525533334444",
    nextAvailable: "Martes 08:00",
    averageRating: 5,
    reviewCount: 1,
    services: [
      {
        id: "svc-miguel-valoracion",
        name: "Valoración fisioterapéutica",
        description: "Revisión de movilidad, dolor y plan de ejercicios.",
        durationMinutes: 45,
        price: 780,
        mode: "in_person" as AppointmentMode
      }
    ],
    availability: [
      { id: "av-miguel-1", weekday: 2, weekdayLabel: "Martes", startsAt: "08:00", endsAt: "12:00" },
      { id: "av-miguel-2", weekday: 4, weekdayLabel: "Jueves", startsAt: "15:00", endsAt: "19:00" }
    ],
    slug: "dr-miguel-torres-b2c3d4",
    profilePhotoUrl: ""
  },
  {
    id: "pro-nora-ibarra",
    displayName: "Psic. Nora Ibarra",
    specialty: "psychologist" as Specialty,
    specialtyLabel: "Psicología",
    bio: "Psicóloga cognitivo conductual para ansiedad, manejo de estrés y procesos de cambio.",
    location: "Zapopan, Jalisco",
    appointmentMode: "online" as AppointmentMode,
    basePrice: 850,
    status: "active",
    verificationStatus: "verified",
    licenseNumber: "PSI-73044",
    whatsappNumber: "+523355556666",
    nextAvailable: "Lunes 10:00",
    averageRating: 4,
    reviewCount: 1,
    services: [
      {
        id: "svc-nora-terapia",
        name: "Sesión de terapia individual",
        description: "Sesión online para ansiedad, estrés o acompañamiento emocional.",
        durationMinutes: 60,
        price: 850,
        mode: "online" as AppointmentMode
      }
    ],
    availability: [
      { id: "av-nora-1", weekday: 1, weekdayLabel: "Lunes", startsAt: "10:00", endsAt: "14:00" },
      { id: "av-nora-2", weekday: 5, weekdayLabel: "Viernes", startsAt: "15:00", endsAt: "18:00" }
    ],
    slug: "psic-nora-ibarra-c3d4e5",
    profilePhotoUrl: ""
  },
  {
    id: "pro-andres-campos",
    displayName: "Dr. Andres Campos",
    specialty: "doctor" as Specialty,
    specialtyLabel: "Medicina",
    bio: "Médico general con enfoque preventivo, control metabólico y coordinación con especialistas.",
    location: "San Pedro, Nuevo Leon",
    appointmentMode: "hybrid" as AppointmentMode,
    basePrice: 900,
    status: "active",
    verificationStatus: "verified",
    licenseNumber: "MED-88412",
    whatsappNumber: "+528177778888",
    nextAvailable: "Martes 09:30",
    averageRating: 5,
    reviewCount: 1,
    services: [
      {
        id: "svc-andres-consulta",
        name: "Consulta médica general",
        description: "Revisión preventiva y seguimiento de indicadores de salud.",
        durationMinutes: 45,
        price: 900,
        mode: "hybrid" as AppointmentMode
      }
    ],
    availability: [
      { id: "av-andres-1", weekday: 2, weekdayLabel: "Martes", startsAt: "09:30", endsAt: "13:30" },
      { id: "av-andres-2", weekday: 6, weekdayLabel: "Sábado", startsAt: "09:00", endsAt: "12:00" }
    ],
    slug: "dr-andres-campos-d4e5f6",
    profilePhotoUrl: ""
  }
];

export const reviews = [
  {
    id: "rev-laura-1",
    professionalId: "pro-laura-vega",
    patientName: "Ana M.",
    rating: 5,
    comment: "Me ayudó a convertir el plan en hábitos realistas y fáciles de seguir.",
    status: "published",
    createdAt: "2026-05-28T14:00:00Z"
  },
  {
    id: "rev-laura-2",
    professionalId: "pro-laura-vega",
    patientName: "Carlos R.",
    rating: 5,
    comment: "Muy clara explicando cambios pequeños sin sentir que todo era restricción.",
    status: "published",
    createdAt: "2026-05-20T14:00:00Z"
  },
  {
    id: "rev-miguel-1",
    professionalId: "pro-miguel-torres",
    patientName: "Carlos R.",
    rating: 5,
    comment: "La rutina fue progresiva y pude entender qué movimientos evitar al inicio.",
    status: "published",
    createdAt: "2026-05-25T14:00:00Z"
  },
  {
    id: "rev-nora-1",
    professionalId: "pro-nora-ibarra",
    patientName: "Sofia L.",
    rating: 4,
    comment: "Me sentí escuchada y salí con pasos concretos para la semana.",
    status: "published",
    createdAt: "2026-05-18T14:00:00Z"
  },
  {
    id: "rev-andres-1",
    professionalId: "pro-andres-campos",
    patientName: "Ana M.",
    rating: 5,
    comment: "Integra muy bien prevención y explicaciones sencillas.",
    status: "published",
    createdAt: "2026-05-16T14:00:00Z"
  }
];

export const patientRecords = [
  {
    id: "record-ana-nutrition",
    patientId: "ana-martinez",
    professionalId: "pro-laura-vega",
    professionalName: "Dra. Laura Vega",
    recordType: "nutrition",
    recordTypeLabel: "Nutrición",
    title: "Expediente nutricional",
    summary: "Resumen visible para paciente: objetivos de adherencia, energía estable y ajustes de colaciones.",
    visibility: "patient_visible",
    status: "active"
  }
];

export const patients = [
  {
    id: "ana-martinez",
    fullName: "Ana Martinez",
    initials: "AM",
    status: "active" as PatientStatus,
    statusLabel: "Activo",
    age: 34,
    email: "ana.martinez@example.com",
    phone: "+52 55 1030 4412",
    focus: "Seguimiento nutricional",
    mainReason: "Control de hábitos y adherencia al plan",
    riskLevel: "Estable",
    nextAppointment: "Hoy 11:30",
    lastSession: "2026-05-30",
    progress: "Mejor adherencia durante las últimas 2 semanas.",
    professional: "Dra. Laura Vega"
  },
  {
    id: "carlos-ruiz",
    fullName: "Carlos Ruiz",
    initials: "CR",
    status: "active" as PatientStatus,
    statusLabel: "Activo",
    age: 41,
    email: "carlos.ruiz@example.com",
    phone: "+52 55 7891 2104",
    focus: "Plan de rehabilitación",
    mainReason: "Dolor lumbar recurrente",
    riskLevel: "Moderado",
    nextAppointment: "Mañana 09:00",
    lastSession: "2026-06-01",
    progress: "Dolor menor después de ejercicios guiados.",
    professional: "Dr. Miguel Torres"
  },
  {
    id: "sofia-leon",
    fullName: "Sofia Leon",
    initials: "SL",
    status: "pending" as PatientStatus,
    statusLabel: "Pendiente",
    age: 29,
    email: "sofia.leon@example.com",
    phone: "+52 33 1402 8821",
    focus: "Primera consulta",
    mainReason: "Evaluación inicial de ansiedad",
    riskLevel: "Por evaluar",
    nextAppointment: "Viernes 16:00",
    lastSession: "Sin historial",
    progress: "Paciente pendiente de primera valoración.",
    professional: "Psic. Nora Ibarra"
  },
  {
    id: "diego-paredes",
    fullName: "Diego Paredes",
    initials: "DP",
    status: "paused" as PatientStatus,
    statusLabel: "Pausado",
    age: 37,
    email: "diego.paredes@example.com",
    phone: "+52 81 4420 1207",
    focus: "Coaching de bienestar",
    mainReason: "Rutina de sueño y manejo de estrés",
    riskLevel: "Bajo",
    nextAppointment: "Sin cita",
    lastSession: "2026-05-12",
    progress: "Seguimiento pausado por agenda del paciente.",
    professional: "Coach Elena Mora"
  }
];

export const appointments = [
  {
    id: "apt-001",
    patientId: "ana-martinez",
    patientName: "Ana Martinez",
    professionalId: "pro-laura-vega",
    professionalServiceId: "svc-laura-seguimiento",
    professionalName: "Dra. Laura Vega",
    specialtyLabel: "Nutrición",
    date: "2026-06-06",
    time: "11:30",
    duration: "50 min",
    type: "Seguimiento",
    mode: "online" as AppointmentMode,
    status: "scheduled" as AppointmentStatus,
    statusLabel: "Programada",
    reason: "Revision de plan alimenticio"
  },
  {
    id: "apt-002",
    patientId: "carlos-ruiz",
    patientName: "Carlos Ruiz",
    professionalId: "pro-miguel-torres",
    professionalServiceId: "svc-miguel-valoracion",
    professionalName: "Dr. Miguel Torres",
    specialtyLabel: "Fisioterapia",
    date: "2026-06-07",
    time: "09:00",
    duration: "45 min",
    type: "Rehabilitación",
    mode: "in_person" as AppointmentMode,
    status: "scheduled" as AppointmentStatus,
    statusLabel: "Programada",
    reason: "Progresion de ejercicios"
  },
  {
    id: "apt-003",
    patientId: "sofia-leon",
    patientName: "Sofia Leon",
    professionalId: "pro-nora-ibarra",
    professionalServiceId: "svc-nora-terapia",
    professionalName: "Psic. Nora Ibarra",
    specialtyLabel: "Psicología",
    date: "2026-06-12",
    time: "16:00",
    duration: "60 min",
    type: "Primera consulta",
    mode: "online" as AppointmentMode,
    status: "scheduled" as AppointmentStatus,
    statusLabel: "Programada",
    reason: "Historia inicial"
  },
  {
    id: "apt-004",
    patientId: "ana-martinez",
    patientName: "Ana Martinez",
    professionalId: "pro-laura-vega",
    professionalServiceId: "svc-laura-seguimiento",
    professionalName: "Dra. Laura Vega",
    specialtyLabel: "Nutrición",
    date: "2026-05-30",
    time: "10:00",
    duration: "50 min",
    type: "Seguimiento",
    mode: "online" as AppointmentMode,
    status: "completed" as AppointmentStatus,
    statusLabel: "Completada",
    reason: "Revision de adherencia"
  }
];

export const soapNotes = [
  {
    id: "soap-001",
    patientId: "ana-martinez",
    patientName: "Ana Martinez",
    appointmentId: "apt-004",
    date: "2026-05-30",
    title: "Seguimiento nutricional",
    status: "finalized" as SoapStatus,
    statusLabel: "Finalizada",
    subjective: "Refiere mejor energía y menor ansiedad por alimentos entre comidas.",
    objective: "Peso estable, registro alimenticio completo 10 de 14 días.",
    assessment: "Buena adherencia general con áreas de ajuste en cenas.",
    plan: "Mantener desayuno actual, ajustar colaciones y revisar cena en 7 días.",
    aiGenerated: true
  },
  {
    id: "soap-002",
    patientId: "carlos-ruiz",
    patientName: "Carlos Ruiz",
    appointmentId: "apt-002",
    date: "2026-06-01",
    title: "Rehabilitación lumbar",
    status: "draft" as SoapStatus,
    statusLabel: "Borrador",
    subjective: "Dolor baja de 6/10 a 4/10 después de rutina guiada.",
    objective: "Mejor rango de flexión, molestia al final del movimiento.",
    assessment: "Evolución favorable, aún con tensión posterior.",
    plan: "Progresar movilidad y reforzar técnica de bisagra de cadera.",
    aiGenerated: false
  },
  {
    id: "soap-003",
    patientId: "diego-paredes",
    patientName: "Diego Paredes",
    appointmentId: null,
    date: "2026-05-12",
    title: "Revisión de sueño",
    status: "finalized" as SoapStatus,
    statusLabel: "Finalizada",
    subjective: "Reporta despertares nocturnos menos frecuentes.",
    objective: "Registro de sueño con promedio de 6.8 horas.",
    assessment: "Avance parcial en consistencia de rutina nocturna.",
    plan: "Mantener horario fijo y reducir pantalla 45 min antes de dormir.",
    aiGenerated: true
  }
];

export const conversations = [
  {
    id: "conv-001",
    patientId: "ana-martinez",
    patientName: "Ana Martinez",
    preview: "Gracias, voy a subir mi registro antes de la cita.",
    unread: 1,
    updatedAt: "10:42"
  },
  {
    id: "conv-002",
    patientId: "carlos-ruiz",
    patientName: "Carlos Ruiz",
    preview: "Me molestó un poco el ejercicio del martes.",
    unread: 0,
    updatedAt: "Ayer"
  },
  {
    id: "conv-003",
    patientId: "sofia-leon",
    patientName: "Sofia Leon",
    preview: "Confirmo mi primera consulta.",
    unread: 0,
    updatedAt: "Lun"
  }
];

export const messages = [
  {
    id: "msg-001",
    conversationId: "conv-001",
    sender: "professional",
    body: "Hola Ana, para la cita de hoy trae tu registro de alimentos de esta semana.",
    time: "10:20"
  },
  {
    id: "msg-002",
    conversationId: "conv-001",
    sender: "patient",
    body: "Claro, lo tengo casi completo. Lo reviso y lo subo antes de la consulta.",
    time: "10:32"
  },
  {
    id: "msg-003",
    conversationId: "conv-001",
    sender: "professional",
    body: "Perfecto. También revisaremos cómo te fue con las cenas.",
    time: "10:35"
  },
  {
    id: "msg-004",
    conversationId: "conv-001",
    sender: "patient",
    body: "Gracias, voy a subir mi registro antes de la cita.",
    time: "10:42"
  }
];

export function getPatientById(id: string) {
  return patients.find((patient) => patient.id === id);
}

export function getPatientAppointments(patientId: string) {
  return appointments.filter((appointment) => appointment.patientId === patientId);
}

export function getPatientSoapNotes(patientId: string) {
  return soapNotes.filter((note) => note.patientId === patientId);
}
