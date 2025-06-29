import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { ClientProvider } from "@/contexts/client-context";
import { ActiveShootProvider } from "@/contexts/active-shoot-context";
import { ThemeProvider } from "@/components/theme-provider";
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider session={session}>
            <ClientProvider>
              <ActiveShootProvider>
                <AuthGuard>
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                </AuthGuard>
              </ActiveShootProvider>
            </ClientProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
