import { redirect } from "next/navigation";

// La "Valutazione unificata" duplicava DPIA e FRIA: si lavora direttamente nei due tool.
export default function AssessmentPage() {
  redirect("/dashboard/tools/dpia");
}
