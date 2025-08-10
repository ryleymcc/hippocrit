import { getModule } from "../../modules";
import { notFound } from "next/navigation";

export default async function NewModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const mod = getModule(module);
  if (!mod) notFound();
  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">Create {mod.title}</h1>
      <p>{mod.title} creation form coming soon.</p>
    </div>
  );
}

