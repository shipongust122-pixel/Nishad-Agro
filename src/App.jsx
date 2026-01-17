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

// Rule 1: Strict Paths - appId segment must be single (sanitizing slashes)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'nishad-agro-live';
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

// --- Web Components (Helper Components) ---

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

  // derived state defining early to avoid ReferenceErrors
  const isExpense = activeTab === 'expense';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';
  const isSubAdmin = userRole === 'subadmin';
  const isRateReadOnly = isSell && isSubAdmin;
  const isWholesale = isSell && formData.saleCategory === 'wholesale';

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
    
    // Using odd-numbered segment path for Rule 1
    const qTr = collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2');
    const unsubTr = onSnapshot(qTr, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
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
      const type = activeTab;
      if (type === 'expense') {
        total = parseFloat(formData.amount || 0);
        paid = total;
      } else {
        qtyP = parseInt(formData.quantity) * (type === 'sell' ? SELL_UNITS[formData.unit].value : 1);
        const sub = parseFloat(formData.quantity) * parseFloat(formData.rate);
        total = sub - parseFloat(formData.discount || 0);
        paid = formData.paidAmount === '' ? total : parseFloat(formData.paidAmount);
        due = total - paid;
      }
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2'), {
        ...formData, type, amount: total, paidAmount: paid, dueAmount: due, quantityInPieces: qtyP, createdAt: new Date().toISOString()
      });
      alert('Success!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('Error!'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("মুছে ফেলতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id));
    } catch (err) { alert("Error deleting document"); }
  };

  const saveRates = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates);
      alert('রেট সফলভাবে আপডেট হয়েছে!');
    } catch (err) { alert("Error saving rates"); }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <p className="text-orange-600 font-bold tracking-widest text-xs uppercase">Initializing System...</p>
      </div>
    </div>
  );

  return (
    <div className="web-system-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          min-height: 100vh !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          display: block !important; 
          background: #F8F9FA !important;
          color: #111;
          place-items: unset !important;
          text-align: left !important;
          overflow-x: hidden;
        }

        .web-system-container { display: flex; width: 100%; min-height: 100vh; }

        .sidebar-container { 
          position: fixed; top: 0; bottom: 0; left: 0; z-index: 50; 
          background: #fff; border-right: 1px solid #f0f0f0; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 10px 0 30px rgba(0,0,0,0.02);
        }
        .sidebar-container.expanded { width: 260px; }
        .sidebar-container.collapsed { width: 80px; }
        
        .sidebar-inner-scroll { height: 100%; display: flex; flex-direction: column; padding: 1.5rem 1rem; overflow-y: auto; }
        .sidebar-logo-area { display: flex; items-center; gap: 1rem; margin-bottom: 2.5rem; padding: 0 0.5rem; overflow: hidden; }
        .sidebar-logo-icon { min-width: 40px; height: 40px; background: #EA580C; color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .sidebar-title { font-weight: 900; font-size: 1.25rem; white-space: nowrap; }
        .sidebar-divider { padding: 1.5rem 1rem 0.5rem; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }
        .sidebar-logout-btn { margin-top: auto; display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 12px; color: #f43f5e; font-weight: 700; border: none; background: none; cursor: pointer; }

        .main-content-wrapper { flex: 1; transition: padding 0.3s; width: 100%; }
        .sidebar-expanded { padding-left: 260px; }
        .sidebar-collapsed { padding-left: 80px; }

        .top-navbar-fixed { 
          height: 80px; background: rgba(255,255,255,0.85); backdrop-filter: blur(24px); 
          position: sticky; top: 0; z-index: 40; border-bottom: 1px solid #f0f0f0; 
          display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; 
        }
        .navbar-left { display: flex; align-items: center; gap: 1.5rem; }
        .sidebar-toggle-trigger { border: none; background: none; color: #6b7280; cursor: pointer; padding: 8px; border-radius: 12px; transition: background 0.2s; }
        .sidebar-toggle-trigger:hover { background: #f9fafb; }
        .nav-page-title { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #374151; }

        .navbar-right { display: flex; align-items: center; gap: 2rem; }
        .cash-indicator-pill { text-align: right; }
        .indicator-label { font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
        .indicator-value { font-size: 1.25rem; font-weight: 900; color: #EA580C; line-height: 1; }
        .user-avatar-circle { width: 40px; height: 40px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #9ca3af; }

        .page-content-padding { padding: 2.5rem; max-width: 1400px; margin: 0 auto; }
        .dashboard-grid-layout { display: flex; flex-direction: column; gap: 2rem; }
        .metrics-summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
        .inventory-row-split { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
        .inventory-grid-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .inventory-item-pill { padding: 1.5rem; background: #F9FAFB; border: 1px solid #F0F0F0; border-radius: 20px; text-align: center; }
        .pill-title { font-size: 13px; font-weight: 900; color: #4b5563; }
        .pill-value { font-size: 2rem; font-weight: 900; line-height: 1.1; margin: 4px 0; }
        .pill-sub { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; }

        .status-item-list { display: flex; flex-direction: column; gap: 1rem; }
        .status-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
        .status-badge { font-size: 10px; font-weight: 900; color: #10b981; background: #ecfdf5; padding: 2px 8px; rounded: 8px; text-transform: uppercase; }

        .web-data-table { width: 100%; border-collapse: collapse; }
        .web-data-table th { padding: 1rem; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #f3f4f6; text-align: left; }
        .web-data-table td { padding: 1.25rem 1rem; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .row-flex-cell { display: flex; align-items: center; gap: 1rem; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.sell { background: #10b981; }
        .status-dot.buy { background: #3b82f6; }
        .status-dot.expense { background: #ef4444; }
        .row-main-text { font-size: 14px; font-weight: 900; color: #1f2937; }
        .row-sub-text { font-size: 11px; color: #9ca3af; }
        .row-amount { font-weight: 900; font-size: 14px; }
        .row-amount.sell { color: #10b981; }
        .row-amount.buy { color: #3b82f6; }
        .row-amount.expense { color: #ef4444; }
        .type-tag { padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .type-tag.sell { background: #ecfdf5; color: #10b981; }
        .type-tag.buy { background: #eff6ff; color: #2563eb; }
        .type-tag.expense { background: #fef2f2; color: #ef4444; }
        .due-pill { background: #fff1f2; color: #f43f5e; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; }
        .paid-pill { color: #10b981; font-size: 11px; font-weight: 900; font-family: sans-serif; }

        .voucher-form-layout { display: flex; flex-direction: column; gap: 2rem; }
        .form-grid-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
        .form-grid-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .modern-select-web { width: 100%; padding: 0.875rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 1rem; font-weight: 700; outline: none; }
        .input-label-mini { font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; display: block; }
        .category-toggle-box { display: flex; background: #f3f4f6; padding: 4px; border-radius: 12px; }
        .cat-btn { flex: 1; padding: 6px; border-radius: 8px; font-size: 10px; font-weight: 900; border: none; background: none; color: #9ca3af; cursor: pointer; transition: all 0.2s; }
        .cat-btn.active { background: #fff; color: #ea580c; shadow: 0 2px 4px rgba(0,0,0,0.05); }

        .payment-summary-voucher-box { background: #111827; padding: 2.5rem; border-radius: 2rem; text-align: center; color: #fff; }
        .summary-label { font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; }
        .summary-total { font-size: 3rem; font-weight: 900; margin: 10px 0; }
        .voucher-paid-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; border-radius: 12px; color: #fff; text-align: center; font-weight: 900; outline: none; }
        .voucher-paid-input:focus { border-color: #ea580c; }
        .voucher-submit-btn { width: 100%; padding: 1.5rem; border-radius: 1rem; border: none; color: #fff; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; }
        .voucher-submit-btn.sell { background: #10b981; }
        .voucher-submit-btn.buy { background: #2563eb; }
        .voucher-submit-btn.expense { background: #ef4444; }

        .history-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: #fff; padding: 1rem 1.5rem; border-radius: 20px; border: 1px solid #f0f0f0; }
        .filter-group { display: flex; gap: 10px; }
        .history-pill { padding: 10px 20px; border-radius: 12px; background: #fff; border: 1px solid #f0f0f0; font-size: 11px; font-weight: 900; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .history-pill.active { background: #111827; color: #fff; border-color: #111827; }
        .toolbar-filter-btn { display: flex; items-center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; border: 1px solid #f0f0f0; background: #fff; cursor: pointer; }
        .toolbar-filter-btn.active { background: #fff7ed; border-color: #ea580c; color: #ea580c; }

        .login-full-screen { position: fixed; inset: 0; z-index: 100; background: #fff; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-box-container { width: 100%; max-width: 360px; text-align: center; }
        .login-icon-box { width: 90px; height: 90px; background: #fff7ed; color: #ea580c; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .login-pass-field { width: 100%; padding: 1.25rem; background: #f9fafb; border: 2px solid #f3f4f6; border-radius: 1rem; text-align: center; font-size: 2rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; }
        .login-submit-btn { width: 100%; padding: 1.25rem; background: #111827; color: #fff; border: none; border-radius: 1rem; font-weight: 900; margin-top: 1rem; cursor: pointer; }

        .settings-rate-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .rate-config-card { padding: 1.5rem; background: #F9FAFB; border: 1px solid #F0F0F0; border-radius: 24px; }
        .rate-card-title { font-weight: 900; font-size: 0.875rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; }
        .rate-card-title .dot { width: 8px; height: 8px; background: #ea580c; border-radius: 50%; }
        .rate-input-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .rate-input-item label { font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; display: block; text-align: center; }
        .rate-field { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 900; font-size: 14px; outline: none; }
        .wholesale-config-row { padding-top: 1.25rem; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
        .wholesale-config-row span { font-size: 10px; font-weight: 900; color: #9333ea; text-transform: uppercase; }
        .wholesale-field { width: 100px; padding: 8px; border-radius: 10px; border: 1px solid #ddd; text-align: center; font-weight: 900; }
        .save-settings-btn { width: 100%; padding: 1rem; background: #111827; color: #fff; font-weight: 900; border: none; border-radius: 12px; margin-top: 2rem; cursor: pointer; }

        .web-input { width: 100%; padding: 1rem 1.25rem; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 1.25rem; font-weight: 700; font-size: 0.875rem; outline: none; transition: all 0.2s; }
        .delete-row-btn { border: none; background: none; color: #d1d5db; cursor: pointer; padding: 4px; }
        .history-link { font-size: 10px; font-weight: 900; color: #ea580c; border: none; background: none; cursor: pointer; text-transform: uppercase; }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1024px) {
          .sidebar-container { transform: translateX(-100%); width: 260px !important; }
          .sidebar-container.expanded { transform: translateX(0); }
          .main-content-wrapper { padding-left: 0 !important; }
        }
      `}</style>

      {/* --- Sidebar --- */}
      <aside className={`sidebar-container ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-inner-scroll">
          <div className="sidebar-logo-area">
            <div className="sidebar-logo-icon"><Egg size={22} /></div>
            <h2 className={`sidebar-title ${isSidebarOpen ? 'visible' : 'hidden'}`}>নিশাদ এগ্রো</h2>
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
            <span className={isSidebarOpen ? 'block' : 'hidden'}>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className={`main-content-wrapper ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        
        <header className="top-navbar-fixed">
          <div className="navbar-left">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-trigger">
              <Menu size={24} />
            </button>
            <h1 className="nav-page-title">
              {activeTab === 'dashboard' ? 'Business Overview' : activeTab.toUpperCase()}
            </h1>
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
                <div className="inventory-report-card">
                  <WebCard title="ইনভেন্টরি রিপোর্ট" icon={Store}>
                    <div className="inventory-grid-three">
                      {EGG_TYPES.map((egg, idx) => (
                        <div key={egg} className="inventory-item-pill">
                          <Egg size={24} className={`${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-gray-400' : 'text-blue-500'} mb-3`} />
                          <h4 className="pill-title">{egg}</h4>
                          <p className="pill-value">{stats.stock[egg]}</p>
                          <p className="pill-sub">পিস</p>
                        </div>
                      ))}
                    </div>
                  </WebCard>
                </div>

                <div className="system-status-card">
                  <WebCard title="সিস্টেম স্ট্যাটাস" icon={ShieldCheck}>
                     <div className="status-item-list">
                        <div className="status-row"><span>আজকের বিক্রি</span><span className="font-bold text-gray-800">৳{stats.todaySales}</span></div>
                        <div className="status-row"><span>আজকের খরচ</span><span className="font-bold text-rose-500">৳{stats.todayExp}</span></div>
                        <div className="status-row border-none"><span>সার্ভার স্ট্যাটাস</span><span className="status-badge">Online</span></div>
                     </div>
                  </WebCard>
                </div>
              </div>

              <WebCard title="সাম্প্রতিক লেনদেন" icon={History} action={<button onClick={() => setActiveTab('history')} className="history-link">সব দেখুন</button>}>
                <div className="table-responsive-container">
                  <table className="web-data-table">
                    <thead>
                      <tr>
                        <th>বিবরণ</th>
                        <th>ধরণ</th>
                        <th>পরিমাণ</th>
                        <th className="text-right">টাকা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 6).map(t => (
                        <tr key={t.id}>
                          <td>
                            <p className="row-main-text">{t.customerName || t.description || t.eggType}</p>
                            <p className="row-sub-text">{t.date}</p>
                          </td>
                          <td>
                            <span className={`type-tag ${t.type}`}>
                              {t.type === 'sell' ? 'বিক্রি' : t.type === 'buy' ? 'ক্রয়' : 'খরচ'}
                            </span>
                          </td>
                          <td><p className="row-data-text">{t.quantity > 0 ? `${t.quantity} ${SELL_UNITS[t.unit]?.label || 'পিস'}` : '-'}</p></td>
                          <td className="text-right"><p className={`row-amount ${t.type}`}>৳{t.amount.toLocaleString()}</p></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WebCard>
            </div>
          )}

          {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
            <div className="form-page-container animate-in">
              <WebCard title={`${activeTab.toUpperCase()} ভাউচার এন্ট্রি`} icon={Target}>
                <form onSubmit={handleSubmit} className="voucher-form-layout">
                  <div className="form-grid-columns">
                    <div className="form-column">
                      <ModernInput label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required icon={Calendar} />
                      
                      {!isExpense && (
                        <div className="form-grid-inner">
                          <div>
                            <label className="input-label-mini">ডিমের ধরণ</label>
                            <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} className="modern-select-web">
                              {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          {isSell && (
                            <div>
                              <label className="input-label-mini">বিক্রি ক্যাটাগরি</label>
                              <div className="category-toggle-box">
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`cat-btn ${formData.saleCategory === 'retail' ? 'active' : ''}`}>খুচরা</button>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`cat-btn ${formData.saleCategory === 'wholesale' ? 'active' : ''}`}>পাইকারি</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!isExpense && (
                        <div className="form-grid-inner mt-4">
                           <ModernInput label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" required icon={PlusCircle} />
                           <div className="flex flex-col gap-1.5">
                              <label className="input-label-mini">একক</label>
                              <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || isWholesale} className="modern-select-web disabled:opacity-50">
                                 {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                           </div>
                        </div>
                      )}

                      {isExpense && (
                        <div className="mt-4">
                          <label className="input-label-mini">খরচের খাত</label>
                          <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="modern-select-web">
                            {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="form-column">
                      {!isExpense && (
                        <>
                          <div className="form-grid-inner">
                             <ModernInput label="দর (একক)" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} className="web-input" placeholder="0.00" required readOnly={isRateReadOnly} />
                             <ModernInput label="ডিসকাউন্ট" type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} className="web-input" placeholder="0" />
                          </div>
                          <ModernInput label={isSell ? 'কাস্টমার নাম' : 'মহাজন নাম'} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="নাম..." required={isBuy || isWholesale} icon={User} className="mt-4" />
                        </>
                      )}

                      {isExpense && (
                        <ModernInput label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required icon={Wallet} className="mt-4" />
                      )}

                      <div className="payment-summary-voucher-box mt-6">
                        <p className="summary-label">পেমেন্ট ক্যালকুলেশন</p>
                        <h3 className="summary-total">
                          ৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}
                        </h3>
                        {!isExpense && (
                          <div className="paid-input-group mt-4">
                            <label className="input-label-mini text-white/70">নগদ জমা</label>
                            <input type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} className="voucher-paid-input" placeholder="সম্পূর্ণ পরিশোধ" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button disabled={submitting} className={`voucher-submit-btn ${activeTab}`}>
                    {submitting ? 'PROCESSING...' : 'ভাউচার সেভ করুন'}
                  </button>
                </form>
              </WebCard>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-page-layout animate-in">
               <div className="history-toolbar">
                  <div className="filter-group">
                    {['all', 'sell', 'buy', 'expense'].map(t => (
                      <button key={t} onClick={() => setTypeFilter(t)} className={`history-pill ${typeFilter === t ? 'active' : ''}`}>{t === 'all' ? 'সব' : t === 'sell' ? 'বিক্রি' : t === 'buy' ? 'ক্রয়' : 'খরচ'}</button>
                    ))}
                  </div>
                  <button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className={`toolbar-filter-btn ${dateFilter === 'today' ? 'active' : ''}`}>
                    <Filter size={16} /> {dateFilter === 'today' ? 'আজকের' : 'সকল সময়ের'}
                  </button>
               </div>

               <WebCard title="সম্পূর্ণ লেনদেন রেজিস্টার" icon={History}>
                  <div className="table-responsive-container">
                    <table className="web-data-table full-table">
                      <thead>
                        <tr>
                          <th>তারিখ</th>
                          <th>বিবরণ</th>
                          <th className="text-center">পরিমাণ</th>
                          <th className="text-right">মোট টাকা</th>
                          <th className="text-right">বাকি</th>
                          {userRole === 'admin' && <th className="text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map(t => (
                          <tr key={t.id}>
                            <td className="text-gray-500 font-bold">{t.date}</td>
                            <td>
                               <div className="row-flex-cell">
                                  <div className={`status-dot ${t.type}`}></div>
                                  <p className="row-main-text">{t.customerName || t.description || t.eggType}</p>
                               </div>
                            </td>
                            <td className="text-center font-bold text-gray-600">{t.quantity > 0 ? `${t.quantity} ${t.unit}` : '-'}</td>
                            <td className="text-right font-black text-gray-900">৳{t.amount.toLocaleString()}</td>
                            <td className="text-right">
                               {t.dueAmount > 0 ? <span className="due-pill">৳{t.dueAmount}</span> : <span className="paid-pill">Paid</span>}
                            </td>
                            {userRole === 'admin' && (
                              <td className="text-center">
                                <button onClick={() => handleDelete(t.id)} className="delete-row-btn"><Trash2 size={16} /></button>
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

          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="settings-page-grid animate-in">
               <WebCard title="ডিমের রেট সেটিংস" icon={Settings}>
                  <div className="settings-rate-list">
                     {EGG_TYPES.map(egg => (
                       <div key={egg} className="rate-config-card">
                          <h4 className="rate-card-title"><div className="dot"></div> {egg}</h4>
                          <div className="rate-input-grid">
                             {['pis', 'hali', 'case'].map(u => (
                               <div key={u} className="rate-input-item">
                                  <label>{u.toUpperCase()}</label>
                                  <input 
                                    type="number" 
                                    value={rates.retail[egg]?.[u] || ''} 
                                    onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} 
                                    className="rate-field"
                                  />
                               </div>
                             ))}
                          </div>
                          <div className="wholesale-config-row">
                             <span>পাইকারি দর (পিস)</span>
                             <input 
                               type="number" 
                               value={rates.wholesale[egg] || ''} 
                               onChange={e => setRates(p => ({ ...p, wholesale: { ...p.wholesale, [egg]: e.target.value } }))} 
                               className="wholesale-field" 
                             />
                          </div>
                       </div>
                     ))}
                     <button onClick={saveRates} className="save-settings-btn">সেটিংস সেভ করুন</button>
                  </div>
               </WebCard>
            </div>
          )}
        </main>
      </div>

      {/* --- Login Screen --- */}
      {userRole === 'guest' && (
        <div className="login-full-screen">
          <div className="login-box-container">
            <div className="login-icon-box"><Egg size={44} /></div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">নিশাদ এগ্রো</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">Management System Pro</p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড লিখুন" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="login-pass-field"
                autoFocus
              />
              <button className="login-submit-btn">প্রবেশ করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
