import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Package, Search, Plus, Minus, Trash2, Camera, X, 
  Wallet, Zap, Smartphone, CreditCard, UserPlus, RefreshCw, Check, 
  Send, ShieldAlert, History, Settings, LayoutDashboard, TrendingUp, 
  Sparkles, DollarSign, QrCode, Power, Bluetooth, User, ClipboardList, 
  Menu, Bell, MessageSquareCode, ShoppingCart, ChevronUp, ChevronDown,
  ShieldCheck, AlertCircle, Eye, EyeOff, FileText, Camera as CameraIcon,
  Printer, Lock, ShieldX, KeyRound, Share2, Info, MessageSquare
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { INITIAL_PRODUCTS } from './constants';
import { Product, CartItem, Transaction, Expense, ShopConfig, Debt, ExpenseCategory, Category } from './types';
import TopStatusBar from './components/TopStatusBar';
import { analyzeNextMonthForecast } from './geminiService';
import { saveData, getData, clearStore } from './db';

const DAILY_TARGET = 1000000;
const EXPENSE_THRESHOLD = 500; 
// Set to 1 minute for testing as requested. Normal: 30 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 60 * 1000; 
const SYSTEM_SERIAL = 'S1234T6R';

// Secure Telegram Credentials
const TELEGRAM_BOT_TOKEN = '7245537071:AAGFvnaOo9RDEvMuEqjKuNOFouHdcgKs_VI';
const TELEGRAM_CHAT_ID = '1226030696';

const SMART_EXP_CATS: ExpenseCategory[] = [
  { id: 'inventory', name: 'بضاعة (مخزون)', color: '#9333ea', type: 'A' },
  { id: 'rent', name: 'إيجار المحل', color: '#7c3aed', type: 'A' },
  { id: 'electricity', name: 'كهرباء', color: '#eab308', type: 'A' },
  { id: 'water', name: 'ماء', color: '#3b82f6', type: 'A' },
  { id: 'license', name: 'رخصة تجارية', color: '#ef4444', type: 'A' },
  { id: 'salaries', name: 'رواتب موظفين', color: '#ec4899', type: 'B' },
  { id: 'commissions', name: 'عمولات مبيعات', color: '#f43f5e', type: 'B' },
  { id: 'marketing', name: 'تسويق وإعلانات', color: '#06b6d4', type: 'B' },
  { id: 'packaging', name: 'مواد تغليف', color: '#10b981', type: 'B' },
  { id: 'hospitality', name: 'ضيافة زبائن', color: '#f97316', type: 'C' },
  { id: 'cleaning', name: 'منظفات وصيانة', color: '#64748b', type: 'C' },
  { id: 'stationery', name: 'قرطاسية ومستلزمات', color: '#475569', type: 'C' }
];

const DEFAULT_CONFIG: ShopConfig = {
  name: "Boutique AI Pro",
  logoUrl: "https://via.placeholder.com/150",
  address: "بغداد - الكرادة",
  phone: "07700000000",
  ownerPhone: "07700000000",
  currency: "د.ع",
};

/**
 * Sends a secure notification to the Admin Telegram Bot
 */
const sendToTelegram = async (message: string) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.error("Telegram Notification Failed", e);
  }
};

