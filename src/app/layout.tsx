import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { ClientProvider } from "@/contexts/client-context";
import { ActiveShootProvider } from "@/contexts/active-shoot-context";
import { getSession } from "@/lib/auth/session";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Buzzboard",
  description: "Content production system",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <ClientProvider>
            <ActiveShootProvider>
              <AuthGuard>
                <MobileLayout>
                  {children}
                </MobileLayout>
              </AuthGuard>
            </ActiveShootProvider>
          </ClientProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  )
}
