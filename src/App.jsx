import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Wallet, 
  History, 
  PlusCircle, 
  Trash2, 
  Egg,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  Lock,
  Unlock,
  LogOut,
  ShieldCheck,
  User,
  Settings,
  Phone,
  Filter,
  ChevronRight,
  TrendingUp,
  Store,
  Calendar,
  AlertCircle,
  CreditCard,
  Target
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyBOWUydDyASpw664VN7kkkUNJUPekpTmQA",
      authDomain: "nishad-agro.firebaseapp.com",
      projectId: "nishad-agro",
      storageBucket: "nishad-agro.firebasestorage.app",
      messagingSenderId: "984825143099",
      appId: "1:984825143099:web:c48e6e399fc98ee257211e"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nishad-agro-live';

// --- Constants ---
const EGG_TYPES = ['লাল ডিম', 'সাদা ডিম', 'হাঁসের ডিম'];
const EXPENSE_TYPES = ['গাড়ির তেল খরচ', 'ড্রাইভার ও হেল্পার খরচ', 'নাস্তা খরচ', 'অন্যান্য'];

const SELL_UNITS = {
  'pis': { label: 'পিস', value: 1 },
  'hali': { label: 'হালি (৪)', value: 4 },
  'dojon': { label: 'ডজন (১২)', value: 12 },
  'case': { label: 'কেস (৩০)', value: 30 },
  'soto': { label: 'শত (১০০)', value: 100 }
};

// --- Reusable Modern Components ---

