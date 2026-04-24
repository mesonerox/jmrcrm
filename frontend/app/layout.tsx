import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crossmint CRM",
  description: "Revenue intelligence dashboard for Crossmint BD",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex h-full bg-transparent text-[#eaeaea] antialiased">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
