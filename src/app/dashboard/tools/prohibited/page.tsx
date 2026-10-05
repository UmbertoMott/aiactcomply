import { redirect } from "next/navigation";

// La verifica delle pratiche vietate (Art. 5) è ora nel Triage.
export default function ProhibitedPage() {
  redirect("/dashboard/triage");
}
