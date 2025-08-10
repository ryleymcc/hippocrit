import { getModule } from "../modules";
import { notFound } from "next/navigation";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const mod = getModule(module);
  if (!mod) notFound();
  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">{mod.title}</h1>
      <p>View and create {mod.title.toLowerCase()} coming soon.</p>
    </div>
  );
}

