export const ALBION_MARKET_REGION='Europe';
export const DEFAULT_MARKET_CITY='Martlock';
const API='https://europe.albion-online-data.com/api/v2/stats';

export type MarketPrice={
  item_id:string;
  city:string;
  quality:number;
  sell_price_min:number;
  sell_price_min_date:string;
  sell_price_max:number;
  sell_price_max_date:string;
  buy_price_max:number;
  buy_price_max_date:string;
  buy_price_min:number;
  buy_price_min_date:string;
};

export type MarketHistoryPoint={
  item_count:number;
  avg_price:number;
  timestamp:string;
};

export type MarketHistory={
  location:string;
  item_id:string;
  quality:number;
  data:MarketHistoryPoint[];
};

const csv=(values:string[])=>values.map(encodeURIComponent).join(',');

export async function fetchMarketPrices(itemIds:string[],city=DEFAULT_MARKET_CITY,qualities=[1,2,3,4,5]){
  if(!itemIds.length)return [] as MarketPrice[];
  const url=`${API}/prices/${csv(itemIds)}.json?locations=${encodeURIComponent(city)}&qualities=${qualities.join(',')}`;
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Albion Europe market prices: ${response.status}`);
  return await response.json() as MarketPrice[];
}

export async function fetchMarketHistory(itemIds:string[],city=DEFAULT_MARKET_CITY,timeScale=24){
  if(!itemIds.length)return [] as MarketHistory[];
  const url=`${API}/history/${csv(itemIds)}.json?locations=${encodeURIComponent(city)}&time-scale=${timeScale}`;
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Albion Europe market history: ${response.status}`);
  return await response.json() as MarketHistory[];
}

export function weightedAverage(history:MarketHistory[]){
  let units=0,value=0;
  for(const series of history)for(const point of series.data||[]){
    const count=Number(point.item_count)||0;
    const price=Number(point.avg_price)||0;
    units+=count;
    value+=count*price;
  }
  return units?Math.round(value/units):null;
}

export function marketFreshness(date:string){
  if(!date)return 'Nessun dato';
  const age=Date.now()-new Date(date).getTime();
  if(!Number.isFinite(age))return 'Data sconosciuta';
  if(age<=60*60*1000)return 'Fresco';
  if(age<=24*60*60*1000)return 'Recente';
  if(age<=72*60*60*1000)return 'Datato';
  return 'Molto datato';
}
