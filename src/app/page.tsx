import { redirect } from "next/navigation";

// Pablo 16-may: la app SOLO sirve /blog/*. El root "/" no debería ser
// alcanzable en producción porque el CF Worker filtra. Pero por las dudas,
// si alguien navega directo a https://mecha-blog.vercel.app/ → redirect
// al blog público.
export default function RootPage() {
  redirect("/blog");
}
