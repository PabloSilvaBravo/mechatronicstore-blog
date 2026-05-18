import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  icons: {
    icon: "/favicon.ico",
  },
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
    <html lang="es-CL" data-theme="dark" className={montserrat.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
