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
  AlertCircle
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

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, className = "" }) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-600 px-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 outline-none transition-all text-gray-800 font-medium ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-100' : ''}`}
      />
    </div>
  </div>
);

const ModernSelect = ({ label, value, onChange, options, disabled = false, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-semibold text-gray-600 px-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" size={18} />}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 appearance-none outline-none transition-all text-gray-800 font-medium ${disabled ? 'bg-gray-50 text-gray-400 border-gray-100' : ''}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 group-hover:scale-110 transition-transform ${colorClass.split(' ')[0]}`}></div>
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2.5 rounded-2xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-none">{title}</span>
    </div>
    {blurred ? (
      <div className="flex items-center gap-2">
        <div className="text-2xl font-black text-gray-200 blur-md select-none">৳৳৳৳</div>
        <Lock size={14} className="text-gray-300"/>
      </div>
    ) : (
      <div>
        <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
        {subValue && <div className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">{subValue}</div>}
      </div>
    )}
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
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
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
        ...formData,
        amount: total,
        paidAmount: paid,
        dueAmount: due,
        quantityInPieces: qtyP,
        createdAt: new Date().toISOString()
      });
      alert('এন্ট্রি সফল হয়েছে!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('সমস্যা হয়েছে!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
      <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
      <p className="text-orange-600 font-bold tracking-widest animate-pulse uppercase">লোড হচ্ছে...</p>
    </div>
  );

  return (
    <div className="app-container">
      
      {/* Premium Login Overlay */}
      {userRole === 'guest' && (
        <div className="login-overlay">
          <div className="login-card">
            <div className="icon-box">
              <Egg size={44} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-500 font-medium mb-8">ম্যানেজমেন্ট সিস্টেমে স্বাগতম</p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড লিখুন" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-orange-500 outline-none transition-all text-center text-2xl font-black tracking-widest placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-bold"
                autoFocus
              />
              <button className="w-full py-4 bg-orange-600 text-white font-black rounded-3xl shadow-xl shadow-orange-200 hover:bg-orange-700 active:scale-95 transition-all">প্রবেশ করুন</button>
            </form>
            <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">Developer: Shipon Talukdar</p>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="main-header">
        <div className="container-inner flex justify-between items-center px-5">
          <div className="flex items-center gap-3">
            <div className="header-icon bg-orange-600 shadow-orange-200 shadow-lg">
              <Egg size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none text-gray-900 tracking-tighter">নিশাদ এগ্রো</h1>
              <p className="text-[10px] font-bold uppercase mt-1 text-gray-400 flex items-center gap-1"><Phone size={10} /> 01979665911</p>
            </div>
          </div>
          <div className="text-right bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5 leading-none">ক্যাশ বক্স</p>
            <p className="text-lg font-black text-orange-600 leading-none">৳{stats.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="container-inner p-5 pb-36">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <section className="grid grid-cols-3 gap-3">
              <MetricCard title="লাল ডিম" value={stats.stock['লাল ডিম']} subValue="পিস" icon={Egg} colorClass="bg-red-50 text-red-600" />
              <MetricCard title="সাদা ডিম" value={stats.stock['সাদা ডিম']} subValue="পিস" icon={Egg} colorClass="bg-indigo-50 text-indigo-600" />
              <MetricCard title="হাঁস" value={stats.stock['হাঁসের ডিম']} subValue="পিস" icon={Egg} colorClass="bg-cyan-50 text-cyan-600" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-amber-50 text-amber-600" />
              <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={User} colorClass="bg-purple-50 text-purple-600" />
            </section>

            <section className="profit-banner overflow-hidden">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">আজকের নিট লাভ/লস</p>
                {userRole === 'admin' ? (
                  <h2 className="text-4xl font-black tracking-tight">৳{stats.todayProfit.toLocaleString()}</h2>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black blur-md select-none tracking-tighter">৳৳৳৳৳</span>
                    <Lock size={18} className="opacity-50" />
                  </div>
                )}
              </div>
              <div className="text-right pl-6 border-l border-white/20">
                <p className="text-[10px] uppercase font-bold opacity-60 mb-0.5 tracking-tighter">আজকের বিক্রি</p>
                <p className="text-xl font-black">৳{stats.todaySales.toLocaleString()}</p>
              </div>
              {/* Background accent */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">সাম্প্রতিক লেনদেন</h3>
                  <div className="h-1 w-8 bg-orange-200 rounded-full"></div>
                </div>
                <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 group">
                  সব দেখুন <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="transaction-item group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`t-icon ${t.type} rounded-2xl p-3 shadow-sm`}>
                        {t.type === 'sell' ? <ArrowUpCircle size={22}/> : t.type === 'buy' ? <ArrowDownCircle size={22}/> : <MinusCircle size={22}/>}
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-gray-900 leading-none mb-1.5">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date} 
                          {t.dueAmount > 0 && <span className="text-rose-500 font-black ml-1.5">• বাকি ৳{t.dueAmount}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black text-base ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>
                         {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                       </p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                    <AlertCircle size={40} className="mb-2 opacity-50" />
                    <p className="font-bold uppercase text-xs tracking-widest">লেনদেন নেই</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* FORMS TAB (SELL/BUY/EXPENSE) */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="form-card animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className={`p-4 rounded-3xl mb-4 shadow-xl shadow-opacity-20 ${activeTab === 'sell' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : activeTab === 'buy' ? 'bg-indigo-50 text-indigo-600 shadow-indigo-100' : 'bg-rose-50 text-rose-600 shadow-rose-100'}`}>
                {activeTab === 'sell' ? <ShoppingCart size={32}/> : activeTab === 'buy' ? <PlusCircle size={32}/> : <Wallet size={32}/>}
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} এন্ট্রি
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">সঠিক তথ্য দিয়ে ডাটা সেভ করুন</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
              
              {activeTab !== 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <ModernSelect label="ডিমের ধরণ" value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} options={EGG_TYPES.map(v => ({ label: v, value: v }))} icon={Egg} />
                    <ModernSelect label="একক" value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} options={Object.entries(SELL_UNITS).map(([k, v]) => ({ label: v.label, value: k }))} icon={Filter} />
                  </div>

                  {activeTab === 'sell' && (
                    <div className="flex bg-gray-100/50 p-1.5 rounded-[1.25rem] border border-gray-100">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>খুচরা বিক্রি</button>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>পাইকারি বিক্রি</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                    <ModernInput label="দর (একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} placeholder="0.00" required icon={TrendingUp} />
                  </div>

                  <ModernInput label={activeTab === 'sell' ? "কাস্টমারের নাম" : "মহাজন/পাইকারের নাম"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম লিখুন..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                  
                  <div className="pt-6 mt-2 border-t border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-4 px-1">
                       <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">সর্বমোট বিল</span>
                       <span className="text-3xl font-black text-gray-800 leading-none">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</span>
                    </div>
                    <ModernInput label="নগদ জমা" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব পরিশোধ" icon={Wallet} />
                  </div>
                </>
              )}

              {activeTab === 'expense' && (
                <div className="space-y-5">
                  <ModernSelect label="খরচের খাত" value={EXPENSE_TYPES.includes(formData.description) ? formData.description : 'অন্যান্য'} onChange={e => setFormData(p => ({ ...p, description: e.target.value === 'অন্যান্য' ? '' : e.target.value }))} options={EXPENSE_TYPES.concat(['অন্যান্য']).map(v => ({ label: v, value: v }))} icon={Filter} />
                  {(!EXPENSE_TYPES.includes(formData.description) || formData.description === '') && (
                     <ModernInput label="খরচের বিবরণ" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="বিবরণ লিখুন..." required icon={MinusCircle} />
                  )}
                  <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                </div>
              )}

              <button disabled={submitting} className={`submit-btn ${activeTab} py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-4`}>
                {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        )}

        {/* REGISTER/HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1">
              {['all', 'sell', 'buy', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border transition-all ${typeFilter === t ? 'bg-orange-600 text-white border-orange-600 shadow-xl shadow-orange-100' : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'}`}>
                  {t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">লেনদেন রেজিস্টার</h3>
                  <p className="text-[10px] font-bold text-gray-300 uppercase leading-none">ফিল্টারকৃত রেজাল্ট</p>
                </div>
                <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`p-3 rounded-2xl border transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}>
                  <Filter size={18}/>
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredHistory.length > 0 ? filteredHistory.map(t => (
                  <div key={t.id} className="p-5 flex justify-between items-center hover:bg-gray-50/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-10 rounded-full transition-transform group-hover:scale-y-110 ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                      <div>
                        <h4 className="font-bold text-[15px] text-gray-900 leading-none mb-1.5">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-[15px]">৳{t.amount.toLocaleString()}</p>
                      {t.dueAmount > 0 && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tighter">বাকি ৳{t.dueAmount}</span>}
                      {userRole === 'admin' && (
                        <button onClick={() => { if(window.confirm('মুছে ফেলতে চান?')) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', t.id)); }} className="text-gray-200 hover:text-rose-500 ml-2 transition-colors">
                          <Trash2 size={12} className="inline"/>
                        </button>
                      )}
                    </div>
                  </div>
                )) : <div className="p-20 text-center text-gray-300 font-bold uppercase tracking-[0.2em] text-xs">কোনো তথ্য পাওয়া যায়নি</div>}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="space-y-7 animate-in fade-in duration-500">
            <div className="form-card">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gray-100 text-gray-600 rounded-2xl"><Settings size={24}/></div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-gray-900 leading-none">রেট সেটিংস</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">সব ডিমের রেট এখান থেকে ঠিক করুন</p>
                </div>
              </div>
              <div className="space-y-6">
                {EGG_TYPES.map(egg => (
                  <div key={egg} className="p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                    <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></div> {egg}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['pis', 'hali', 'case'].map(u => (
                        <div key={u}>
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1.5 mb-1.5 block tracking-widest">{u === 'pis' ? 'পিস' : u === 'hali' ? 'হালি' : 'কেস'}</label>
                          <input 
                            type="number" 
                            value={rates.retail[egg]?.[u] || ''} 
                            onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} 
                            className="w-full p-3.5 rounded-2xl border border-gray-200 font-black text-center text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all" 
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সফলভাবে সেভ হয়েছে!'); }} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4">সবগুলো সেভ করুন</button>
              </div>
            </div>
            
            <button onClick={() => { setUserRole('guest'); setActiveTab('dashboard'); }} className="w-full py-5 text-rose-600 font-black border-2 border-rose-50 bg-rose-50/20 rounded-3xl flex items-center justify-center gap-3 hover:bg-rose-50 transition-colors">
              <LogOut size={20}/> সিস্টেম থেকে লগআউট করুন
            </button>
          </div>
        )}
      </main>

      {/* Floating Centered Bottom Navigation Bar */}
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
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`nav-item transition-all duration-500 ${isActive ? 'active' : ''}`}
            >
              <item.icon size={isActive ? 24 : 22} />
              {isActive && <span className="absolute -bottom-1 w-1.5 h-1.5 bg-orange-600 rounded-full"></span>}
            </button>
          )
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');

        /* Layout & Typography Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          min-height: 100vh !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          background: #FDFCFB !important;
          color: #1a1a1a;
          overflow-x: hidden !important;
          text-align: left !important;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .app-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; }
        .container-inner { width: 100%; max-width: 550px; margin: 0 auto !important; }

        /* Modern Header */
        .main-header { 
          width: 100%; 
          position: sticky; 
          top: 0; 
          z-index: 50; 
          background: rgba(255,255,255,0.85); 
          backdrop-filter: blur(20px); 
          border-b: 1px solid #f3f3f3; 
          padding: 1.25rem 0; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .header-icon { padding: 0.6rem; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; }

        /* Banner Style */
        .profit-banner { 
          background: linear-gradient(135deg, #ea580c 0%, #fb923c 100%);
          color: white; 
          padding: 1.75rem 2rem; 
          border-radius: 2.5rem; 
          box-shadow: 0 20px 40px -10px rgba(234, 88, 12, 0.3);
          display: flex; justify-content: space-between; align-items: center;
          position: relative;
        }

        /* List Items */
        .transaction-item { 
          background: white; 
          padding: 1.25rem; 
          border-radius: 1.75rem; 
          border: 1px solid #f8f8f8; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }
        .t-icon.sell { background: #ecfdf5; color: #10b981; }
        .t-icon.buy { background: #eef2ff; color: #6366f1; }
        .t-icon.expense { background: #fff1f2; color: #f43f5e; }

        /* Login Screen */
        .login-overlay { position: fixed; inset: 0; z-index: 100; background: #fff; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-card { text-align: center; width: 100%; max-width: 350px; }
        .login-card .icon-box { background: #fff7ed; color: #ea580c; width: 90px; height: 90px; border-radius: 2.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 15px 30px -10px rgba(234, 88, 12, 0.2); }

        /* Floating Nav Bar */
        .bottom-nav { 
          position: fixed; bottom: 1.75rem; left: 50%; transform: translateX(-50%); 
          width: calc(100% - 2.5rem); max-width: 450px; 
          background: rgba(255,255,255,0.9); 
          backdrop-filter: blur(24px); 
          border: 1px solid rgba(255,255,255,0.3); 
          padding: 0.8rem; border-radius: 2.75rem; 
          display: flex; justify-content: space-around; 
          box-shadow: 0 15px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5); 
          z-index: 60; 
        }
        .nav-item { border: none; background: none; color: #cbd5e1; padding: 0.8rem; border-radius: 1.75rem; cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; }
        .nav-item.active { color: #ea580c; background: #fff7ed; transform: translateY(-10px); box-shadow: 0 10px 20px -5px rgba(234, 88, 12, 0.15); }

        /* Custom Form Style */
        .form-card { background: white; padding: 2.25rem 1.75rem; border-radius: 3rem; border: 1px solid #f0f0f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .submit-btn { width: 100%; font-weight: 900; color: white; border: none; cursor: pointer; }
        .submit-btn.sell { background: #10b981; box-shadow: 0 15px 30px -8px rgba(16, 185, 129, 0.3); }
        .submit-btn.buy { background: #6366f1; box-shadow: 0 15px 30px -8px rgba(99, 102, 241, 0.3); }
        .submit-btn.expense { background: #f43f5e; box-shadow: 0 15px 30px -8px rgba(244, 63, 94, 0.3); }
      `}</style>
    </div>
  );
}
