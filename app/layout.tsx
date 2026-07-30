import type { Metadata, Viewport } from "next"
import "./globals.css"
import { MSWProvider } from "@/components/dev/MSWProvider"
import { MockAuthToggle } from "@/components/dev/MockAuthToggle"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Arrows",
  description:
    "A per-dart darts scoring app for solo practice, with practice games, a simulated opponent, and stats that show which doubles you actually miss.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#15181C",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh flex-col bg-slate2 text-chalk">
        <MSWProvider>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
          <MockAuthToggle />
          <Toaster />
        </MSWProvider>
      </body>
    </html>
  )
}
