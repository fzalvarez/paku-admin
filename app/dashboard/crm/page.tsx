import { redirect } from "next/navigation";

// /dashboard/crm no tiene vista propia: cada vista del CRM es un ítem del menú.
export default function CrmPage() {
  redirect("/dashboard/crm/clientes");
}
