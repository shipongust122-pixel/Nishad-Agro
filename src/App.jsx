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
  CreditCard
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

// --- Modern Components ---

const SectionCard = ({ title, children, icon: Icon, action }) => (
  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-6">
    {(title || Icon) && (
      <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-orange-500" />}
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">{title}</h3>
        </div>
        {action && action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 w-full mb-4">
    {label && <label className="text-xs font-bold text-gray-500 uppercase px-1 tracking-widest">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`w-full ${Icon ? 'pl-12' : 'px-4'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white outline-none transition-all text-gray-800 font-semibold ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative group hover:shadow-md transition-all">
    <div className="flex flex-col items-center text-center">
      <div className={`p-3 rounded-2xl mb-3 ${colorClass}`}>
        <Icon size={22} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      {blurred ? (
        <div className="flex items-center gap-1">
          <div className="text-xl font-black text-gray-200 blur-sm select-none">৳৳৳৳</div>
          <Lock size={12} className="text-gray-300"/>
        </div>
      ) : (
        <>
          <div className="text-lg font-black text-gray-900 leading-tight">{value}</div>
          {subValue && <div className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase">{subValue}</div>}
        </>
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
      alert('এন্ট্রি সফল হয়েছে!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('সমস্যা হয়েছে!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB]">
      <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4"></div>
      <p className="text-orange-500 font-black tracking-widest uppercase text-xs">নিশাদ এগ্রো...</p>
    </div>
  );

  return (
    <div className="app-container min-h-screen bg-[#FDFCFB]">
      
      {/* Login Overlay */}
      {userRole === 'guest' && (
        <div className="login-overlay">
          <div className="login-card">
            <div className="icon-box"><Egg size={40} /></div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">ম্যানেজমেন্ট সিস্টেম</p>
            <form onSubmit={handleLogin} className="w-full mt-8 space-y-4">
              <input type="password" placeholder="পাসওয়ার্ড" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="login-input" autoFocus />
              <button className="login-btn">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="main-header sticky top-0 z-50">
        <div className="container-inner flex justify-between items-center px-5">
          <div className="flex items-center gap-3">
            <div className="header-icon bg-orange-600 shadow-xl shadow-orange-200">
              <Egg size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none text-gray-900">নিশাদ এগ্রো</h1>
              <p className="text-[10px] font-bold uppercase mt-1 text-gray-400 flex items-center gap-1 tracking-tighter">
                <Phone size={10} /> 01979665911
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">ক্যাশ বক্স</p>
            <p className="text-lg font-black text-orange-600">৳{stats.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="container-inner px-5 py-6 pb-36">
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-3 mb-8">
              <MetricCard title="লাল ডিম" value={stats.stock['লাল ডিম']} subValue="পিস" icon={Egg} colorClass="bg-red-50 text-red-500" />
              <MetricCard title="সাদা ডিম" value={stats.stock['সাদা ডিম']} subValue="পিস" icon={Egg} colorClass="bg-gray-100 text-gray-500" />
              <MetricCard title="হাঁসের ডিম" value={stats.stock['হাঁসের ডিম']} subValue="পিস" icon={Egg} colorClass="bg-blue-50 text-blue-500" />
            </div>

            <SectionCard title="আর্থিক হিসাব" icon={CreditCard}>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">মার্কেট পাবে</p>
                    <p className="text-xl font-black text-emerald-700">৳{stats.custDue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">মহাজন পাবে</p>
                    <p className="text-xl font-black text-rose-700">৳{stats.suppDue.toLocaleString()}</p>
                  </div>
               </div>
               
               <div className="profit-banner">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">আজকের নেট লাভ/লস</p>
                    {userRole === 'admin' ? (
                      <h2 className="text-3xl font-black">৳{stats.todayProfit.toLocaleString()}</h2>
                    ) : (
                      <div className="flex items-center gap-2"><span className="text-2xl font-black blur-md select-none tracking-tighter">৳৳৳৳৳</span><Lock size={16} className="opacity-50" /></div>
                    )}
                  </div>
                  <div className="text-right border-l border-white/20 pl-5">
                    <p className="text-[9px] uppercase font-bold opacity-60 mb-0.5 tracking-tighter">আজকের বিক্রি</p>
                    <p className="text-lg font-black">৳{stats.todaySales.toLocaleString()}</p>
                  </div>
               </div>
            </SectionCard>

            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <History size={14} /> সাম্প্রতিক লেনদেন
              </h3>
              <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b border-orange-100">সব দেখুন</button>
            </div>
            
            <div className="space-y-3">
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="transaction-item group">
                  <div className="flex items-center gap-4">
                    <div className={`t-icon ${t.type} rounded-2xl p-3`}>
                      {t.type === 'sell' ? <ArrowUpCircle size={20}/> : t.type === 'buy' ? <ArrowDownCircle size={20}/> : <MinusCircle size={20}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-tight">{t.customerName || t.description || t.eggType}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">
                        {t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date}
                        {t.dueAmount > 0 && <span className="text-rose-500 ml-1.5 font-black">• বাকি ৳{t.dueAmount}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className={`font-black text-[15px] ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>
                       {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                     </p>
                     <ChevronRight size={14} className="text-gray-200 ml-auto mt-1 group-hover:text-orange-300 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMS */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <SectionCard>
               <div className="flex flex-col items-center mb-8 text-center pt-2">
                  <div className={`p-4 rounded-3xl mb-4 shadow-xl ${activeTab === 'sell' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : activeTab === 'buy' ? 'bg-blue-50 text-blue-600 shadow-blue-100' : 'bg-rose-50 text-rose-600 shadow-rose-100'}`}>
                    {activeTab === 'sell' ? <ShoppingCart size={32}/> : activeTab === 'buy' ? <PlusCircle size={32}/> : <Wallet size={32}/>}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} এন্ট্রি
                  </h2>
               </div>

               <form onSubmit={handleSubmit} className="space-y-2">
                 <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                 
                 {activeTab !== 'expense' && (
                   <>
                     <div className="grid grid-cols-2 gap-4">
                       <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                       <ModernInput label="দর (প্রতি একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} placeholder="0.00" required icon={TrendingUp} />
                     </div>

                     {activeTab === 'sell' && (
                        <div className="flex bg-gray-100/50 p-1.5 rounded-2xl mb-4 border border-gray-100">
                          <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400'}`}>খুচরা</button>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400'}`}>পাইকারি</button>
                        </div>
                     )}

                     <div className="grid grid-cols-2 gap-4">
                       <ModernInput label="ডিমের ধরণ" value={formData.eggType} readOnly className="hidden" />
                       <div className="flex flex-col gap-1.5 mb-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ডিমের ধরণ</label>
                          <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all">
                             {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                       </div>
                       <div className="flex flex-col gap-1.5 mb-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">একক</label>
                          <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all disabled:opacity-50">
                             {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                       </div>
                     </div>

                     <ModernInput label={activeTab === 'sell' ? "কাস্টমারের নাম" : "মহাজন/পাইকারের নাম"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম লিখুন..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                     
                     <div className="p-5 bg-orange-50/50 rounded-3xl border border-dashed border-orange-200 mb-6 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">সর্বমোট বিল</p>
                          <p className="text-2xl font-black text-gray-800">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</p>
                        </div>
                        <div className="w-1/2">
                          <ModernInput label="নগদ জমা" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব পরিশোধ" className="mb-0" />
                        </div>
                     </div>
                   </>
                 )}

                 {activeTab === 'expense' && (
                   <>
                     <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">খরচের খাত</label>
                        <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none transition-all">
                           {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                           <option value="অন্যান্য">অন্যান্য</option>
                        </select>
                     </div>
                     <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                   </>
                 )}

                 <button disabled={submitting} className={`submit-btn ${activeTab} py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4`}>
                   {submitting ? 'প্রসেসিং হচ্ছে...' : 'সেভ করুন'}
                 </button>
               </form>
            </SectionCard>
          </div>
        )}

        {/* REGISTER/HISTORY */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
              {['all', 'sell', 'buy', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-orange-600 text-white border-orange-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'}`}>
                  {t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}
                </button>
              ))}
            </div>

            <SectionCard title="লেনদেন রেজিস্টার" icon={History} action={
              <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`p-2 rounded-xl border transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white border-gray-100 text-gray-400'}`}>
                <Filter size={16}/>
              </button>
            }>
              <div className="divide-y divide-gray-50 -mx-6">
                {filteredHistory.length > 0 ? filteredHistory.map(t => (
                  <div key={t.id} className="px-6 py-5 hover:bg-gray-50/50 transition-all flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-8 rounded-full ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                      <div>
                        <h4 className="font-black text-sm text-gray-900 leading-none mb-1.5">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-sm">৳{t.amount.toLocaleString()}</p>
                      {t.dueAmount > 0 && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tighter">বাকি ৳{t.dueAmount}</span>}
                    </div>
                  </div>
                )) : <div className="p-20 text-center text-gray-300 font-bold uppercase tracking-[0.2em] text-xs">কোনো তথ্য নেই</div>}
              </div>
            </SectionCard>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <SectionCard title="রেট সেটিংস" icon={Settings}>
               <div className="space-y-6">
                {EGG_TYPES.map(egg => (
                  <div key={egg} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <h3 className="font-black text-xs text-gray-700 mb-4 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div> {egg}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['pis', 'hali', 'case'].map(u => (
                        <div key={u}>
                          <label className="text-[9px] font-black uppercase opacity-40 ml-1.5 mb-1.5 block tracking-widest">{u}</label>
                          <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="w-full p-3.5 rounded-2xl border border-gray-200 font-black text-center text-sm focus:border-orange-500 outline-none transition-all" placeholder="0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সেভ হয়েছে!'); }} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4">সবগুলো সেভ করুন</button>
               </div>
            </SectionCard>
            <button onClick={() => { setUserRole('guest'); setActiveTab('dashboard'); }} className="w-full py-5 text-rose-600 font-black border-2 border-rose-50 bg-rose-50/20 rounded-3xl flex items-center justify-center gap-3 hover:bg-rose-50 transition-colors">
              <LogOut size={20}/> লগআউট করুন
            </button>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="bottom-nav">
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
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={22} />
              {isActive && <span className="absolute -bottom-1.5 w-1 h-1 bg-orange-600 rounded-full"></span>}
            </button>
          )
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        html, body, #root { width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; display: block !important; background: #FDFCFB !important; text-align: left !important; place-items: initial !important; }
        .app-container { width: 100%; display: flex; flex-direction: column; align-items: center; }
        .container-inner { width: 100%; max-width: 550px; margin: 0 auto !important; }
        .main-header { width: 100%; background: rgba(255,255,255,0.85); backdrop-filter: blur(16px); border-b: 1px solid #f3f3f3; padding: 1.25rem 0; }
        .header-icon { padding: 0.6rem; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; }
        .profit-banner { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 1.75rem; border-radius: 2rem; box-shadow: 0 20px 25px -5px rgba(234, 88, 12, 0.2); display: flex; justify-content: space-between; align-items: center; }
        .transaction-item { background: white; padding: 1.25rem; border-radius: 1.75rem; border: 1px solid #f8f8f8; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.01); }
        .t-icon.sell { background: #f0fdf4; color: #10b981; }
        .t-icon.buy { background: #eff6ff; color: #3b82f6; }
        .t-icon.expense { background: #fef2f2; color: #ef4444; }
        .login-overlay { position: fixed; inset: 0; z-index: 100; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-card { text-align: center; width: 100%; max-width: 320px; }
        .login-card .icon-box { background: #fff7ed; color: #ea580c; width: 90px; height: 90px; border-radius: 2.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.1); }
        .login-input { width: 100%; padding: 1.25rem; background: #f9fafb; border: 2px solid #f3f4f6; border-radius: 1.5rem; text-align: center; font-size: 1.5rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; }
        .login-btn { width: 100%; padding: 1.25rem; background: #ea580c; color: white; font-weight: 900; border: none; border-radius: 1.5rem; cursor: pointer; }
        .bottom-nav { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); width: calc(100% - 2.5rem); max-width: 450px; background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.2); padding: 0.8rem; border-radius: 2.5rem; display: flex; justify-content: space-around; box-shadow: 0 15px 35px rgba(0,0,0,0.1); z-index: 60; }
        .nav-item { border: none; background: none; color: #cbd5e1; padding: 0.8rem; border-radius: 1.5rem; cursor: pointer; position: relative; transition: all 0.3s; }
        .nav-item.active { color: #ea580c; background: #fff7ed; transform: translateY(-8px); }
        .submit-btn { width: 100%; font-weight: 900; color: white; border: none; cursor: pointer; }
        .submit-btn.sell { background: #10b981; }
        .submit-btn.buy { background: #3b82f6; }
        .submit-btn.expense { background: #ef4444; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
