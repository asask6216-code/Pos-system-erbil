
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Package, Search, Plus, Minus, Trash2, Camera, X, 
  Wallet, Zap, Smartphone, CreditCard, UserPlus, RefreshCw, Check, 
  Send, ShieldAlert, History, Settings, LayoutDashboard, TrendingUp, 
  Sparkles, DollarSign, QrCode, Power, Bluetooth, User, ClipboardList, 
  Menu, Bell, MessageSquareCode, ShoppingCart, ChevronUp, ChevronDown,
  ShieldCheck, AlertCircle, Eye, EyeOff, FileText, Camera as CameraIcon,
  Printer, Lock, ShieldX, KeyRound, Share2, Info, MessageSquare, Phone,
  LogOut, Timer as TimerIcon, Calendar, Sun, Moon, SendHorizontal, Bot,
  Award, BarChart3, Receipt, Scale, UserCheck, Banknote, Home, Paintbrush, 
  Zap as PowerIcon, Coffee, Megaphone, Users, ArrowUpCircle, Languages, Edit3,
  Activity, Clock, FileBarChart
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_PRODUCTS } from './constants';
import { 
  Product, CartItem, Transaction, Expense, ShopConfig, Debt, 
  Category, ExpenseCategoryType, ChatMessage 
} from './types';
import TopStatusBar from './components/TopStatusBar';
import { saveData, getData } from './db';

const MASTER_CODE = '992288';
const RENEWAL_CODES = ['R-MONTH-1', 'R-MONTH-2', 'R-MONTH-3', 'R-MONTH-4', 'R-MONTH-5', 'R-MONTH-6', 'R-MONTH-7', 'R-MONTH-8', 'R-MONTH-9', 'R-MONTH-10', 'R-MONTH-11', 'R-MONTH-12'];

const TEST_MODE_MS = 60 * 1000; // 1 Minute
const REAL_MODE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

const DEFAULT_CONFIG: ShopConfig = {
  name: "AL-HOUT PRO SYSTEM",
  logoUrl: "",
  address: "بغداد - المنصور",
  phone: "07700000000",
  ownerPhone: "07700000000",
  currency: "د.ع",
  theme: 'dark',
  license: {
    mode: 'installment',
    modeSet: false,
    activationDate: null,
    lastRenewalCycle: 0,
    isLocked: false,
    expiryDate: null,
    totalInstallments: 12,
    isTestMode: true,
    cycleStartTime: Date.now()
  }
};

