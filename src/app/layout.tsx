import type { Metadata, Viewport } from "next";
import { Eb_Garamond } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

const ebGaramond = Eb_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "What's with Dinner",
  description:
    "A zero-friction pantry-aware meal planner for ingredient households.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
    <html lang="en" className={ebGaramond.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased bg-white text-slate-900">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1 pb-16 sm:pb-0">
            <div className="w-full flex-1 flex-col sm:mx-auto sm:max-w-5xl sm:px-4 sm:py-6">
              {children}
            </div>
          </main>
          <footer className="hidden border-t border-slate-100 bg-slate-50 sm:block">
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

