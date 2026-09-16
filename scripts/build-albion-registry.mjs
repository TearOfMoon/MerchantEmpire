import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE='https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';
const OUTPUT=new URL('../public/data/albion-item-registry.json',import.meta.url);
const ICON_BASE='https://render.albiononline.com/v1/item/';

const response=await fetch(SOURCE,{headers:{Accept:'application/json'}});
if(!response.ok)throw new Error(`Albion item metadata fetch failed: ${response.status}`);
const source=await response.json();
if(!Array.isArray(source))throw new Error('Unexpected Albion item metadata format');

const tierFrom=id=>{const m=String(id).match(/^T([1-8])_/);return m?Number(m[1]):null};
const enchantFrom=id=>{const m=String(id).match(/@([1-4])$/);return m?Number(m[1]):0};
const iconIdentifier=id=>String(id);

const items=source
  .filter(item=>item?.UniqueName)
  .map(item=>({
    index:Number(item.Index)||null,
    id:item.UniqueName,
    nameIt:item.LocalizedNames?.['IT-IT']||null,
    nameEn:item.LocalizedNames?.['EN-US']||null,
    tier:tierFrom(item.UniqueName),
    enchantment:enchantFrom(item.UniqueName),
    icon:`${ICON_BASE}${encodeURIComponent(iconIdentifier(item.UniqueName))}.png?quality=1&size=217`
  }));

const registry={
  generatedAt:new Date().toISOString(),
  source:SOURCE,
  renderService:ICON_BASE,
  count:items.length,
  items
};

await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
await writeFile(OUTPUT,JSON.stringify(registry));
console.log(`Albion visual registry generated: ${items.length} items -> public/data/albion-item-registry.json`);
