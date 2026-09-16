import React from 'react';
import { inventory as fallbackInventory, ledger as fallbackLedger, orders as fallbackOrders, money } from './data';

type InventoryItem={item:string;tier:string;category:string;quantity:number;source:string;price:number;position?:string};
const DATABASE_URL='https://raw.githubusercontent.com/TearOfMoon/MerchantEmpire/main/public/data/merchant-empire.json';
const POLL_INTERVAL_MS=10_000;
const fmtDate=(iso:string)=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?iso:new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Amsterdam'}).format(d).replace(',','')};

export let inventory:InventoryItem[]=fallbackInventory.map(x=>({...x}));
export let ledger=fallbackLedger.map(x=>({...x}));
export let orders=fallbackOrders.map(x=>({...x}));
export let currentBalance=fallbackLedger[0]?.balance??0;
export let inventoryUnits=0;
export let inventoryValue=0;
export let composition:{name:string;value:number}[]=[];

let revision=0;
let lastPayload='';
const listeners=new Set<()=>void>();
const notify=()=>{revision+=1;listeners.forEach(listener=>listener())};
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener)};
const getSnapshot=()=>revision;

function recalculate(){
  inventoryUnits=inventory.reduce((sum,x)=>sum+x.quantity,0);
  inventoryValue=inventory.reduce((sum,x)=>sum+x.quantity*x.price,0);
  composition=Object.entries(inventory.reduce((acc:Record<string,number>,x)=>{acc[x.category]=(acc[x.category]||0)+x.quantity;return acc},{})).map(([name,value])=>({name,value}));
}

function applyData(data:any){
  inventory=data.warehouse.inventory.map((x:any)=>({item:x.item,tier:x.tier,category:x.category,quantity:Number(x.qty||0),source:x.source,price:Number(x.unitPrice||0),position:x.location}));
  ledger=data.ledger.records.map((x:any)=>({date:fmtDate(x.date),description:x.description,type:x.type||'',income:Number(x.income||0),expense:Number(x.expense||0),balance:Number(x.balance||0),notes:x.notes||''}));
  orders=data.orders.records.map((x:any)=>({id:x.id,item:x.item,quality:x.quality,enchant:x.enchant||'.0',quantity:Number(x.quantity||0),date:fmtDate(x.date),price:Number(x.price||0),status:x.status||'In attesa',total:Number(x.total||0)}));
  currentBalance=Number(data.ledger.currentBalance||0);
  recalculate();
}

async function refresh(){
  try{
    const separator=DATABASE_URL.includes('?')?'&':'?';
    const response=await fetch(`${DATABASE_URL}${separator}t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`merchant-empire.json: ${response.status}`);
    const text=await response.text();
    if(text===lastPayload)return;
    const data=JSON.parse(text);
    if(!Array.isArray(data?.warehouse?.inventory)||!Array.isArray(data?.ledger?.records)||!Array.isArray(data?.orders?.records))throw new Error('Database Merchant Empire incompleto');
    applyData(data);
    lastPayload=text;
    notify();
  }catch(error){
    console.warn('Database GitHub Merchant Empire temporaneamente non disponibile: mantengo l’ultimo snapshot valido.',error);
  }
}

recalculate();
void refresh();
if(typeof window!=='undefined')window.setInterval(()=>void refresh(),POLL_INTERVAL_MS);

export function useLiveDataVersion(){return React.useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
export { money };
