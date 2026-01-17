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
  query,
  where,
  orderBy
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
  ChevronDown,
  DollarSign,
  Target,
  MoreVertical,
  ArrowRightLeft
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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// App ID Sanitization for Firestore Paths
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'nishad-agro-system';
const appId = rawAppId.replace(/\//g, '_');

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

// --- Professional UI Components ---

const SidebarLink = ({ id, icon: Icon, label, activeTab, setActiveTab, onClick }) => (
  <button
    onClick={() => { setActiveTab(id); if(onClick) onClick(); }}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      activeTab === id 
      ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
      : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
    }`}
  >
    <Icon size={20} className={`${activeTab === id ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'}`} />
    <span className="font-bold text-sm tracking-wide">{label}</span>
  </button>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      {blurred && <Lock size={16} className="text-gray-300" />}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      {blurred ? (
        <div className="text-2xl font-black text-gray-200 blur-sm select-none">XXXXXX</div>
      ) : (
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-black text-gray-900 leading-none">{value}</h2>
          {subValue && <span className="text-[10px] font-bold text-gray-400 uppercase">{subValue}</span>}
        </div>
      )}
    </div>
  </div>
);

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('guest'); // guest, admin, subadmin
  const [passwordInput, setPasswordInput] = useState('');

  // Settings state
  const [adminPassword, setAdminPassword] = useState('665911');
  const [subAdminPassword, setSubAdminPassword] = useState('1234');
  const [rates, setRates] = useState({
    retail: { 'লাল ডিম': { pis: '', hali: '', case: '' }, 'সাদা ডিম': { pis: '', hali: '', case: '' }, 'হাঁসের ডিম': { pis: '', hali: '', case: '' } },
    wholesale: { 'লাল ডিম': '', 'সাদা ডিম': '', 'হাঁসের ডিম': '' }
  });

  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    eggType: 'লাল ডিম',
    unit: 'pis',
    quantity: '',
    rate: '',
    saleCategory: 'retail',
    customerName: '',
    discount: '',
    paidAmount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- Auth logic ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- Data listener ---
  useEffect(() => {
    if (!user) return;
    
    // Transactions stream
    const qTr = collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2');
    const unsubTr = onSnapshot(qTr, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    // Settings stream
    const docRates = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates');
    const unsubRates = onSnapshot(docRates, (d) => {
      if (d.exists()) setRates(d.data());
    });

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

  // --- Auto-rate logic ---
  useEffect(() => {
    if (activeTab === 'sell' && rates) {
      if (formData.saleCategory === 'wholesale') {
        setFormData(p => ({ ...p, unit: 'pis', rate: rates.wholesale?.[p.eggType] || '' }));
      } else {
        setFormData(p => ({ ...p, rate: rates.retail?.[p.eggType]?.[p.unit] || '' }));
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, activeTab, rates]);

  // --- Calculations ---
  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let cash = 0, custDue = 0, suppDue = 0, todaySales = 0, todayProfit = 0, todayExp = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Average cost for profit calculation (Simplified)
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
    else alert('Invalid Password');
    setPasswordInput('');
  };

  const handleSignOut = () => {
    setUserRole('guest');
    setActiveTab('dashboard');
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
        ...formData,
        type,
        amount: total,
        paidAmount: paid,
        dueAmount: due,
        quantityInPieces: qtyP,
        createdAt: new Date().toISOString()
      });

      alert('Successfully Saved!');
      setActiveTab('dashboard');
      setFormData({ ...formData, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' });
    } catch (err) {
      alert('Error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id));
    } catch (err) {
      alert("Error deleting record.");
    }
  };

  // --- View Helper ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-orange-600 font-bold uppercase tracking-widest text-[10px]">Nishad Agro initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row font-hind overflow-x-hidden">
      
      {/* Login Screen */}
      {userRole === 'guest' && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-100">
              <Egg size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-10">Web Management Pro</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  placeholder="পাসওয়ার্ড লিখুন" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  className="w-full py-4 pl-12 pr-6 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all text-2xl font-black tracking-widest placeholder:tracking-normal placeholder:font-bold placeholder:text-gray-300"
                  autoFocus
                />
              </div>
              <button className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-2xl hover:bg-gray-800 transition-all active:scale-95">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 bg-white border-b border-gray-100 sticky top-0 z-50 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600 rounded-lg text-white">
            <Egg size={20} />
          </div>
          <span className="font-black text-gray-800">নিশাদ এগ্রো</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="hidden lg:flex items-center gap-3 mb-10 overflow-hidden">
            <div className="p-2.5 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-100">
              <Egg size={22} />
            </div>
            <h2 className="font-black text-xl text-gray-900 tracking-tighter">নিশাদ এগ্রো</h2>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarLink id="dashboard" icon={LayoutDashboard} label="ড্যাশবোর্ড" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">লেনদেন</div>
            <SidebarLink id="sell" icon={ShoppingCart} label="ডিম বিক্রি" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink id="buy" icon={ArrowDownCircle} label="মাল ক্রয়" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink id="expense" icon={Wallet} label="খরচ এন্ট্রি" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">রিপোর্ট</div>
            <SidebarLink id="history" icon={History} label="রেজিস্টার বুক" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
            {userRole === 'admin' && (
              <>
                <div className="pt-4 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">অ্যাডমিন</div>
                <SidebarLink id="settings" icon={Settings} label="সেটিংস" activeTab={activeTab} setActiveTab={setActiveTab} onClick={() => setIsSidebarOpen(false)} />
              </>
            )}
          </nav>

          <button onClick={handleSignOut} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 font-bold hover:bg-rose-50 transition-all">
            <LogOut size={20} />
            <span>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 bg-white border-b border-gray-100 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Dashboard</h1>
            <p className="text-xl font-black text-gray-900">
              {activeTab === 'dashboard' ? 'Business Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right border-r border-gray-100 pr-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">বর্তমান ক্যাশ</p>
              <p className="text-2xl font-black text-orange-600 leading-none mt-1">৳{stats.cash.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <User size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-gray-900">{userRole === 'admin' ? 'Admin' : 'Operator'}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-5 lg:p-8 flex-1 max-w-7xl mx-auto w-full">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={ArrowRightLeft} colorClass="bg-rose-50 text-rose-600" />
                <MetricCard title="আজকের বিক্রি" value={`৳${stats.todaySales.toLocaleString()}`} icon={ArrowUpCircle} colorClass="bg-orange-50 text-orange-600" />
                <MetricCard title="আজকের নিট লাভ" value={`৳${stats.todayProfit.toLocaleString()}`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" blurred={userRole !== 'admin'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stock Summary */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Store size={20}/></div>
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">ইনভেন্টরি স্ট্যাটাস</h3>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">Live stock</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {EGG_TYPES.map((egg, idx) => (
                        <div key={egg} className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50/50 border border-gray-100 group hover:border-orange-200 transition-all">
                          <Egg size={36} className={`${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-gray-400' : 'text-blue-500'} mb-4 transition-transform group-hover:scale-110`} />
                          <h4 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-1">{egg}</h4>
                          <p className="text-3xl font-black text-gray-900 leading-none mt-2">{stats.stock[egg]}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-tighter">Current Pieces</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profit Visual Card (Large) */}
                  <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600 rounded-full blur-[100px] opacity-20 transition-opacity group-hover:opacity-30"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div>
                        <p className="text-xs font-black text-orange-500 uppercase tracking-[0.3em] mb-4">Total Liquidity</p>
                        <h2 className="text-5xl font-black text-white leading-none tracking-tighter">৳{stats.cash.toLocaleString()}</h2>
                        <p className="text-gray-400 text-sm font-medium mt-4">Available cash in box today</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Today's Sales</p>
                          <p className="text-xl font-black">৳{stats.todaySales}</p>
                        </div>
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Today's Expense</p>
                          <p className="text-xl font-black text-rose-400">৳{stats.todayExp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Quick History */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm flex items-center gap-2">
                      <History size={18} className="text-orange-500"/> সাম্প্রতিক হিসাব
                    </h3>
                    <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-orange-600 hover:underline uppercase tracking-widest">সকল বুক</button>
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2 no-scrollbar">
                    {transactions.slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all active:scale-98">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            t.type === 'sell' ? 'bg-emerald-50 text-emerald-600' : t.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {t.type === 'sell' ? <ArrowUpCircle size={20}/> : t.type === 'buy' ? <ArrowDownCircle size={20}/> : <MinusCircle size={20}/>}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-800 leading-none mb-1.5 line-clamp-1">{t.customerName || t.description || t.eggType}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t.date}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-black ${t.type === 'sell' ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {t.type === 'sell' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forms Tabs */}
          {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
            <div className="max-w-4xl mx-auto animate-fade-in-up">
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className={`p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 ${
                  activeTab === 'sell' ? 'bg-emerald-600' : activeTab === 'buy' ? 'bg-blue-600' : 'bg-rose-600'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                      {activeTab === 'sell' ? <ShoppingCart size={32}/> : activeTab === 'buy' ? <ArrowDownCircle size={32}/> : <Wallet size={32}/>}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tight">
                        {activeTab === 'sell' ? 'ডিম বিক্রি' : activeTab === 'buy' ? 'মাল ক্রয়' : 'খরচ এন্ট্রি'}
                      </h2>
                      <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-xs mt-1">Voucher Entry System</p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Date Selected</p>
                    <p className="text-xl font-black">{formData.date}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">লেনদেন তারিখ</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="professional-input pl-12" required />
                        </div>
                      </div>
                      
                      {activeTab !== 'expense' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">ডিমের ধরণ</label>
                              <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="professional-input">
                                {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            {activeTab === 'sell' && (
                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">ক্যাটাগরি</label>
                                <div className="flex bg-gray-100 p-1 rounded-2xl h-[52px]">
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-1 rounded-xl text-[10px] font-black transition-all ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>খুচরা</button>
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-1 rounded-xl text-[10px] font-black transition-all ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>পাইকারি</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">একক</label>
                               <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} className="professional-input disabled:opacity-50">
                                 {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                               </select>
                            </div>
                          </div>
                        </>
                      )}

                      {activeTab === 'expense' && (
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">খরচের খাত</label>
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="professional-input">
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
                            <ModernInput label="দর (প্রতি একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} placeholder="0.00" required readOnly={activeTab === 'sell' && userRole === 'subadmin'} icon={DollarSign} />
                            <ModernInput label="ডিসকাউন্ট" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} placeholder="0" icon={TrendingUp} />
                          </div>
                          <ModernInput label={activeTab === 'sell' ? 'কাস্টমার নাম' : 'মহাজন নাম'} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="পুরো নাম লিখুন..." required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} icon={User} />
                        </>
                      )}

                      {activeTab === 'expense' && (
                        <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} />
                      )}

                      <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Total Amount to Pay</p>
                        <h3 className={`text-5xl font-black leading-none ${activeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (activeTab === 'expense' ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}
                        </h3>
                        {activeTab !== 'expense' && (
                          <div className="mt-8 flex flex-col items-center">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2">নগদ জমা (ঐচ্ছিক)</label>
                            <input type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} className="w-40 py-2 border-b-2 border-gray-200 text-center font-black text-xl outline-none focus:border-orange-500 bg-transparent" placeholder="Paid Amt" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button disabled={submitting} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all text-white ${
                    activeTab === 'sell' ? 'bg-emerald-600' : activeTab === 'buy' ? 'bg-blue-600' : 'bg-rose-600'
                  }`}>
                    {submitting ? 'ভাউচার প্রসেসিং...' : 'ভাউচার সেভ করুন'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* History / Register View */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {['all', 'sell', 'buy', 'expense'].map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                      {t === 'all' ? 'সব রেকর্ড' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'ক্রয়' : 'খরচ'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${dateFilter === 'today' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-gray-400 border-gray-100'}`}>
                  <Filter size={16}/> {dateFilter === 'today' ? 'আজকের' : 'সম্পূর্ণ'}
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[900px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ ও কাস্টমার</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">পরিমাণ</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">মোট বিল</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অবশিষ্ট বাকি</th>
                        {userRole === 'admin' && <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredHistory.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/30 transition-all group">
                          <td className="px-8 py-6 text-sm font-black text-gray-400">{t.date}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-2.5 h-2.5 rounded-full ${t.type === 'sell' ? 'bg-emerald-500' : t.type === 'buy' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                              <div>
                                <p className="font-black text-gray-800 text-sm">{t.customerName || t.description || t.eggType}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center font-bold text-sm text-gray-600">{t.quantity > 0 ? `${t.quantity} ${t.unit || 'পিস'}` : '-'}</td>
                          <td className="px-8 py-6 text-right font-black text-gray-900">৳{t.amount.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right">
                            {t.dueAmount > 0 
                              ? <span className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-rose-100">৳{t.dueAmount.toLocaleString()}</span> 
                              : <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-end gap-1"><ShieldCheck size={14}/> Paid</span>
                            }
                          </td>
                          {userRole === 'admin' && (
                            <td className="px-8 py-6 text-center">
                              <button onClick={() => handleDelete(t.id)} className="p-2.5 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredHistory.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center">
                       <AlertCircle size={48} className="text-gray-100 mb-4" />
                       <p className="text-gray-300 font-black uppercase text-xs tracking-[0.3em]">No records found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-right">
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-10 bg-gray-900 text-white flex items-center gap-6">
                   <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/10">
                    <Settings size={32} />
                   </div>
                   <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">ডিমের রেট সেটিংস</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs mt-1">Global Rate Configuration</p>
                   </div>
                </div>
                
                <div className="p-10 space-y-10">
                  {EGG_TYPES.map(egg => (
                    <div key={egg} className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Egg size={80} />
                      </div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-3 h-3 rounded-full bg-orange-600 animate-pulse"></div>
                        <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">{egg}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        {['pis', 'hali', 'case'].map(u => (
                          <div key={u} className="flex flex-col items-center">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{u.toUpperCase()}</label>
                            <input 
                              type="number" 
                              value={rates.retail[egg]?.[u] || ''} 
                              onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} 
                              className="w-full py-4 rounded-2xl bg-white border-2 border-transparent focus:border-orange-500 text-center font-black text-xl outline-none shadow-sm transition-all"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={16} className="text-purple-600" />
                          <span className="text-[11px] font-black text-purple-600 uppercase tracking-widest">পাইকারি দর (প্রতি পিস)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 font-bold">৳</span>
                          <input 
                            type="number" 
                            value={rates.wholesale[egg] || ''} 
                            onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} 
                            className="w-32 py-3 bg-purple-50 rounded-xl text-center font-black text-purple-600 outline-none border border-transparent focus:border-purple-200"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={saveRates} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">সিস্টেম রেট আপডেট করুন</button>
                </div>
              </div>
            </div>
          )}

        </main>

        <footer className="py-10 text-center border-t border-gray-100">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">Nishad Agro Web System v2.0</p>
        </footer>
      </div>

      {/* Global CSS Logic */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        body { 
          background: #F8F9FA !important; 
          color: #111; 
          -webkit-font-smoothing: antialiased; 
          -moz-osx-font-smoothing: grayscale;
        }

        .professional-input {
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
        .professional-input:focus {
          border-color: #EA580C;
          background: white;
          box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.05);
        }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
        .animate-fade-in-right { animation: fadeInRight 0.5s ease-out; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// --- Internal Helpers ---

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, className = "" }) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
    {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`w-full ${Icon ? 'pl-12' : 'px-6'} py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold text-gray-800 placeholder:text-gray-300 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const MetricBoxWeb = ({ title, value, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:translate-y-[-2px] transition-all">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="flex flex-col">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      {blurred ? (
        <div className="flex items-center gap-1">
          <div className="text-lg font-black text-gray-200 blur-sm select-none tracking-tighter">XXXXX</div>
          <Lock size={12} className="text-gray-300" />
        </div>
      ) : (
        <h2 className="text-2xl font-black text-gray-900 leading-none">{value}</h2>
      )}
    </div>
  </div>
);