const Section = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6 ${className}`}>
    <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
      {Icon && <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600"><Icon size={18} /></div>}
      <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, error = false }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-[10px] font-black text-gray-400 uppercase px-1 tracking-widest">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <div className="relative group">
      {Icon && <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-rose-400' : 'text-gray-400 group-focus-within:text-orange-500'}`} size={16} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3 bg-gray-50 border ${error ? 'border-rose-200' : 'border-gray-200'} rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold text-gray-800 placeholder:text-gray-300 ${readOnly ? 'opacity-60 cursor-not-allowed border-gray-100' : ''}`}
      />
    </div>
  </div>
);

const MetricBox = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
    <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">{title}</span>
      {blurred ? (
        <div className="flex items-center gap-1">
          <div className="text-lg font-black text-gray-200 blur-sm select-none">৳৳৳৳</div>
          <Lock size={12} className="text-gray-300"/>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-lg font-black text-gray-900 leading-none">{value}</div>
          {subValue && <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{subValue}</div>}
        </div>
      )}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('guest'); 
  const [passwordInput, setPasswordInput] = useState('');

  const [adminPassword, setAdminPassword] = useState('665911');
  const [subAdminPassword, setSubAdminPassword] = useState('1234');
  const [rates, setRates] = useState({
    retail: { 'লাল ডিম': { pis: '', hali: '', case: '' }, 'সাদা ডিম': { pis: '', hali: '', case: '' }, 'হাঁসের ডিম': { pis: '', hali: '', case: '' } },
    wholesale: { 'লাল ডিম': '', 'সাদা ডিম': '', 'হাঁসের ডিম': '' }
  });

  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    type: 'sell',
    saleCategory: 'retail',
    eggType: 'লাল ডিম',
    unit: 'pis',
    quantity: '',
    rate: '',
    customerName: '',
    discount: '',
    paidAmount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- Auth & Initial Data ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (err) { console.error(err); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qTr = collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2');
    const unsubTr = onSnapshot(qTr, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(docs);
      setLoading(false);
    }, (err) => setLoading(false));

    const docRates = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates');
    const unsubRates = onSnapshot(docRates, (d) => { if (d.exists()) setRates(d.data()); });

    const docAuth = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubAuth = onSnapshot(docAuth, (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.subAdminPassword) setSubAdminPassword(data.subAdminPassword);
      }
    });
    return () => { unsubTr(); unsubRates(); unsubAuth(); };
  }, [user]);

  // Rate Automation
  useEffect(() => {
    if (formData.type === 'sell' && rates) {
      if (formData.saleCategory === 'wholesale') {
        setFormData(p => ({ ...p, unit: 'pis', rate: rates.wholesale?.[p.eggType] || '' }));
      } else {
        setFormData(p => ({ ...p, rate: rates.retail?.[p.eggType]?.[p.unit] || '' }));
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, formData.type, rates]);

  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let cash = 0, custDue = 0, suppDue = 0, todaySales = 0, todayProfit = 0, todayExp = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    let costs = { 'লাল ডিম': 10, 'সাদা ডিম': 9, 'হাঁসের ডিম': 12 };

    transactions.forEach(t => {
      const qInP = parseInt(t.quantityInPieces) || 0;
      const amt = parseFloat(t.amount) || 0;
      const paid = parseFloat(t.paidAmount) || 0;
      const due = parseFloat(t.dueAmount) || 0;
      const isToday = t.date === todayStr;

      if (t.type === 'buy') {
        stock[t.eggType] += qInP;
        cash -= paid;
        suppDue += due;
      } else if (t.type === 'sell') {
        stock[t.eggType] -= qInP;
        cash += paid;
        custDue += due;
        if (isToday) {
          todaySales += amt;
          todayProfit += (amt - (qInP * costs[t.eggType]));
        }
      } else if (t.type === 'expense') {
        cash -= amt;
        if (isToday) {
          todayExp += amt;
          todayProfit -= amt;
        }
      }
    });
    return { stock, cash, custDue, suppDue, todaySales, todayProfit, todayExp };
  }, [transactions]);

  const filteredHistory = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(t => {
      const dateMatch = dateFilter === 'today' ? t.date === today : true;
      const typeMatch = typeFilter === 'all' ? true : t.type === typeFilter;
      return dateMatch && typeMatch;
    });
  }, [transactions, dateFilter, typeFilter]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) setUserRole('admin');
    else if (passwordInput === subAdminPassword) setUserRole('subadmin');
    else alert('ভুল পাসওয়ার্ড!');
    setPasswordInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !user) return;
    setSubmitting(true);
    try {
      let qtyP = 0, total = 0, paid = 0, due = 0;
      if (formData.type === 'expense') {
        total = parseFloat(formData.amount || 0);
        paid = total;
      } else {
        qtyP = parseInt(formData.quantity) * (formData.type === 'sell' ? SELL_UNITS[formData.unit].value : 1);
        const sub = parseFloat(formData.quantity) * parseFloat(formData.rate);
        total = sub - parseFloat(formData.discount || 0);
        paid = formData.paidAmount === '' ? total : parseFloat(formData.paidAmount);
        due = total - paid;
      }
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2'), {
        ...formData, amount: total, paidAmount: paid, dueAmount: due, quantityInPieces: qtyP, createdAt: new Date().toISOString()
      });
      alert('সফলভাবে সেভ হয়েছে!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('সমস্যা হয়েছে!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB]">
      <div className="relative w-20 h-20">
         <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
         <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
         <div className="absolute inset-0 flex items-center justify-center text-orange-500"><Egg size={32}/></div>
      </div>
      <p className="mt-6 text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Nishad Agro Loading</p>
    </div>
  );

  return (
    <div className="app-container min-h-screen bg-[#FDFCFB] flex flex-col items-center">
      
      {/* Login Screen */}
      {userRole === 'guest' && (
        <div className="login-overlay fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-100">
               <Egg size={48} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-10">Egg Management Pro</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড লিখুন" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="w-full py-5 px-8 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-orange-500 focus:bg-white outline-none transition-all text-center text-3xl font-black tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-200"
                autoFocus
              />
              <button className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-orange-600 rounded-2xl shadow-lg shadow-orange-100 text-white">
                <Egg size={22} />
             </div>
             <div>
                <h1 className="text-lg font-black text-gray-900 leading-none">নিশাদ এগ্রো</h1>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Habbiganj, BD</p>
             </div>
          </div>
          <div className="bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100 text-right">
             <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-0.5">লাইভ ক্যাশ</p>
             <p className="text-lg font-black text-orange-600 leading-none">৳{stats.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl px-6 py-8 pb-32">
        
        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
               <MetricBox title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-emerald-50 text-emerald-600" />
               <MetricBox title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={User} colorClass="bg-rose-50 text-rose-600" />
            </div>

            {/* Stock Progress */}
            <Section title="ইনভেন্টরি রিপোর্ট" icon={Store}>
               <div className="space-y-5">
                 {EGG_TYPES.map((egg, idx) => (
                   <div key={egg} className="flex flex-col gap-2">
                     <div className="flex justify-between items-end px-1">
                        <span className="text-xs font-black text-gray-700">{egg}</span>
                        <span className="text-xs font-black text-gray-900">{stats.stock[egg]} পিস</span>
                     </div>
                     <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-gray-400' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(100, (stats.stock[egg] / 5000) * 100)}%` }}
                        ></div>
                     </div>
                   </div>
                 ))}
               </div>
            </Section>

            {/* Profit Highlight */}
            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
               <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mb-2">আজকের নিট প্রফিট</p>
                    {userRole === 'admin' ? (
                      <h2 className="text-4xl font-black tracking-tight">৳{stats.todayProfit.toLocaleString()}</h2>
                    ) : (
                      <div className="flex items-center gap-2"><span className="text-3xl font-black blur-md select-none tracking-tighter text-white/50">৳৳৳৳৳</span><Lock size={18} className="text-orange-500/50" /></div>
                    )}
                  </div>
                  <div className="text-right border-l border-white/10 pl-6">
                    <p className="text-[9px] uppercase font-black text-gray-500 mb-1 tracking-widest">মোট বিক্রি</p>
                    <p className="text-xl font-black text-orange-500">৳{stats.todaySales.toLocaleString()}</p>
                  </div>
               </div>
            </div>

            {/* Recent Ledger */}
            <div className="flex items-center justify-between px-1">
               <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><History size={14}/> সাম্প্রতিক লেনদেন</h3>
               <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest">সব দেখুন</button>
            </div>
            <div className="space-y-3">
               {transactions.slice(0, 4).map(t => (
                 <div key={t.id} className="bg-white p-4 rounded-3xl border border-gray-50 flex justify-between items-center hover:border-orange-100 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-2xl ${t.type === 'sell' ? 'bg-emerald-50 text-emerald-600' : t.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === 'sell' ? <ArrowUpCircle size={18}/> : t.type === 'buy' ? <ArrowDownCircle size={18}/> : <MinusCircle size={18}/>}
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-gray-800 leading-none mb-1">{t.customerName || t.description || t.eggType}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>{t.type === 'sell' ? '+' : '-'} ৳{t.amount}</p>
                    </div>
                 </div>
               ))}
            </div>

            <button onClick={() => setUserRole('guest')} className="w-full py-4 text-rose-500 font-black text-xs uppercase tracking-widest border-2 border-rose-50 rounded-3xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
               <LogOut size={14}/> লগআউট করুন
            </button>
          </div>
        )}

        {/* FORMS VIEW */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="animate-in slide-in-from-bottom-6 duration-500">
            <Section title={`${activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} সেকশন`} icon={Target}>
               <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ধরণ</label>
                        <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all">
                           {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                     </div>
                  </div>

                  {activeTab === 'sell' && (
                     <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-100">
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>খুচরা</button>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>পাইকারি</button>
                     </div>
                  )}

                  {activeTab !== 'expense' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                         <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                         <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">একক</label>
                            <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all disabled:opacity-50">
                               {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <ModernInput label="দর (একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} placeholder="0.00" required icon={TrendingUp} />
                         <ModernInput label={activeTab === 'sell' ? "কাস্টমার" : "মহাজন"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                      </div>

                      <div className="p-6 bg-orange-600 rounded-3xl shadow-xl shadow-orange-100 flex flex-col items-center">
                         <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">সর্বমোট বিল</p>
                         <h3 className="text-3xl font-black text-white">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</h3>
                         <div className="w-full mt-6 bg-white/10 p-4 rounded-2xl border border-white/10">
                            <ModernInput label="নগদ জমা" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব পরিশোধ" className="bg-transparent text-white" />
                         </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'expense' && (
                    <div className="space-y-4">
                       <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">খরচের খাত</label>
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all">
                             {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                             <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                       </div>
                       <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                    </div>
                  )}

                  <button disabled={submitting} className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-white ${activeTab === 'sell' ? 'bg-emerald-600 shadow-emerald-100' : activeTab === 'buy' ? 'bg-blue-600 shadow-blue-100' : 'bg-rose-600 shadow-rose-100'}`}>
                    {submitting ? 'প্রসেসিং হচ্ছে...' : 'ডাটা সেভ করুন'}
                  </button>
               </form>
            </Section>
          </div>
        )}

        {/* REGISTER VIEW */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500 space-y-4">
             <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {['all', 'sell', 'buy', 'expense'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-white text-gray-400 border-gray-100'}`}>{t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}</button>
                ))}
             </div>

             <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">লেনদেন রেজিস্টার</h3>
                   <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`p-2.5 rounded-xl border transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-gray-100'}`}><Filter size={16}/></button>
                </div>
                <div className="divide-y divide-gray-50">
                   {filteredHistory.map(t => (
                     <div key={t.id} className="p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={`w-1.5 h-10 rounded-full ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                           <div>
                              <h4 className="font-black text-gray-800 text-sm leading-none mb-1">{t.customerName || t.description || t.eggType}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-gray-900 text-sm">৳{t.amount.toLocaleString()}</p>
                           {t.dueAmount > 0 && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">বাকি ৳{t.dueAmount}</span>}
                        </div>
                     </div>
                   ))}
                   {filteredHistory.length === 0 && <div className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest">কোনো তথ্য নেই</div>}
                </div>
             </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
             <Section title="ডিমের রেট সেটিংস" icon={Settings}>
                <div className="space-y-6">
                   {EGG_TYPES.map(egg => (
                     <div key={egg} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <h4 className="text-xs font-black text-gray-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> {egg}</h4>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                           {['pis', 'hali', 'case'].map(u => (
                             <div key={u}>
                                <label className="text-[8px] font-black text-gray-400 uppercase ml-1.5 mb-1 block">{u === 'pis' ? 'পিস' : u === 'hali' ? 'হালি' : 'কেস'}</label>
                                <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="w-full p-3 rounded-2xl border border-gray-200 font-black text-center text-xs focus:border-orange-500 outline-none transition-all" placeholder="0" />
                             </div>
                           ))}
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                           <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">পাইকারি দর</span>
                           <input type="number" value={rates.wholesale[egg] || ''} onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} className="w-24 p-2 bg-purple-50 border border-purple-100 rounded-xl font-black text-center text-xs text-purple-700 outline-none" placeholder="0" />
                        </div>
                     </div>
                   ))}
                   <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সফলভাবে আপডেট হয়েছে!'); }} className="w-full py-4 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">সবগুলো সেভ করুন</button>
                </div>
             </Section>
          </div>
        )}

      </main>

      {/* Floating Bottom Nav */}
      <nav className="bottom-nav fixed bottom-6 left-6 right-6 z-[60] flex items-center justify-around bg-white/90 backdrop-blur-2xl border border-white/20 p-2.5 rounded-[2.5rem] shadow-2xl shadow-gray-200 max-w-lg mx-auto">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'buy', icon: ArrowDownCircle },
          { id: 'sell', icon: ArrowUpCircle },
          { id: 'expense', icon: Wallet },
          { id: 'history', icon: History },
          { id: 'settings', icon: Settings, admin: true }
        ].map(item => {
          if (item.admin && userRole !== 'admin') return null;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-3.5 rounded-full transition-all duration-500 relative flex items-center justify-center ${isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 -translate-y-4' : 'text-gray-400 hover:text-gray-600'}`}>
               <item.icon size={22} />
               {isActive && <div className="absolute -bottom-1.5 w-1 h-1 bg-white rounded-full"></div>}
            </button>
          )
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          min-height: 100vh !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          background: #FDFCFB !important;
          color: #111;
          place-items: initial !important;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
          height: auto;
        }
      `}</style>
    </div>
  );
}
