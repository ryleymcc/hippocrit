export interface AdminModule {
  slug: string;
  title: string;
}

export const adminModules: AdminModule[] = [
  { slug: "work-orders", title: "Work Orders" },
  { slug: "preventive-maintenance", title: "Preventative Maintenance" },
  { slug: "employees", title: "Employees & Roles" },
  { slug: "equipment", title: "Equipment" },
  { slug: "templates", title: "Work Order Templates" },
];

export const getModule = (slug: string): AdminModule | undefined =>
  adminModules.find((m) => m.slug === slug);

