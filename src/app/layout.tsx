import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "What's with Dinner",
  description:
    "A zero-friction pantry-aware meal planner for ingredient households.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-slate-950 text-slate-50">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1 pb-16 sm:pb-0">
            <div className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-6">
              {children}
            </div>
          </main>
          <footer className="hidden border-t border-slate-900/60 bg-slate-950/80 sm:block">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-[11px] text-slate-500">
              <span>Zero-shot pantry utility.</span>
              <span>
                Data keys live in your env -- Supabase & OpenAI.
              </span>
            </div>
          </footer>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
