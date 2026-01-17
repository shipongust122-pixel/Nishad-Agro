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
  Fingerprint
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

const appId = 'nishad_agro_v6_final';

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

const StatCard = ({ title, value, subValue, icon: Icon, color, blurred = false }) => (
  <div className="stat-card">
    <div className={`icon-circle ${color}`}>
      <Icon size={20} />
    </div>
    <div className="card-info">
      <p className="card-title">{title}</p>
      {blurred ? (
        <div className="blur-text">৳৳৳৳৳ <Lock size={12} /></div>
      ) : (
        <div className="value-group">
          <h2 className="card-value">{value}</h2>
          {subValue && <span className="card-sub">{subValue}</span>}
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

  // Derived state
  const isExpense = activeTab === 'expense';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';

  // --- Firebase Listeners ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth initialization failed", e);
      }
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
      console.error("Firestore access error", err);
      setLoading(false);
    });

    const docRates = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates');
    const unsubRates = onSnapshot(docRates, (d) => {
      if (d.exists()) setRates(d.data());
    }, (err) => console.error("Rates access error", err));

    const docAuth = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubAuth = onSnapshot(docAuth, (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.subAdminPassword) setSubAdminPassword(data.subAdminPassword);
      }
    }, (err) => console.error("Auth settings access error", err));

    return () => {
      unsubTr();
      unsubRates();
      unsubAuth();
    };
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

  // Stats logic
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
      alert('Sadhin bhabe save hoyeche!');
      setActiveTab('dashboard');
      setFormData(prev => ({ ...prev, quantity: '', paidAmount: '', customerName: '', description: '', discount: '' }));
    } catch (err) { alert('Error occurred!'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id)); } catch (err) { alert("Error!"); }
  };

  if (loading) return <div className="app-loader">Loading Nishad Agro...</div>;

  return (
    <div className="app-main">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; font-family: 'Hind Siliguri', sans-serif !important; }
        html, body, #root { 
          width: 100% !important; min-height: 100vh !important; display: block !important; 
          background: #FDFCFB !important; text-align: left !important; place-items: unset !important;
        }

        .app-main { display: flex; flex-direction: column; min-height: 100vh; width: 100%; max-width: 600px; margin: 0 auto !important; position: relative; padding-bottom: 100px !important; }

        /* Header */
        .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 20px !important; background: #fff; border-bottom: 1px solid #F0F0F0; position: sticky; top: 0; z-index: 100; }
        .logo-group { display: flex; align-items: center; gap: 10px !important; }
        .cash-group { text-align: right; }
        .cash-val { color: #EA580C; font-weight: 900; font-size: 20px; }

        /* Stat Cards */
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px !important; padding: 15px !important; }
        .stat-card { background: #fff; padding: 16px !important; border-radius: 20px !important; border: 1px solid #F3F4F6; display: flex; align-items: center; gap: 12px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important; }
        .icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .icon-circle.orange { background: #FFF7ED; color: #EA580C; }
        .icon-circle.blue { background: #EFF6FF; color: #3B82F6; }
        .icon-circle.green { background: #F0FDF4; color: #10B981; }
        .icon-circle.rose { background: #FFF1F2; color: #F43F5E; }
        .card-title { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; }
        .card-value { font-size: 18px; font-weight: 900; color: #111827; }
        .blur-text { font-size: 16px; filter: blur(4px); color: #D1D5DB; display: flex; align-items: center; gap: 4px !important; }

        /* Navigation */
        .bottom-nav { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 400px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 24px !important; display: flex; justify-content: space-around; padding: 10px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; z-index: 1000; border: 1px solid #F0F0F0; }
        .nav-item { border: none; background: none; color: #9CA3AF; padding: 12px !important; border-radius: 18px !important; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .nav-item.active { color: #EA580C; background: #FFF7ED; }

        /* Forms */
        .voucher-box { background: #fff; margin: 15px !important; border-radius: 24px !important; border: 1px solid #F3F4F6; overflow: hidden; padding: 20px !important; }
        .form-label { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 5px !important; display: block; margin-left: 5px !important; }
        input, select { width: 100%; padding: 12px 16px !important; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 14px !important; font-weight: 700; font-size: 14px !important; outline: none !important; margin-bottom: 15px !important; }
        input:focus { border-color: #EA580C; background: #fff; }
        .bill-highlight { background: #111827; padding: 20px !important; border-radius: 18px !important; text-align: center; color: #fff; margin-bottom: 20px !important; }
        .bill-highlight h3 { font-size: 28px; font-weight: 900; margin-top: 5px !important; }
        .submit-btn { width: 100%; padding: 16px !important; border-radius: 16px !important; border: none; color: #fff; font-weight: 900; text-transform: uppercase; cursor: pointer; }

        /* History */
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 15px !important; border-bottom: 1px solid #F9FAFB; }
        .history-left { display: flex; align-items: center; gap: 12px !important; }
        .type-indicator { width: 4px; height: 30px; border-radius: 2px; }
        .type-indicator.sell { background: #10B981; }
        .type-indicator.buy { background: #3B82F6; }
        .type-indicator.expense { background: #F43F5E; }
        .history-main-text { font-size: 14px; font-weight: 700; color: #111827; }
        .history-sub-text { font-size: 11px; color: #9CA3AF; }

        .app-loader { height: 100vh; display: flex; align-items: center; justify-content: center; color: #EA580C; font-weight: 900; }
        .animate-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Lock Screen */
        .login-screen { position: fixed; inset: 0; z-index: 2000; background: linear-gradient(135deg, #FDFCFB 0%, #F3F4F6 100%); display: flex; align-items: center; justify-content: center; padding: 30px !important; }
        .login-card { width: 100%; max-width: 380px; text-align: center; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 40px !important; border-radius: 32px !important; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #E5E7EB; }
        .login-icon-wrapper { width: 80px; height: 80px; background: #EA580C; color: #fff; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px !important; box-shadow: 0 10px 20px rgba(234, 88, 12, 0.3); }
        .login-title { font-size: 26px; font-weight: 900; color: #111827; }
        .login-field { width: 100%; padding: 18px !important; background: #fff; border: 2px solid #F3F4F6; border-radius: 20px !important; text-align: center; font-size: 24px !important; font-weight: 900 !important; letter-spacing: 12px; outline: none !important; }
        .login-btn { width: 100%; padding: 18px !important; background: #111827; color: #fff; border: none; border-radius: 20px !important; font-weight: 900; font-size: 16px; cursor: pointer; }
      `}</style>

      {/* Modern Professional Lock Screen */}
      {userRole === 'guest' && (
        <div className="login-screen">
          <div className="login-card animate-up">
            <div className="login-icon-wrapper"><ShieldCheck size={38} /></div>
            <h1 className="login-title">নিশাদ এগ্রো</h1>
            <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '40px' }}>সিস্টেম অ্যাক্সেস করতে পিন দিন</p>
            <form onSubmit={handleLogin}>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="login-field" placeholder="••••" maxLength={6} autoFocus />
              <button type="submit" className="login-btn flex items-center justify-center gap-2" style={{ marginTop: '20px' }}><Fingerprint size={20} /> আনলক করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="top-bar">
        <div className="logo-group">
          <div style={{ padding: '8px', background: '#EA580C', color: '#fff', borderRadius: '10px' }}><Egg size={20} /></div>
          <span style={{ fontWeight: 900, fontSize: '18px' }}>নিশাদ এগ্রো</span>
        </div>
        <div className="cash-group">
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>ক্যাশ বক্স</p>
          <p className="cash-val">৳ {(stats.cash || 0).toLocaleString()}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="animate-up">
        {activeTab === 'dashboard' && (
          <div className="tab-dashboard">
            <div className="stat-grid">
               <StatCard title="লাল ডিম" value={stats.stock['লাল ডিম'] || 0} subValue="পিস" icon={Egg} color="orange" />
               <StatCard title="সাদা ডিম" value={stats.stock['সাদা ডিম'] || 0} subValue="পিস" icon={Egg} color="blue" />
               <StatCard title="হাঁসের ডিম" value={stats.stock['হাঁসের ডিম'] || 0} subValue="পিস" icon={Egg} color="rose" />
               <StatCard title="মার্কেট বাকি" value={`৳${(stats.custDue || 0).toLocaleString()}`} icon={Users} color="green" />
               <StatCard title="মহাজন বাকি" value={`৳${(stats.suppDue || 0).toLocaleString()}`} icon={AlertCircle} color="rose" />
               <StatCard title="আজকের লাভ" value={`৳${(stats.todayProfit || 0).toLocaleString()}`} icon={TrendingUp} color="green" blurred={userRole !== 'admin'} />
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ background: '#111827', padding: '24px', borderRadius: '24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase' }}>আজকের মোট বিক্রি</p>
                <h2 style={{ fontSize: '32px', fontWeight: 900 }}>৳ {(stats.todaySales || 0).toLocaleString()}</h2>
                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }}><ShoppingCart size={100} /></div>
              </div>
            </div>

            <div style={{ padding: '15px' }}>
               <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#4B5563', marginBottom: '15px' }}>সাম্প্রতিক লেনদেন</h3>
               <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="history-item">
                      <div className="history-left">
                         <div className={`type-indicator ${t.type}`}></div>
                         <div>
                            <p className="history-main-text">{t.customerName || t.description || t.eggType}</p>
                            <p className="history-sub-text">{t.type} • {t.date}</p>
                         </div>
                      </div>
                      <p style={{ fontWeight: 900, fontSize: '14px' }}>৳{(t.amount || 0).toLocaleString()}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {(isSell || isBuy || isExpense) && (
          <div className="voucher-box">
             <div className="bill-highlight" style={{ background: isSell ? '#10B981' : isBuy ? '#3B82F6' : '#EF4444' }}>
                <p style={{ fontSize: '10px', opacity: 0.8, fontWeight: 900 }}>মোট ভাউচার বিল</p>
                <h3>৳ {(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0) + (isExpense ? parseFloat(formData.amount || 0) : 0)).toLocaleString()}</h3>
             </div>
             <form onSubmit={handleSubmit}>
                <label className="form-label">তারিখ</label>
                <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                {!isExpense && (
                  <>
                    <label className="form-label">ডিমের ধরণ</label>
                    <select value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))}>
                      {EGG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    {isSell && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: 900, background: formData.saleCategory === 'retail' ? '#EA580C' : '#F3F4F6', color: formData.saleCategory === 'retail' ? '#fff' : '#9CA3AF' }}>খুচরা</button>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: 900, background: formData.saleCategory === 'wholesale' ? '#EA580C' : '#F3F4F6', color: formData.saleCategory === 'wholesale' ? '#fff' : '#9CA3AF' }}>পাইকারি</button>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label className="form-label">পরিমাণ</label><input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} required /></div>
                      <div>
                        <label className="form-label">একক</label>
                        <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={isBuy || (isSell && formData.saleCategory === 'wholesale')}>
                          {Object.entries(SELL_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label className="form-label">দর</label><input type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} required /></div>
                      <div><label className="form-label">ছাড়</label><input type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} /></div>
                    </div>
                    <label className="form-label">নাম</label>
                    <input type="text" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} />
                    <label className="form-label">নগদ পরিশোধ</label>
                    <input type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} />
                  </>
                )}
                {isExpense && (
                  <>
                    <label className="form-label">খাত</label>
                    <select value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}>
                      {EXPENSE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      <option value="অন্যান্য">অন্যান্য</option>
                    </select>
                    <label className="form-label">টাকা</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required />
                  </>
                )}
                <button type="submit" disabled={submitting} className="submit-btn" style={{ background: isSell ? '#10B981' : isBuy ? '#3B82F6' : '#EF4444' }}>{submitting ? 'Saving...' : 'ভাউচার সেভ করুন'}</button>
             </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ padding: '15px' }}>
             <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '15px' }} className="no-scrollbar">
                {['all', 'sell', 'buy', 'expense'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '10px 20px', borderRadius: '14px', border: '1px solid #F0F0F0', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', background: typeFilter === t ? '#111827' : '#fff', color: typeFilter === t ? '#fff' : '#9CA3AF' }}>{t}</button>
                ))}
             </div>
             <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #F3F4F6' }}>
                {filteredHistory.map(t => (
                  <div key={t.id} className="history-item">
                     <div className="history-left">
                        <div className={`type-indicator ${t.type}`}></div>
                        <div>
                           <p className="history-main-text">{t.customerName || t.eggType || t.description}</p>
                           <p className="history-sub-text">{t.date} • ৳{(t.amount || 0).toLocaleString()}</p>
                        </div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        {t.dueAmount > 0 ? <span style={{ color: '#F43F5E', fontSize: '10px', fontWeight: 900 }}>DUE ৳{t.dueAmount}</span> : <span style={{ color: '#10B981', fontSize: '10px', fontWeight: 900 }}>PAID</span>}
                        {userRole === 'admin' && <button onClick={() => handleDelete(t.id)} style={{ display: 'block', border: 'none', background: 'none', color: '#D1D5DB', marginLeft: 'auto' }}><Trash2 size={16}/></button>}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'settings' && userRole === 'admin' && (
          <div style={{ padding: '20px' }}>
             <div style={{ background: '#fff', padding: '24px', borderRadius: '28px', border: '1px solid #F3F4F6' }}>
                <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Settings className="text-orange-600"/> রেট সেটিংস</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {EGG_TYPES.map(egg => (
                      <div key={egg} style={{ padding: '20px', background: '#F9FAFB', borderRadius: '20px' }}>
                        <h4 style={{ fontWeight: 900, marginBottom: '15px' }}>{egg}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            {['pis', 'hali', 'case'].map(u => (
                              <div key={u}>
                                <label className="form-label">{u}</label>
                                <input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => {
                                  const newRates = {...rates};
                                  newRates.retail[egg][u] = e.target.value;
                                  setRates(newRates);
                                }} style={{ background: '#fff' }} />
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('Update successful!'); }} className="submit-btn" style={{ background: '#111827' }}>Update</button>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#F43F5E', fontWeight: 900, marginTop: '20px' }}>Logout</button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={24}/></button>
        <button onClick={() => setActiveTab('sell')} className={`nav-item ${activeTab === 'sell' ? 'active' : ''}`}><ShoppingCart size={24}/></button>
        <button onClick={() => setActiveTab('buy')} className={`nav-item ${activeTab === 'buy' ? 'active' : ''}`}><PlusCircle size={24}/></button>
        <button onClick={() => setActiveTab('expense')} className={`nav-item ${activeTab === 'expense' ? 'active' : ''}`}><Wallet size={24}/></button>
        <button onClick={() => setActiveTab('history')} className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}><History size={24}/></button>
        {userRole === 'admin' && <button onClick={() => setActiveTab('settings')} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}><Settings size={24}/></button>}
      </nav>

    </div>
  );
}
