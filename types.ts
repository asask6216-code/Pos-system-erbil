
export enum Category {
  Men = 'رجالي',
  Women = 'نسائي',
  Kids = 'أطفال',
  Accessories = 'إكسسوارات',
  Shortcuts = 'سريع'
}

export type ExpenseCategoryType = 'رواتب' | 'إيجار' | 'ديكور' | 'كهرباء وماء' | 'بضاعة' | 'تسويق' | 'نثريات';

export interface ProductVariant {
  id: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free';
  color: string;
  stock: number;
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
  variants: ProductVariant[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariantId?: string;
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
  pointsEarned: number;
}

export interface Debt {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  timestamp: Date;
  status: 'pending' | 'paid';
  history: { amount: number; date: Date; type: 'payment' | 'initial' }[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategoryType;
  timestamp: Date;
  recordedBy: string;
  receiptImage?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface LicenseData {
  mode: 'trial' | 'installment' | 'permanent';
  modeSet: boolean;
  activationDate: number | null;
  lastRenewalCycle: number;
  isLocked: boolean;
  expiryDate: number | null;
  totalInstallments: number;
  isTestMode: boolean; 
  cycleStartTime: number | null;
}

export interface ShopConfig {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  currency: string;
  ownerPhone: string;
  theme: 'dark' | 'light';
  license: LicenseData;
}
