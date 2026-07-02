const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5050";

export type PublicProfessionalService = {
  id: string; name: string; description: string; durationMinutes: number; price: number; mode: string;
};
export type PublicProfessionalAvailability = {
  id: string; weekday: number; startsAt: string; endsAt: string;
};
export type PublicProfessional = {
  id: string; displayName: string; specialty: string; specialtyLabel: string; bio: string;
  location: string; appointmentMode: string; basePrice: number; status: string; verificationStatus: string;
  nextAvailable: string; averageRating: number; reviewCount: number;
  services: PublicProfessionalService[]; availability: PublicProfessionalAvailability[];
  slug: string; profilePhotoUrl: string;
};

function withBase(url: string) {
  // Las URLs de avatar vienen relativas a la API ("/uploads/..."). Prefijar para <img>.
  return url && url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
}

export async function fetchPublicProfessionals(params?: { specialty?: string; query?: string }): Promise<PublicProfessional[]> {
  const search = new URLSearchParams();
  if (params?.specialty && params.specialty !== "all") search.set("specialty", params.specialty);
  if (params?.query) search.set("query", params.query);
  const qs = search.toString();
  const res = await fetch(`${API_BASE_URL}/api/professionals${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) return [];
  const list = (await res.json()) as PublicProfessional[];
  return list.map((p) => ({ ...p, profilePhotoUrl: withBase(p.profilePhotoUrl) }));
}

export async function fetchProfessionalBySlug(slug: string): Promise<PublicProfessional | null> {
  const res = await fetch(`${API_BASE_URL}/api/professionals/by-slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const p = (await res.json()) as PublicProfessional;
  return { ...p, profilePhotoUrl: withBase(p.profilePhotoUrl) };
}

export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
