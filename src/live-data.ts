import { inventory as fallbackInventory, ledger, orders, money } from './data';

type InventoryItem = {
  item: string;
  tier: string;
  category: string;
  quantity: number;
  source: string;
  price: number;
  position?: string;
};

type WarehousePayload = {
  source: string;
  generatedAt: string;
  count: number;
  totalUnits: number;
  totalValue: number;
  inventory: Array<{
    item: string;
    tier: string;
    category: string;
    qty: number;
    location: string;
    source: string;
    unitPrice: number;
    value: number;
  }>;
};

async function loadInventory(): Promise<InventoryItem[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/warehouse.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`warehouse.json: ${response.status}`);
    const data: WarehousePayload = await response.json();
    if (!Array.isArray(data.inventory) || data.inventory.length === 0) throw new Error('Inventario Airtable vuoto');
    return data.inventory.map(x => ({
      item: x.item,
      tier: x.tier,
      category: x.category,
      quantity: Number(x.qty || 0),
      source: x.source,
      price: Number(x.unitPrice || 0),
      position: x.location
    }));
  } catch (error) {
    console.warn('Airtable warehouse non disponibile: uso snapshot locale.', error);
    return fallbackInventory.map(x => ({ ...x }));
  }
}

export const inventory = await loadInventory();
export const inventoryUnits = inventory.reduce((sum, x) => sum + x.quantity, 0);
export const inventoryValue = inventory.reduce((sum, x) => sum + x.quantity * x.price, 0);
export const composition = Object.entries(
  inventory.reduce((acc: Record<string, number>, x) => {
    acc[x.category] = (acc[x.category] || 0) + x.quantity;
    return acc;
  }, {})
).map(([name, value]) => ({ name, value }));

export { ledger, orders, money };
