import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const devAuthEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH !== "false";
const isPublicRoute = createRouteMatcher([
  "/bienvenida(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/sesion(.*)",
  "/aceptar-invitacion(.*)",
  "/aviso-privacidad(.*)",
  "/terminos(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  // Directorio y perfiles publicos de profesionales (HUE-08/09): SEO, sin sesion.
  "/profesionales(.*)"
]);

// Rutas exclusivas del portal profesional. Un paciente no debe poder cargar
// estas shells aunque el API rechace sus llamadas de datos.
const isProfessionalRoute = createRouteMatcher([
  "/portal-profesional(.*)",
  "/agenda(.*)",
  "/pacientes(.*)",
  "/expediente(.*)",
  "/recetas(.*)",
  "/tareas-paciente(.*)",
  "/nutricion(.*)",
  "/suscripcion(.*)",
  "/activacion(.*)"
]);

// Rutas exclusivas del portal paciente. Un profesional no debería terminar aquí
// (el home ya lo redirige, pero el middleware lo refuerza al nivel de ruta).
const isPatientRoute = createRouteMatcher([
  "/portal-paciente(.*)",
  "/mi-salud(.*)"
]);

// El rol se persiste en una cookie ligera al completar la autenticación
// (ver persistUserRole en healthhub-store.ts). En el middleware solo la
// leemos para redirigir; si no existe todavía (primer request tras login)
// dejamos pasar: la página de destino se encarga de su propia guardia de rol.
function readRoleCookie(request: NextRequest): string | null {
  return request.cookies.get("healthhub-user-role")?.value ?? null;
}

function applyRoleRouting(request: NextRequest): NextResponse | null {
  const role = readRoleCookie(request);

  if (!role) {
    // Sin cookie de rol no redirigimos: evitamos bucles en el primer login.
    return null;
  }

  if (role === "patient" && isProfessionalRoute(request)) {
    return NextResponse.redirect(new URL("/portal-paciente", request.url));
  }

  if ((role === "professional" || role === "clinic_admin") && isPatientRoute(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return null;
}

function hasDeveloperSession(request: NextRequest) {
  return devAuthEnabled && Boolean(request.cookies.get("healthhub-dev-user")?.value);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return response;
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request) || hasDeveloperSession(request)) {
    return addSecurityHeaders(NextResponse.next());
  }

  const { userId } = await auth();

  if (!userId) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/bienvenida", request.url)));
  }

  // Usuario autenticado: aplicar guardia de rol basada en cookie.
  const roleRedirect = applyRoleRouting(request);

  if (roleRedirect) {
    return addSecurityHeaders(roleRedirect);
  }

  return addSecurityHeaders(NextResponse.next());
});

function developmentProxy(request: NextRequest) {
  if (isPublicRoute(request) || hasDeveloperSession(request)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // En dev, si hay sesión de usuario (cookie) también aplicamos la guardia de rol.
  const roleRedirect = applyRoleRouting(request);

  if (roleRedirect) {
    return addSecurityHeaders(roleRedirect);
  }

  return addSecurityHeaders(NextResponse.redirect(new URL("/bienvenida", request.url)));
}

export default clerkEnabled ? clerkProxy : developmentProxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
};
