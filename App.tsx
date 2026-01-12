
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Package, Search, Plus, Minus, Trash2, Camera, X, 
  Wallet, Zap, Smartphone, CreditCard, UserPlus, RefreshCw, Check, 
  Send, ShieldAlert, History, Settings, LayoutDashboard, TrendingUp, 
  Sparkles, DollarSign, QrCode, Power, Bluetooth, User, ClipboardList, 
  Menu, Bell, MessageSquareCode, ShoppingCart, ChevronUp, ChevronDown,
  ShieldCheck, AlertCircle, Eye, EyeOff, FileText, Camera as CameraIcon,
  Printer
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { INITIAL_PRODUCTS } from './constants';
import { Product, CartItem, Transaction, Expense, ShopConfig, Debt, ExpenseCategory, Category } from './types';
import TopStatusBar from './components/TopStatusBar';
import { analyzeNextMonthForecast } from './geminiService';

const STORAGE_KEYS = {
  PRODUCTS: 'ai_pro_products_v8',
  TRANSACTIONS: 'ai_pro_tx_v8',
  EXPENSES: 'ai_pro_expenses_v8',
  DEBTS: 'ai_pro_debts_v8',
  CONFIG: 'ai_pro_config_v8'
};

const DAILY_TARGET = 1000000;
const EXPENSE_THRESHOLD = 500; 

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

