'use client';

import { useState } from 'react';

export default function QuickCreateWO() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('P3');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: 1, title, descriptionMd: desc, priority }),
      });
      if (!res.ok) throw new Error('Failed');
      setTitle('');
      setDesc('');
      setPriority('P3');
      alert('Work order created');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-3">
      <h1 className="text-xl font-semibold">Quick Work Order</h1>
      <input
        className="w-full border rounded p-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full border rounded p-2"
        placeholder="Description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <select
        className="w-full border rounded p-2"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option value="P0">P0 – Emergency</option>
        <option value="P1">P1 – Urgent</option>
        <option value="P2">P2 – High</option>
        <option value="P3">P3 – Normal</option>
        <option value="P4">P4 – Low</option>
      </select>
      <button
        disabled={saving}
        onClick={save}
        className="w-full rounded bg-black text-white p-2"
      >
        {saving ? 'Saving...' : 'Create'}
      </button>
    </div>
  );
}
