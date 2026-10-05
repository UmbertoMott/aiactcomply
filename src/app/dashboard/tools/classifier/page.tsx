import { redirect } from "next/navigation";

// La classificazione si fa ora nell'inventario (ruolo, rischio e obblighi per ciascun sistema).
export default function ClassifierPage() {
  redirect("/dashboard/tools/inventory");
}
