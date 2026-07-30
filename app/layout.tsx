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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Arrows",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch zoom is deliberately off: the throwing UI is a control surface
  // used one-handed mid-visit, and accidental zoom is worse than no zoom.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
