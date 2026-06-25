import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ShellGate } from "@/components/shell-gate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zcash Back Office (ZBO)",
  description:
    "Treasury and transparency for the Zcash Dev Fund · read-only auditing via viewing keys and the public ZCG accounting.",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ShellGate isAdmin={isAdmin}>{children}</ShellGate>
      </body>
    </html>
  );
}
