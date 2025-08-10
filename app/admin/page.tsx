import { adminModules } from "./modules";
import { ModuleCard } from "./components/ModuleCard";

export default function AdminDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {adminModules.map((m) => (
          <ModuleCard key={m.slug} {...m} />
        ))}
      </div>
    </div>
  );
}

