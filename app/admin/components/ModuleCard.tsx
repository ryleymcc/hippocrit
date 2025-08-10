import Link from "next/link";
import type { AdminModule } from "../modules";

type ModuleCardProps = AdminModule;

export function ModuleCard({ slug, title }: ModuleCardProps) {
  return (
    <div className="border p-4 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="flex gap-4">
        <Link href={`/admin/${slug}`} className="text-blue-600 underline">
          View
        </Link>
        <Link href={`/admin/${slug}/new`} className="text-blue-600 underline">
          Create
        </Link>
      </div>
    </div>
  );
}

