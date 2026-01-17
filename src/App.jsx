import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  onSnapshot, 
  doc, 
  deleteDoc 
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
  User,
  Settings,
  Phone,
  Filter,
  DollarSign,
  TrendingUp,
  Store,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Fingerprint,
  ChevronRight,
  Package,
  Activity,
  ArrowRightLeft,
  Menu,
  X,
  LogOut,
  ChevronDown
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

const appId = 'nishad_agro_doro_v8';

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

// --- Helper UI Components ---

const NavItem = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`nav-btn ${activeTab === id ? 'active' : ''}`}
  >
    <Icon size={24} />
    <span className="nav-label">{label}</span>
  </button>
);

const MetricCard = ({ title, value, subValue, icon: Icon, type, blurred = false }) => (
  <div className={`metric-card-pro ${type}`}>
    <div className="card-top">
      <div className="m-icon-box"><Icon size={20} /></div>
      <p className="m-label">{title}</p>
    </div>
    <div className="card-bottom">
      {blurred ? (
        <div className="m-blur">XXXXX <Lock size={14} /></div>
      ) : (
        <h2 className="m-value">{value}</h2>
      )}
      {subValue && !blurred && <p className="sub-label-text">{subValue}</p>}
    </div>
  </div>
);

const ModernInput = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, icon: Icon, className = "" }) => (
  <div className={`doro-input-field ${className}`}>
    {label && <label>{label} {required && <span style={{ color: '#F43F5E' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      {Icon && <Icon style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        style={{ paddingLeft: Icon ? '44px' : '20px' }}
      />
    </div>
  </div>
);

// --- Main Application ---

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
    retail: { 'লাল ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' }, 'সাদা ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' }, 'হাঁসের ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' } },
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

  // --- Handlers ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) setUserRole('admin');
    else if (passwordInput === subAdminPassword) setUserRole('subadmin');
    else alert('Invalid PIN!');
    setPasswordInput('');
  };

  const handleLogout = () => {
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
        ...formData, type, amount: total, paidAmount: paid, dueAmount: due, quantityInPieces: qtyP, createdAt: new Date().toISOString()
      });
      alert('Voucher Saved!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('Error!'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') return;
    if (!window.confirm("Delete record?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id)); } catch (err) { }
  };

  const saveRates = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates);
      alert('Rates updated!');
    } catch (err) { alert("Error saving."); }
  };

  // --- Sync logic ---
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
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
      console.error(err);
      setLoading(false);
    });

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

  if (loading) return (
    <div className="doro-loader">
       <div className="spinner"></div>
       <p>NISHAD AGRO</p>
    </div>
  );

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; min-height: 100vh !important; display: block !important; 
          background: #0F172A !important; color: #E2E8F0 !important; text-align: left !important; place-items: initial !important;
          overflow-x: hidden !important;
        }

        .app-container { width: 100%; min-height: 100vh; background: #0F172A; display: flex; flex-direction: column; align-items: center; position: relative; }
        
        /* Main View Wrapper (Phone Style) */
        .main-view-wrapper { 
          width: 100%; max-width: 600px; min-height: 100vh; background: #0F172A;
          display: flex; flex-direction: column; padding-bottom: 100px !important; position: relative;
        }

        /* Bottom Nav */
        .bottom-nav-bar {
          position: fixed; bottom: 0; left: 0; width: 100%; display: flex; justify-content: center; z-index: 1000;
          padding: 10px 20px 20px !important; pointer-events: none;
        }
        .nav-inner {
          width: 100%; max-width: 500px; background: #1E293B; border-radius: 24px !important;
          display: flex; justify-content: space-around; padding: 10px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5); pointer-events: auto; border: 1px solid rgba(255,255,255,0.05);
        }
        .nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px !important; border: none; background: none; color: #64748B; cursor: pointer; transition: 0.3s; padding: 8px !important; border-radius: 16px !important; }
        .nav-btn.active { color: #fff; background: #F59E0B; }
        .nav-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Top Header */
        .app-header {
          height: 80px; width: 100%; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px);
          display: flex; align-items: center; justify-content: space-between; padding: 0 24px !important;
          border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 100;
        }
        .app-logo { display: flex; align-items: center; gap: 10px !important; }
        .logo-symbol { width: 36px; height: 36px; background: #F59E0B; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #000; font-weight: 900; }
        .app-title { font-size: 18px; font-weight: 900; color: #fff; }

        /* Metric Cards */
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px !important; padding: 20px !important; }
        .metric-card-pro {
          background: #1E293B; border-radius: 20px !important; padding: 20px !important; border: 1px solid rgba(255,255,255,0.03);
          display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; position: relative; overflow: hidden;
        }
        .m-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px !important; }
        .metric-card-pro.blue .m-icon-box { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
        .metric-card-pro.orange .m-icon-box { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .metric-card-pro.green .m-icon-box { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .metric-card-pro.rose .m-icon-box { background: rgba(244, 63, 94, 0.1); color: #F43F5E; }
        .m-label { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; }
        .m-value { font-size: 18px; font-weight: 900; color: #fff; }
        .sub-label-text { font-size: 8px; color: #475569; font-weight: 700; text-transform: uppercase; }

        /* Digital Voucher Box */
        .voucher-box { background: #1E293B; margin: 20px !important; border-radius: 24px !important; padding: 24px !important; border: 1px solid rgba(255,255,255,0.03); }
        .voucher-summary { background: #0F172A; border-radius: 20px !important; padding: 24px !important; text-align: center; margin-bottom: 24px !important; border: 1px solid rgba(255,255,255,0.05); }
        .voucher-summary h3 { font-size: 32px; font-weight: 900; color: #F59E0B; margin-top: 5px !important; }
        
        .doro-input-field { display: flex; flex-direction: column; gap: 6px !important; margin-bottom: 16px !important; }
        .doro-input-field label { font-size: 10px; font-weight: 900; color: #64748B; text-transform: uppercase; margin-left: 4px !important; }
        input, select { 
          width: 100%; padding: 12px 16px !important; background: #0F172A !important; border: 1px solid #334155 !important;
          border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; outline: none !important; transition: 0.2s; color: #fff !important;
        }
        input:focus { border-color: #F59E0B; }

        .confirm-btn { width: 100%; padding: 16px !important; border-radius: 14px !important; border: none; color: #000; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; margin-top: 10px !important; }

        /* History Items */
        .history-card { background: #1E293B; margin: 0 20px 10px !important; padding: 16px !important; border-radius: 16px !important; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.02); }
        .hist-type { font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 2px 8px !important; border-radius: 6px !important; margin-bottom: 4px !important; display: inline-block; }
        .hist-title { font-size: 14px; font-weight: 800; color: #F1F5F9; }
        .hist-date { font-size: 10px; color: #64748B; font-weight: 600; }
        .hist-amt { font-size: 15px; font-weight: 900; color: #F59E0B; }

        /* Lock Screen */
        .lock-screen { position: fixed; inset: 0; z-index: 2000; background: #0F172A; display: flex; align-items: center; justify-content: center; padding: 24px !important; }
        .lock-card { width: 100%; max-width: 360px; text-align: center; }
        .lock-icon { width: 80px; height: 80px; background: #F59E0B; color: #000; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px !important; }
        .lock-input { width: 100%; padding: 16px !important; background: #1E293B !important; border: 2px solid #334155 !important; border-radius: 16px !important; text-align: center; font-size: 24px !important; font-weight: 900 !important; letter-spacing: 8px; color: #fff !important; outline: none !important; }

        .doro-loader { height: 100vh; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0F172A; color: #F59E0B; font-weight: 900; letter-spacing: 5px; }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(245, 158, 11, 0.1); border-top-color: #F59E0B; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* --- LOCK SCREEN --- */}
      {userRole === 'guest' && (
        <div className="lock-screen">
          <div className="lock-card animate-in">
            <div className="lock-icon"><Fingerprint size={40} /></div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', color: '#fff' }}>নিশাদ এগ্রো</h1>
            <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '32px' }}>পিন দিয়ে আনলক করুন</p>
            <form onSubmit={handleLogin}>
              <input 
                type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} 
                className="lock-input" placeholder="••••" maxLength={6} autoFocus 
              />
              <button className="confirm-btn" style={{ background: '#F59E0B', marginTop: '24px' }}>আনলক করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAIN VIEW --- */}
      <div className="main-view-wrapper">
        
        {/* Header */}
        <header className="app-header">
           <div className="app-logo">
              <div className="logo-symbol"><Egg size={20} /></div>
              <h1 className="app-title">নিশাদ এগ্রো</h1>
           </div>
           <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>Cash Balance</p>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#F59E0B' }}>৳ {(stats.cash || 0).toLocaleString()}</p>
           </div>
        </header>

        <main className="animate-in">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
               <div className="metrics-grid">
                  <MetricCard title="লাল ডিম স্টক" value={`${stats.stock['লাল ডিম'] || 0}`} subValue="PIS" icon={Egg} type="orange" />
                  <MetricCard title="সাদা ডিম স্টক" value={`${stats.stock['সাদা ডিম'] || 0}`} subValue="PIS" icon={Egg} type="blue" />
                  <MetricCard title="মার্কেট বাকি" value={`৳${(stats.custDue || 0).toLocaleString()}`} icon={Users} type="green" />
                  <MetricCard title="মহাজন বাকি" value={`৳${(stats.suppDue || 0).toLocaleString()}`} icon={AlertCircle} type="rose" />
                  <MetricCard title="আজকের বিক্রি" value={`৳${(stats.todaySales || 0).toLocaleString()}`} icon={TrendingUp} type="orange" />
                  <MetricCard title="আজকের লাভ" value={`৳${(stats.todayProfit || 0).toLocaleString()}`} icon={ShieldCheck} type="green" blurred={userRole !== 'admin'} />
               </div>

               <div style={{ padding: '0 20px 20px !important' }}>
                  <div style={{ background: '#111827', padding: '24px', borderRadius: '24px', color: '#fff', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <p style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase' }}>Total Cash Flow Today</p>
                     <h2 style={{ fontSize: '28px', fontWeight: 900, marginTop: '8px' }}>৳ {(stats.todaySales - stats.todayExp).toLocaleString()}</h2>
                  </div>
               </div>

               <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#475569', margin: '10px 24px !important', textTransform: 'uppercase' }}>সাম্প্রতিক লেনদেন</h3>
               {transactions.slice(0, 5).map(t => (
                 <div key={t.id} className="history-card">
                    <div>
                       <span className="hist-type" style={{ background: t.type === 'sell' ? 'rgba(16,185,129,0.1)' : t.type === 'buy' ? 'rgba(59,130,246,0.1)' : 'rgba(244,63,94,0.1)', color: t.type === 'sell' ? '#10B981' : t.type === 'buy' ? '#3B82F6' : '#F43F5E' }}>{t.type}</span>
                       <p className="hist-title">{t.customerName || t.eggType || t.description}</p>
                       <p className="hist-date">{t.date}</p>
                    </div>
                    <p className="hist-amt">৳ {(t.amount || 0).toLocaleString()}</p>
                 </div>
               ))}
            </div>
          )}

          {/* VOUCHERS */}
          {(isSell || isBuy || isExpense) && (
            <div className="tab-content animate-in">
               <div className="voucher-box">
                  <div className="voucher-summary">
                     <p style={{ fontSize: '10px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>Net Payable Bill</p>
                     <h3>৳ {(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}</h3>
                  </div>

                  <form onSubmit={handleSubmit}>
                     <ModernInput label="Transaction Date" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                     
                     {!isExpense && (
                        <>
                           <div className="doro-input-field">
                              <label>Egg Category</label>
                              <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))}>
                                {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                           </div>
                           
                           {isSell && (
                             <div style={{ display: 'flex', background: '#0F172A', padding: '5px', borderRadius: '14px', marginBottom: '20px' }}>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 900, background: formData.saleCategory === 'retail' ? '#1E293B' : 'none', color: formData.saleCategory === 'retail' ? '#F59E0B' : '#64748B' }}>RETAIL</button>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 900, background: formData.saleCategory === 'wholesale' ? '#1E293B' : 'none', color: formData.saleCategory === 'wholesale' ? '#F59E0B' : '#64748B' }}>WHOLESALE</button>
                             </div>
                           )}

                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <ModernInput label="Quantity" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required />
                              <div className="doro-input-field">
                                <label>Unit</label>
                                <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || (isSell && formData.saleCategory === 'wholesale')}>
                                  {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </div>
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <ModernInput label="Price (Rate)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} required />
                              <ModernInput label="Discount" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} placeholder="0" />
                           </div>

                           <ModernInput label="Name" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="Full Name" icon={User} />
                           <ModernInput label="Cash Received" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="Full Amount" icon={Wallet} />
                        </>
                     )}

                     {isExpense && (
                        <>
                           <div className="doro-input-field">
                              <label>Expense Category</label>
                              <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}>
                                {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                                <option value="অন্যান্য">অন্যান্য</option>
                              </select>
                           </div>
                           <ModernInput label="Amount" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required icon={Wallet} />
                        </>
                     )}

                     <button disabled={submitting} className="confirm-btn" style={{ background: isSell ? '#10B981' : isBuy ? '#3B82F6' : '#F43F5E', color: '#fff' }}>{submitting ? 'PROCESSING...' : 'Confirm Voucher'}</button>
                  </form>
               </div>
            </div>
          )}

          {/* HISTORY */}
          {activeTab === 'history' && (
            <div className="tab-content animate-in">
               <div style={{ display: 'flex', gap: '10px', padding: '20px !important', overflowX: 'auto' }} className="no-scrollbar">
                  {['all', 'sell', 'buy', 'expense'].map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #334155', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', background: typeFilter === t ? '#F59E0B' : '#1E293B', color: typeFilter === t ? '#000' : '#64748B' }}>{t}</button>
                  ))}
               </div>
               <div style={{ padding: '0 4px' }}>
                  {filteredHistory.map(t => (
                    <div key={t.id} className="history-card">
                       <div>
                          <p className="hist-title">{t.customerName || t.eggType || t.description}</p>
                          <p className="hist-date">{t.date} • {t.type.toUpperCase()}</p>
                          {t.dueAmount > 0 ? <span style={{ color: '#F43F5E', fontWeight: 900, fontSize: '10px' }}>DUE: ৳{t.dueAmount}</span> : <span style={{ color: '#10B981', fontWeight: 900, fontSize: '10px' }}>PAID</span>}
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <p className="hist-amt">৳ {(t.amount || 0).toLocaleString()}</p>
                          {userRole === 'admin' && <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: '#475569', marginTop: '10px' }}><Trash2 size={16}/></button>}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="tab-content animate-in" style={{ padding: '20px' }}>
               <div style={{ background: '#1E293B', borderRadius: '24px', padding: '24px !important', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', color: '#fff' }}>Rate Configuration</h2>
                  {EGG_TYPES.map(egg => (
                    <div key={egg} style={{ padding: '20px', background: '#0F172A', borderRadius: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                       <h4 style={{ fontWeight: 800, fontSize: '14px', marginBottom: '16px', color: '#F59E0B' }}>{egg}</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          {['pis', 'hali', 'case'].map(u => (
                            <div key={u}>
                               <label className="field-label" style={{ textAlign: 'center', display: 'block', fontSize: '9px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>{u}</label>
                               <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => {
                                 const newRates = {...rates};
                                 newRates.retail[egg][u] = e.target.value;
                                 setRates(newRates);
                               }} style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px' }} />
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
                  <button onClick={saveRates} className="confirm-btn" style={{ background: '#F59E0B' }}>Save Config</button>
                  <button onClick={handleLogout} style={{ width: '100%', background: 'none', border: '1px solid #334155', color: '#F43F5E', padding: '16px !important', borderRadius: '14px', fontWeight: 900, marginTop: '16px' }}>LOGOUT</button>
               </div>
            </div>
          )}

        </main>
      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="bottom-nav-bar">
         <div className="nav-inner">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="sell" icon={ShoppingCart} label="Sell" activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="buy" icon={ArrowDownCircle} label="Buy" activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="expense" icon={Wallet} label="Expense" activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="history" icon={History} label="History" activeTab={activeTab} setActiveTab={setActiveTab} />
            {userRole === 'admin' && <NavItem id="settings" icon={Settings} label="Admin" activeTab={activeTab} setActiveTab={setActiveTab} />}
         </div>
      </nav>

    </div>
  );
}
