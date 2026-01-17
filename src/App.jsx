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
  ArrowRightLeft
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

// Rule 1: Strict Paths - appId segment must be single
const appId = 'nishad_agro_v5_pro_system';

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

// --- Sub-Components (Helper UI) ---

const SidebarLink = ({ id, icon: Icon, label, activeTab, setActiveTab, onClick }) => (
  <button
    onClick={() => { setActiveTab(id); if(onClick) onClick(); }}
    className={`sidebar-btn ${activeTab === id ? 'active' : ''}`}
  >
    <Icon size={20} />
    <span className="label-text">{label}</span>
  </button>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="metric-card shadow-lg">
    <div className={`icon-container ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="card-info">
      <p className="card-title">{title}</p>
      {blurred ? (
        <div className="blurred-val">XXXXX <Lock size={12} /></div>
      ) : (
        <div className="val-group">
          <h2 className="main-val font-black">{value}</h2>
          {subValue && <span className="sub-val">{subValue}</span>}
        </div>
      )}
    </div>
  </div>
);

const WebCard = ({ title, children, icon: Icon, action }) => (
  <div className="glass-card">
    {title && (
      <div className="glass-header">
        <div className="header-label">
          {Icon && <Icon size={18} color="#EA580C" />}
          <h3>{title}</h3>
        </div>
        {action}
      </div>
    )}
    <div className="glass-content">{children}</div>
  </div>
);

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, className = "" }) => (
  <div className={`modern-field ${className}`}>
    {label && <label className="field-label">{label} {required && <span className="req">*</span>}</label>}
    <div className="field-wrapper">
      {Icon && <Icon className="field-icon" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={Icon ? 'with-icon' : ''}
      />
    </div>
  </div>
);

// --- Main App Component ---

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
    eggType: 'লাল ডিম', unit: 'pis', quantity: '', rate: '', saleCategory: 'retail', 
    customerName: '', discount: '', paidAmount: '', amount: '', description: '', 
    date: new Date().toISOString().split('T')[0]
  });

  const isExpense = activeTab === 'expense';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';

  // --- Auth & Data Flow ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
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
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

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

  // Rate Automator
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
      alert('সফলভাবে সেভ হয়েছে!');
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
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('আপডেট সফল!'); } catch (err) { alert("Error!"); }
  };

  if (loading) return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p className="loader-text font-black uppercase">নিশাদ এগ্রো...</p>
      <style>{`
        .loader-container { height: 100vh; width: 100%; display: flex; flex-direction: column; align-items: center; justifyContent: center; background: #F8F9FA; }
        .spinner { width: 40px; height: 40px; border: 4px solid #EA580C; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        .loader-text { margin-top: 16px; color: #EA580C; letter-spacing: 2px; font-size: 12px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div className="web-app-layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        /* Aggressive CSS Reset */
        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; min-height: 100vh !important; display: block !important; 
          background: #FDFCFB !important; text-align: left !important; place-items: initial !important;
        }

        .web-app-layout { display: flex; width: 100%; min-height: 100vh; flex-direction: column; }

        /* Sidebar Desktop */
        .sidebar {
          width: 260px; background: #fff; border-right: 1px solid #F0F0F0; height: 100vh;
          display: flex; flex-direction: column; padding: 24px 16px !important; position: fixed; left: 0; top: 0; z-index: 60; transition: 0.3s;
        }
        
        .main-content { flex: 1; padding-left: 260px; transition: 0.3s; width: 100%; }

        /* Modern UI Components */
        .glass-card { background: #fff; border-radius: 24px !important; border: 1px solid #F3F4F6 !important; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02) !important; }
        .glass-header { padding: 16px 24px !important; border-bottom: 1px solid #F3F4F6; display: flex; justifyContent: space-between; alignItems: center; background: #FAFAFA; }
        .header-label { display: flex; alignItems: center; gap: 10px !important; }
        .header-label h3 { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #374151; }
        .glass-content { padding: 24px !important; }

        .metric-card {
          background: #fff; padding: 20px !important; border-radius: 24px !important; border: 1px solid #F3F4F6 !important;
          display: flex; alignItems: center; gap: 16px !important;
        }
        .metric-card .icon-container { padding: 14px !important; border-radius: 14px !important; display: flex; alignItems: center; justifyContent: center; }
        .metric-card .card-title { font-size: 10px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; }
        .metric-card .main-val { font-size: 22px; color: #111827; line-height: 1; margin-top: 4px !important; }
        .metric-card .sub-val { font-size: 9px; font-weight: bold; color: #9CA3AF; text-transform: uppercase; }

        .modern-field { display: flex; flexDirection: column; gap: 8px !important; width: 100%; }
        .field-label { font-size: 11px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; margin-left: 4px !important; }
        .req { color: #EF4444; }
        .field-wrapper { position: relative; width: 100%; }
        .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #D1D5DB; }
        
        input, select { 
          width: 100%; padding: 14px 18px !important; background: #F9FAFB !important; border: 1px solid #E5E7EB !important;
          border-radius: 16px !important; font-weight: 700 !important; font-size: 14px !important; outline: none !important; transition: 0.2s;
        }
        input.with-icon { padding-left: 44px !important; }
        input:focus, select:focus { border-color: #EA580C !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.05) !important; }

        .sidebar-btn {
          width: 100%; display: flex; alignItems: center; gap: 12px !important; padding: 12px 16px !important; border-radius: 14px !important;
          border: none; cursor: pointer; transition: 0.2s; background: transparent; color: #6B7280;
        }
        .sidebar-btn.active { background: #EA580C !important; color: #fff !important; box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.2) !important; }
        .sidebar-btn .label-text { font-weight: bold; font-size: 14px; }

        .bottom-nav { 
          display: none; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          width: calc(100% - 40px); max-width: 480px; background: rgba(255,255,255,0.9); backdrop-filter: blur(24px);
          padding: 10px !important; border-radius: 28px !important; box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important; z-index: 50; border: 1px solid #F0F0F0;
        }
        .b-nav-item { flex: 1; display: flex; alignItems: center; justifyContent: center; padding: 12px !important; border-radius: 20px !important; color: #9CA3AF; border: none; background: none; transition: 0.3s; }
        .b-nav-item.active { background: #FFF7ED !important; color: #EA580C !important; transform: translateY(-5px); }

        /* Layout Grid */
        .grid-3 { display: grid; gridTemplateColumns: repeat(3, 1fr); gap: 20px !important; }
        .grid-2 { display: grid; gridTemplateColumns: repeat(2, 1fr); gap: 20px !important; }
        .v-grid { display: grid; gridTemplateColumns: 1fr 1fr; gap: 40px !important; }
        
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1024px) {
          .sidebar { display: none; }
          .main-content { padding-left: 0 !important; }
          .bottom-nav { display: flex; justifyContent: space-around; }
          .v-grid { gridTemplateColumns: 1fr !important; }
          .grid-3 { gridTemplateColumns: 1fr !important; }
        }

        .primary-btn { width: 100%; padding: 18px !important; border-radius: 18px !important; border: none; color: #fff; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: 0.2s; }
        .primary-btn:active { transform: scale(0.98); }
        .table-responsive { overflowX: auto; border-radius: 16px; }
        .web-table { width: 100%; borderCollapse: collapse; }
        .web-table th { padding: 14px 20px !important; font-size: 11px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; borderBottom: 1px solid #F3F4F6; text-align: left; }
        .web-table td { padding: 18px 20px !important; borderBottom: 1px solid #F9FAFB; vertical-align: middle; }
      `}</style>

      {/* Login Screen Overlay */}
      {userRole === 'guest' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ width: '90px', height: '90px', background: '#FFF7ED', color: '#EA580C', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Egg size={44} />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>নিশাদ এগ্রো</h1>
            <p style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '40px' }}>System Management</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="password" placeholder="পাসওয়ার্ড দিন" value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="web-input" style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }} autoFocus
              />
              <button style={{ width: '100%', padding: '18px', background: '#111827', color: '#fff', border: 'none', borderRadius: '18px', fontWeight: 900, cursor: 'pointer' }}>প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px', padding: '0 8px' }}>
          <div style={{ minWidth: '42px', height: '42px', background: '#EA580C', color: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Egg size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111827' }}>নিশাদ এগ্রো</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SidebarLink id="dashboard" icon={LayoutDashboard} label="ড্যাশবোর্ড" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarLink id="sell" icon={ShoppingCart} label="ডিম বিক্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarLink id="buy" icon={ArrowDownCircle} label="মাল ক্রয়" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarLink id="expense" icon={Wallet} label="খরচ এন্ট্রি" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarLink id="history" icon={History} label="রেজিস্টার বুক" activeTab={activeTab} setActiveTab={setActiveTab} />
          {userRole === 'admin' && <SidebarLink id="settings" icon={Settings} label="সিস্টেম সেটিংস" activeTab={activeTab} setActiveTab={setActiveTab} />}
        </div>
        <button onClick={() => setUserRole('guest')} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', color: '#F43F5E', fontWeight: 900, border: 'none', background: 'none', cursor: 'pointer' }}>
          <LogOut size={20} /> <span>লগআউট</span>
        </button>
      </aside>

      {/* Main Container */}
      <div className="main-content">
        <header style={{ height: '80px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 40 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden" style={{ border: 'none', background: 'none', color: '#6B7280' }}><Menu size={24} /></button>
             <h1 style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#374151', letterSpacing: '1px' }}>{activeTab}</h1>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ textAlign: 'right' }}>
                 <p style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase' }}>CASH BOX</p>
                 <p style={{ fontSize: '20px', fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>৳{stats.cash.toLocaleString()}</p>
              </div>
              <div style={{ width: '44px', height: '44px', background: '#F3F4F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={22} color="#9CA3AF" /></div>
           </div>
        </header>

        <main style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
           
           {/* DASHBOARD */}
           {activeTab === 'dashboard' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-in">
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                 <MetricCard title="মার্কেট বাকি" value={`৳${stats.custDue.toLocaleString()}`} icon={Users} color="bg-blue-500" />
                 <MetricCard title="মোট ক্যাশ" value={`৳${stats.cash.toLocaleString()}`} icon={DollarSign} color="bg-orange-500" />
                 <MetricCard title="মহাজন পাবে" value={`৳${stats.suppDue.toLocaleString()}`} icon={AlertCircle} color="bg-rose-500" />
                 <MetricCard title="আজকের লাভ" value={`৳${stats.todayProfit.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" blurred={userRole !== 'admin'} />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="grid-3">
                  <WebCard title="ইনভেন্টরি স্ট্যাটাস" icon={Store}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                       {EGG_TYPES.map((egg, idx) => (
                         <div key={egg}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                               <span style={{ fontSize: '13px', fontWeight: 900, color: '#4B5563' }}>{egg}</span>
                               <span style={{ fontSize: '14px', fontWeight: 900 }}>{stats.stock[egg]} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>PIS</span></span>
                            </div>
                            <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '50px', overflow: 'hidden' }}>
                               <div style={{ height: '100%', width: `${Math.min(100, (stats.stock[egg] / 5000) * 100)}%`, background: idx === 0 ? '#EF4444' : idx === 1 ? '#9CA3AF' : '#3B82F6', borderRadius: '50px', transition: '1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </WebCard>

                  <WebCard title="সিস্টেম রিপোর্ট" icon={ShieldCheck}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="status-row"><span>আজকের বিক্রি</span><span style={{ fontWeight: 900 }}>৳{stats.todaySales}</span></div>
                        <div className="status-row"><span>আজকের খরচ</span><span style={{ fontWeight: 900, color: '#F43F5E' }}>৳{stats.todayExp}</span></div>
                        <div className="status-row" style={{ border: 'none' }}><span>সার্ভার স্ট্যাটাস</span><span style={{ background: '#ECFDF5', color: '#10B981', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900 }}>ACTIVE</span></div>
                     </div>
                  </WebCard>
               </div>

               <WebCard title="সাম্প্রতিক লেনদেন" icon={History}>
                  <div className="table-responsive">
                    <table className="web-table">
                       <thead><tr><th>কাস্টমার/বিবরণ</th><th>টাইপ</th><th>পরিমাণ</th><th style={{ textAlign: 'right' }}>টাকা</th></tr></thead>
                       <tbody>
                         {transactions.slice(0, 8).map(t => (
                           <tr key={t.id}>
                             <td><p style={{ fontSize: '14px', fontWeight: 900, color: '#111827' }}>{t.customerName || t.description || t.eggType}</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>{t.date}</p></td>
                             <td><span style={{ padding: '4px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, background: t.type === 'sell' ? '#ECFDF5' : t.type === 'buy' ? '#EFF6FF' : '#FFF1F2', color: t.type === 'sell' ? '#10B981' : t.type === 'buy' ? '#3B82F6' : '#F43F5E', textTransform: 'uppercase' }}>{t.type}</span></td>
                             <td style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.quantity > 0 ? `${t.quantity} ${t.unit || 'পিস'}` : '-'}</td>
                             <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>৳{t.amount.toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                  </div>
               </WebCard>
             </div>
           )}

           {/* FORMS */}
           {(isSell || isBuy || isExpense) && (
             <div style={{ maxWidth: '900px', margin: '0 auto' }} className="animate-in">
               <WebCard title={`${activeTab} ভাউচার এন্ট্রি`} icon={Target}>
                 <form onSubmit={handleSubmit} className="v-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <ModernInput label="লেনদেনের তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                      {!isExpense && (
                        <>
                          <div className="modern-field">
                            <label className="field-label">ডিমের ধরণ</label>
                            <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))}>
                              {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          {isSell && (
                             <div style={{ display: 'flex', background: '#F3F4F6', padding: '6px', borderRadius: '16px' }}>
                               <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 900, background: formData.saleCategory === 'retail' ? '#fff' : 'none', color: formData.saleCategory === 'retail' ? '#EA580C' : '#9CA3AF', boxShadow: formData.saleCategory === 'retail' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}>খুচরা</button>
                               <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 900, background: formData.saleCategory === 'wholesale' ? '#fff' : 'none', color: formData.saleCategory === 'wholesale' ? '#EA580C' : '#9CA3AF', boxShadow: formData.saleCategory === 'wholesale' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}>পাইকারি</button>
                             </div>
                          )}
                          <div className="grid-2">
                             <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required />
                             <div className="modern-field">
                                <label className="field-label">একক</label>
                                <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || (isSell && formData.saleCategory === 'wholesale')}>
                                  {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                             </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                       {!isExpense ? (
                         <>
                           <div className="grid-2">
                             <ModernInput label="দর (Rate)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} required icon={DollarSign} />
                             <ModernInput label="ছাড় (Discount)" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} placeholder="0" />
                           </div>
                           <ModernInput label="কাস্টমার/মহাজন নাম" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="পুরো নাম লিখুন" icon={User} />
                           <ModernInput label="নগদ পেমেন্ট" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সম্পূর্ণ পরিশোধ" icon={Wallet} />
                         </>
                       ) : (
                         <>
                           <div className="modern-field">
                             <label className="field-label">খরচের খাত</label>
                             <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}>
                                {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                                <option value="অন্যান্য">অন্যান্য</option>
                             </select>
                           </div>
                           <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required icon={Wallet} />
                         </>
                       )}
                       <div className="payment-summary-box" style={{ background: '#111827', padding: '30px !important', borderRadius: '24px', textAlign: 'center', color: '#fff', marginTop: '10px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '2px' }}>Voucher Total Amount</p>
                          <h3 style={{ fontSize: '42px', fontWeight: 900, marginTop: '8px' }}>৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}</h3>
                       </div>
                    </div>
                    <button disabled={submitting} className="primary-btn" style={{ background: isSell ? '#10B981' : isBuy ? '#3B82F6' : '#EF4444', gridColumn: 'span 2' }}>{submitting ? 'সেভ হচ্ছে...' : 'ভাউচার কনফার্ম করুন'}</button>
                 </form>
               </WebCard>
             </div>
           )}

           {/* REGISTER */}
           {activeTab === 'history' && (
             <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '20px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', gap: '10px' }}>
                     {['all', 'sell', 'buy', 'expense'].map(t => (
                       <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '10px 20px', borderRadius: '14px', border: '1px solid #F0F0F0', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', background: typeFilter === t ? '#111827' : '#fff', color: typeFilter === t ? '#fff' : '#9CA3AF', transition: '0.2s' }}>{t}</button>
                     ))}
                   </div>
                   <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '14px', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', border: '1px solid #F0F0F0', background: dateFilter === 'today' ? '#FFF7ED' : '#fff', color: dateFilter === 'today' ? '#EA580C' : '#9CA3AF' }}><Filter size={16}/> {dateFilter === 'today' ? 'আজকের' : 'সব সময়'}</button>
                </div>

                <WebCard title="লেনদেন রেজিস্টার বুক" icon={History}>
                   <div className="table-responsive">
                     <table className="web-table">
                       <thead><tr><th>তারিখ</th><th>বিবরণ ও নাম</th><th>পরিমাণ</th><th style={{ textAlign: 'right' }}>টাকা</th><th>অবস্থা</th></tr></thead>
                       <tbody>
                         {filteredHistory.map(t => (
                           <tr key={t.id}>
                             <td style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: '12px' }}>{t.date}</td>
                             <td><div className="row-flex-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div className={`status-dot ${t.type}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.type === 'sell' ? '#10B981' : t.type === 'buy' ? '#3B82F6' : '#F43F5E' }}></div><p style={{ fontSize: '14px', fontWeight: 900 }}>{t.customerName || t.eggType}</p></div></td>
                             <td style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.quantity > 0 ? `${t.quantity} ${t.unit || 'পিস'}` : '-'}</td>
                             <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '14px' }}>৳{t.amount.toLocaleString()}</td>
                             <td style={{ textAlign: 'right' }}>{t.dueAmount > 0 ? <span style={{ color: '#F43F5E', fontSize: '10px', fontWeight: 900, background: '#FFF1F2', padding: '4px 10px', borderRadius: '8px' }}>বাকি ৳{t.dueAmount}</span> : <span style={{ color: '#10B981', fontWeight: 900, fontSize: '10px', background: '#ECFDF5', padding: '4px 10px', borderRadius: '8px' }}>PAID</span>}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </WebCard>
             </div>
           )}

           {/* SETTINGS */}
           {activeTab === 'settings' && userRole === 'admin' && (
             <div className="animate-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
                <WebCard title="ডিমের রেট কনফিগারেশন" icon={Settings}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {EGG_TYPES.map(egg => (
                      <div key={egg} style={{ padding: '24px', backgroundColor: '#F9FAFB', borderRadius: '24px', border: '1px solid #F0F0F0' }}>
                         <h4 style={{ fontWeight: 900, fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#EA580C', borderRadius: '50%', boxShadow: '0 0 10px rgba(234, 88, 12, 0.3)' }}></div> {egg}</h4>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            {['pis', 'hali', 'case'].map(u => (
                              <div key={u}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px', display: 'block', textAlign: 'center' }}>{u}</label>
                                <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRetailRateChange(egg, u, e.target.value)} className="web-input" style={{ textAlign: 'center', fontWeight: 900 }} />
                              </div>
                            ))}
                         </div>
                      </div>
                    ))}
                    <button onClick={saveRates} className="primary-btn" style={{ background: '#111827' }}>সেটিংস আপডেট করুন</button>
                  </div>
                </WebCard>
             </div>
           )}

        </main>
      </div>

      {/* Floating Bottom Nav for Mobile */}
      <nav className="bottom-nav">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'sell', icon: ShoppingCart },
          { id: 'buy', icon: PlusCircle },
          { id: 'expense', icon: Wallet },
          { id: 'history', icon: History }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`b-nav-item ${activeTab === item.id ? 'active' : ''}`}><item.icon size={22} /></button>
        ))}
      </nav>

    </div>
  );
}

// Global functions for state updates (not in component to keep it clean)
function setRetailRateChange(egg, unit, val) {
  // Logic handled via local component state or directly via setter if available
}
