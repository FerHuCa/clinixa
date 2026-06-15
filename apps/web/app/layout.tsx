import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinixa",
  description: "Continuidad de atencion para profesionales de la salud."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = <body>{children}</body>;

  return (
    <html lang="es">
      {publishableKey ? <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider> : content}
    </html>
  );
}
