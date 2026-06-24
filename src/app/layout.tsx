import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ShellGate } from "@/components/shell-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zcash Back Office (ZBO)",
  description:
    "Tesouraria e transparência do Dev Fund Zcash — auditoria read-only via viewing keys e a contabilidade pública do ZCG.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The bare-vs-shell decision is made client-side in ShellGate (reacts to
  // navigation); here we only need the admin flag for the shell's controls.
  const isAdmin = (await headers()).get("x-admin") === "1";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ShellGate isAdmin={isAdmin}>{children}</ShellGate>
      </body>
    </html>
  );
}
