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
  Menu,
  X,
  DollarSign,
  Target,
  ArrowRightLeft,
  ChevronLeft
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBOWUydDyASpw664VN7kkkUNJUPekpTmQA",
  authDomain: "nishad-agro.firebaseapp.com",
  projectId: "nishad-agro",
  storageBucket: "nishad-agro.firebasestorage.app",
  messagingSenderId: "984825143099",
  appId: "1:984825143099:web:c48e6e399fc98ee257211e"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Strict Paths: appId must be single segment
const appId = 'nishad_agro_v3_production';

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

// --- Modern Reusable Components ---

const MetricCard = ({ title, value, icon: Icon, color, blurred = false }) => (
  <div className="modern-card p-5 flex items-center gap-4 animate-in">
    <div className={`p-3 rounded-2xl ${color} bg-opacity-15 text-current shadow-sm`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
      {blurred ? (
        <div className="flex items-center gap-1">
          <span className="text-xl font-black text-gray-200 blur-sm select-none">XXXXX</span>
          <Lock size={12} className="text-gray-300" />
        </div>
      ) : (
        <h2 className="text-xl font-black text-gray-900 leading-none">{value}</h2>
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
  
  // Settings
  const [adminPassword, setAdminPassword] = useState('665911');
  const [subAdminPassword, setSubAdminPassword] = useState('1234');
  const [rates, setRates] = useState({
    retail: { 'লাল ডিম': { pis: '', hali: '', case: '' }, 'সাদা ডিম': { pis: '', hali: '', case: '' }, 'হাঁসের ডিম': { pis: '', hali: '', case: '' } },
    wholesale: { 'লাল ডিম': '', 'সাদা ডিম': '', 'হাঁসের ডিম': '' }
  });

  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    eggType: 'লাল ডিম', unit: 'pis', quantity: '', rate: '', saleCategory: 'retail', 
    customerName: '', discount: '', paidAmount: '', description: '', 
    date: new Date().toISOString().split('T')[0]
  });

  // Derived
  const isExpense = activeTab === 'expense';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';

  // --- Auth & Data ---
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
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
    onSnapshot(docRates, (d) => { if (d.exists()) setRates(d.data()); });

    const docAuth = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    onSnapshot(docAuth, (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.subAdminPassword) setSubAdminPassword(data.subAdminPassword);
      }
    });
    return () => { unsubTr(); };
  }, [user]);

  // Rate logic
  useEffect(() => {
    if (isSell && rates) {
      if (formData.saleCategory === 'wholesale') {
        setFormData(p => ({ ...p, unit: 'pis', rate: rates.wholesale?.[p.eggType] || '' }));
      } else {
        setFormData(p => ({ ...p, rate: rates.retail?.[p.eggType]?.[p.unit] || '' }));
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, isSell, rates]);

  // Statistics
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
        stock[t.eggType] = (stock[t.eggType] || 0) + qInP;
        cash -= paid;
        suppDue += due;
      } else if (t.type === 'sell') {
        stock[t.eggType] = (stock[t.eggType] || 0) - qInP;
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

  // --- Handlers ---
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
      const type = activeTab;
      if (type === 'expense') {
        total = parseFloat(formData.amount || 0);
        paid = total;
      } else {
        qtyP = parseInt(formData.quantity) * (type === 'sell' ? (SELL_UNITS[formData.unit]?.value || 1) : 1);
        const sub = parseFloat(formData.quantity) * parseFloat(formData.rate);
        total = sub - parseFloat(formData.discount || 0);
        paid = formData.paidAmount === '' ? total : parseFloat(formData.paidAmount);
        due = total - paid;
      }
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2'), {
        ...formData, type, amount: total, paidAmount: paid, dueAmount: due, quantityInPieces: qtyP, createdAt: new Date().toISOString()
      });
      alert('সফল হয়েছে!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('Error!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 font-black text-orange-600 animate-pulse uppercase tracking-widest text-xs">নিশাদ এগ্রো...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-hind">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; min-height: 100vh !important; display: block !important; 
          background: #F8F9FA !important; place-items: unset !important; text-align: left !important;
        }

        .modern-card { background: #fff; border-radius: 24px; border: 1px solid #F3F4F6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01); transition: 0.3s; }
        .modern-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04); }

        .app-input { width: 100%; padding: 14px 20px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 16px; font-weight: 700; outline: none; transition: 0.2s; }
        .app-input:focus { border-color: #EA580C; background: #fff; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.05); }

        .bottom-nav { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); width: calc(100% - 2.5rem); max-width: 500px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.3); border-radius: 2.5rem; display: flex; justify-content: space-around; padding: 0.75rem; box-shadow: 0 15px 35px rgba(0,0,0,0.1); z-index: 50; }
        .nav-item { border: none; background: none; color: #9CA3AF; padding: 0.75rem; border-radius: 1.5rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; position: relative; }
        .nav-item.active { color: #EA580C; background: #FFF7ED; transform: translateY(-8px); }
        .nav-item.active::after { content: ""; position: absolute; bottom: -4px; width: 4px; height: 4px; background: #EA580C; border-radius: 50%; }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Login Screen */}
      {userRole === 'guest' && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-100">
              <Egg size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-10">Web System Management</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password" placeholder="পাসওয়ার্ড লিখুন" value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="app-input text-center text-2xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-200" 
                autoFocus 
              />
              <button className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Egg size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-none">নিশাদ এগ্রো</h1>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter flex items-center gap-1"><Phone size={10}/> 01979665911</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ক্যাশ বক্স</p>
          <p className="text-xl font-black text-orange-600 leading-none">৳{stats.cash.toLocaleString()}</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 lg:p-10 max-w-6xl mx-auto w-full pb-32">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} color="bg-blue-500" />
              <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={AlertCircle} color="bg-rose-500" />
              <MetricCard title="আজকের বিক্রি" value={`৳${stats.todaySales.toLocaleString()}`} icon={ShoppingCart} color="bg-orange-500" />
              <MetricCard title="আজকের লাভ" value={`৳${stats.todayProfit.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" blurred={userRole !== 'admin'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Inventory Bars */}
              <div className="lg:col-span-2 modern-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm flex items-center gap-2"><Store size={18} className="text-orange-500" /> ইনভেন্টরি রিপোর্ট</h3>
                  <span className="text-[10px] font-black text-gray-400 uppercase px-3 py-1 bg-gray-50 rounded-full border border-gray-100">Live Stock</span>
                </div>
                <div className="space-y-6">
                  {EGG_TYPES.map((egg, idx) => (
                    <div key={egg} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-black text-gray-600 uppercase">{egg}</span>
                        <span className="text-sm font-black text-gray-900">{stats.stock[egg]} <span className="text-[10px] text-gray-400">পিস</span></span>
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
              </div>

              {/* Status & Settings Quick Access */}
              <div className="space-y-4">
                <div className="modern-card p-6 bg-gray-900 text-white relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600 rounded-full blur-[80px] opacity-20"></div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">System Health</p>
                  <h4 className="text-xl font-black mb-4">সার্ভার অনলাইন</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs border-b border-white/10 pb-2"><span className="text-gray-400">আজকের এন্ট্রি</span><span className="font-bold">{transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).length} টি</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-400">অ্যাডমিন আইডি</span><span className="font-bold">#NISHAD_01</span></div>
                  </div>
                </div>
                <button onClick={() => setUserRole('guest')} className="w-full p-4 modern-card flex items-center justify-center gap-3 text-rose-500 font-black uppercase text-[10px] tracking-widest bg-rose-50/30 border-rose-100 hover:bg-rose-50 transition-all">
                  <LogOut size={16} /> লগআউট করুন
                </button>
              </div>
            </div>

            {/* Recent Table */}
            <div className="modern-card overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><History size={16} className="text-orange-500" /> সাম্প্রতিক লেনদেন</h3>
                <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 hover:underline uppercase">সব দেখুন</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">বিস্তারিত</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">ধরণ</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.slice(0, 5).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-all">
                        <td className="px-6 py-4">
                          <p className="font-black text-sm text-gray-800 leading-none mb-1.5">{t.customerName || t.description || t.eggType}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{t.date}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${t.type === 'sell' ? 'bg-emerald-50 text-emerald-600' : t.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                            {t.type === 'sell' ? 'বিক্রি' : t.type === 'buy' ? 'ক্রয়' : 'খরচ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`font-black text-sm ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(isSell || isBuy || isExpense) && (
          <div className="max-w-3xl mx-auto animate-in">
            <div className="modern-card overflow-hidden">
              <div className={`p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 ${isSell ? 'bg-emerald-600' : isBuy ? 'bg-blue-600' : 'bg-rose-600'}`}>
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
                    {isSell ? <ShoppingCart size={32}/> : isBuy ? <ArrowDownCircle size={32}/> : <Wallet size={32}/>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{isSell ? 'ডিম বিক্রি' : isBuy ? 'মাল ক্রয়' : 'খরচ এন্ট্রি'}</h2>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">New Entry Voucher</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[9px] font-black uppercase">Voucher Date</p>
                  <p className="text-lg font-black">{formData.date}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">তারিখ</label>
                      <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="app-input" required />
                    </div>
                    {!isExpense && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">ডিমের ধরণ</label>
                          <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="app-input">
                            {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        {isSell && (
                          <div className="flex bg-gray-100 p-1 rounded-2xl h-[56px]">
                            <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-1 rounded-xl text-[10px] font-black transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>Retail</button>
                            <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-1 rounded-xl text-[10px] font-black transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>Wholesale</button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">পরিমাণ</label>
                            <input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} className="app-input" placeholder="0" required />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">একক</label>
                            <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || (isSell && formData.saleCategory === 'wholesale')} className="app-input">
                              {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-5">
                    {!isExpense && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">দর (রেট)</label>
                            <input type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} className="app-input" placeholder="0.00" required />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">ছাড়</label>
                            <input type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} className="app-input" placeholder="0" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">কাস্টমার/মহাজন নাম</label>
                          <input type="text" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} className="app-input" placeholder="নাম লিখুন..." required />
                        </div>
                      </>
                    )}
                    {isExpense && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">খরচের খাত</label>
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="app-input">
                            {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">টাকার পরিমাণ</label>
                          <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="app-input" placeholder="0.00" required />
                        </div>
                      </>
                    )}
                    
                    <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Voucher Bill</p>
                      <h3 className="text-4xl font-black text-gray-900 leading-none mt-2">
                        ৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}
                      </h3>
                      {activeTab !== 'expense' && (
                         <div className="mt-4 flex flex-col items-center">
                            <label className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2 block">নগদ পরিশোধ</label>
                            <input type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} className="w-32 py-1.5 border-b-2 border-gray-300 text-center font-black text-xl bg-transparent outline-none focus:border-orange-500" placeholder="সম্পূর্ণ" />
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <button disabled={submitting} className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all text-white ${isSell ? 'bg-emerald-600' : isBuy ? 'bg-blue-600' : 'bg-rose-600'}`}>
                  {submitting ? 'Voucher Saving...' : 'ভাউচার সেভ করুন'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in">
            <div className="modern-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {['all', 'sell', 'buy', 'expense'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                    {t === 'all' ? 'সব রেকর্ড' : t}
                  </button>
                ))}
              </div>
              <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm' : 'bg-white text-gray-400 border-gray-100'}`}>
                <Filter size={14}/> {dateFilter === 'today' ? 'আজকের' : 'সব সময়ের'}
              </button>
            </div>

            <div className="modern-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ ও কাস্টমার</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase text-center">পরিমাণ</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase text-right">বিল</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase text-right">বাকি</th>
                      {userRole === 'admin' && <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/30 transition-all group">
                        <td className="px-8 py-6 text-sm font-black text-gray-400 leading-none">{t.date}</td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                             <div className={`w-1.5 h-8 rounded-full ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                             <div>
                               <p className="font-black text-gray-800 text-sm">{t.customerName || t.description || t.eggType}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase">{t.type}</p>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center font-bold text-gray-600 text-sm">{t.quantity > 0 ? `${t.quantity} ${t.unit || 'পিস'}` : '-'}</td>
                        <td className="px-8 py-6 text-right font-black text-gray-900 text-sm">৳{t.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right">
                          {t.dueAmount > 0 
                            ? <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black border border-rose-100">৳{t.dueAmount.toLocaleString()}</span> 
                            : <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Paid</span>
                          }
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-8 py-6 text-center">
                            <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredHistory.length === 0 && <div className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest">No data available</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="max-w-2xl mx-auto animate-in">
             <WebCard title="রেট সেটিংস" icon={Settings}>
                <div className="space-y-6">
                  {EGG_TYPES.map(egg => (
                    <div key={egg} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                      <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs"><div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div> {egg}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {['pis', 'hali', 'case'].map(u => (
                          <div key={u}>
                            <label className="text-[9px] font-black text-gray-400 uppercase text-center block mb-2">{u}</label>
                            <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="app-input text-center py-2" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Wholesale Rate</span>
                        <input type="number" value={rates.wholesale[egg] || ''} onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} className="w-32 app-input py-2 text-center text-purple-700" placeholder="0" />
                      </div>
                    </div>
                  ))}
                  <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('Updated!'); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Save Config</button>
                </div>
             </WebCard>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile */}
      <nav className="bottom-nav lg:hidden">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'buy', icon: ArrowDownCircle },
          { id: 'sell', icon: ArrowUpCircle },
          { id: 'expense', icon: Wallet },
          { id: 'history', icon: History }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}>
            <item.icon size={24} />
          </button>
        ))}
        {userRole === 'admin' && (
          <button onClick={() => setActiveTab('settings')} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>
            <Settings size={24} />
          </button>
        )}
      </nav>

      {/* Desktop Sidebar (Optional, if needed for wider view) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-100 flex-col items-center py-10 gap-8 shadow-sm">
          <div className="p-2 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-100 mb-10"><Egg size={24}/></div>
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'buy', icon: ArrowDownCircle },
            { id: 'sell', icon: ArrowUpCircle },
            { id: 'expense', icon: Wallet },
            { id: 'history', icon: History }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-orange-50 text-orange-600' : 'text-gray-300 hover:text-gray-500'}`}>
              <item.icon size={22} />
            </button>
          ))}
          {userRole === 'admin' && (
            <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-orange-50 text-orange-600' : 'text-gray-300 hover:text-gray-500'}`}>
              <Settings size={22} />
            </button>
          )}
          <button onClick={() => setUserRole('guest')} className="mt-auto p-4 text-gray-300 hover:text-rose-500"><LogOut size={22}/></button>
      </aside>

      {/* Responsive content adjustment for Desktop sidebar */}
      <style>{`
        @media (min-width: 1024px) {
          .main-content { margin-left: 80px; }
          body { padding-left: 80px; }
        }
      `}</style>

    </div>
  );
}
