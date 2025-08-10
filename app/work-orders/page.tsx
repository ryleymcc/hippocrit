'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WorkOrder {
  id: number;
  number: string;
  title: string;
  priority: string;
}

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    fetch('/api/work-orders')
      .then((res) => res.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <Link
          href="new"
          className="rounded bg-black px-3 py-1 text-white"
        >
          New Work Order
        </Link>
      </div>
      {orders.length === 0 ? (
        <p>No work orders found.</p>
      ) : (
        <ul className="divide-y rounded border">
          {orders.map((wo) => (
            <li key={wo.id} className="flex justify-between p-2">
              <span>
                {wo.number} – {wo.title}
              </span>
              <span className="text-sm text-gray-600">{wo.priority}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

