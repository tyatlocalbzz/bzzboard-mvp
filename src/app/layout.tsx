import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { ClientProvider } from "@/contexts/client-context";
import { ActiveShootProvider } from "@/contexts/active-shoot-context";
import { getSession } from "@/lib/auth/session";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Buzzboard - Content Production System",
  description: "Mobile-first content production workflow for social media creators",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <ClientProvider>
            <ActiveShootProvider>
              {children}
              <Toaster position="top-center" richColors />
            </ActiveShootProvider>
          </ClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
