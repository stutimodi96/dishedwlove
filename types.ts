export interface LedgerEntry {
  id?: string;
  date: any; // Firestore Timestamp
  product: string;
  customer: string;
  price: number;
  quantity: number;
  total: number;
  uid: string;
}

export interface InventoryItem {
  id?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  uid: string;
}

export interface MarketingLog {
  id?: string;
  type: 'whatsapp' | 'instagram' | 'strategy';
  content: string;
  timestamp: any; // Firestore Timestamp
  uid: string;
}

export interface BakerySettings {
  bakeryName: string;
  owner: string;
  specialty: string;
}
