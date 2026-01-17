import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  serverTimestamp,
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
  Coins,
  Phone,
  Filter,
  Search,
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
      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">{title}</span>
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

  // History Filters
  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form State
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

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.error("Custom token failed, falling back to anonymous:", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Firebase Auth Error:", err); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Transactions
    const qTr = collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2');
    const unsubTr = onSnapshot(qTr, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      console.error("Transactions snapshot error:", error);
      setLoading(false);
    });

    // Rates
    const docRates = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates');
    const unsubRates = onSnapshot(docRates, (d) => {
      if (d.exists()) setRates(d.data());
    }, (error) => {
      console.error("Rates snapshot error:", error);
    });

    // Auth (Passwords)
    const docAuth = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubAuth = onSnapshot(docAuth, (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.subAdminPassword) setSubAdminPassword(data.subAdminPassword);
      }
    }, (error) => {
      console.error("Auth snapshot error:", error);
    });

    return () => { unsubTr(); unsubRates(); unsubAuth(); };
  }, [user]);

  // Auto-fill Rate
  useEffect(() => {
    if (formData.type === 'sell' && rates) {
      if (formData.saleCategory === 'wholesale') {
        setFormData(p => ({ ...p, unit: 'pis', rate: rates.wholesale?.[p.eggType] || '' }));
      } else {
        setFormData(p => ({ ...p, rate: rates.retail?.[p.eggType]?.[p.unit] || '' }));
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, formData.type, rates]);

  // --- Calculations ---
  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let cash = 0, custDue = 0, suppDue = 0, todaySales = 0, todayProfit = 0, todayExp = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    // Simple avg cost logic (mocked for brevity or calculated from 'buy' type)
    let costs = { 'লাল ডিম': 10, 'সাদা ডিম': 9, 'হাঁসের ডিম': 12 }; // Default/Initial

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
      if (formData.type === 'expense') {
        total = parseFloat(formData.amount || 0);
        paid = total;
      } else {
        qtyP = parseInt(formData.quantity) * (formData.type === 'sell' ? SELL_UNITS[formData.unit].value : 1);
        const sub = parseFloat(formData.quantity) * parseFloat(formData.rate);
        const disc = parseFloat(formData.discount || 0);
        total = sub - disc;
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
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', description: '', customerName: '', discount: '' }));
    } catch (err) { alert('সমস্যা হয়েছে!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-orange-600 font-bold">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 pb-24 md:pb-8 flex flex-col items-center">
      
      {/* Login Overlay */}
      {userRole === 'guest' && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-orange-100 animate-bounce">
            <Egg size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">নিশাদ এগ্রো</h1>
          <p className="text-gray-500 font-medium mb-8">ম্যানেজমেন্ট সিস্টেমে স্বাগতম</p>
          <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
            <input 
              type="password" 
              placeholder="পাসওয়ার্ড লিখুন"
              className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all text-center text-xl tracking-widest font-bold"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <button className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-100 active:scale-95 transition-all">প্রবেশ করুন</button>
          </form>
          <p className="mt-12 text-[10px] text-gray-300 font-bold tracking-widest uppercase">Developer: Shipon Talukdar</p>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-2xl bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
            <Egg size={22} />
          </div>
          <div>
            <h1 className="font-black text-lg leading-none">নিশাদ এগ্রো</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter flex items-center gap-1">
              <Phone size={10} /> 01979665911
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase">ক্যাশ বক্স</p>
          <p className="font-black text-orange-600 text-lg">৳{stats.cash.toLocaleString()}</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl p-5 flex-1">

        {/* --- Dashboard View --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard title="লাল ডিম" value={stats.stock['লাল ডিম']} subValue="পিস" icon={Egg} colorClass="bg-red-50 text-red-600" />
              <MetricCard title="সাদা ডিম" value={stats.stock['সাদা ডিম']} subValue="পিস" icon={Egg} colorClass="bg-gray-50 text-gray-600" />
              <MetricCard title="হাঁস" value={stats.stock['হাঁসের ডিম']} subValue="পিস" icon={Egg} colorClass="bg-blue-50 text-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-orange-50 text-orange-600" />
              <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={User} colorClass="bg-purple-50 text-purple-600" />
            </div>

            <div className="bg-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">আজকের নেট লাভ/লস</p>
              <div className="flex items-end justify-between">
                {userRole === 'admin' ? (
                  <h2 className="text-4xl font-black">৳{stats.todayProfit.toLocaleString()}</h2>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black blur-sm">৳৳৳৳</span>
                    <Lock size={20} className="opacity-50" />
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[10px] font-bold opacity-60 uppercase">আজকের বিক্রি</p>
                  <p className="font-bold">৳{stats.todaySales.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions / Recent Transactions */}
            <div className="flex justify-between items-center px-1">
              <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">সাম্প্রতিক লেনদেন</h3>
              <button onClick={() => setActiveTab('history')} className="text-orange-600 font-bold text-[10px] uppercase border-b-2 border-orange-100">সব দেখুন</button>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 4).map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'sell' ? 'bg-green-50 text-green-600' : t.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      {t.type === 'sell' ? <ArrowUpCircle size={24}/> : t.type === 'buy' ? <ArrowDownCircle size={24}/> : <MinusCircle size={24}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{t.customerName || t.description || t.eggType}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        {t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label.split(' ')[0]}` : t.date} 
                        {t.dueAmount > 0 && <span className="text-red-500 ml-1">• বাকি ৳{t.dueAmount}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${t.type === 'sell' ? 'text-green-600' : 'text-gray-900'}`}>{t.type === 'sell' ? '+' : '-'} ৳{t.amount}</p>
                    <ChevronRight size={14} className="text-gray-200 ml-auto mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Transaction Forms --- */}
        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              {activeTab === 'sell' ? <><ShoppingCart className="text-green-600"/> বিক্রি এন্ট্রি</> : activeTab === 'buy' ? <><PlusCircle className="text-blue-600"/> মাল কেনা</> : <><Wallet className="text-red-600"/> খরচ এন্ট্রি</>}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
              
              {activeTab !== 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <CustomSelect label="ডিমের ধরণ" value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} options={EGG_TYPES.map(v => ({ label: v, value: v }))} />
                    <CustomSelect 
                      label="একক" 
                      value={formData.unit} 
                      onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} 
                      disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'}
                      options={Object.entries(SELL_UNITS).map(([k, v]) => ({ label: v.label, value: k }))} 
                    />
                  </div>

                  {activeTab === 'sell' && (
                    <div className="flex gap-2 mb-4 p-1 bg-gray-50 rounded-2xl">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.saleCategory === 'retail' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>খুচরা</button>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>পাইকারি</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required />
                    <Input label="দর (প্রতি একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} placeholder="0.00" required readOnly={activeTab === 'sell' && userRole === 'subadmin'} />
                  </div>

                  <Input 
                    label={activeTab === 'sell' ? "কাস্টমারের নাম" : "মহাজন/পাইকারের নাম"} 
                    value={formData.customerName} 
                    onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} 
                    placeholder="নাম লিখুন..." 
                    required={activeTab === 'buy' || formData.saleCategory === 'wholesale'}
                  />

                  {activeTab === 'sell' && (
                    <Input label="ডিসকাউন্ট (টাকা)" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} placeholder="0" />
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50 mt-4">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">মোট বিল</p>
                      <p className="text-xl font-black text-gray-800">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</p>
                    </div>
                    <Input label="জমা / নগদ" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব পরিশোধ" />
                  </div>
                </>
              )}

              {activeTab === 'expense' && (
                <>
                  <CustomSelect label="খরচের খাত" value={EXPENSE_TYPES.includes(formData.description) ? formData.description : 'অন্যান্য'} onChange={e => setFormData(p => ({ ...p, description: e.target.value === 'অন্যান্য' ? '' : e.target.value }))} options={EXPENSE_TYPES.map(v => ({ label: v, value: v }))} />
                  {!EXPENSE_TYPES.includes(formData.description) && <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="বিবরণ লিখুন..." required />}
                  <Input label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
                </>
              )}

              <button disabled={submitting} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all mt-6 ${activeTab === 'sell' ? 'bg-green-600 shadow-green-100' : activeTab === 'buy' ? 'bg-blue-600 shadow-blue-100' : 'bg-red-600 shadow-red-100'}`}>
                {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        )}

        {/* --- History View --- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['all', 'sell', 'buy', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>
                  {t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'কেনা' : 'খরচ'}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">লেনদেনের খাতা</h3>
                <div className="flex gap-2">
                  <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`p-2 rounded-lg border transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white border-gray-100 text-gray-400'}`}>
                    <Filter size={14} />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredHistory.length > 0 ? filteredHistory.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex gap-3 items-center">
                      <div className={`w-1 h-8 rounded-full ${t.type === 'sell' ? 'bg-green-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                      <div>
                        <h4 className="font-bold text-sm">{t.customerName || t.description || t.eggType}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">৳{t.amount}</p>
                      {t.dueAmount > 0 && <p className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 rounded-full inline-block mt-1 uppercase">বাকি: ৳{t.dueAmount}</p>}
                      {userRole === 'admin' && (
                        <button onClick={() => { if(window.confirm('মুছতে চান?')) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', t.id)); }} className="text-gray-300 hover:text-red-500 ml-2">
                          <Trash2 size={12} className="inline"/>
                        </button>
                      )}
                    </div>
                  </div>
                )) : <div className="p-10 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">কোনো তথ্য নেই</div>}
              </div>
            </div>
          </div>
        )}

        {/* --- Settings View --- */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tighter"><Settings size={20}/> রেট সেটআপ</h2>
              
              <div className="space-y-6">
                {EGG_TYPES.map(egg => (
                  <div key={egg} className="p-4 bg-gray-50 rounded-2xl">
                    <h3 className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> {egg}</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">পিস</label>
                        <input type="number" value={rates.retail[egg]?.pis || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], pis: e.target.value } } }))} className="w-full px-2 py-2 rounded-xl border-2 border-gray-100 text-sm font-black text-center" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">হালি</label>
                        <input type="number" value={rates.retail[egg]?.hali || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], hali: e.target.value } } }))} className="w-full px-2 py-2 rounded-xl border-2 border-gray-100 text-sm font-black text-center" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">কেস</label>
                        <input type="number" value={rates.retail[egg]?.case || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], case: e.target.value } } }))} className="w-full px-2 py-2 rounded-xl border-2 border-gray-100 text-sm font-black text-center" placeholder="0" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <label className="text-[10px] font-black text-purple-600 uppercase">পাইকারি (পিস)</label>
                      <input type="number" value={rates.wholesale[egg] || ''} onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} className="w-24 px-2 py-1.5 rounded-xl border-2 border-purple-50 bg-purple-50 text-purple-700 text-sm font-black text-center" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('রেট সেভ হয়েছে!'); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black mt-6 shadow-xl active:scale-95 transition-all">সেটিংস সেভ করুন</button>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100">
               <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><ShieldCheck size={14}/> পাসওয়ার্ড আপডেট</h3>
               <div className="space-y-3">
                 <div className="flex gap-2">
                   <input type="text" placeholder="নতুন অ্যাডমিন পাসওয়ার্ড" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold" id="newAdminPass" />
                   <button onClick={async () => { const v = document.getElementById('newAdminPass').value; if(v) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth'), { adminPassword: v }, { merge: true }); alert('আপডেট সফল!'); } }} className="px-4 py-3 bg-gray-100 rounded-xl font-bold text-xs">বদলান</button>
                 </div>
                 <div className="flex gap-2">
                   <input type="text" placeholder="নতুন সাব-এডমিন পাসওয়ার্ড" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold" id="newSubPass" />
                   <button onClick={async () => { const v = document.getElementById('newSubPass').value; if(v) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth'), { subAdminPassword: v }, { merge: true }); alert('আপডেট সফল!'); } }} className="px-4 py-3 bg-gray-100 rounded-xl font-bold text-xs">বদলান</button>
                 </div>
               </div>
            </div>

            <button onClick={() => { setUserRole('guest'); setActiveTab('dashboard'); }} className="w-full py-4 text-red-600 font-black flex items-center justify-center gap-2 border-2 border-red-50 rounded-2xl"><LogOut size={18}/> লগআউট করুন</button>
          </div>
        )}

      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-5 right-5 z-[60] flex items-center justify-around bg-white/80 backdrop-blur-xl border border-white/20 p-2.5 rounded-[2.5rem] shadow-2xl shadow-gray-200 max-w-lg mx-auto">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'buy', icon: ArrowDownCircle },
          { id: 'sell', icon: ArrowUpCircle },
          { id: 'expense', icon: Wallet },
          { id: 'history', icon: History },
          { id: 'settings', icon: Settings, adminOnly: true },
        ].map(item => {
          if (item.adminOnly && userRole !== 'admin') return null;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative p-3 rounded-full transition-all duration-300 ${isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 -translate-y-2' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <item.icon size={22} />
              {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
            </button>
          )
        })}
      </nav>

      {/* Footer Branding */}
      <footer className="w-full py-8 text-center">
        <p className="text-[10px] font-black text-gray-200 uppercase tracking-[0.3em]">Nishad Agro Management System</p>
      </footer>

      {/* Tailwind & CSS Tweaks */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Hind Siliguri', sans-serif;
          margin: 0;
          padding: 0;
          background: #FDFCFB;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

    </div>
  );
}
