import { ToastProvider } from "@/components/Toast";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { aktifKullanici, cikisYap, rolYeterli } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { TourProvider } from "@/components/tour/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TESKON Atlas",
  description: "Doğrulanmış Muhatap + Kurum Hafızası + Piyasa İstihbaratı",
  manifest: "/manifest.json",
  applicationName: "TESKON Atlas",
  appleWebApp: { capable: true, title: "Atlas", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true,
};

async function cikisAction() {
  "use server";
  await cikisYap();
  redirect("/giris");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await aktifKullanici();
  const adminMi = kullanici ? rolYeterli(kullanici.rol, "ADMIN") : false;
  const exportcuMu = kullanici
    ? rolYeterli(kullanici.rol, "EXPORTER") || kullanici.hassas_export_yetkisi
    : false;

  return (
    <html lang="tr" className={inter.variable}>
      <body className="antialiased">
        <TourProvider>
          <ToastProvider>
            {kullanici ? (
              <div className="flex">
                <Sidebar adminMi={adminMi} exportcuMu={exportcuMu} />
                <div className="flex-1 min-w-0">
                  <Navbar adSoyad={kullanici.ad_soyad} rol={kullanici.rol} cikisAction={cikisAction} />
                  <main>{children}</main>
                </div>
              </div>
            ) : children}
            <TourOverlay />
          </ToastProvider>
        </TourProvider>
      </body>
    </html>
  );
}
