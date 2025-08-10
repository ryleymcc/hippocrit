import { getModule } from "../../modules";
import { notFound } from "next/navigation";

export default function NewModulePage({
  params,
}: {
  params: { module: string };
}) {
  const mod = getModule(params.module);
  if (!mod) notFound();
  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">Create {mod.title}</h1>
      <p>{mod.title} creation form coming soon.</p>
    </div>
  );
}

