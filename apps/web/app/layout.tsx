import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const fontSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Clinixa",
  description: "Continuidad de atencion para profesionales de la salud."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = <body className="font-sans antialiased">{children}</body>;

  return (
    <html className={`${fontSans.variable} ${fontDisplay.variable}`} lang="es">
      {publishableKey ? <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider> : content}
    </html>
  );
}
