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
  ChevronDown,
  DollarSign,
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

// --- Web Components (Moved to top to prevent ReferenceErrors) ---

const SidebarLink = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      activeTab === id 
      ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
      : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
    }`}
  >
    <Icon size={20} className={`${activeTab === id ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'}`} />
    <span className="font-bold text-sm tracking-wide">{label}</span>
  </button>
);

const WebCard = ({ title, children, icon: Icon, action }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
    {title && (
      <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-orange-500" />}
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{title}</h3>
        </div>
        {action && action}
      </div>
    )}
    <div className="p-6 flex-1">{children}</div>
  </div>
);

const MetricCardWeb = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="flex flex-col">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      {blurred ? (
        <div className="flex items-center gap-2">
          <div className="text-2xl font-black text-gray-100 blur-sm select-none tracking-tighter">XXXXX</div>
          <Lock size={14} className="text-gray-300" />
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-black text-gray-900 leading-none">{value}</h2>
          {subValue && <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{subValue}</p>}
        </>
      )}
    </div>
  </div>
);

const MetricBoxWeb = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="flex flex-col">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h2 className="text-2xl font-black text-gray-900 leading-none">{value}</h2>
    </div>
  </div>
);

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

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('guest'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

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

  // --- Auth ---
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

  // --- Data Fetching ---
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

  // --- Automation ---
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
        total = sub - parseFloat(formData.discount || 0);
        paid = formData.paidAmount === '' ? total : parseFloat(formData.paidAmount);
        due = total - paid;
      }
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2'), {
        ...formData, amount: total, paidAmount: paid, dueAmount: due, quantityInPieces: qtyP, createdAt: new Date().toISOString()
      });
      alert('Success!');
      setActiveTab('dashboard');
    } catch (err) { alert('Error!'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <p className="text-orange-600 font-bold tracking-widest text-xs uppercase">System Initializing...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* --- Login Component (Enterprise Style) --- */}
      {userRole === 'guest' && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center">
            <div className="w-20 h-20 bg-orange-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Egg size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-10">Web Management System</p>
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">পাসওয়ার্ড দিন</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none text-2xl font-black tracking-[0.5em] text-center"
                  placeholder="••••"
                  autoFocus
                />
              </div>
              <button className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR (Desktop Web Nav) --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0 overflow-hidden'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 mb-10 mt-2 overflow-hidden">
            <div className="min-w-[40px] h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
              <Egg size={22} />
            </div>
            <h2 className={`font-black text-lg transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>নিশাদ এগ্রো</h2>
          </div>

          <div className="flex-1 space-y-2">
            <SidebarLink id="dashboard" icon={LayoutDashboard} label="ড্যাশবোর্ড" activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest overflow-hidden">লেনদেন</div>
            <SidebarLink id="sell" icon={ArrowUpCircle} label="ডিম বিক্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarLink id="buy" icon={ArrowDownCircle} label="ডিম ক্রয়" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarLink id="expense" icon={Wallet} label="খরচ এন্ট্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest overflow-hidden">রিপোর্ট</div>
            <SidebarLink id="history" icon={History} label="লেনদেন ইতিহাস" activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {userRole === 'admin' && (
              <>
                <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest overflow-hidden">অ্যাডমিন</div>
                <SidebarLink id="settings" icon={Settings} label="সিস্টেম সেটিংস" activeTab={activeTab} setActiveTab={setActiveTab} />
              </>
            )}
          </div>

          <button onClick={() => setUserRole('guest')} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 font-bold hover:bg-rose-50 transition-all">
            <LogOut size={20} />
            <span className={isSidebarOpen ? 'block' : 'hidden'}>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        
        {/* --- Top Navbar --- */}
        <header className="h-20 bg-white border-b border-gray-100 sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <Menu size={24} className="text-gray-500" />
            </button>
            <h1 className="text-lg font-black text-gray-800 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Overview' : activeTab === 'sell' ? 'Sales Management' : activeTab === 'buy' ? 'Purchase' : 'Settings'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">বর্তমান ক্যাশ</p>
              <p className="text-xl font-black text-orange-600 leading-none">৳{stats.cash.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
               <User size={20} className="text-gray-400" />
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">

          {/* --- DASHBOARD VIEW --- */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCardWeb title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-blue-50 text-blue-600" />
                <MetricBoxWeb title="মোট ক্যাশ" value={`৳${stats.cash.toLocaleString()}`} icon={DollarSign} colorClass="bg-orange-50 text-orange-600" />
                <MetricBoxWeb title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
                <MetricCardWeb title="আজকের লাভ" value={`৳${stats.todayProfit.toLocaleString()}`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" blurred={userRole !== 'admin'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <WebCard title="ইনভেন্টরি রিপোর্ট" icon={Store}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {EGG_TYPES.map((egg, idx) => (
                        <div key={egg} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                          <Egg size={32} className={`${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-gray-400' : 'text-blue-500'} mb-4`} />
                          <h4 className="font-black text-sm text-gray-700 mb-1">{egg}</h4>
                          <p className="text-3xl font-black text-gray-900 leading-none">{stats.stock[egg]}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">বর্তমান পিস</p>
                        </div>
                      ))}
                    </div>
                  </WebCard>
                </div>

                <WebCard title="সিস্টেম স্ট্যাটাস" icon={ShieldCheck}>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-500 uppercase">আজকের বিক্রি</span>
                        <span className="font-black text-gray-800">৳{stats.todaySales}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-500 uppercase">আজকের খরচ</span>
                        <span className="font-black text-rose-500">৳{stats.todayExp}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                        <span className="text-xs font-bold text-emerald-600 uppercase">সার্ভার স্ট্যাটাস</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase bg-white px-2 py-1 rounded-lg">Online</span>
                      </div>
                   </div>
                </WebCard>
              </div>

              <WebCard title="সাম্প্রতিক লেনদেন" icon={History} action={<button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 hover:underline uppercase">সব দেখুন</button>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-50">
                      <tr>
                        <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                        <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ধরণ</th>
                        <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">পরিমাণ</th>
                        <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">টাকা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.slice(0, 6).map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-all">
                          <td className="py-4">
                            <p className="font-bold text-sm text-gray-800">{t.customerName || t.description || t.eggType}</p>
                            <p className="text-[10px] text-gray-400">{t.date}</p>
                          </td>
                          <td className="py-4">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                              t.type === 'sell' ? 'bg-emerald-50 text-emerald-600' : t.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {t.type === 'sell' ? 'বিক্রি' : t.type === 'buy' ? 'ক্রয়' : 'খরচ'}
                            </span>
                          </td>
                          <td className="py-4">
                            <p className="text-sm font-bold text-gray-700">{t.quantity > 0 ? `${t.quantity} ${SELL_UNITS[t.unit]?.label || 'পিস'}` : '-'}</p>
                          </td>
                          <td className="py-4 text-right">
                            <p className={`font-black ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WebCard>
            </div>
          )}

          {/* --- FORMS (Sell/Buy/Expense) --- */}
          {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
              <WebCard title={`${activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'ক্রয়' : 'খরচ'} ভাউচার`} icon={Target}>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">তারিখ</label>
                        <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="web-input" required />
                      </div>
                      
                      {activeTab !== 'expense' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">ডিমের ধরণ</label>
                              <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="web-input">
                                {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            {activeTab === 'sell' && (
                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">বিক্রি ক্যাটাগরি</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-1 rounded-lg text-[10px] font-black ${formData.saleCategory === 'retail' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>খুচরা</button>
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-1 rounded-lg text-[10px] font-black ${formData.saleCategory === 'wholesale' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>পাইকারি</button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">পরিমাণ</label>
                                <input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} className="web-input" placeholder="0" required />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">একক</label>
                                <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} className="web-input disabled:opacity-50">
                                   {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                             </div>
                          </div>
                        </>
                      )}

                      {activeTab === 'expense' && (
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">খরচের খাত</label>
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="web-input">
                            {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      {activeTab !== 'expense' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">দর (প্রতি একক)</label>
                                <input type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} className="web-input" placeholder="0.00" required readOnly={activeTab === 'sell' && userRole === 'subadmin'} />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">ডিসকাউন্ট</label>
                                <input type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} className="web-input" placeholder="0" />
                             </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{activeTab === 'sell' ? 'কাস্টমার নাম' : 'মহাজন নাম'}</label>
                            <input type="text" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} className="web-input" placeholder="নাম লিখুন..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} />
                          </div>
                        </>
                      )}

                      {activeTab === 'expense' && (
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">টাকার পরিমাণ</label>
                           <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="web-input" placeholder="0.00" required />
                        </div>
                      )}

                      <div className="p-8 bg-gray-900 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">পেমেন্ট ক্যালকুলেশন</p>
                        <h3 className="text-4xl font-black text-white mb-6">
                          ৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (activeTab === 'expense' ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}
                        </h3>
                        {activeTab !== 'expense' && (
                          <div className="max-w-[200px] mx-auto">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block">নগদ জমা</label>
                            <input type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-4 text-white text-center font-black outline-none focus:border-orange-500" placeholder="সম্পূর্ণ" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button disabled={submitting} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-white ${
                    activeTab === 'sell' ? 'bg-emerald-600 shadow-emerald-100' : activeTab === 'buy' ? 'bg-blue-600 shadow-blue-100' : 'bg-rose-600 shadow-rose-100'
                  }`}>
                    {submitting ? 'PROCESSING...' : 'ভাউচার সেভ করুন'}
                  </button>
                </form>
              </WebCard>
            </div>
          )}

          {/* --- HISTORY TABLE --- */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex gap-2">
                    {['all', 'sell', 'buy', 'expense'].map(t => (
                      <button key={t} onClick={() => setTypeFilter(t)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'}`}>
                        {t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'ক্রয়' : 'খরচ'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                     <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-gray-100'}`}>
                        <Filter size={16} /> {dateFilter === 'today' ? 'আজকের' : 'সকল সময়ের'}
                     </button>
                  </div>
               </div>

               <WebCard title="সম্পূর্ণ লেনদেন রেজিস্টার" icon={History}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">পরিমাণ</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">মোট টাকা</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">বাকি</th>
                          {userRole === 'admin' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">অ্যাকশন</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredHistory.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-5 text-sm font-bold text-gray-500">{t.date}</td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                  <p className="font-black text-gray-800 text-sm">{t.customerName || t.description || t.eggType}</p>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center font-bold text-sm text-gray-600">{t.quantity > 0 ? `${t.quantity} ${t.unit}` : '-'}</td>
                            <td className="px-6 py-5 text-right font-black text-gray-900">৳{t.amount.toLocaleString()}</td>
                            <td className="px-6 py-5 text-right">
                               {t.dueAmount > 0 ? <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black">৳{t.dueAmount}</span> : <span className="text-emerald-500 text-[10px] font-black">Paid</span>}
                            </td>
                            {userRole === 'admin' && (
                              <td className="px-6 py-5 text-center">
                                <button onClick={() => { if(window.confirm('মুছে ফেলতে চান?')) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', t.id)); }} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </WebCard>
            </div>
          )}

          {/* --- SETTINGS VIEW --- */}
          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-8 duration-500">
               <WebCard title="ডিমের রেট কনফিগারেশন" icon={Settings}>
                  <div className="space-y-6">
                     {EGG_TYPES.map(egg => (
                       <div key={egg} className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                          <h4 className="font-black text-sm text-gray-700 mb-6 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> {egg}</h4>
                          <div className="grid grid-cols-3 gap-4">
                             {['pis', 'hali', 'case'].map(u => (
                               <div key={u}>
                                  <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block text-center">{u}</label>
                                  <input 
                                    type="number" 
                                    value={rates.retail[egg]?.[u] || ''} 
                                    onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} 
                                    className="w-full p-3 rounded-xl border border-gray-200 text-center font-black text-sm focus:border-orange-500 outline-none transition-all" 
                                  />
                               </div>
                             ))}
                          </div>
                          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                             <span className="text-[10px] font-black uppercase text-purple-600">Wholesale Rate (পিস)</span>
                             <input 
                               type="number" 
                               value={rates.wholesale[egg] || ''} 
                               onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} 
                               className="w-24 p-2 bg-purple-50 border border-purple-100 rounded-xl text-center font-black text-sm outline-none" 
                             />
                          </div>
                       </div>
                     ))}
                     <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('Updated!'); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">কনফিগারেশন সেভ করুন</button>
                  </div>
               </WebCard>

               <div className="space-y-8">
                  <WebCard title="সিস্টেম সিকিউরিটি" icon={ShieldCheck}>
                     <p className="text-xs text-gray-400 mb-6 font-bold uppercase tracking-widest leading-loose">পাসওয়ার্ড পরিবর্তন করার সময় সতর্কতা অবলম্বন করুন।</p>
                     <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                           <span className="text-xs font-bold text-gray-600 uppercase">অ্যাডমিন পাসওয়ার্ড</span>
                           <button className="text-[10px] font-black text-orange-600 uppercase bg-white px-3 py-1 rounded-lg border border-orange-100">পরিবর্তন</button>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                           <span className="text-xs font-bold text-gray-600 uppercase">সাব-অ্যাডমিন পাসওয়ার্ড</span>
                           <button className="text-[10px] font-black text-orange-600 uppercase bg-white px-3 py-1 rounded-lg border border-orange-100">পরিবর্তন</button>
                        </div>
                     </div>
                  </WebCard>
               </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap');
        
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
          font-family: 'Hind Siliguri', sans-serif !important; 
        }
        
        body {
          background: #F8F9FA;
        }

        .login-overlay-full { position: fixed; inset: 0; z-index: 100; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-content-box { width: 100%; max-width: 320px; text-align: center; }
        .login-icon-circle { background: #fff7ed; color: #ea580c; width: 80px; height: 80px; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .login-field-input { width: 100%; padding: 1.25rem; background: #f9fafb; border: 2px solid #f3f4f6; border-radius: 1.5rem; text-align: center; font-size: 2rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; }
        .login-action-btn { width: 100%; padding: 1.25rem; background: #111827; color: white; border: none; border-radius: 1.5rem; font-weight: 900; margin-top: 1rem; }

        .app-global-header { width: 100%; position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.85); backdrop-filter: blur(24px); border-bottom: 1px solid #f0f0f0; padding: 1.25rem 0; }
        .header-icon-box { padding: 0.6rem; border-radius: 1.25rem; }
        
        .web-input {
          width: 100%;
          padding: 1rem 1.25rem;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          font-weight: 700;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        
        .web-input:focus {
          border-color: #EA580C;
          background: white;
          box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.05);
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

        /* Scrollbar Styling */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }

        .animate-in {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
