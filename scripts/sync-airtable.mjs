import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;
const tableId = process.env.AIRTABLE_TABLE_ID;
if (!token || !baseId || !tableId) throw new Error('Missing Airtable configuration');

const fields = ['Oggetto','Tier','Categoria','Quantità','Posizione','Metodo di acquisizione','Prezzo di mercato unitario','Valore totale'];
const params = new URLSearchParams();
for (const field of fields) params.append('fields[]', field);
params.set('pageSize','100');

let offset;
const records = [];
do {
  if (offset) params.set('offset', offset); else params.delete('offset');
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  const data = await res.json();
  records.push(...data.records);
  offset = data.offset;
} while (offset);

const inventory = records
  .filter(r => r.fields.Oggetto)
  .map(r => ({
    id: r.id,
    item: r.fields.Oggetto,
    tier: r.fields.Tier ?? '—',
    category: r.fields.Categoria ?? 'Altro',
    qty: Number(r.fields['Quantità'] ?? 0),
    location: r.fields.Posizione ?? '—',
    source: r.fields['Metodo di acquisizione'] ?? '—',
    unitPrice: Number(r.fields['Prezzo di mercato unitario'] ?? 0),
    value: Number(r.fields['Valore totale'] ?? 0)
  }))
  .sort((a,b) => a.item.localeCompare(b.item, 'it'));

const payload = {
  source: 'Airtable',
  generatedAt: new Date().toISOString(),
  count: inventory.length,
  totalUnits: inventory.reduce((s,r) => s + r.qty, 0),
  totalValue: inventory.reduce((s,r) => s + r.value, 0),
  inventory
};

await mkdir('public/data', { recursive: true });
await writeFile('public/data/warehouse.json', JSON.stringify(payload, null, 2) + '\n');
console.log(`Synced ${payload.count} warehouse records; value ${payload.totalValue}`);
