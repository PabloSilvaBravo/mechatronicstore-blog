import type { Metadata } from "next";
import type { Viewport } from "next";
import { Suspense } from "react";
import { Montserrat, Baloo_2 } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import BlogHeader from "./components/v2/BlogHeader";

// Client-only components loaded dynamically para reducir el bundle inicial.
// En Next 16 NO se puede usar `ssr: false` desde un Server Component (layout.tsx
// es SC). Cada componente tiene "use client" arriba, eso basta para que Next
// los compile como client bundle y los hidrate después.
const PullToRefresh = dynamic(() => import("./components/PullToRefresh"));
const PWARegister = dynamic(() => import("./components/PWARegister"));
const PushPrompt = dynamic(() => import("./components/PushPrompt"));

// Montserrat — fuente PRIMARIA, igual que tienda y mechanews.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Baloo 2 — para "BLOG" del logo (mismo approach que "NOTICIAS" en
// mechanews). Solo se usa en el componente Logo, no en body.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const BASE_URL = "https://www.mechatronicstore.cl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Blog MechatronicStore · Tutoriales técnicos en español",
    template: "%s · Blog MechatronicStore",
  },
  description:
    "Tutoriales técnicos de electrónica, robótica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
  icons: {
    icon: [
      { url: "/favicon.ico?v=1", sizes: "any" },
      { url: "/blog/icons/favicon-32.png?v=1", sizes: "32x32", type: "image/png" },
      { url: "/blog/icons/favicon-16.png?v=1", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/blog/icons/apple-touch-icon.png?v=1", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/blog/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MechaBlog",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: `${BASE_URL}/blog`,
    siteName: "MechatronicStore Blog",
    title: "Blog MechatronicStore · Tutoriales técnicos en español",
    description: "Tutoriales técnicos de electrónica, robótica, IoT y DIY.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog MechatronicStore",
    description: "Tutoriales técnicos en español",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0E0F14" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

// Pablo 25-may-2026: default LIGHT (era "dark"). Script inline en <head>
// para evitar FOUC - corre antes de React hidrate, lee localStorage y aplica
// el theme correcto en el <html>. Si no hay stored, default light.
const THEME_INIT_SCRIPT = `
(function(){try{
  var t = localStorage.getItem('mechastore-blog-theme');
  if (t !== 'light' && t !== 'dark') t = 'light';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){
  document.documentElement.setAttribute('data-theme', 'light');
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CL"
      data-theme="light"
      className={`${montserrat.variable} ${baloo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://images.mechatronicstore.cl" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.mechatronicstore.cl" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-[color:var(--brand-purple)] focus:px-4 focus:py-2 focus:text-white focus:font-semibold focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <ThemeProvider>
          <PullToRefresh />
          {/* Suspense necesario porque SearchBar usa useSearchParams() -
              Next 16 lo requiere cuando se hace prerender static (ej /404). */}
          <Suspense fallback={null}>
            <BlogHeader />
          </Suspense>
          <div id="main" className="flex-1">
            {children}
          </div>
          <PWARegister />
          <PushPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
