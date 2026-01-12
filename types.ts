
export enum Category {
  Men = 'رجالي',
  Women = 'نسائي',
  Kids = 'أطفال',
  Accessories = 'إكسسوارات',
  Shortcuts = 'سريع'
}

export type ExpenseCategoryType = 'A' | 'B' | 'C';

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  type: ExpenseCategoryType;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  image: string;
  category: Category;
  stock: number;
  minStock: number;
  barcode?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  profit: number;
  paymentMethod: 'cash' | 'debt';
  timestamp: Date;
  customerName?: string;
  customerPhone?: string;
  sellerId: string;
}

export interface Debt {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  timestamp: Date;
  status: 'pending' | 'paid';
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  timestamp: Date;
  recordedBy: string;
  receiptImage?: string;
  isAiVerified?: boolean;
}

export interface ShopConfig {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  currency: string;
  ownerPhone: string;
}
