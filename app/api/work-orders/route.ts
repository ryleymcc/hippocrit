import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  siteId: z.number(),
  title: z.string().min(3),
  descriptionMd: z.string().optional(),
  assetId: z.number().int().positive().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).default('P3'),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  const where = siteId ? { siteId: Number(siteId) } : undefined;
  const workOrders = await prisma.workOrder.findMany({
    where,
    orderBy: { id: 'desc' },
    take: 100,
  });
  return NextResponse.json(workOrders);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const site = await prisma.site.findUnique({ where: { id: data.siteId } });
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (data.assetId !== undefined) {
    const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
  }

  const year = new Date().getFullYear();
  let attempt = 0;
  while (attempt < 5) {
    const count = await prisma.workOrder.count({ where: { siteId: data.siteId } });
    const number = `WO-${year}-${String(count + 1).padStart(4, '0')}`;
    try {
      const wo = await prisma.workOrder.create({
        data: {
          siteId: data.siteId,
          number,
          title: data.title,
          descriptionMd: data.descriptionMd ?? '',
          priority: data.priority,
          status: 'new',
          ...(data.assetId !== undefined ? { assetId: data.assetId } : {}),
        },
      });
      return NextResponse.json(wo, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          attempt += 1;
          continue;
        }
        if (err.code === 'P2003') {
          return NextResponse.json({ error: 'Related record not found' }, { status: 404 });
        }
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'Could not generate unique work order number' },
    { status: 409 }
  );
}