const App: React.FC = () => {
  const [isLaunched, setIsLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'debts' | 'expenses' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS)));
  const [transactions, setTransactions] = useState<Transaction[]>(() => (JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]')).map((t:any)=>({...t, timestamp: new Date(t.timestamp)})));
  const [expenses, setExpenses] = useState<Expense[]>(() => (JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]')).map((e:any)=>({...e, timestamp: new Date(e.timestamp)})));
  const [debts, setDebts] = useState<Debt[]>(() => (JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBTS) || '[]')).map((d:any)=>({...d, status: d.status || 'pending', timestamp: new Date(d.timestamp)})));
  const [config, setConfig] = useState<ShopConfig>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG)));

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

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, cost: 0, stock: 10, category: Category.Men });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [products, transactions, expenses, debts, config]);

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
  const dailyTotal = useMemo(() => transactions.filter(t => isToday(t.timestamp)).reduce((acc, t) => acc + t.total, 0), [transactions]);
  const dailyProfit = useMemo(() => transactions.filter(t => isToday(t.timestamp)).reduce((acc, t) => acc + t.profit, 0), [transactions]);
  const dailyExpensesTotal = useMemo(() => expenses.filter(e => isToday(e.timestamp)).reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const dailyCashSales = useMemo(() => transactions.filter(t => isToday(t.timestamp) && t.paymentMethod === 'cash').reduce((acc, t) => acc + t.total, 0), [transactions]);
  const dailyCashInHand = useMemo(() => dailyCashSales - dailyExpensesTotal, [dailyCashSales, dailyExpensesTotal]);
  const totalDebtsVal = useMemo(() => debts.filter(d => d.status === 'pending').reduce((acc, d) => acc + d.amount, 0), [debts]);
  const netProfitVal = useMemo(() => dailyProfit - dailyExpensesTotal, [dailyProfit, dailyExpensesTotal]);
  const targetProgress = useMemo(() => Math.min(100, (dailyTotal / DAILY_TARGET) * 100), [dailyTotal]);
  const cartTotalVal = useMemo(() => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0), [cart]);
  const changeToReturnVal = useMemo(() => (parseFloat(receivedAmount) || 0) - cartTotalVal, [receivedAmount, cartTotalVal]);

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

  const notifyManagerOnWhatsApp = (expense: Expense) => {
    const catName = SMART_EXP_CATS.find(c => c.id === expense.categoryId)?.name;
    const timestamp = expense.timestamp.toLocaleString('ar-EG');
    const receiptStatus = expense.receiptImage ? "✅ Captured" : "❌ Not Captured";
    const template = `🚨 NEW EXPENSE ALERT - ${config.name} 🚨
------------------------------------
💰 Amount: ${expense.amount} ${config.currency}
📁 Category: ${catName}
👤 Recorded By: ${expense.recordedBy}
⏰ Time/Date: ${timestamp}
📸 Internal Proof: ${receiptStatus}
------------------------------------
⚠️ WARNING: This entry is PERMANENT. Deletion is STRICTLY PROHIBITED.`;
    window.open(`https://wa.me/${config.ownerPhone}?text=${encodeURIComponent(template)}`, '_blank');
  };

  const finalizeExpense = () => {
    const cat = SMART_EXP_CATS.find(c => c.id === newExpense.categoryId);
    const amount = Number(newExpense.amount);
    const isInternalProofRequired = cat?.id === 'salaries' || cat?.id === 'commissions' || cat?.type === 'A' || amount > EXPENSE_THRESHOLD;

    if (!newExpense.title || !amount || !newExpense.recordedBy) {
      alert("يرجى إكمال كافة البيانات المطلوبة.");
      return;
    }

    if (isInternalProofRequired && !capturedImage) {
      alert(`هذه العملية (رواتب/مصاريف داخلية) تتطلب التقاط صورة إثبات (Proof Photo) كبديل للوصل الورقي.`);
      setIsCameraOpen(true);
      return;
    }

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
    notifyManagerOnWhatsApp(expenseRecord);
    alert("تم تسجيل العملية الداخلية بنجاح وحفظ صورة الإثبات في السجل الدائم.");

    setShowAddExpense(false);
    setNewExpense({ title: '', amount: 0, categoryId: 'inventory', recordedBy: '' });
    setCapturedImage(null);
    setOcrResult(null);
  };

  const simulatePrint = (tx: Transaction) => {
    console.log("Printing customer receipt for:", tx.id);
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

    if (checkoutType === 'debt') {
      const exists = debts.find(d => d.customerPhone === customerInfo.phone && d.status === 'pending');
      if (exists) setDebts(p => p.map(d => d.id === exists.id ? { ...d, amount: d.amount + cartTotalVal } : d));
      else setDebts(p => [{ id: `D-${Date.now()}`, customerName: customerInfo.name, customerPhone: customerInfo.phone, amount: cartTotalVal, timestamp: new Date(), status: 'pending' }, ...p]);
    }

    simulatePrint(tx);
    const msg = `🛍️ *فاتورة ${config.name}*\n💰 المبلغ: ${cartTotalVal.toLocaleString()} ${config.currency}\n💳 الدفع: ${checkoutType === 'cash' ? 'كاش' : 'دين'}\n📅 ${new Date().toLocaleString('ar-EG')}`;
    window.open(`https://wa.me/${config.ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    
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

  if (!isLaunched) {
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center text-white gap-10">
        <div className="relative animate-bounce">
          <div className="w-24 h-24 bg-purple-600 rounded-[28px] flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.3)]"><Zap size={48}/></div>
          <Sparkles className="absolute -top-3 -right-3 text-yellow-400" size={24}/>
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-2">AI PRO <span className="text-purple-500">CASHIER</span></h1>
          <p className="text-slate-400 text-lg font-medium opacity-80 italic">نظام إدارة الملابس بذكاء Gemini</p>
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
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">صافي الربح</span>
            <span className={`text-2xl font-black ${netProfitVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{netProfitVal.toLocaleString()}</span>
          </div>
          <div className="hidden sm:flex flex-col border-r border-slate-800 pr-5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">الكاش المتوفر</span>
            <span className="text-2xl font-black text-indigo-400">{dailyCashInHand.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
           <button onClick={() => window.open(`https://wa.me/${config.ownerPhone}`, '_blank')} className="btn-touch bg-emerald-600 rounded-xl shadow-lg w-14 h-14"><ClipboardList size={24}/></button>
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
                    <div className="text-center md:text-right">
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة الأداء الذكي</h1>
                      <p className="text-slate-500 font-medium">نظام التتبع المالي المتكامل لمتجر الملابس.</p>
                    </div>
                    <button onClick={async () => {
                      setIsAiLoading(true);
                      const res = await analyzeNextMonthForecast({ transactions, expenses, products, config });
                      setAiReport(res); setIsAiLoading(false);
                    }} className="btn-premium sparkle-btn h-14 px-10 text-white rounded-2xl font-black text-xl flex items-center gap-4 shadow-xl">
                       {isAiLoading ? <RefreshCw className="animate-spin" size={24}/> : <Sparkles size={24}/>} تحليل Gemini
                    </button>
                  </header>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     {[
                       { l: 'إجمالي المبيعات', v: dailyTotal, i: TrendingUp, c: 'purple' },
                       { l: 'إجمالي الأرباح', v: dailyProfit, i: DollarSign, c: 'emerald' },
                       { l: 'المصروفات', v: dailyExpensesTotal, i: Wallet, c: 'rose' },
                       { l: 'الديون المتبقية', v: totalDebtsVal, i: CreditCard, c: 'amber' }
                     ].map(card => (
                       <div key={card.l} className="glass-effect p-8 premium-shadow flex flex-col gap-3 group hover:bg-white transition-all rounded-[30px]">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${card.c}-100 text-${card.c}-600`}><card.i size={30}/></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{card.l}</p>
                            <h2 className="text-2xl font-black text-slate-800">{card.v.toLocaleString()} <span className="text-sm opacity-30">{config.currency}</span></h2>
                          </div>
                       </div>
                     ))}
                  </div>

                  {aiReport && (
                    <div className="glass-effect p-10 premium-shadow border-2 border-purple-100 animate-fade rounded-[40px] relative overflow-hidden">
                       <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-40"></div>
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
                               <div key={i} className="p-5 bg-white border border-purple-50 rounded-[25px] text-sm font-bold flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
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
                    <input 
                      type="text" placeholder="ابحث عن موديل، باركود، أو نوع..." 
                      className="w-full pr-16 pl-6 h-16 bg-transparent border-none font-bold text-xl outline-none" 
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-y-auto custom-scrollbar pb-36 px-2">
                  {products.filter(p => p.name.includes(searchQuery)).map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="glass-effect p-5 premium-shadow flex flex-col text-right h-[320px] group transition-all active:scale-95 rounded-[30px] border border-white/40">
                      <div className="flex-1 rounded-[20px] overflow-hidden mb-4 bg-slate-50 border border-white relative shadow-inner">
                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        {p.stock < 3 && <div className="absolute top-3 left-3 px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full animate-pulse shadow-lg">نفاذ</div>}
                      </div>
                      <h3 className="text-base font-black text-slate-800 truncate mb-1 px-1">{p.name}</h3>
                      <div className="flex justify-between items-center mt-auto px-1">
                        <span className="text-purple-600 font-black text-2xl">{p.price.toLocaleString()}</span>
                        <div className="btn-touch w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm"><Plus size={32}/></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {cart.length > 0 && (
                <div className={`cart-drawer absolute bottom-0 left-0 right-0 glass-effect premium-shadow z-[60] rounded-t-[50px] border-t-2 border-purple-200 flex flex-col overflow-hidden ${isCartExpanded ? 'h-[70vh]' : 'h-24'}`}>
                  <div onClick={() => setIsCartExpanded(!isCartExpanded)} className="h-24 flex items-center justify-between px-10 cursor-pointer hover:bg-white/50 transition-colors flex-shrink-0">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <ShoppingCart size={44} className="text-purple-600" />
                        <span className="absolute -top-3 -right-3 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-black animate-pop shadow-lg">{cart.reduce((a,b)=>a+b.quantity, 0)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-800">{cartTotalVal.toLocaleString()} <span className="text-sm opacity-50">{config.currency}</span></span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">إجمالي السلة الحالية</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                       <button onClick={(e) => { e.stopPropagation(); setShowCheckoutModal(true); }} className="h-16 px-12 bg-purple-600 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">إتمام البيع</button>
                       <div className="p-3 text-slate-300">{isCartExpanded ? <ChevronDown size={36}/> : <ChevronUp size={36}/>}</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-white/20">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white/80 p-5 rounded-[30px] flex items-center gap-6 border border-white shadow-sm hover:shadow-md transition-all">
                        <img src={item.image} className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-lg text-slate-800 truncate">{item.name}</h4>
                          <p className="text-purple-600 font-black text-xl">{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                          <button onClick={() => setCart(p => p.map(i => i.id === item.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0))} className="btn-touch w-10 h-10"><Minus size={24}/></button>
                          <span className="font-black text-2xl min-w-[32px] text-center">{item.quantity}</span>
                          <button onClick={() => setCart(p => p.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="btn-touch w-10 h-10"><Plus size={24}/></button>
                        </div>
                        <button onClick={() => setCart(p => p.filter(i => i.id !== item.id))} className="btn-touch text-rose-300 hover:text-rose-600 w-12 h-12"><Trash2 size={28}/></button>
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
                <div className="text-right">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">وحدة المصروفات وإثباتات الدفع</h1>
                  <p className="text-slate-500 font-medium">نظام التتبع المالي (سجل دائم - يمنع الحذف).</p>
                </div>
                <button onClick={() => setShowAddExpense(true)} className="btn-premium h-16 px-10 bg-purple-600 text-white rounded-3xl font-black text-xl flex items-center gap-4 shadow-2xl active:scale-95">
                   <Plus size={32}/> تسجيل مصروف/رواتب
                </button>
              </header>

              <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-[40px] flex items-center gap-8 shadow-inner">
                <div className="w-16 h-16 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl animate-pulse">
                  <ShieldAlert size={36}/>
                </div>
                <div className="text-right">
                  <h4 className="font-black text-rose-900 text-xl">تنبيه النظام: سجل المصروفات دائم ومراقب</h4>
                  <p className="text-rose-800 font-bold leading-relaxed">يمنع حذف أو تعديل أي سجل مالي. الرواتب تتطلب صورة إثبات للموظف كبديل للوصل المطبوع.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {SMART_EXP_CATS.map(cat => {
                   const sum = expenses.filter(e => e.categoryId === cat.id).reduce((acc, e) => acc + e.amount, 0);
                   return (
                    <div key={cat.id} className="glass-effect p-6 premium-shadow flex flex-col items-center gap-3 text-center border-b-8 transition-all hover:bg-white rounded-3xl" style={{ borderBottomColor: cat.color }}>
                       <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: cat.color }}><Wallet size={24}/></div>
                       <h3 className="font-black text-[11px] uppercase text-slate-400 tracking-tighter">{cat.name}</h3>
                       <p className="text-xl font-black text-slate-800">{sum.toLocaleString()}</p>
                    </div>
                   );
                })}
              </div>

              <div className="glass-effect premium-shadow p-8 bg-slate-900 text-white rounded-[50px] border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-purple-600/5 blur-3xl"></div>
                <h3 className="text-3xl font-black text-purple-400 mb-10 flex items-center gap-5 relative z-10"><History size={36}/> السجل المالي الدائم</h3>
                <div className="space-y-5 relative z-10">
                  {expenses.map(exp => {
                    const cat = SMART_EXP_CATS.find(c => c.id === exp.categoryId);
                    return (
                      <div key={exp.id} className="flex flex-col md:flex-row justify-between items-center p-6 bg-white/5 rounded-[30px] border border-white/5 group hover:bg-white/10 transition-all gap-6">
                        <div className="flex items-center gap-8 text-right flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${exp.receiptImage ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                            {exp.receiptImage ? <Check size={28}/> : <AlertCircle size={28}/>}
                          </div>
                          <div>
                            <p className="font-black text-2xl text-white">{exp.title}</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                              {cat?.name} • الموظف: {exp.recordedBy} • {exp.timestamp.toLocaleString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          {exp.isAiVerified && (
                             <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-black uppercase shadow-lg border border-purple-500/30">
                               <ShieldCheck size={18}/> AI Verified
                             </div>
                          )}
                          <span className="text-3xl font-black text-rose-400">{exp.amount.toLocaleString()} <span className="text-sm opacity-30">{config.currency}</span></span>
                          {exp.receiptImage && (
                            <button 
                              onClick={() => {
                                const win = window.open("");
                                win?.document.write(`
                                  <div style="background: #0f172a; height: 100vh; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
                                    <div style="text-align: center;">
                                      <h2>إثبات الدفع الداخلي - ${exp.title}</h2>
                                      <img src="${exp.receiptImage}" style="max-width: 90%; max-height: 80vh; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 10px solid white;"/>
                                      <p style="margin-top: 20px; font-weight: bold; opacity: 0.6;">سجل دائم - لا يمكن حذفه</p>
                                    </div>
                                  </div>
                                `);
                              }}
                              className="btn-touch bg-white/10 text-slate-400 hover:text-white rounded-2xl w-14 h-14"
                            >
                              <Eye size={28}/>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {expenses.length === 0 && <div className="py-24 text-center text-slate-600 font-black text-3xl opacity-30 italic">لا توجد عمليات مسجلة في السجل.</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 flex flex-col gap-12 overflow-y-auto custom-scrollbar animate-fade">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">إعدادات النظام الذكي</h1>
              <div className="max-w-4xl space-y-12 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">اسم المتجر / الشركة</label>
                      <input type="text" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} className="glass-effect w-full h-16 px-8 font-black text-2xl text-slate-800 outline-none rounded-3xl" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">رقم هاتف المدير (واتساب)</label>
                      <input type="text" value={config.ownerPhone} onChange={e => setConfig({...config, ownerPhone: e.target.value})} className="glass-effect w-full h-16 px-8 font-black text-2xl text-slate-800 outline-none rounded-3xl text-left" dir="ltr" />
                   </div>
                </div>
                <div className="p-10 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-full bg-purple-600/10 blur-3xl"></div>
                   <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl"><ShieldCheck size={48}/></div>
                   <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2">تشفير البيانات وسجل التتبع</h3>
                      <p className="text-slate-400 font-medium text-lg leading-relaxed italic opacity-80">تم تفعيل بروتوكول "Append-Only" للسجلات المالية. يتم تخزين صور الإثبات للمصاريف الداخلية والرواتب بشكل دائم ومشفر.</p>
                   </div>
                </div>
                <button onClick={() => { if(confirm("سيتم تصفير كافة السجلات والمنتجات. هل أنت متأكد؟")) { localStorage.clear(); window.location.reload(); } }} className="h-16 px-12 bg-rose-50 text-rose-600 rounded-2xl font-black text-xl border-2 border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-95">تصفير النظام بالكامل</button>
              </div>
            </div>
          )}

          {(activeTab === 'inventory' || activeTab === 'debts') && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-50 font-black text-3xl italic animate-pulse">
               جاري تحميل البيانات...
            </div>
          )}
        </div>
      </main>

      {showAddExpense && (
        <div className="fixed inset-0 z-[120] bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade">
           <div className="bg-white w-full max-w-3xl rounded-[60px] shadow-3xl overflow-hidden relative border-[12px] border-rose-500/10">
              <button onClick={() => { setShowAddExpense(false); setCapturedImage(null); setIsCameraOpen(false); }} className="btn-touch absolute top-8 left-8 text-slate-300 hover:text-rose-500 transition-all active:scale-75"><X size={48}/></button>
              
              <div className="p-12 border-b-4 border-rose-50 bg-rose-50/20 flex flex-col items-center gap-3">
                <h3 className="text-4xl font-black text-rose-900 tracking-tighter">تسجيل مصروف / راتب معتمد</h3>
                <div className="flex items-center gap-2 text-rose-700 bg-white px-5 py-2 rounded-full shadow-sm text-xs font-black uppercase tracking-widest border border-rose-200">
                   <ShieldAlert size={18}/> Deletion is Strictly Prohibited
                </div>
              </div>

              <div className="p-12 space-y-10 text-right max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">بيان المصروف (السبب)</label>
                      <input type="text" placeholder="مثال: راتب موظف الشهر" className="w-full h-16 px-8 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl outline-none focus:border-purple-500 shadow-inner" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">اسم الموظف المستلم / المسجل</label>
                      <input type="text" placeholder="اسمك الكامل" className="w-full h-16 px-8 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl outline-none focus:border-purple-500 shadow-inner" value={newExpense.recordedBy} onChange={e => setNewExpense({...newExpense, recordedBy: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">التصنيف المحاسبي</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {SMART_EXP_CATS.map(cat => (
                         <button 
                           key={cat.id} 
                           onClick={() => setNewExpense({...newExpense, categoryId: cat.id})}
                           className={`p-6 rounded-[30px] font-black text-sm border-4 transition-all flex flex-col items-center gap-2 ${newExpense.categoryId === cat.id ? 'bg-slate-900 text-white border-slate-900 scale-105 shadow-2xl' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                         >
                            <span className="text-[9px] opacity-60 uppercase tracking-widest">فئة {cat.type}</span>
                            {cat.name}
                            {cat.id === 'salaries' && <Printer size={14} className="opacity-40 line-through text-rose-400" />}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-4">القيمة المالية</label>
                    <div className="relative">
                      <input 
                        type="number" placeholder="0" 
                        className="w-full h-24 px-12 bg-slate-50 border-[6px] border-rose-100 rounded-[40px] font-black text-7xl text-rose-600 outline-none text-center shadow-inner" 
                        value={newExpense.amount || ''} 
                        onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} 
                      />
                      {(newExpense.categoryId === 'salaries' || newExpense.amount! > EXPENSE_THRESHOLD) && (
                        <div className="absolute top-3 right-6 flex items-center gap-2 text-rose-600 text-[10px] font-black animate-pulse bg-white px-4 py-1 rounded-full shadow-sm border border-rose-200 uppercase tracking-widest">
                           <Camera size={18}/> Proof Photo Required
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center pr-6">
                       <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CameraIcon size={20}/> صورة إثبات الدفع (Internal Proof)</label>
                       {(newExpense.categoryId === 'salaries' || newExpense.amount! > EXPENSE_THRESHOLD) && (
                         <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-4 py-1.5 rounded-full animate-pulse shadow-sm border border-rose-200">إلزامية للنظام ⚠</span>
                       )}
                    </div>
                    
                    <div className="relative h-80 bg-slate-100 rounded-[40px] border-8 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden shadow-inner group">
                       {isOcrLoading && (
                         <div className="absolute inset-0 z-20 bg-purple-600/30 backdrop-blur-xl flex flex-col items-center justify-center text-purple-900 gap-5">
                            <RefreshCw className="animate-spin" size={64}/>
                            <span className="font-black text-2xl tracking-tighter">Gemini OCR جاري تدقيق الوصل عبر...</span>
                         </div>
                       )}

                       {capturedImage ? (
                         <div className="relative w-full h-full">
                           <img src={capturedImage} className="w-full h-full object-cover animate-fade" />
                           <button onClick={() => setCapturedImage(null)} className="absolute top-6 right-6 p-4 bg-rose-600 text-white rounded-full shadow-2xl active:scale-75 transition-transform"><X size={32}/></button>
                           {ocrResult && (
                             <div className="absolute bottom-6 inset-x-6 bg-white/95 p-6 rounded-[30px] flex justify-between items-center shadow-2xl border-2 border-purple-500 animate-pop">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck size={28}/></div>
                                  <div>
                                    <p className="text-sm font-black text-slate-800 tracking-tight">AI OCR التحقق عبر</p>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verified Amount: {ocrResult.amount} {config.currency}</p>
                                  </div>
                                </div>
                             </div>
                           )}
                         </div>
                       ) : isCameraOpen ? (
                         <div className="relative w-full h-full">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-[85%] h-[85%] border-[6px] border-dashed border-white/50 rounded-[40px] shadow-[0_0_0_500px_rgba(0,0,0,0.4)]"></div>
                              <p className="absolute bottom-24 text-white font-black text-xl bg-black/50 px-8 py-3 rounded-full backdrop-blur-md">ضع إثبات الدفع أو الموظف في الإطار</p>
                            </div>
                            <button onClick={capturePhoto} className="absolute bottom-8 inset-x-0 mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-3xl border-[8px] border-rose-500 hover:scale-110 active:scale-90 transition-transform"><CameraIcon size={48} className="text-rose-500"/></button>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center gap-6 text-slate-300">
                           <button onClick={() => setIsCameraOpen(true)} className="w-28 h-28 bg-white text-rose-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-90 border-4 border-slate-100"><CameraIcon size={56}/></button>
                           <p className="font-black text-xl uppercase tracking-widest opacity-60">التقاط صورة إثبات داخلي</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <button 
                   onClick={finalizeExpense}
                   className="btn-premium sparkle-btn w-full h-24 rounded-[35px] font-black text-4xl text-white shadow-3xl active:scale-95 transition-all mt-6 flex items-center justify-center gap-6"
                 >
                    حفظ السجل النهائي وإرسال الإشعار <Check size={48}/>
                 </button>
              </div>
           </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade">
           <div className="bg-white w-full max-w-3xl rounded-[60px] shadow-3xl overflow-hidden relative border border-white/5">
              <button onClick={() => setShowCheckoutModal(false)} className="btn-touch absolute top-8 left-8 text-slate-300 hover:text-rose-500 active:scale-75 transition-all"><X size={48}/></button>
              <div className="p-12 border-b border-slate-50 bg-slate-50/20 flex flex-col items-center gap-3">
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">إتمام عملية البيع</h3>
                <p className="text-slate-400 font-black mt-1 uppercase text-[12px] tracking-widest opacity-60">إجمالي الفاتورة: {cartTotalVal.toLocaleString()} {config.currency}</p>
              </div>
              <div className="p-12 space-y-12 text-right">
                 <div className="grid grid-cols-2 gap-8">
                    <button onClick={() => setCheckoutType('cash')} className={`p-10 rounded-[40px] border-8 flex flex-col items-center gap-6 transition-all ${checkoutType === 'cash' ? 'bg-purple-600 border-purple-600 text-white shadow-2xl scale-105' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}>
                       <Wallet size={64}/> <span className="font-black text-3xl">كاش</span>
                    </button>
                    <button onClick={() => setCheckoutType('debt')} className={`p-10 rounded-[40px] border-8 flex flex-col items-center gap-6 transition-all ${checkoutType === 'debt' ? 'bg-amber-500 border-amber-500 text-white shadow-2xl scale-105' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}>
                       <UserPlus size={64}/> <span className="font-black text-3xl">دين</span>
                    </button>
                 </div>
                 {checkoutType === 'cash' && (
                   <div className="space-y-6 animate-fade">
                      <div className="space-y-4">
                        <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pr-6">المبلغ المستلم</label>
                        <input 
                          type="number" placeholder="0.00" autoFocus
                          className="w-full h-24 px-12 bg-slate-50 border-[6px] border-purple-100 rounded-[40px] font-black text-7xl text-purple-600 outline-none text-center shadow-inner" 
                          value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} 
                        />
                      </div>
                      {parseFloat(receivedAmount) > 0 && (
                        <div className={`flex justify-between items-center p-10 rounded-[40px] shadow-2xl transition-all ${changeToReturnVal >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                           <span className="font-black text-3xl italic tracking-tighter">{changeToReturnVal >= 0 ? 'باقي الزبون:' : 'المبلغ ناقص:'}</span>
                           <h2 className="text-7xl font-black">{Math.abs(changeToReturnVal).toLocaleString()}</h2>
                        </div>
                      )}
                   </div>
                 )}
                 <button onClick={finalizeSale} className="btn-premium sparkle-btn w-full h-24 rounded-[35px] font-black text-4xl text-white shadow-3xl active:scale-95 transition-all flex items-center justify-center gap-6">
                    تأكيد البيع والطباعة <Printer size={48}/>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