// --- First-Time Activation Admin Panel ---
const ActivationAdminPanel: React.FC<{ onActivate: (mode: 'installment' | 'lifetime') => void }> = ({ onActivate }) => {
  const [pass, setPass] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (pass === '777') {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('كلمة مرور الإدارة غير صحيحة');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="lock-overlay flex-col gap-8 animate-pop">
        <div className="bg-slate-900 p-12 rounded-[50px] border border-purple-500/30 flex flex-col items-center gap-8 max-w-lg w-full text-white shadow-2xl">
          <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.3)]">
            <ShieldCheck size={40}/>
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-purple-400">نظام الـ Whale Pro</h2>
            <p className="text-slate-300 text-lg font-bold">يرجى إدخال رمز التفعيل الأولي للإدارة</p>
          </div>
          <div className="w-full space-y-4">
            <input 
              type="password" 
              placeholder="رمز الإدارة" 
              className="w-full h-16 text-center bg-slate-800 rounded-2xl text-white font-bold text-2xl outline-none border border-slate-700 focus:border-purple-500"
              value={pass} 
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-rose-500 text-xs font-bold text-center animate-bounce">{error}</p>}
            <button 
              onClick={handleLogin}
              className="w-full h-16 bg-purple-600 text-white rounded-2xl font-black text-xl hover:bg-purple-700 transition-all shadow-xl"
            >
              دخول الإدارة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lock-overlay flex-col gap-8 animate-pop">
      <div className="bg-slate-900 p-12 rounded-[50px] border border-purple-500/30 flex flex-col items-center gap-8 max-w-2xl w-full text-white shadow-2xl">
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-black text-purple-400">إعدادات التفعيل</h2>
          <p className="text-slate-300 text-lg">المهندس محمد، يرجى اختيار نوع الترخيص لهذا الجهاز</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button 
            onClick={() => onActivate('installment')}
            className="group flex flex-col items-center gap-5 p-8 bg-slate-800 rounded-[40px] border-2 border-slate-700 hover:border-amber-500 transition-all text-center"
          >
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <History size={32}/>
            </div>
            <div>
              <h3 className="text-xl font-black mb-2">نظام الأقساط</h3>
              <p className="text-xs text-slate-400 leading-relaxed">تفعيل لمدة اختبار (1 دقيقة). سيتم القفل تلقائياً بعد انتهاء المدة ما لم يتم التمديد.</p>
            </div>
          </button>

          <button 
            onClick={() => onActivate('lifetime')}
            className="group flex flex-col items-center gap-5 p-8 bg-slate-800 rounded-[40px] border-2 border-slate-700 hover:border-emerald-500 transition-all text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap size={32}/>
            </div>
            <div>
              <h3 className="text-xl font-black mb-2">تفعيل كاش (مدى الحياة)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">تفعيل دائم للنظام. لن يظهر قفل النظام أبداً على هذا الجهاز.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Professional Lockdown UI (Indigo/Purple) ---
