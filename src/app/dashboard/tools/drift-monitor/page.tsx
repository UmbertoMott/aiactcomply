import { redirect } from "next/navigation";

// Il monitoraggio delle prestazioni leggeva i log inviati dai sistemi dei clienti a RegulaeOS.
// RegulaeOS non riceve più i log (Registro dei log = solo prova documentale), quindi la pagina è dismessa.
export default function DriftMonitorPage() {
  redirect("/dashboard/tools/logvault");
}
