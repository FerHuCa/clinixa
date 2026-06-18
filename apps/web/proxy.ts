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

function hasDeveloperSession(request: NextRequest) {
  return devAuthEnabled && Boolean(request.cookies.get("healthhub-dev-user")?.value);
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request) || hasDeveloperSession(request)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/bienvenida", request.url));
  }

  return NextResponse.next();
});

function developmentProxy(request: NextRequest) {
  if (isPublicRoute(request) || hasDeveloperSession(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/bienvenida", request.url));
}

export default clerkEnabled ? clerkProxy : developmentProxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
};