const LockdownScreen: React.FC<{ expectedCode: string, onUnlock: (permanent: boolean) => void }> = ({ expectedCode, onUnlock }) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = () => {
    if (inputCode.trim() === expectedCode) {
      setShowConfirmation(true);
    } else {
      setError('كود التفعيل غير صحيح. يرجى مراجعة المسؤول.');
    }
  };

  if (showConfirmation) {
    return (
      <div className="lock-overlay flex-col gap-8 animate-pop">
        <div className="bg-slate-900 p-12 rounded-[50px] border border-purple-500/30 flex flex-col items-center gap-8 max-w-lg w-full text-white shadow-2xl">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
            <ShieldCheck size={40}/>
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-emerald-400">تم التحقق بنجاح</h2>
            <p className="text-slate-300 text-lg font-bold leading-relaxed">المهندس محمد، ما هو الإجراء المطلوب؟</p>
          </div>
          <div className="w-full flex flex-col gap-4">
            <button 
              onClick={() => onUnlock(true)}
              className="w-full h-16 bg-purple-600 text-white rounded-2xl font-black text-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <Check size={24}/> تفعيل دائم (إنهاء الأقساط)
            </button>
            <button 
              onClick={() => onUnlock(false)}
              className="w-full h-16 bg-slate-800 text-slate-300 rounded-2xl font-bold text-lg hover:bg-slate-700 transition-all border border-slate-700"
            >
              تمديد الاختبار (1 دقيقة إضافية)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lock-overlay flex-col gap-8 animate-pop">
      <div className="bg-purple-900/20 p-10 rounded-[50px] border border-purple-500/40 flex flex-col items-center gap-6 max-w-lg w-full shadow-[0_0_80px_rgba(147,51,234,0.15)]">
        <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(147,51,234,0.4)] animate-pulse">
          <Lock size={48} className="text-white"/>
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black text-white">نظام Al-Hout مقفل</h1>
          <p className="text-purple-300 font-bold text-lg italic">أدخل كود الفتح المرسل لتليجرام المسؤول</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 border border-slate-700 px-3 py-1 rounded-full">Device Serial: {SYSTEM_SERIAL}</p>
        </div>
        
        <div className="w-full space-y-4 mt-4">
          <div className="relative">
            <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400" size={24}/>
            <input 
              type="text" 
              placeholder="000000" 
              className="w-full h-24 pr-12 pl-4 bg-slate-900/80 rounded-3xl text-white font-black text-5xl tracking-[1.5rem] text-center outline-none border-2 border-slate-700 focus:border-purple-500 transition-all"
              value={inputCode} 
              onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && <p className="text-rose-500 text-sm font-black text-center animate-bounce">{error}</p>}
          <button 
            onClick={handleSubmit}
            className="w-full h-20 bg-white text-indigo-900 rounded-3xl font-black text-2xl hover:bg-purple-500 hover:text-white transition-all shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
          >
            تأكيد كود التفعيل
          </button>
        </div>
        <p className="text-slate-600 text-[10px] font-black mt-4 uppercase tracking-[0.3em] opacity-60">Whale Pro Secure Remote Cloud Activation</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLaunched, setIsLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'debts' | 'expenses' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [config, setConfig] = useState<ShopConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Lockdown & Activation States
  const [activationChoice, setActivationChoice] = useState<'unconfigured' | 'installment' | 'lifetime'>('unconfigured');
  const [activationTimestamp, setActivationTimestamp] = useState<number | null>(null);
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [remainingTimeLabel, setRemainingTimeLabel] = useState<string>('30 يوم');
  const [currentUnlockCode, setCurrentUnlockCode] = useState<string>('');

  // Initialization from IndexedDB
  useEffect(() => {
    const loadAppData = async () => {
      const storedProducts = await getData('products', 'list');
      const storedTx = await getData('transactions', 'list');
      const storedExpenses = await getData('expenses', 'list');
      const storedDebts = await getData('debts', 'list');
      const storedConfig = await getData('settings', 'config');
      
      const choice = await getData('settings', 'activationChoice');
      const ts = await getData('settings', 'activationTimestamp');
      const code = await getData('settings', 'currentUnlockCode');

      setProducts(storedProducts || INITIAL_PRODUCTS);
      setTransactions(storedTx || []);
      setExpenses(storedExpenses || []);
      setDebts(storedDebts || []);
      setConfig(storedConfig || DEFAULT_CONFIG);
      setCurrentUnlockCode(code || '');
      
      if (choice) {
        setActivationChoice(choice);
        setActivationTimestamp(ts);
      }
      
      setIsLoaded(true);
    };
    loadAppData();
  }, []);

  // Syncing to IndexedDB
  useEffect(() => {
    if (isLoaded) {
      saveData('products', 'list', products);
      saveData('transactions', 'list', transactions);
      saveData('expenses', 'list', expenses);
      saveData('debts', 'list', debts);
      saveData('settings', 'config', config);
      saveData('settings', 'activationChoice', activationChoice);
      saveData('settings', 'activationTimestamp', activationTimestamp);
      saveData('settings', 'currentUnlockCode', currentUnlockCode);
    }
  }, [products, transactions, expenses, debts, config, activationChoice, activationTimestamp, currentUnlockCode, isLoaded]);

  // Lockdown Monitor Logic
  useEffect(() => {
    if (isLaunched && isLoaded && activationChoice === 'installment' && activationTimestamp) {
      const checkLock = async () => {
        const now = Date.now();
        const elapsed = now - activationTimestamp;
        const remaining = Math.max(0, THIRTY_DAYS_MS - elapsed);
        
        // Update Label
        if (THIRTY_DAYS_MS > 600000) { // If > 10 mins, show days
            const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
            setRemainingTimeLabel(`${days} يوم`);
        } else { // Show seconds for test
            const secs = Math.ceil(remaining / 1000);
            setRemainingTimeLabel(`${secs} ثانية`);
        }
        
        if (elapsed >= THIRTY_DAYS_MS) {
          setIsSystemLocked(true);
          // Generate code if not already present for this lock cycle
          if (!currentUnlockCode) {
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            setCurrentUnlockCode(newCode);
            await sendToTelegram(`🔒 *Al-Hout System: Store Locked*\n📍 الجهاز: ${SYSTEM_SERIAL}\n🔑 كود الفتح: \`${newCode}\``);
          }
        } else {
          setIsSystemLocked(false);
        }
      };
      
      checkLock();
      const interval = setInterval(checkLock, 1000); // Check every second for smooth test
      return () => clearInterval(interval);
    }
  }, [isLaunched, isLoaded, activationChoice, activationTimestamp, currentUnlockCode]);

  // POS & UI States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'cash' | 'debt'>('cash');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ title: '', amount: 0, categoryId: 'inventory', recordedBy: '' });
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ amount?: number; date?: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
      const initCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => videoRef.current?.play();
          }
        } catch (err) {
          console.error("Camera error:", err);
          setIsCameraOpen(false);
        }
      };
      setTimeout(initCamera, 100);
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOpen]);

  const isToday = (date: Date) => new Date(date).toDateString() === new Date().toDateString();
  const dailyTotal = useMemo(() => transactions.filter(t => isToday(new Date(t.timestamp))).reduce((acc, t) => acc + t.total, 0), [transactions]);
  const dailyProfit = useMemo(() => transactions.filter(t => isToday(new Date(t.timestamp))).reduce((acc, t) => acc + t.profit, 0), [transactions]);
  const dailyExpensesTotal = useMemo(() => expenses.filter(e => isToday(new Date(e.timestamp))).reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const dailyCashSales = useMemo(() => transactions.filter(t => isToday(new Date(t.timestamp)) && t.paymentMethod === 'cash').reduce((acc, t) => acc + t.total, 0), [transactions]);
  const dailyCashInHand = useMemo(() => dailyCashSales - dailyExpensesTotal, [dailyCashSales, dailyExpensesTotal]);
  const netProfitVal = useMemo(() => dailyProfit - dailyExpensesTotal, [dailyProfit, dailyExpensesTotal]);
  const cartTotalVal = useMemo(() => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0), [cart]);

  const sendDailyReport = () => {
    const report = `📊 *تقرير مبيعات اليوم - ${config.name}*
---------------------------------------
💰 إجمالي المبيعات: ${dailyTotal.toLocaleString()} ${config.currency}
💵 صافي الأرباح: ${dailyProfit.toLocaleString()} ${config.currency}
📉 إجمالي المصاريف: ${dailyExpensesTotal.toLocaleString()} ${config.currency}
👛 الكاش المتوفر: ${dailyCashInHand.toLocaleString()} ${config.currency}
---------------------------------------
📅 تاريخ: ${new Date().toLocaleDateString('ar-EG')}
🔒 النظام مؤمن بالكامل.`;
    window.open(`https://wa.me/${config.ownerPhone}?text=${encodeURIComponent(report)}`, '_blank');
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setIsCameraOpen(false);
        if (showAddExpense) verifyReceiptWithAI(dataUrl);
      }
    }
  };

  const verifyReceiptWithAI = async (imageDataUrl: string) => {
    setIsOcrLoading(true);
    setOcrResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageDataUrl.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Extract the 'Total Amount' and 'Date' from this receipt. Response must be JSON only: { \"amount\": number, \"date\": \"string\" }" },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || "{}");
      setOcrResult(result);
      if (result.amount) setNewExpense(prev => ({ ...prev, amount: result.amount }));
    } catch (e) {
      console.error("OCR Verification failed", e);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const finalizeExpense = () => {
    const amount = Number(newExpense.amount);
    if (!newExpense.title || !amount || !newExpense.recordedBy) return alert("أكمل البيانات.");
    const expenseRecord: Expense = {
      id: `EXP-${Date.now()}`,
      title: newExpense.title || '',
      amount: amount,
      categoryId: newExpense.categoryId || 'misc',
      timestamp: new Date(),
      recordedBy: newExpense.recordedBy || 'Unknown',
      receiptImage: capturedImage || undefined,
      isAiVerified: !!ocrResult
    };
    setExpenses(prev => [expenseRecord, ...prev]);
    setShowAddExpense(false);
    setCapturedImage(null);
  };

  const finalizeSale = async () => {
    if (checkoutType === 'debt' && (!customerInfo.name || !customerInfo.phone)) return alert("أدخل بيانات الزبون.");
    const cost = cart.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
    const tx: Transaction = {
      id: `TX-${Date.now()}`, items: [...cart], total: cartTotalVal, profit: cartTotalVal - cost,
      paymentMethod: checkoutType, timestamp: new Date(), sellerId: 'Admin',
      customerName: checkoutType === 'debt' ? customerInfo.name : undefined,
      customerPhone: checkoutType === 'debt' ? customerInfo.phone : undefined
    };
    setProducts(prev => prev.map(p => {
      const c = cart.find(i => i.id === p.id);
      return c ? { ...p, stock: Math.max(0, p.stock - c.quantity) } : p;
    }));
    setTransactions(p => [tx, ...p]);
    setCart([]); setShowCheckoutModal(false); setReceivedAmount('');
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if(ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, {...p, quantity: 1}];
    });
    if(!isCartExpanded) setIsCartExpanded(true);
  };

  const handleInitialActivation = (mode: 'installment' | 'lifetime') => {
    setActivationChoice(mode);
    setActivationTimestamp(Date.now());
  };

  const handleUnlock = (permanent: boolean) => {
    if (permanent) {
      setActivationChoice('lifetime');
      setIsSystemLocked(false);
      setCurrentUnlockCode('');
    } else {
      // Extend installment by resetting timestamp to now
      setActivationTimestamp(Date.now());
      setIsSystemLocked(false);
      setCurrentUnlockCode('');
    }
  };

  if (!isLoaded) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-black text-2xl animate-pulse">Loading Al-Hout System...</div>;

  // 1. Initial Admin Activation
  if (isLaunched && activationChoice === 'unconfigured') {
    return <ActivationAdminPanel onActivate={handleInitialActivation} />;
  }

  // 2. Lockdown Screen
  if (isSystemLocked) {
    return <LockdownScreen expectedCode={currentUnlockCode} onUnlock={handleUnlock} />;
  }

  // 3. Launch Screen
  if (!isLaunched) {
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center text-white gap-10">
        <div className="relative animate-bounce">
          <div className="w-24 h-24 bg-purple-600 rounded-[28px] flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.3)]"><Zap size={48}/></div>
          <Sparkles className="absolute -top-3 -right-3 text-yellow-400" size={24}/>
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-2 uppercase">The Whale <span className="text-purple-500">System</span></h1>
          <p className="text-slate-400 text-lg font-medium opacity-80 italic">نظام كاشير مبيعات ذكي وفائق الأمان</p>
        </div>
        <button onClick={() => setIsLaunched(true)} className="btn-premium w-full max-w-xs h-16 bg-white text-slate-900 rounded-2xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          دخول النظام <Power size={24}/>
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-tajawal rtl" dir="rtl">
      <TopStatusBar />
      
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-6 shadow-2xl z-50">
        <div className="flex items-center gap-5">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="btn-touch lg:hidden bg-white/10 rounded-xl"><Menu size={28}/></button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">صافي الربح اليوم</span>
            <span className={`text-2xl font-black ${netProfitVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{netProfitVal.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
           {activationChoice === 'installment' && (
             <div className="hidden md:flex flex-col items-center justify-center px-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
               <span className="text-[10px] text-amber-500 font-black">انتهاء الترخيص خلال:</span>
               <span className="text-xl font-black text-amber-500">{remainingTimeLabel}</span>
             </div>
           )}
           <button onClick={sendDailyReport} title="إرسال التقرير اليومي" className="btn-touch bg-emerald-600 rounded-xl shadow-lg w-14 h-14 hover:bg-emerald-700 transition-colors">
             <Share2 size={24}/>
           </button>
           <button onClick={() => setActiveTab('settings')} className="btn-touch bg-white/5 rounded-xl text-slate-400 w-14 h-14"><Settings size={24}/></button>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden relative">
        <nav className={`sidebar-premium w-24 lg:w-28 flex flex-col items-center py-8 gap-8 shadow-2xl z-40 transition-all ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
            { id: 'pos', icon: ShoppingBag, label: 'البيع' },
            { id: 'inventory', icon: Package, label: 'المخزن' },
            { id: 'debts', icon: CreditCard, label: 'الديون' },
            { id: 'expenses', icon: Wallet, label: 'المصروفات' }
          ].map(btn => (
            <button 
              key={btn.id} onClick={() => { setActiveTab(btn.id as any); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex flex-col items-center gap-2 transition-all group ${activeTab === btn.id ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className={`btn-touch w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeTab === btn.id ? 'bg-purple-600 text-white shadow-2xl' : 'bg-slate-800/50 group-hover:bg-slate-700'}`}>
                <btn.icon size={28}/>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 flex flex-col overflow-hidden relative p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col gap-10 overflow-y-auto custom-scrollbar animate-fade">
               <div className="max-w-6xl w-full mx-auto space-y-10 pb-24">
                  <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-right">
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة الأداء الذكي</h1>
                      <p className="text-slate-500 font-medium">نظام Al-Hout متصل وآمن بالكامل مع تليجرام.</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={async () => {
                        setIsAiLoading(true);
                        const res = await analyzeNextMonthForecast({ transactions, expenses, products, config });
                        setAiReport(res); setIsAiLoading(false);
                      }} className="btn-premium sparkle-btn h-14 px-8 text-white rounded-2xl font-black flex items-center gap-4 shadow-xl">
                         {isAiLoading ? <RefreshCw className="animate-spin" size={24}/> : <Sparkles size={24}/>} تحليل Gemini
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     {[
                       { l: 'إجمالي المبيعات', v: dailyTotal, i: TrendingUp, c: 'purple' },
                       { l: 'إجمالي الأرباح', v: dailyProfit, i: DollarSign, c: 'emerald' },
                       { l: 'المصروفات', v: dailyExpensesTotal, i: Wallet, c: 'rose' },
                       { l: 'الكاش المتوفر', v: dailyCashInHand, i: Smartphone, c: 'indigo' }
                     ].map(card => (
                       <div key={card.l} className="glass-effect p-8 premium-shadow flex flex-col gap-3 group hover:bg-white transition-all rounded-[30px]">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${card.c}-100 text-${card.c}-600`}><card.i size={30}/></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{card.l}</p>
                            <h2 className="text-2xl font-black text-slate-800">{card.v.toLocaleString()}</h2>
                          </div>
                       </div>
                     ))}
                  </div>

                  {aiReport && (
                    <div className="glass-effect p-10 premium-shadow border-2 border-purple-100 animate-fade rounded-[40px] relative overflow-hidden">
                       <h3 className="text-3xl font-black flex items-center gap-4 text-slate-800 mb-10 relative z-10"><MessageSquareCode className="text-purple-600" size={36}/> الرؤية الاستراتيجية الذكية</h3>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                          <div className="space-y-6">
                             <div className="p-8 bg-purple-600 text-white rounded-[35px] shadow-xl">
                                <p className="text-[11px] font-black mb-1 opacity-60 uppercase tracking-widest">توقع الغد</p>
                                <p className="text-xl font-bold italic leading-relaxed">"{aiReport.tomorrowForecast}"</p>
                             </div>
                             <div className="p-8 bg-slate-900 text-white rounded-[35px] border border-white/5">
                                <p className="text-[11px] font-black mb-1 text-purple-400 uppercase tracking-widest">التحليل الشهري</p>
                                <p className="text-sm opacity-80 leading-relaxed">{aiReport.monthlyOutlook}</p>
                             </div>
                          </div>
                          <div className="space-y-4">
                             {aiReport.strategicAdvices.map((adv:string, i:number) => (
                               <div key={i} className="p-5 bg-white border border-purple-50 rounded-[25px] text-sm font-bold flex items-center gap-5 shadow-sm">
                                 <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0"><Check size={20}/></div>
                                 <span className="leading-tight">{adv}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="flex-1 flex flex-col relative overflow-hidden h-full">
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="glass-effect p-2 premium-shadow max-w-2xl mx-auto w-full group">
                  <div className="relative">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={32}/>
                    <input type="text" placeholder="ابحث عن موديل..." className="w-full pr-16 pl-6 h-16 bg-transparent border-none font-bold text-xl outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-y-auto custom-scrollbar pb-36 px-2">
                  {products.filter(p => p.name.includes(searchQuery)).map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="glass-effect p-5 premium-shadow flex flex-col text-right h-[320px] group transition-all active:scale-95 rounded-[30px] border border-white/40">
                      <img src={p.image} className="w-full h-32 object-cover rounded-[20px] mb-4 group-hover:scale-105 transition-transform" />
                      <h3 className="text-base font-black text-slate-800 truncate mb-1">{p.name}</h3>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="text-purple-600 font-black text-2xl">{p.price.toLocaleString()}</span>
                        <div className="btn-touch w-12 h-12 rounded-2xl bg-purple-50 text-purple-600"><Plus size={28}/></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {cart.length > 0 && (
                <div className={`cart-drawer absolute bottom-0 left-0 right-0 glass-effect z-[60] rounded-t-[50px] border-t-2 border-purple-200 flex flex-col overflow-hidden ${isCartExpanded ? 'h-[70vh]' : 'h-24'}`}>
                  <div onClick={() => setIsCartExpanded(!isCartExpanded)} className="h-24 flex items-center justify-between px-10 cursor-pointer shrink-0">
                    <div className="flex items-center gap-6">
                      <div className="relative"><ShoppingCart size={40} className="text-purple-600" /><span className="absolute -top-3 -right-3 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-black">{cart.reduce((a,b)=>a+b.quantity, 0)}</span></div>
                      <span className="text-2xl font-black text-slate-800">{cartTotalVal.toLocaleString()} {config.currency}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowCheckoutModal(true); }} className="h-14 px-10 bg-purple-600 text-white rounded-xl font-black">إتمام البيع</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white/20">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-[30px] flex items-center gap-6 shadow-sm">
                        <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
                        <div className="flex-1"><h4 className="font-black truncate">{item.name}</h4><p className="text-purple-600 font-black">{item.price.toLocaleString()}</p></div>
                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
                          <button onClick={() => setCart(p => p.map(i => i.id === item.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0))}><Minus/></button>
                          <span className="font-black text-xl">{item.quantity}</span>
                          <button onClick={() => setCart(p => p.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))}><Plus/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="flex-1 flex flex-col gap-10 overflow-y-auto custom-scrollbar animate-fade">
              <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h1 className="text-4xl font-black">المصروفات</h1>
                <button onClick={() => setShowAddExpense(true)} className="h-16 px-10 bg-rose-600 text-white rounded-2xl font-black text-xl flex items-center gap-4 shadow-xl"><Plus/> تسجيل مصروف</button>
              </header>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {SMART_EXP_CATS.slice(0, 4).map(cat => (
                  <div key={cat.id} className="glass-effect p-6 rounded-3xl border-b-8" style={{ borderBottomColor: cat.color }}>
                    <p className="text-[11px] font-black text-slate-400">{cat.name}</p>
                    <h2 className="text-2xl font-black">{expenses.filter(e => e.categoryId === cat.id).reduce((a,b)=>a+b.amount, 0).toLocaleString()}</h2>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-white p-6 rounded-[30px] flex justify-between items-center shadow-sm">
                    <div><h4 className="font-black text-xl">{exp.title}</h4><p className="text-xs text-slate-400">{exp.timestamp.toLocaleString('ar-EG')}</p></div>
                    <span className="text-2xl font-black text-rose-500">{exp.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="flex-1 flex flex-col gap-8 overflow-y-auto animate-fade">
               <h1 className="text-4xl font-black">المخزن</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-[30px] flex gap-6 shadow-sm">
                       <img src={p.image} className="w-24 h-24 rounded-2xl object-cover"/>
                       <div className="flex-1">
                          <h4 className="font-black text-lg">{p.name}</h4>
                          <div className="mt-3 flex items-center justify-between">
                             <span className={`px-4 py-1 rounded-full text-xs font-black ${p.stock <= p.minStock ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>المخزون: {p.stock}</span>
                             <span className="text-purple-600 font-black">{p.price.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 flex flex-col gap-12 overflow-y-auto custom-scrollbar animate-fade">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">إعدادات النظام</h1>
              <div className="max-w-2xl space-y-8">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400">اسم المتجر</label>
                  <input type="text" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} className="w-full h-14 px-6 bg-white rounded-2xl font-bold border border-slate-200 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400">رقم واتساب المالك</label>
                  <input type="text" value={config.ownerPhone} onChange={e => setConfig({...config, ownerPhone: e.target.value})} className="w-full h-14 px-6 bg-white rounded-2xl font-bold border border-slate-200 outline-none text-left" dir="ltr" />
                </div>
                <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                  <h4 className="font-black text-purple-900 flex items-center gap-2"><ShieldCheck size={20}/> حالة الترخيص</h4>
                  <p className="text-sm text-purple-700">
                    نوع التفعيل: {activationChoice === 'lifetime' ? 'كاش (مدى الحياة)' : 'أقساط / اختبار'}
                  </p>
                  {activationChoice === 'installment' && (
                    <p className="text-sm text-purple-700">الوقت المتبقي: {remainingTimeLabel}</p>
                  )}
                  <p className="text-xs text-slate-400">ID: {SYSTEM_SERIAL}</p>
                </div>
                <button onClick={async () => { 
                  if (confirm("سيتم تصفير كافة البيانات، هل أنت متأكد؟")) {
                    await clearStore('products');
                    await clearStore('transactions');
                    await clearStore('expenses');
                    await clearStore('debts');
                    await clearStore('settings');
                    window.location.reload(); 
                  }
                }} className="text-rose-600 font-black">تصفير كافة البيانات (IndexedDB)</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddExpense && (
        <div className="fixed inset-0 z-[120] bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade">
           <div className="bg-white w-full max-w-2xl rounded-[60px] p-12 space-y-8 relative">
              <button onClick={() => setShowAddExpense(false)} className="absolute top-8 left-8"><X size={40}/></button>
              <h3 className="text-4xl font-black text-rose-600">تسجيل مصروف</h3>
              <div className="space-y-6">
                <input type="text" placeholder="سبب المصروف" className="w-full h-16 px-8 bg-slate-50 rounded-3xl font-black text-xl outline-none border border-slate-200" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                <input type="number" placeholder="المبلغ" className="w-full h-16 px-8 bg-slate-50 rounded-3xl font-black text-xl outline-none border border-slate-200" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                <div className="h-48 bg-slate-100 rounded-3xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                  {capturedImage ? <img src={capturedImage} className="w-full h-full object-cover" /> : <button onClick={() => setIsCameraOpen(true)} className="text-slate-400 font-black">التقاط صورة وصل</button>}
                  {isCameraOpen && (
                    <div className="absolute inset-0 bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center text-white"><CameraIcon/></button>
                    </div>
                  )}
                </div>
                <button onClick={finalizeExpense} className="w-full h-16 bg-rose-600 text-white rounded-2xl font-black text-2xl shadow-xl">حفظ السجل</button>
              </div>
           </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade">
           <div className="bg-white w-full max-w-2xl rounded-[60px] p-12 space-y-10 relative">
              <button onClick={() => setShowCheckoutModal(false)} className="absolute top-8 left-8"><X size={40}/></button>
              <h3 className="text-3xl font-black text-center">إتمام الدفع</h3>
              <div className="grid grid-cols-2 gap-8">
                 <button onClick={() => setCheckoutType('cash')} className={`p-10 rounded-[40px] border-4 flex flex-col items-center gap-4 ${checkoutType === 'cash' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-100 text-slate-400'}`}><Wallet size={48}/><span className="font-black">كاش</span></button>
                 <button onClick={() => setCheckoutType('debt')} className={`p-10 rounded-[40px] border-4 flex flex-col items-center gap-4 ${checkoutType === 'debt' ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-100 text-slate-400'}`}><UserPlus size={48}/><span className="font-black">دين</span></button>
              </div>
              <button onClick={finalizeSale} className="w-full h-20 bg-purple-600 text-white rounded-3xl font-black text-2xl shadow-xl flex items-center justify-center gap-4"><Printer/> تأكيد البيع</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;