import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;
if (!token || !baseId) throw new Error('Missing Airtable configuration');

const tables = {
  warehouse: 'tblnCpscQ0bX1bceO',
  ledger: 'tblVnIvSbmb9aLHa7',
  orders: 'tbl5mzgHeJGbsDxdZ'
};

async function fetchTable(tableId, fields) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    fields.forEach(field => params.append('fields[]', field));
    params.set('pageSize', '100');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Airtable ${tableId} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

const warehouseRecords = await fetchTable(tables.warehouse, ['Oggetto','Tier','Categoria','Quantità','Posizione','Metodo di acquisizione','Prezzo di mercato unitario','Valore totale']);
const ledgerRecords = await fetchTable(tables.ledger, ['Descrizione','Data/Ora','Tipo','Entrata','Uscita','Saldo','Note']);
const orderRecords = await fetchTable(tables.orders, ['Oggetto','Qualità','Incantamento','Quantità','Data/Ora','Prezzo unit.','Stato','Totale Lordo']);

const inventory = warehouseRecords.filter(r => r.fields.Oggetto).map(r => ({
  id:r.id,item:r.fields.Oggetto,tier:r.fields.Tier??'—',category:r.fields.Categoria??'Altro',qty:Number(r.fields['Quantità']??0),location:r.fields.Posizione??'—',source:r.fields['Metodo di acquisizione']??'—',unitPrice:Number(r.fields['Prezzo di mercato unitario']??0),value:Number(r.fields['Valore totale']??0)
})).sort((a,b)=>a.item.localeCompare(b.item,'it'));

const ledger = ledgerRecords.filter(r => r.fields.Descrizione).map(r => ({
  id:r.id,date:r.fields['Data/Ora']??'',description:r.fields.Descrizione,type:r.fields.Tipo??'',income:Number(r.fields.Entrata??0),expense:Number(r.fields.Uscita??0),balance:Number(r.fields.Saldo??0),notes:r.fields.Note??''
})).sort((a,b)=>new Date(b.date)-new Date(a.date));

const orders = orderRecords.filter(r => r.fields.Oggetto).map(r => ({
  id:r.id,item:r.fields.Oggetto,quality:r.fields['Qualità']??'—',enchant:r.fields.Incantamento??'.0',quantity:Number(r.fields['Quantità']??0),date:r.fields['Data/Ora']??'',price:Number(r.fields['Prezzo unit.']??0),status:r.fields.Stato??'In attesa',total:Number(r.fields['Totale Lordo']??0)
})).sort((a,b)=>new Date(b.date)-new Date(a.date));

const payload = {
  source:'Airtable',generatedAt:new Date().toISOString(),
  warehouse:{count:inventory.length,totalUnits:inventory.reduce((s,r)=>s+r.qty,0),totalValue:inventory.reduce((s,r)=>s+r.value,0),inventory},
  ledger:{count:ledger.length,currentBalance:ledger.find(r=>Number.isFinite(r.balance))?.balance??0,records:ledger},
  orders:{count:orders.length,records:orders}
};

await mkdir('public/data',{recursive:true});
await writeFile('public/data/merchant-empire.json',JSON.stringify(payload,null,2)+'\n');
await writeFile('public/data/warehouse.json',JSON.stringify({source:payload.source,generatedAt:payload.generatedAt,...payload.warehouse},null,2)+'\n');
console.log(`Synced warehouse ${inventory.length}, ledger ${ledger.length}, orders ${orders.length}; balance ${payload.ledger.currentBalance}`);
