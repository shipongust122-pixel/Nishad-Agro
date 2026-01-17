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
// Note: Keeping your current credentials
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

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, error = false, className = "" }) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
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

  // --- Auth & Data Flow ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (err) { console.error("Firebase Auth Error:", err); }
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

  // Rate Automation Logic
  useEffect(() => {
    if (formData.type === 'sell' && rates) {
      if (formData.saleCategory === 'wholesale') {
        setFormData(p => ({ ...p, unit: 'pis', rate: rates.wholesale?.[p.eggType] || '' }));
      } else {
        setFormData(p => ({ ...p, rate: rates.retail?.[p.eggType]?.[p.unit] || '' }));
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, formData.type, rates]);

  // Statistics Calculation
  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let cash = 0, custDue = 0, suppDue = 0, todaySales = 0, todayProfit = 0, todayExp = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Average cost estimation (In a real app, this would be calculated from purchases)
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

  // Handlers
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
      <div className="relative w-16 h-16">
         <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
         <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-orange-500 font-black uppercase tracking-widest text-[10px]">Loading Nishad Agro</p>
    </div>
  );

  return (
    <div className="app-main-wrapper">
      
      {/* Login Screen */}
      {userRole === 'guest' && (
        <div className="login-overlay-full">
          <div className="login-content-box">
            <div className="login-icon-circle"><Egg size={44} /></div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">Management System Pro</p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড লিখুন" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="login-field-input"
                autoFocus
              />
              <button className="login-action-btn">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Header */}
      <header className="app-global-header">
        <div className="header-container-inner flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
             <div className="header-icon-box bg-orange-600 shadow-xl shadow-orange-100 text-white">
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

      <main className="app-content-area px-6 py-8 pb-32">
        
        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <MetricBox title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-emerald-50 text-emerald-600" />
               <MetricBox title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={User} colorClass="bg-rose-50 text-rose-600" />
            </div>

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

            <div className="profit-card-highlight">
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

            <div className="flex items-center justify-between px-1 pt-4">
               <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><History size={14}/> সাম্প্রতিক লেনদেন</h3>
               <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b border-orange-100">সব দেখুন</button>
            </div>
            <div className="space-y-3">
               {transactions.slice(0, 4).map(t => (
                 <div key={t.id} className="transaction-list-item">
                    <div className="flex items-center gap-4">
                       <div className={`icon-box-small ${t.type}`}>
                          {t.type === 'sell' ? <ArrowUpCircle size={18}/> : t.type === 'buy' ? <ArrowDownCircle size={18}/> : <MinusCircle size={18}/>}
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-gray-800 leading-none mb-1">{t.customerName || t.description || t.eggType}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>{t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}</p>
                    </div>
                 </div>
               ))}
            </div>

            <button onClick={() => setUserRole('guest')} className="logout-btn-full">
               <LogOut size={14}/> লগআউট করুন
            </button>
          </div>
        )}

        {/* TRANSACTION FORMS */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="animate-in slide-in-from-bottom-6 duration-500">
            <Section title={`${activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} সেকশন`} icon={Target}>
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ধরণ</label>
                        <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="form-select-modern">
                           {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                     </div>
                  </div>

                  {activeTab === 'sell' && (
                     <div className="sale-category-toggle">
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`toggle-btn ${formData.saleCategory === 'retail' ? 'active' : ''}`}>খুচরা</button>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`toggle-btn ${formData.saleCategory === 'wholesale' ? 'active' : ''}`}>পাইকারি</button>
                     </div>
                  )}

                  {activeTab !== 'expense' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                         <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                         <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">একক</label>
                            <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} className="form-select-modern disabled:opacity-50">
                               {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <ModernInput label="দর (একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} placeholder="0.00" required icon={TrendingUp} />
                         <ModernInput label={activeTab === 'sell' ? "কাস্টমার" : "মহাজন"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                      </div>

                      <div className="total-bill-display-box">
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
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="form-select-modern">
                             {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                             <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                       </div>
                       <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                    </div>
                  )}

                  <button disabled={submitting} className={`submit-action-btn ${activeTab}`}>
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
                  <button key={t} onClick={() => setTypeFilter(t)} className={`history-filter-btn ${typeFilter === t ? 'active' : ''}`}>{t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}</button>
                ))}
             </div>

             <div className="register-data-table">
                <div className="table-header-box px-6 py-5 flex justify-between items-center">
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">লেনদেন রেজিস্টার</h3>
                   <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`filter-icon-btn ${dateFilter === 'today' ? 'active' : ''}`}><Filter size={16}/></button>
                </div>
                <div className="divide-y divide-gray-50">
                   {filteredHistory.map(t => (
                     <div key={t.id} className="table-row-item hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={`row-indicator-bar ${t.type}`}></div>
                           <div>
                              <h4 className="font-black text-gray-800 text-sm leading-none mb-1">{t.customerName || t.description || t.eggType}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-gray-900 text-sm">৳{t.amount.toLocaleString()}</p>
                           {t.dueAmount > 0 && <span className="due-tag">বাকি ৳{t.dueAmount}</span>}
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
                     <div key={egg} className="settings-rate-card p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <h4 className="text-xs font-black text-gray-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> {egg}</h4>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                           {['pis', 'hali', 'case'].map(u => (
                             <div key={u}>
                                <label className="text-[8px] font-black text-gray-400 uppercase ml-1.5 mb-1 block">{u === 'pis' ? 'পিস' : u === 'hali' ? 'হালি' : 'কেস'}</label>
                                <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="settings-rate-input" placeholder="0" />
                             </div>
                           ))}
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                           <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">পাইকারি দর</span>
                           <input type="number" value={rates.wholesale[egg] || ''} onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} className="wholesale-input-field" placeholder="0" />
                        </div>
                     </div>
                   ))}
                   <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সফলভাবে আপডেট হয়েছে!'); }} className="w-full py-4 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">সবগুলো সেভ করুন</button>
                </div>
             </Section>
          </div>
        )}

      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="app-floating-nav">
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
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-icon-item ${isActive ? 'active' : ''}`}>
               <item.icon size={22} />
               {isActive && <div className="nav-indicator-dot"></div>}
            </button>
          )
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        /* AGGRESSIVE CSS RESET - DO NOT REMOVE */
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          min-height: 100vh !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          display: block !important; 
          background: #FDFCFB !important;
          color: #111;
          place-items: initial !important; /* Vite Override */
          text-align: left !important;
          overflow-x: hidden;
        }

        .app-main-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .app-content-area {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Modern UI Elements */
        .app-global-header {
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid #f0f0f0;
          padding: 1.25rem 0;
        }

        .header-container-inner {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .header-icon-box {
          padding: 0.6rem;
          border-radius: 1.25rem;
        }

        .profit-card-highlight {
          background: #111827;
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
          border-radius: 2.5rem;
          padding: 2rem;
          color: white;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
        }

        .transaction-list-item {
          background: white;
          padding: 1rem;
          border-radius: 1.5rem;
          border: 1px solid #f5f5f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .icon-box-small { padding: 0.75rem; border-radius: 1rem; }
        .icon-box-small.sell { background: #f0fdf4; color: #16a34a; }
        .icon-box-small.buy { background: #eff6ff; color: #2563eb; }
        .icon-box-small.expense { background: #fef2f2; color: #dc2626; }

        .logout-btn-full {
          width: 100%;
          padding: 1.25rem;
          margin-top: 1.5rem;
          border-radius: 1.5rem;
          border: 2px solid #fff1f2;
          background: none;
          color: #f43f5e;
          font-weight: 900;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }

        /* Form Styling */
        .form-select-modern {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 1.25rem;
          font-weight: 900;
          font-size: 0.875rem;
          outline: none;
        }

        .sale-category-toggle {
          display: flex;
          background: #f3f4f6;
          padding: 0.375rem;
          border-radius: 1.25rem;
          border: 1px solid #e5e7eb;
        }
        .toggle-btn {
          flex: 1;
          padding: 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 900;
          text-transform: uppercase;
          border: none;
          background: none;
          color: #9ca3af;
          transition: all 0.2s;
        }
        .toggle-btn.active {
          background: white;
          color: #ea580c;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .total-bill-display-box {
          background: #ea580c;
          background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          border-radius: 2rem;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.3);
        }

        .submit-action-btn {
          width: 100%;
          padding: 1.25rem;
          border-radius: 1.5rem;
          border: none;
          color: white;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .submit-action-btn.sell { background: #16a34a; }
        .submit-action-btn.buy { background: #2563eb; }
        .submit-action-btn.expense { background: #dc2626; }

        /* Login Overlay Styling */
        .login-overlay-full { position: fixed; inset: 0; z-index: 100; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-content-box { width: 100%; max-width: 320px; text-align: center; }
        .login-icon-circle { background: #fff7ed; color: #ea580c; width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .login-field-input { width: 100%; padding: 1.25rem; background: #f9fafb; border: 2px solid #f3f4f6; border-radius: 1.5rem; text-align: center; font-size: 2rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; }
        .login-action-btn { width: 100%; padding: 1.25rem; background: #111827; color: white; border: none; border-radius: 1.5rem; font-weight: 900; margin-top: 1rem; }

        /* Floating Nav Bar */
        .app-floating-nav {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 3rem);
          max-width: 450px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(0,0,0,0.05);
          padding: 0.75rem;
          border-radius: 2.5rem;
          display: flex;
          justify-content: space-around;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 60;
        }
        .nav-icon-item { border: none; background: none; color: #9ca3af; padding: 0.75rem; border-radius: 1.5rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
        .nav-icon-item.active { background: #ea580c; color: white; transform: translateY(-1.25rem) scale(1.1); box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.3); }
        .nav-indicator-dot { position: absolute; bottom: -0.5rem; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background: white; border-radius: 50%; }

        /* Tables & History */
        .history-filter-btn { padding: 0.625rem 1.25rem; border-radius: 1rem; border: 1px solid #f3f4f6; background: white; color: #9ca3af; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; }
        .history-filter-btn.active { background: #111827; color: white; border-color: #111827; }
        .register-data-table { background: white; border-radius: 2rem; border: 1px solid #f0f0f0; overflow: hidden; }
        .table-row-item { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f9fafb; }
        .row-indicator-bar { width: 4px; height: 2.5rem; border-radius: 2px; }
        .row-indicator-bar.sell { background: #10b981; }
        .row-indicator-bar.buy { background: #3b82f6; }
        .row-indicator-bar.expense { background: #ef4444; }
        .due-tag { background: #fff1f2; color: #f43f5e; font-size: 0.625rem; font-weight: 900; padding: 0.125rem 0.5rem; border-radius: 1rem; margin-top: 0.25rem; display: inline-block; }

        /* Settings */
        .settings-rate-input { width: 100%; padding: 0.75rem; border-radius: 1rem; border: 1px solid #e5e7eb; text-align: center; font-weight: 900; font-size: 0.875rem; outline: none; }
        .wholesale-input-field { width: 6rem; padding: 0.5rem; border-radius: 0.75rem; border: 1px solid #ddd; font-weight: 900; text-align: center; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
