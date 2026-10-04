import { redirect } from "next/navigation";

// La raíz no tiene contenido propio: el middleware manda a /login si no hay sesión.
export default function Home() {
  redirect("/dashboard");
}
