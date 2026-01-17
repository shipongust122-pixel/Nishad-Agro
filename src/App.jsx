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
  ChevronRight
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
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, blurred = false }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
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

      <header className="main-header">
        <div className="header-content max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="header-icon"><Egg size={22} /></div>
            <div>
              <h1 className="text-lg font-black leading-none">নিশাদ এগ্রো</h1>
              <p className="text-[9px] font-bold uppercase mt-1 opacity-60 flex items-center gap-1"><Phone size={10} /> 01979665911</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold opacity-40 uppercase">ক্যাশ</p>
            <p className="font-black text-orange-600">৳{stats.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-5 pb-32">
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
              <p className="text-[10px] font-bold uppercase opacity-80 mb-1">আজকের লাভ/লস</p>
              <div className="flex justify-between items-end">
                {userRole === 'admin' ? <h2 className="text-3xl font-black">৳{stats.todayProfit.toLocaleString()}</h2> : <div className="blur-sm text-2xl font-black">৳৳৳৳৳</div>}
                <div className="text-right"><p className="text-[9px] uppercase font-bold opacity-60">আজকের বিক্রি</p><p className="font-bold">৳{stats.todaySales}</p></div>
              </div>
            </div>

            <div className="recent-list space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">সাম্প্রতিক লেনদেন</h3>
              {transactions.slice(0, 4).map(t => (
                <div key={t.id} className="transaction-item">
                  <div className="flex items-center gap-3">
                    <div className={`t-icon ${t.type}`}>{t.type === 'sell' ? <ArrowUpCircle size={18}/> : t.type === 'buy' ? <ArrowDownCircle size={18}/> : <MinusCircle size={18}/>}</div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">{t.customerName || t.description || t.eggType}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{t.type === 'sell' ? `${t.quantity} ${SELL_UNITS[t.unit]?.label}` : t.date}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${t.type === 'sell' ? 'text-green-600' : 'text-gray-900'}`}>{t.type === 'sell' ? '+' : '-'} ৳{t.amount}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'sell' || activeTab === 'buy' || activeTab === 'expense') && (
          <div className="form-card">
            <h2 className="text-xl font-black mb-6 uppercase flex items-center gap-2">
              {activeTab === 'sell' ? <ShoppingCart className="text-green-600"/> : activeTab === 'buy' ? <PlusCircle className="text-blue-600"/> : <Wallet className="text-red-600"/>}
              {activeTab === 'sell' ? 'বিক্রি' : activeTab === 'buy' ? 'মাল কেনা' : 'খরচ'} এন্ট্রি
            </h2>
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input label="তারিখ" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
              {activeTab !== 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <CustomSelect label="ডিমের ধরণ" value={formData.eggType} onChange={e => setFormData(p => ({ ...p, eggType: e.target.value }))} options={EGG_TYPES.map(v => ({ label: v, value: v }))} />
                    <CustomSelect label="একক" value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} disabled={activeTab === 'buy' || formData.saleCategory === 'wholesale'} options={Object.entries(SELL_UNITS).map(([k, v]) => ({ label: v.label, value: k }))} />
                  </div>
                  {activeTab === 'sell' && (
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'retail' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formData.saleCategory === 'retail' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>খুচরা</button>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, saleCategory: 'wholesale' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formData.saleCategory === 'wholesale' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>পাইকারি</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="পরিমাণ" type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} required />
                    <Input label="দর" type="number" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: e.target.value }))} readOnly={activeTab === 'sell' && userRole === 'subadmin'} required />
                  </div>
                  <Input label={activeTab === 'sell' ? "কাস্টমার" : "মহাজন"} value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} required={activeTab === 'buy' || formData.saleCategory === 'wholesale'} />
                  <div className="grid grid-cols-2 gap-3 border-t pt-4">
                    <div className="bg-gray-50 p-2 rounded-xl text-center"><p className="text-[9px] font-bold text-gray-400 uppercase">মোট</p><p className="font-black text-gray-800">৳{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0) - parseFloat(formData.discount || 0)).toLocaleString()}</p></div>
                    <Input label="নগদ জমা" type="number" value={formData.paidAmount} onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value }))} placeholder="সব" />
                  </div>
                </>
              )}
              {activeTab === 'expense' && (
                <>
                  <CustomSelect label="খাত" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} options={EXPENSE_TYPES.map(v => ({ label: v, value: v }))} />
                  <Input label="টাকা" type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required />
                </>
              )}
              <button disabled={submitting} className={`submit-btn ${activeTab}`}>{submitting ? 'প্রসেসিং...' : 'সেভ করুন'}</button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {['all', 'sell', 'buy', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${typeFilter === t ? 'bg-orange-600 text-white' : 'bg-white text-gray-400'}`}>{t === 'all' ? 'সব' : t}</button>
              ))}
            </div>
            <div className="bg-white rounded-[2rem] border overflow-hidden">
              <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center"><h3 className="text-[10px] font-black uppercase opacity-40">রেজিস্টার</h3><button onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')} className="p-2 bg-white border rounded-lg"><Filter size={14}/></button></div>
              <div className="divide-y">
                {filteredHistory.map(t => (
                  <div key={t.id} className="p-4 flex justify-between items-center">
                    <div><h4 className="font-bold text-sm">{t.customerName || t.description || t.eggType}</h4><p className="text-[9px] font-bold text-gray-400">{t.date} • {t.quantity > 0 ? `${t.quantity} ${t.unit}` : 'খরচ'}</p></div>
                    <div className="text-right"><p className="font-black text-sm">৳{t.amount}</p>{t.dueAmount > 0 && <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 rounded-full">বাকি ৳{t.dueAmount}</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="space-y-6">
            <div className="form-card">
              <h2 className="text-lg font-black mb-4 uppercase">রেট সেটআপ</h2>
              <div className="space-y-4">
                {EGG_TYPES.map(egg => (
                  <div key={egg} className="p-4 bg-gray-50 rounded-2xl">
                    <h3 className="font-black text-xs mb-3">{egg}</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {['pis', 'hali', 'case'].map(u => (
                        <div key={u}><label className="text-[8px] font-black uppercase opacity-40 ml-1">{u}</label><input type="number" value={rates.retail[egg]?.[u] || ''} onChange={e => setRates(p => ({ ...p, retail: { ...p.retail, [egg]: { ...p.retail[egg], [u]: e.target.value } } }))} className="w-full p-2 rounded-lg border font-black text-center text-sm" /></div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates); alert('সেভ হয়েছে!'); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black mt-4">সেভ করুন</button>
              </div>
            </div>
            <button onClick={() => { setUserRole('guest'); setActiveTab('dashboard'); }} className="w-full py-4 text-red-600 font-black border-2 border-red-50 rounded-2xl flex items-center justify-center gap-2"><LogOut size={18}/> লগআউট</button>
          </div>
        )}
      </main>

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
          return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}><item.icon size={22} /></button>
        })}
      </nav>

      <style>{`
        /* Aggressive CSS Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif !important; }
        
        html, body, #root { 
          width: 100% !important; 
          height: 100% !important; 
          min-height: 100vh !important;
          margin: 0 !important; 
          padding: 0 !important; 
          display: block !important; 
          text-align: left !important;
          background: #FDFCFB !important;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Prevent broken character issues */
        body { line-height: 1.6; }

        .app-container { width: 100%; min-height: 100vh; position: relative; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }

        .main-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-b: 1px solid #f0f0f0; padding: 1rem; width: 100%; }
        .header-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .header-icon { background: #ea580c; color: white; padding: 0.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; }

        .profit-banner { background: #ea580c; color: white; padding: 1.5rem; border-radius: 1.5rem; box-shadow: 0 10px 20px rgba(234, 88, 12, 0.2); }

        .transaction-item { background: white; padding: 1rem; border-radius: 1rem; border: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; }
        .t-icon { padding: 0.5rem; border-radius: 0.75rem; }
        .t-icon.sell { background: #f0fdf4; color: #16a34a; }
        .t-icon.buy { background: #eff6ff; color: #2563eb; }
        .t-icon.expense { background: #fef2f2; color: #dc2626; }

        .login-overlay { position: fixed; inset: 0; z-index: 100; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-card { text-align: center; width: 100%; max-width: 320px; }
        .login-card h1 { font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
        .login-card input { width: 100%; padding: 1rem; background: #f9f9f9; border: 2px solid #f0f0f0; border-radius: 1rem; margin-top: 2rem; text-align: center; font-size: 1.5rem; font-weight: 900; letter-spacing: 0.5rem; outline: none; }
        .login-card button { width: 100%; padding: 1rem; background: #ea580c; color: white; font-weight: 900; border: none; border-radius: 1rem; margin-top: 1rem; cursor: pointer; }

        .bottom-nav { position: fixed; bottom: 1.5rem; left: 1.25rem; right: 1.25rem; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(0,0,0,0.05); padding: 0.75rem; border-radius: 2rem; display: flex; justify-content: space-around; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 60; max-width: 500px; margin: 0 auto; }
        .nav-item { border: none; background: none; color: #cbd5e1; padding: 0.5rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .nav-item.active { color: #ea580c; transform: translateY(-5px); }

        .form-card { background: white; padding: 1.5rem; border-radius: 2rem; border: 1px solid #f0f0f0; }
        .submit-btn { width: 100%; padding: 1.25rem; border-radius: 1.25rem; font-weight: 900; color: white; border: none; cursor: pointer; margin-top: 1.5rem; transition: transform 0.1s; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn.sell { background: #16a34a; }
        .submit-btn.buy { background: #2563eb; }
        .submit-btn.expense { background: #dc2626; }
      `}</style>
      
      {/* Import Font with fallback */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap" />
    </div>
  );
}
