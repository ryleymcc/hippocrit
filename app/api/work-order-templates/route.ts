import { NextResponse } from 'next/server';

interface WorkOrderTemplate {
  id: number;
  name: string;
  fields: {
    siteId?: number;
    title?: string;
    descriptionMd?: string;
    assetId?: number;
    priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  };
}

const templates: WorkOrderTemplate[] = [
  { id: 0, name: 'Blank', fields: {} },
  {
    id: 1,
    name: 'Routine Inspection',
    fields: {
      title: 'Routine Inspection',
      descriptionMd: 'Inspect equipment and report issues.',
      priority: 'P3',
    },
  },
];

export async function GET() {
  return NextResponse.json(templates);
}

