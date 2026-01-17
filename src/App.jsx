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
  DollarSign,
  Target,
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

// --- Helper Components ---

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

const MetricBoxWeb = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
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
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-gray-900 leading-none">{value}</h2>
          {subValue && <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{subValue}</p>}
        </div>
      )}
    </div>
  </div>
);

const WebCard = ({ title, children, icon: Icon, action }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
    {title && (
      <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-orange-600" />}
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{title}</h3>
        </div>
        {action && action}
      </div>
    )}
    <div className="p-6 flex-1">{children}</div>
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
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold text-gray-800 placeholder:text-gray-300 ${readOnly ? 'opacity-60 cursor-not-allowed border-gray-100' : ''}`}
      />
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
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

  // Derived state
  const isExpense = activeTab === 'expense';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';
  const isSubAdmin = userRole === 'subadmin';
  const isRateReadOnly = isSell && isSubAdmin;
  const isWholesale = isSell && formData.saleCategory === 'wholesale';

  // Auth logic
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (err) { console.error(err); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Data listeners
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

  // Calculations
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) setUserRole('admin');
    else if (passwordInput === subAdminPassword) setUserRole('subadmin');
    else alert('Invalid Password');
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
      alert('Successfully Saved!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('Error!'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("মুছে ফেলতে চান?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id)); } catch (err) { alert("Error!"); }
  };

  const saveRates = async () => {
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('Updated!'); } catch (err) { alert("Error!"); }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="web-system-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        /* AGGRESSIVE RESET */
        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          min-height: 100vh !important; 
          display: block !important; 
          background: #F8F9FA !important;
          color: #111 !important;
          place-items: initial !important;
          text-align: left !important;
          overflow-x: hidden !important;
        }

        .web-system-wrapper { display: flex; width: 100%; min-height: 100vh; }

        .sidebar-container { 
          position: fixed; top: 0; bottom: 0; left: 0; z-index: 50; 
          background: #fff; border-right: 1px solid #f0f0f0; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 10px 0 30px rgba(0,0,0,0.02);
        }
        .sidebar-container.expanded { width: 260px !important; }
        .sidebar-container.collapsed { width: 80px !important; }
        
        .sidebar-inner-scroll { height: 100%; display: flex; flex-direction: column; padding: 1.5rem 1rem !important; overflow-y: auto; }
        .sidebar-logo-area { display: flex; align-items: center; gap: 1rem; margin-bottom: 2.5rem !important; padding: 0 0.5rem !important; }
        .sidebar-logo-icon { min-width: 40px; height: 40px; background: #EA580C; color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .sidebar-title { font-weight: 900; font-size: 1.25rem; }
        .sidebar-divider { padding: 1.5rem 1rem 0.5rem !important; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }
        .sidebar-logout-btn { margin-top: auto !important; display: flex; align-items: center; gap: 1rem; padding: 1rem !important; border-radius: 12px; color: #f43f5e; font-weight: 700; border: none; background: none; cursor: pointer; }

        .main-content-wrapper { flex: 1; transition: padding 0.3s; width: 100%; }
        .sidebar-expanded { padding-left: 260px !important; }
        .sidebar-collapsed { padding-left: 80px !important; }

        .top-navbar-fixed { 
          height: 80px; background: rgba(255,255,255,0.85); backdrop-filter: blur(24px); 
          position: sticky; top: 0; z-index: 40; border-bottom: 1px solid #f0f0f0; 
          display: flex; align-items: center; justify-content: space-between; padding: 0 2rem !important; 
        }
        .navbar-left { display: flex; align-items: center; gap: 1.5rem; }
        .sidebar-toggle-trigger { border: none; background: none; color: #6b7280; cursor: pointer; padding: 8px !important; border-radius: 12px; }
        .nav-page-title { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #374151; }

        .navbar-right { display: flex; align-items: center; gap: 2rem; }
        .cash-indicator-pill { text-align: right; }
        .indicator-label { font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 2px !important; }
        .indicator-value { font-size: 1.25rem; font-weight: 900; color: #EA580C; line-height: 1; }
        .user-avatar-circle { width: 40px; height: 40px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #9ca3af; }

        .page-content-padding { padding: 2.5rem !important; max-width: 1400px; margin: 0 auto !important; }
        .dashboard-grid-layout { display: flex; flex-direction: column; gap: 2rem !important; }
        .metrics-summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem !important; }
        .inventory-row-split { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem !important; }
        .inventory-grid-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem !important; }
        .inventory-item-pill { padding: 1.5rem !important; background: #F9FAFB; border: 1px solid #F0F0F0; border-radius: 20px; text-align: center; }
        .pill-value { font-size: 2rem; font-weight: 900; margin: 4px 0 !important; }

        .status-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem !important; border-bottom: 1px solid #f3f4f6; margin-bottom: 0.75rem !important; font-size: 0.875rem; }
        .status-badge { font-size: 10px; font-weight: 900; color: #10b981; background: #ecfdf5; padding: 2px 8px !important; border-radius: 8px; text-transform: uppercase; }

        .web-data-table { width: 100%; border-collapse: collapse; }
        .web-data-table th { padding: 1rem !important; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; border-bottom: 1px solid #f3f4f6; text-align: left; }
        .web-data-table td { padding: 1.25rem 1rem !important; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .row-flex-cell { display: flex; align-items: center; gap: 1rem; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.sell { background: #10b981; }
        .status-dot.buy { background: #3b82f6; }
        .status-dot.expense { background: #ef4444; }
        .row-amount { font-weight: 900; font-size: 14px; }
        .row-amount.sell { color: #10b981; }
        .due-pill { background: #fff1f2; color: #f43f5e; padding: 4px 12px !important; border-radius: 20px; font-size: 11px; font-weight: 900; }

        .modern-select-web { width: 100%; padding: 0.875rem !important; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 1rem; font-weight: 700; outline: none; }
        .payment-summary-voucher-box { background: #111827; padding: 2.5rem !important; border-radius: 2rem; text-align: center; color: #fff; }
        .voucher-submit-btn { width: 100%; padding: 1.5rem !important; border-radius: 1rem; border: none; color: #fff; font-weight: 900; text-transform: uppercase; cursor: pointer; }
        .voucher-submit-btn.sell { background: #10b981; }
        .voucher-submit-btn.buy { background: #2563eb; }
        .voucher-submit-btn.expense { background: #ef4444; }

        .login-full-screen { position: fixed; inset: 0; z-index: 100; background: #fff; display: flex; align-items: center; justify-content: center; padding: 2rem !important; }
        .login-box-container { width: 100%; max-width: 360px; text-align: center; }
        .login-icon-box { width: 90px; height: 90px; background: #fff7ed; color: #ea580c; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem !important; }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1024px) {
          .sidebar-container { transform: translateX(-100%); width: 260px !important; }
          .sidebar-container.expanded { transform: translateX(0); }
          .main-content-wrapper { padding-left: 0 !important; }
        }
      `}</style>

      {/* --- SIDEBAR --- */}
      <aside className={`sidebar-container ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-inner-scroll">
          <div className="sidebar-logo-area">
            <div className="sidebar-logo-icon"><Egg size={22} /></div>
            <h2 className={`sidebar-title ${isSidebarOpen ? '' : 'hidden'}`}>নিশাদ এগ্রো</h2>
          </div>

          <div className="sidebar-links-area">
            <SidebarLink id="dashboard" icon={LayoutDashboard} label="ড্যাশবোর্ড" activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="sidebar-divider">লেনদেন</div>
            <SidebarLink id="sell" icon={ArrowUpCircle} label="ডিম বিক্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarLink id="buy" icon={ArrowDownCircle} label="ডিম ক্রয়" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarLink id="expense" icon={Wallet} label="খরচ এন্ট্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="sidebar-divider">রিপোর্ট</div>
            <SidebarLink id="history" icon={History} label="লেনদেন রেজিস্টার" activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {userRole === 'admin' && (
              <>
                <div className="sidebar-divider">অ্যাডমিন</div>
                <SidebarLink id="settings" icon={Settings} label="সিস্টেম সেটিংস" activeTab={activeTab} setActiveTab={setActiveTab} />
              </>
            )}
          </div>

          <button onClick={() => setUserRole('guest')} className="sidebar-logout-btn">
            <LogOut size={20} />
            <span className={isSidebarOpen ? '' : 'hidden'}>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className={`main-content-wrapper ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        
        <header className="top-navbar-fixed">
          <div className="navbar-left">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-trigger"><Menu size={24} /></button>
            <h1 className="nav-page-title">{activeTab.toUpperCase()}</h1>
          </div>
          <div className="navbar-right">
            <div className="cash-indicator-pill">
              <p className="indicator-label">বর্তমান ক্যাশ</p>
              <p className="indicator-value">৳{stats.cash.toLocaleString()}</p>
            </div>
            <div className="user-avatar-circle"><User size={20} /></div>
          </div>
        </header>

        <main className="page-content-padding">
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid-layout animate-in">
              <div className="metrics-summary-row">
                <MetricBoxWeb title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} colorClass="bg-blue-50 text-blue-600" />
                <MetricBoxWeb title="মোট ক্যাশ" value={`৳${stats.cash.toLocaleString()}`} icon={DollarSign} colorClass="bg-orange-50 text-orange-600" />
                <MetricBoxWeb title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
                <MetricBoxWeb title="আজকের লাভ" value={`৳${stats.todayProfit.toLocaleString()}`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" blurred={userRole !== 'admin'} />
              </div>

              <div className="inventory-row-split">
                <WebCard title="ইনভেন্টরি রিপোর্ট" icon={Store}>
                  <div className="inventory-grid-three">
                    {EGG_TYPES.map((egg, idx) => (
                      <div key={egg} className="inventory-item-pill">
                        <Egg size={24} className={`${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-gray-400' : 'text-blue-500'} mb-3`} />
                        <h4 className="font-black text-[13px]">{egg}</h4>
                        <p className="pill-value">{stats.stock[egg]}</p>
                      </div>
                    ))}
                  </div>
                </WebCard>
                <WebCard title="সিস্টেম স্ট্যাটাস" icon={ShieldCheck}>
                   <div className="status-item-list">
                      <div className="status-row"><span>আজকের বিক্রি</span><span className="font-bold">৳{stats.todaySales}</span></div>
                      <div className="status-row"><span>আজকের খরচ</span><span className="font-bold text-rose-500">৳{stats.todayExp}</span></div>
                      <div className="status-row" style={{border: 'none'}}><span>সার্ভার</span><span className="status-badge">Online</span></div>
                   </div>
                </WebCard>
              </div>

              <WebCard title="সাম্প্রতিক লেনদেন" icon={History}>
                <div className="overflow-x-auto">
                  <table className="web-data-table">
                    <thead><tr><th>বিবরণ</th><th>ধরণ</th><th>পরিমাণ</th><th className="text-right">টাকা</th></tr></thead>
                    <tbody>
                      {transactions.slice(0, 6).map(t => (
                        <tr key={t.id}>
                          <td><p className="row-main-text">{t.customerName || t.description || t.eggType}</p></td>
                          <td><span className={`type-tag ${t.type}`}>{t.type}</span></td>
                          <td>{t.quantity > 0 ? `${t.quantity} ${t.unit || 'পিস'}` : '-'}</td>
                          <td className="text-right font-black">৳{t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WebCard>
            </div>
          )}

          {(isSell || isBuy || isExpense) && (
            <div className="animate-in max-w-4xl mx-auto">
              <WebCard title={`${activeTab.toUpperCase()} ভাউচার এন্ট্রি`} icon={Target}>
                <form onSubmit={handleSubmit} className="voucher-form-layout">
                  <div className="form-grid-columns">
                    <div className="form-column" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                      <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                      {!isExpense && (
                        <div className="form-grid-inner">
                          <div>
                            <label className="sidebar-divider">ডিমের ধরণ</label>
                            <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="modern-select-web">
                              {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          {isSell && (
                            <div>
                               <label className="sidebar-divider">ক্যাটাগরি</label>
                               <div className="category-toggle-box">
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`cat-btn ${formData.saleCategory === 'retail' ? 'active' : ''}`}>খুচরা</button>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`cat-btn ${formData.saleCategory === 'wholesale' ? 'active' : ''}`}>পাইকারি</button>
                               </div>
                            </div>
                          )}
                        </div>
                      )}
                      {!isExpense && (
                         <div className="form-grid-inner">
                            <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} required icon={PlusCircle} />
                            <div>
                               <label className="sidebar-divider">একক</label>
                               <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || (isSell && formData.saleCategory === 'wholesale')} className="modern-select-web">
                                  {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                               </select>
                            </div>
                         </div>
                      )}
                    </div>
                    <div className="form-column" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                       {!isExpense && (
                         <>
                          <div className="form-grid-inner">
                             <ModernInput label="দর" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} required icon={DollarSign} />
                             <ModernInput label="ডিসকাউন্ট" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} icon={TrendingUp} />
                          </div>
                          <ModernInput label="নাম" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="পুরো নাম" icon={User} />
                         </>
                       )}
                       {isExpense && (
                         <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required icon={Wallet} />
                       )}
                       <div className="payment-summary-voucher-box">
                          <p className="sidebar-divider" style={{color: '#9ca3af'}}>Total Bill</p>
                          <h3 style={{fontSize: '2.5rem', fontWeight: 900}}>৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}</h3>
                       </div>
                    </div>
                  </div>
                  <button disabled={submitting} className={`voucher-submit-btn ${activeTab}`}>{submitting ? '...' : 'সেভ করুন'}</button>
                </form>
              </WebCard>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in space-y-4">
              <WebCard title="রেজিস্টার বুক" icon={History}>
                <div className="overflow-x-auto">
                  <table className="web-data-table">
                    <thead><tr><th>তারিখ</th><th>বিবরণ</th><th>পরিমাণ</th><th className="text-right">টাকা</th><th>বাকি</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredHistory.map(t => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td><div className="row-flex-cell"><div className={`status-dot ${t.type}`}></div>{t.customerName || t.eggType}</div></td>
                          <td>{t.quantity > 0 ? `${t.quantity} ${t.unit}` : '-'}</td>
                          <td className="text-right font-black">৳{t.amount.toLocaleString()}</td>
                          <td>{t.dueAmount > 0 ? <span className="due-pill">৳{t.dueAmount}</span> : 'Paid'}</td>
                          <td>{userRole === 'admin' && <button onClick={() => handleDelete(t.id)} style={{border: 'none', background: 'none', color: '#d1d5db'}}><Trash2 size={16}/></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WebCard>
            </div>
          )}

          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="animate-in max-w-2xl mx-auto">
               <WebCard title="রেট সেটিংস" icon={Settings}>
                  <div className="settings-rate-list">
                    {EGG_TYPES.map(egg => (
                      <div key={egg} className="rate-config-card">
                         <h4 className="rate-card-title"><div className="dot"></div> {egg}</h4>
                         <div className="rate-input-grid">
                            {['pis', 'hali', 'case'].map(u => (
                              <div key={u} className="rate-input-item">
                                <label>{u}</label>
                                <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="rate-field" />
                              </div>
                            ))}
                         </div>
                         <button onClick={saveRates} className="save-settings-btn">সেভ</button>
                      </div>
                    ))}
                  </div>
               </WebCard>
            </div>
          )}
        </main>
      </div>

      {/* Login Screen */}
      {userRole === 'guest' && (
        <div className="login-full-screen">
          <div className="login-box-container">
            <div className="login-icon-box"><Egg size={44} /></div>
            <h1 className="sidebar-title" style={{fontSize: '2rem'}}>নিশাদ এগ্রো</h1>
            <form onSubmit={handleLogin} style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="modern-select-web" style={{textAlign: 'center', fontSize: '1.5rem'}} autoFocus />
              <button className="login-submit-btn">Login</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
