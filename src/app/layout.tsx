import type { Metadata, Viewport } from "next";
import { participateDemoMode } from "@/lib/participate/demo";
import { Suspense } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import "./redesign.css";
import "./workspace.css";
import "./theme.css";
import "./zarvis/zarvis.css";
import "./mobile-shell.css";
import { ShellGate } from "@/components/shell-gate";
import { TapFeedback } from "@/components/tap-feedback";
import { TreasuryBar } from "@/components/treasury-bar";
import { rootShareMetadata, SITE_DESCRIPTION } from "@/lib/seo/page-metadata";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenZcash · Dev Fund treasury and public transparency",
  description: SITE_DESCRIPTION,
  // metadataBase and the site-wide share fields (site name, default card).
  // No og:title here: every page shares under its own title.
  ...rootShareMetadata(),
  applicationName: "OpenZcash",
  ...(process.env.OPENZCASH_ENV === "redesign" || participateDemoMode()
    ? { robots: { index: false, follow: false } }
    : {}),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpenZcash",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  // The shell is light by default (the theme toggle is per browser, not per
  // OS), so the browser chrome follows the cream canvas.
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
  // The installed app paints under the notch and the home indicator; the
  // shell pads its bars with env(safe-area-inset-*) (theme.css and
  // mobile-shell.css).
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Management controls stay off even for clients holding an old session.
  const isAdmin = false;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("oz-theme");if(t==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content","#0f0e0c")}}catch(e){}'
          }}
        />
        <TapFeedback />
        <ShellGate
          isAdmin={isAdmin}
          bare={participateDemoMode()}
          isPreview={process.env.OPENZCASH_ENV === "redesign"}
          footer={
            <Suspense
              fallback={
                <div className="rd-treasury-inner" aria-busy="true">
                  <span className="rd-treasury-name">Treasury at a glance</span>
                </div>
              }
            >
              <TreasuryBar />
            </Suspense>
          }
        >
          {children}
        </ShellGate>
      </body>
    </html>
  );
}
