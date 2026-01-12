
import { Category, Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'قميص رجالي قطن',
    price: 15000,
    cost: 10000,
    image: 'https://picsum.photos/seed/shirt1/200/200',
    category: Category.Men,
    stock: 20,
    minStock: 5,
    barcode: '123456789'
  },
  {
    id: '2',
    name: 'فستان صيفي نسائي',
    price: 35000,
    cost: 25000,
    image: 'https://picsum.photos/seed/dress1/200/200',
    category: Category.Women,
    stock: 12,
    minStock: 3,
    barcode: '987654321'
  },
  {
    id: '3',
    name: 'طقم ولادي 3 قطع',
    price: 12000,
    cost: 8000,
    image: 'https://picsum.photos/seed/kid1/200/200',
    category: Category.Kids,
    stock: 2,
    minStock: 5,
    barcode: '111222333'
  },
  {
    id: '4',
    name: 'شراب قطن (دزينة)',
    price: 5000,
    cost: 3000,
    image: 'https://picsum.photos/seed/socks/200/200',
    category: Category.Shortcuts,
    stock: 50,
    minStock: 10,
    barcode: '444555666'
  }
];