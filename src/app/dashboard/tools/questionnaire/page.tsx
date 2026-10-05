import { redirect } from "next/navigation";

// Unito alla pagina "Per i clienti"
export default function RedirectPage() {
  redirect("/dashboard/tools/clients?tab=questionnaire");
}