const EXPENSE_TYPES: { label: ExpenseCategoryType; icon: any; color: string }[] = [
  { label: 'رواتب', icon: Users, color: 'blue' },
  { label: 'إيجار', icon: Home, color: 'indigo' },
  { label: 'ديكور', icon: Paintbrush, color: 'pink' },
  { label: 'كهرباء وماء', icon: PowerIcon, color: 'yellow' },
  { label: 'بضاعة', icon: Package, color: 'emerald' },
  { label: 'تسويق', icon: Megaphone, color: 'orange' },
  { label: 'نثريات', icon: Coffee, color: 'rose' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'debts' | 'accounts' | 'ai-chat' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [config, setConfig] = useState<ShopConfig>(DEFAULT_CONFIG);

  // UI States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'cash' | 'debt'>('cash');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  // AI Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'stock' | 'expense'>('stock');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Timer & License
  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');
  const [devCodeInput, setDevCodeInput] = useState('');
  const [renewalCodeInput, setRenewalCodeInput] = useState('');
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Bluetooth
  const [btDevice, setBtDevice] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Form States
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, cost: 0, stock: 0, minStock: 5, category: Category.Men, variants: [] });
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ title: '', amount: 0, category: 'نثريات' });

  // --- AUTO-LOCK & TIMER ENGINE ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isLoaded) return;
      const now = Date.now();
      const license = config.license;

      if (license.mode === 'installment' && license.cycleStartTime) {
        const cycleDuration = license.isTestMode ? TEST_MODE_MS : REAL_MODE_MS;
        const endTime = license.cycleStartTime + cycleDuration;
        const diff = endTime - now;

        if (diff <= 0) {
          if (!license.isLocked) {
            setConfig(prev => ({
              ...prev,
              license: { ...prev.license, isLocked: true }
            }));
          }
          setTimeLeftStr('00:00:00');
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeftStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoaded, config.license]);

  // --- DB SYNC ---
  useEffect(() => {
    const load = async () => {
      const [p, t, e, d, c] = await Promise.all([
        getData('products', 'list'),
        getData('transactions', 'list'),
        getData('expenses', 'list'),
        getData('debts', 'list'),
        getData('settings', 'config')
      ]);
      setProducts(p || INITIAL_PRODUCTS);
      setTransactions(t || []);
      setExpenses(e || []);
      setDebts(d || []);
      if (c) {
        setConfig(c);
        setCurrentTheme(c.theme || 'dark');
      }
      setIsLoaded(true);
      document.getElementById('loading-overlay')?.remove();
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveData('products', 'list', products);
      saveData('transactions', 'list', transactions);
      saveData('expenses', 'list', expenses);
      saveData('debts', 'list', debts);
      saveData('settings', 'config', { ...config, theme: currentTheme });
    }
  }, [products, transactions, expenses, debts, config, currentTheme, isLoaded]);

  // --- BUSINESS OPERATIONS ---
  const handleRenewal = () => {
    const currentCode = RENEWAL_CODES[config.license.lastRenewalCycle] || MASTER_CODE;
    if (renewalCodeInput === currentCode || renewalCodeInput === MASTER_CODE) {
      setConfig(prev => ({
        ...prev,
        license: { 
          ...prev.license, 
          isLocked: false, 
          lastRenewalCycle: prev.license.lastRenewalCycle + 1,
          cycleStartTime: Date.now()
        }
      }));
      setRenewalCodeInput('');
      alert("تم تجديد الاشتراك بنجاح. استمر في العمل!");
    } else {
      alert("كود التجديد غير صحيح. يرجى مراجعة الإدارة.");
    }
  };

  /**
   * Fix: Added missing handleActivation function
   * Handles transitioning the system mode between installment and permanent based on master code input.
   */
  const handleActivation = (mode: 'trial' | 'installment' | 'permanent') => {
    if (devCodeInput === MASTER_CODE) {
      setConfig(prev => ({
        ...prev,
        license: { 
          ...prev.license, 
          mode, 
          modeSet: true,
          activationDate: Date.now(),
          cycleStartTime: Date.now(),
          isLocked: false
        }
      }));
      setDevCodeInput('');
      setShowDevPanel(false);
      alert(`تم تنشيط النظام بنجاح بوضع: ${mode === 'permanent' ? 'التفعيل الدائم' : 'نظام الأقساط'}`);
    } else {
      alert("كود المبرمج غير صحيح.");
    }
  };

  const sendDailyReport = () => {
    const today = new Date().toDateString();
    const todaySales = transactions.filter(t => new Date(t.timestamp).toDateString() === today);
    const totalSales = todaySales.reduce((a, b) => a + b.total, 0);
    const totalProfit = todaySales.reduce((a, b) => a + b.profit, 0);
    const totalExp = expenses.filter(e => new Date(e.timestamp).toDateString() === today).reduce((a, b) => a + b.amount, 0);
    
    const msg = `📊 تقرير الحوت اليومي (${new Date().toLocaleDateString('ar-EG')}):
-------------------------
💰 المبيعات: ${totalSales.toLocaleString()} ${config.currency}
📈 الربح: ${totalProfit.toLocaleString()} ${config.currency}
💸 المصروفات: ${totalExp.toLocaleString()} ${config.currency}
🏦 الكاش المتوفر: ${(totalSales - totalExp).toLocaleString()} ${config.currency}
-------------------------
تم التوليد بواسطة AL-HOUT PRO`;
    
    const url = `https://wa.me/${config.ownerPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const connectBluetooth = async () => {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      setBtDevice(device);
      alert("تم الاتصال بنجاح بـ: " + device.name);
    } catch (e) {
      alert("بلوتوث التابلت معطل أو لم يتم اختيار جهاز.");
    }
  };

  const handleSale = () => {
    if (checkoutType === 'debt' && (!customerInfo.name || !customerInfo.phone)) return alert("بيانات العميل إلزامية للبيع الآجل.");
    const profit = cart.reduce((a, b) => a + (b.price - b.cost) * b.quantity, 0);
    const tx: Transaction = {
      id: `TX-${Date.now()}`,
      items: [...cart],
      total: cartTotal,
      profit,
      paymentMethod: checkoutType,
      timestamp: new Date(),
      sellerId: 'المدير',
      pointsEarned: Math.floor(cartTotal / 1000)
    };
    if (checkoutType === 'debt') {
      setDebts(prev => [{
        id: `DEBT-${Date.now()}`,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        totalAmount: cartTotal,
        paidAmount: 0,
        timestamp: new Date(),
        status: 'pending',
        history: [{ amount: cartTotal, date: new Date(), type: 'initial' }]
      }, ...prev]);
    }
    setTransactions(prev => [tx, ...prev]);
    setProducts(prev => prev.map(p => {
      const item = cart.find(c => c.id === p.id);
      return item ? { ...p, stock: p.stock - item.quantity } : p;
    }));
    setCart([]);
    setShowCheckoutModal(false);
    alert("تمت العملية بنجاح!");
  };

  const saveProduct = () => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...editingProduct,
        ...newProduct,
        price: Number(newProduct.price),
        cost: Number(newProduct.cost),
        stock: Number(newProduct.stock)
      } as Product : p));
    } else {
      const p: Product = {
        id: `P-${Date.now()}`,
        name: newProduct.name!,
        price: Number(newProduct.price),
        cost: Number(newProduct.cost),
        stock: Number(newProduct.stock),
        minStock: Number(newProduct.minStock),
        category: newProduct.category as Category,
        image: capturedImage || `https://picsum.photos/seed/${Date.now()}/400/400`,
        variants: []
      };
      setProducts(prev => [p, ...prev]);
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setCapturedImage(null);
  };

  const handleExpense = (cat?: ExpenseCategoryType) => {
    if (cat) {
      setNewExpense({ title: cat, amount: 0, category: cat });
      setShowExpenseModal(true);
      return;
    }
    const exp: Expense = {
      id: `EXP-${Date.now()}`,
      title: newExpense.title!,
      amount: newExpense.amount!,
      category: newExpense.category as ExpenseCategoryType,
      timestamp: new Date(),
      recordedBy: 'المدير',
      receiptImage: capturedImage || undefined
    };
    setExpenses(prev => [exp, ...prev]);
    setShowExpenseModal(false);
  };

  const sendMessageToAi = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', parts: [{ text: chatInput }] };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...chatHistory, userMsg].map(m => ({ role: m.role, parts: m.parts }))
      });
      const modelMsg: ChatMessage = { role: 'model', parts: [{ text: response.text || "عذراً، فشلت في تحليل البيانات." }] };
      setChatHistory(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const startCameraLocal = (mode: 'stock' | 'expense') => {
    setCameraMode(mode);
    setIsCameraOpen(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
  };

  const capture