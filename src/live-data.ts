import { inventory as fallbackInventory, ledger as fallbackLedger, orders as fallbackOrders, money } from './data';

type InventoryItem={item:string;tier:string;category:string;quantity:number;source:string;price:number;position?:string};
const fmtDate=(iso:string)=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?iso:new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Amsterdam'}).format(d).replace(',','')};

async function loadAll(){
  try{
    const response=await fetch(`${import.meta.env.BASE_URL}data/merchant-empire.json`,{cache:'no-store'});
    if(!response.ok)throw new Error(`merchant-empire.json: ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data?.warehouse?.inventory)||!Array.isArray(data?.ledger?.records)||!Array.isArray(data?.orders?.records))throw new Error('Payload Airtable incompleto');
    return data;
  }catch(error){console.warn('Airtable live data non disponibile: uso snapshot locale.',error);return null}
}
const live=await loadAll();
export const inventory:InventoryItem[]=live?live.warehouse.inventory.map((x:any)=>({item:x.item,tier:x.tier,category:x.category,quantity:Number(x.qty||0),source:x.source,price:Number(x.unitPrice||0),position:x.location})):fallbackInventory.map(x=>({...x}));
export const ledger=live?live.ledger.records.map((x:any)=>({date:fmtDate(x.date),description:x.description,type:x.type||'',income:Number(x.income||0),expense:Number(x.expense||0),balance:Number(x.balance||0),notes:x.notes||''})):fallbackLedger;
export const orders=live?live.orders.records.map((x:any)=>({id:x.id,item:x.item,quality:x.quality,enchant:x.enchant||'.0',quantity:Number(x.quantity||0),date:fmtDate(x.date),price:Number(x.price||0),status:x.status||'In attesa',total:Number(x.total||0)})):fallbackOrders;
export const currentBalance=live?Number(live.ledger.currentBalance||0):(fallbackLedger[0]?.balance??0);
export const inventoryUnits=inventory.reduce((sum,x)=>sum+x.quantity,0);
export const inventoryValue=inventory.reduce((sum,x)=>sum+x.quantity*x.price,0);
export const composition=Object.entries(inventory.reduce((acc:Record<string,number>,x)=>{acc[x.category]=(acc[x.category]||0)+x.quantity;return acc},{})).map(([name,value])=>({name,value}));
export { money };
