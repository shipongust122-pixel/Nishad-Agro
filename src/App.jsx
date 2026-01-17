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
  Save,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  Lock,
  Unlock,
  LogOut,
  ShieldCheck,
  Store,
  User,
  Settings,
  Phone,
  Filter,
  ChevronRight,
  TrendingUp,
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

// --- Reusable Components ---

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, className = "", icon: Icon }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-2.5 bg-white border ${required && !value ? 'border-red-200 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100'} rounded-xl focus:outline-none focus:ring-4 focus:border-orange-500 transition-all text-gray-800 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
        required={required}
      />
    </div>
  </div>
);

const CustomSelect = ({ label, value, onChange, options, disabled = false, icon: Icon }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 appearance-none transition-all text-gray-800 ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
      </div>
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
    <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${colorClass.split(' ')[0]}`}></div>
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{title}</span>
    </div>
    {blurred ? (
      <div className="flex items-center gap-2">
        <div className="text-xl font-black text-gray-200 blur-sm select-none">৳৳৳৳</div>
        <Lock size={14} className="text-gray-300"/>
      </div>
    ) : (
      <div>
        <div className="text-xl font-black text-gray-900 leading-none">{value}</div>
        {subValue && <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{subValue}</div>}
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

  // Settings
  const [adminPassword, setAdminPassword] = useState('665911');
  const [subAdminPassword, setSubAdminPassword] = useState('1234');
  const [rates, setRates] = useState({
    retail: { 'লাল ডিম': { pis: '', hali: '', case: '' }, 'সাদা ডিম': { pis: '', hali: '', case: '' }, 'হাঁসের ডিম': { pis: '', hali: '', case: '' } },
    wholesale: { 'লাল ডিম': '', 'সাদা ডিম': '', 'হাঁসের ডিম': '' }
  });

  // Filters
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
    } catch (err) { alert('সমস্যা হয়েছে!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-orange-600 font-bold">লোড হচ্ছে...</div>;

  return (
    <div className="app-container min-h-screen bg-[#FDFCFB]">
      
      {userRole === 'guest' && (
        <div className="login-overlay">
          <div className="login-card">
            <div className="icon-box"><Egg size={40} /></div>
            <h1>নিশাদ এগ্রো</h1>
            <p>ম্যানেজমেন্ট সিস্টেম</p>
            <form onSubmit={handleLogin}>
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <button>প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="main-header">
        <div className="header-content max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="header-icon"><Egg size={22} /></div>
            <div>
              <h1 className="text-xl font-black leading-none">নিশাদ এগ্রো</h1>
              <p className="text-[10px] font-bold uppercase mt-1 opacity-60 flex items-center gap-1"><Phone size={10} /> 01979665911</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">ক্যাশ বক্স</p>
            <p className="text-xl font-black text-orange-600">৳{stats.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 pb-32">
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard title="লাল ডিম" value={stats.stock['লাল ডিম']} subValue="পিস" icon={Egg} colorClass="bg-red-50 text-red-600" />
              <MetricCard title="সাদা ডিম" value={stats.stock['সাদা ডিম']} subValue="পিস" icon={Egg} colorClass="bg-gray-100 text-gray-600" />
              <MetricCard title="হাঁস" value={stats.stock['হাঁসের ডিম']} subValue="পিস" icon={Egg} colorClass="bg-blue-50 text-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-orange-50 text-orange-600" />
              <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={User} colorClass="bg-purple-50 text-purple-600" />
            </div>

            <div className="profit-banner">
              <div className="flex flex-col">
                <p className="text-[11px] font-bold uppercase opacity-80 mb-1 tracking-widest">আজকের নিট লাভ/লস</p>
                {userRole === 'admin' ? (
                  <h2 className="text-4xl font-black">৳{stats.todayProfit.toLocaleString()}</h2>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black blur-md select-none tracking-tighter">৳৳৳৳৳</span>
                    <Lock size={18} className="opacity-50" />
                  </div>
                )}
              </div>
              <div className="text-right border-l border-white/20 pl-4">
                <p className="text-[10px] uppercase font-bold opacity-60 mb-1">আজকের বিক্রি</p>
                <p className="text-lg font-black tracking-tight">৳{stats.todaySales.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">সাম্প্রতিক লেনদেন</h3>
                <button onClick={() => setActiveTab('history')} className="text-[10px] font-bold text-orange-600 uppercase">সব দেখুন</button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="transaction-item group">
                    <div className="flex items-center gap-4">
                      <div className={`t-icon ${t.type} rounded-2xl p-3`}>
                        {t.type === 'sell' ? <ArrowUpCircle size={22}/> : t.type === 'buy' ? <ArrowDownCircle size={22}/> : <MinusCircle size={22}/>}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 leading-tight">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                          {t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black text-sm ${t.type === 'sell' ? 'text-green-600' : 'text-gray-900'}`}>
                         {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                       </p>
                       {t.dueAmount > 0 && <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 rounded-full inline-block mt-1">বাকি ৳{t.dueAmount}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Improved Forms */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="form-card animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-3 rounded-2xl ${activeTab === 'sell' ? 'bg-green-100 text-green-600' : activeTab === 'buy' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                {activeTab === 'sell' ? <ShoppingCart size={24}/> : activeTab === 'buy' ? <PlusCircle size={24}/> : <Wallet size={24}/>}
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">
                  {activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} এন্ট্রি
                </h2>
                <p className="text-xs font-bold text-gray-400">সঠিক তথ্য দিয়ে ডাটা সেভ করুন</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <Input label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={LayoutDashboard} />
              
              {activeTab !== 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <CustomSelect label="ডিমের ধরণ" value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} options={EGG_TYPES.map(v => ({ label: v, value: v }))} icon={Egg} />
                    <CustomSelect label="একক" value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} options={Object.entries(SELL_UNITS).map(([k, v]) => ({ label: v.label, value: k }))} icon={Filter} />
                  </div>

                  {activeTab === 'sell' && (
                    <div className="flex bg-gray-100/50 p-1.5 rounded-2xl mb-4 border border-gray-100">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400'}`}>খুচরা</button>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400'}`}>পাইকারি</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                    <Input label="দর (প্রতি একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} placeholder="0.00" required icon={ShieldCheck} />
                  </div>

                  <Input label={activeTab === 'sell' ? "কাস্টমার নাম" : "মহাজন/পাইকারের নাম"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম লিখুন..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-200 pt-6 mt-4">
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center items-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">সর্বমোট বিল</p>
                      <p className="text-2xl font-black text-gray-800">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</p>
                    </div>
                    <Input label="নগদ জমা" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব পরিশোধ" icon={Wallet} className="mb-0" />
                  </div>
                </>
              )}

              {activeTab === 'expense' && (
                <div className="space-y-4">
                  <CustomSelect label="খরচের খাত" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} options={EXPENSE_TYPES.map(v => ({ label: v, value: v }))} icon={Filter} />
                  <Input label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                </div>
              )}

              <button disabled={submitting} className={`submit-btn ${activeTab} py-5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all`}>
                {submitting ? 'প্রসেসিং হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        )}

        {/* Improved Register */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
              {['all', 'sell', 'buy', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-orange-600 text-white border-orange-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'}`}>
                  {t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-gray-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">লেনদেন রেজিস্টার</h3>
                </div>
                <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`p-2.5 rounded-xl border transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-gray-100'}`}>
                  <Filter size={16}/>
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredHistory.length > 0 ? filteredHistory.map(t => (
                  <div key={t.id} className="p-5 hover:bg-gray-50/50 transition-colors flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-10 rounded-full ${t.type === 'sell' ? 'bg-green-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900">৳{t.amount.toLocaleString()}</p>
                      {t.dueAmount > 0 && <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1">বাকি ৳{t.dueAmount}</span>}
                    </div>
                  </div>
                )) : <div className="p-20 text-center text-gray-300 font-bold uppercase tracking-[0.2em] text-xs">কোনো তথ্য নেই</div>}
              </div>
            </div>
          </div>
        )}

        {/* Improved Settings */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="form-card">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gray-100 text-gray-600 rounded-2xl"><Settings size={24}/></div>
                <h2 className="text-2xl font-black uppercase text-gray-800">রেট সেটিংস</h2>
              </div>
              <div className="space-y-5">
                {EGG_TYPES.map(egg => (
                  <div key={egg} className="p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                    <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div> {egg}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['pis', 'hali', 'case'].map(u => (
                        <div key={u}>
                          <label className="text-[9px] font-black uppercase opacity-40 ml-1.5 mb-1 block">{u === 'pis' ? 'পিস' : u === 'hali' ? 'হালি' : 'কেস'}</label>
                          <input 
                            type="number" 
                            value={rates.retail[egg]?.[u] || ''} 
                            onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} 
                            className="w-full p-3 rounded-xl border border-gray-200 font-black text-center text-sm focus:border-orange-500 outline-none transition-all" 
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সফলভাবে সেভ হয়েছে!'); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black mt-4 shadow-xl active:scale-95 transition-all">সবগুলো সেভ করুন</button>
              </div>
            </div>
            
            <button onClick={() => { setUserRole('guest'); setActiveTab('dashboard'); }} className="w-full py-5 text-red-600 font-black border-2 border-red-50 bg-red-50/20 rounded-2xl flex items-center justify-center gap-3 hover:bg-red-50 transition-colors">
              <LogOut size={20}/> সিস্টেম থেকে লগআউট
            </button>
          </div>
        )}
      </main>

      {/* Floating Centered Bottom Navigation */}
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
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={22} />
              {activeTab === item.id && <span className="absolute -bottom-1.5 w-1 h-1 bg-orange-600 rounded-full"></span>}
            </button>
          )
        })}
      </nav>

      <style>{`
        /* Essential Overrides to fix layout breakage */
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          height: 100% !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          display: block !important; 
          text-align: left !important;
          background: #FDFCFB !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Header Style */
        .main-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.85); backdrop-filter: blur(16px); border-b: 1px solid #f0f0f0; padding: 1.25rem 0; width: 100%; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .header-icon { background: #ea580c; color: white; padding: 0.6rem; border-radius: 1rem; shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.3); }

        /* Profit Banner Style */
        .profit-banner { 
          background: #ea580c; 
          background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          color: white; 
          padding: 1.75rem; 
          border-radius: 2rem; 
          box-shadow: 0 20px 25px -5px rgba(234, 88, 12, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .profit-banner::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); pointer-events: none; }

        /* List Items */
        .transaction-item { background: white; padding: 1rem; border-radius: 1.5rem; border: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s; }
        .transaction-item:active { transform: scale(0.98); }
        .t-icon.sell { background: #f0fdf4; color: #16a34a; }
        .t-icon.buy { background: #eff6ff; color: #2563eb; }
        .t-icon.expense { background: #fef2f2; color: #dc2626; }

        /* Login Overlay */
        .login-overlay { position: fixed; inset: 0; z-index: 100; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-card { text-align: center; width: 100%; max-width: 320px; }
        .login-card .icon-box { background: #fff7ed; color: #ea580c; width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.1); }
        .login-card h1 { font-size: 2.25rem; font-weight: 900; color: #111827; }
        .login-card p { font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-top: 0.25rem; }
        .login-card input { width: 100%; padding: 1.25rem; background: #f9fafb; border: 2px solid #f3f4f6; border-radius: 1.5rem; margin-top: 2.5rem; text-align: center; font-size: 1.5rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; transition: border-color 0.2s; }
        .login-card input:focus { border-color: #ea580c; background: white; }
        .login-card button { width: 100%; padding: 1.25rem; background: #ea580c; color: white; font-weight: 900; border: none; border-radius: 1.5rem; margin-top: 1rem; cursor: pointer; shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.2); }

        /* Floating Nav Style */
        .bottom-nav { 
          position: fixed; 
          bottom: 1.5rem; 
          left: 50%; 
          transform: translateX(-50%); 
          width: calc(100% - 2.5rem);
          max-width: 450px; 
          background: rgba(255,255,255,0.9); 
          backdrop-filter: blur(24px); 
          border: 1px solid rgba(255,255,255,0.2); 
          padding: 0.75rem; 
          border-radius: 2.5rem; 
          display: flex; 
          justify-content: space-around; 
          box-shadow: 0 15px 35px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.5); 
          z-index: 60; 
        }
        .nav-item { border: none; background: none; color: #94a3b8; padding: 0.75rem; border-radius: 1.5rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; display: flex; align-items: center; justify-content: center; }
        .nav-item.active { color: #ea580c; background: #fff7ed; transform: translateY(-8px); shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.1); }

        /* Form Card */
        .form-card { background: white; padding: 2rem; border-radius: 2.5rem; border: 1px solid #f0f0f0; shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .submit-btn { width: 100%; font-weight: 900; color: white; border: none; cursor: pointer; margin-top: 2rem; }
        .submit-btn.sell { background: #16a34a; shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.3); }
        .submit-btn.buy { background: #2563eb; shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3); }
        .submit-btn.expense { background: #dc2626; shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3); }
      `}</style>
    </div>
  );
}
