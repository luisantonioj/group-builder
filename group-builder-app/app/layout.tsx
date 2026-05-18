import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shepherd's Grouping System — BLD Youth Ministry",
  description:
    "Youth Encounter candidate management and conflict-aware group formation tool for Bukas Loob sa Diyos Youth Ministry.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1b2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Inline theme script — reads saved pref before first paint to avoid flicker */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var t = localStorage.getItem('bld-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else if (t === 'light') document.documentElement.setAttribute('data-theme','light');
  } catch(e) {}
})();
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
