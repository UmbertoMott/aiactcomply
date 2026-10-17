import { notFound } from "next/navigation";
import { Nis2Overview } from "@/components/nis2/Nis2Overview";
import { NIS2_FUNCTIONS, type Nis2Function } from "@/lib/nis2/requirements";

export default async function Nis2FunctionPage({ params }: { params: Promise<{ fn: string }> }) {
  const { fn } = await params;
  if (!NIS2_FUNCTIONS.includes(fn as Nis2Function)) notFound();
  return <Nis2Overview fn={fn as Nis2Function} />;
}
