import type { Metadata } from "next";
import { Montserrat, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

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

export const metadata: Metadata = {
  title: {
    default: "MechatronicStore Blog",
    template: "%s · Blog MechatronicStore",
  },
  description:
    "Tutoriales técnicos de electrónica, robótica y DIY. Aprende y compra los componentes en MechatronicStore.cl",
  metadataBase: new URL("https://www.mechatronicstore.cl"),
  icons: { icon: "/favicon.ico" },
};

const THEME_INIT_SCRIPT = `
(function(){try{
  var t = localStorage.getItem('mechastore-blog-theme');
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){
  document.documentElement.setAttribute('data-theme', 'dark');
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CL"
      data-theme="dark"
      className={`${montserrat.variable} ${baloo.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
