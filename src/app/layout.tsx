import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MechatronicStore Blog",
    template: "%s · Blog MechatronicStore",
  },
  description:
    "Tutoriales técnicos de electrónica, robótica y DIY. Aprende y compra los componentes en MechatronicStore.cl",
  metadataBase: new URL("https://www.mechatronicstore.cl"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
