'use client';

import { useEffect, useState } from 'react';

interface Template {
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

export default function CreateWorkOrderPage() {
  const [siteId, setSiteId] = useState('1');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('P3');
  const [assetId, setAssetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState(0);

  useEffect(() => {
    fetch('/api/work-order-templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data));
  }, []);

  useEffect(() => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSiteId(tmpl.fields.siteId ? String(tmpl.fields.siteId) : '1');
      setTitle(tmpl.fields.title ?? '');
      setDesc(tmpl.fields.descriptionMd ?? '');
      setPriority(tmpl.fields.priority ?? 'P3');
      setAssetId(tmpl.fields.assetId ? String(tmpl.fields.assetId) : '');
    }
  }, [templateId, templates]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: Number(siteId),
          title,
          descriptionMd: desc,
          priority,
          assetId: assetId ? Number(assetId) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setTitle('');
      setDesc('');
      setPriority('P3');
      setAssetId('');
      alert('Work order created');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-3">
      <h1 className="text-xl font-semibold">Create Work Order</h1>
      {templates.length > 0 && (
        <select
          className="w-full border rounded p-2"
          value={templateId}
          onChange={(e) => setTemplateId(Number(e.target.value))}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      <input
        className="w-full border rounded p-2"
        placeholder="Site ID"
        value={siteId}
        onChange={(e) => setSiteId(e.target.value)}
      />
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
      <input
        className="w-full border rounded p-2"
        placeholder="Asset ID (optional)"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
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

