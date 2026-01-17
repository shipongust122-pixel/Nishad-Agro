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
  onSnapshot, 
  doc, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ShoppingCart, 
  Wallet, 
  History, 
  Trash2, 
  Save, 
  Egg, 
  Circle,
  Users, 
  UserMinus, 
  Store, 
  User, 
  Settings, 
  CreditCard,
  Lock, 
  Unlock, 
  LogOut, 
  Phone,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Filter,
  ListFilter,
  PlusCircle,
  ChevronRight,
  Info
} from 'lucide-react';

/**
 * NISHAD AGRO - MODERN PREMIUM UI v2.1
 * Fixed Duplicate Key Error & Reference Errors.
 */

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBOWUydDyASpw664VN7kkkUNJUPekpTmQA",
  authDomain: "nishad-agro.firebaseapp.com",
  projectId: "nishad-agro",
  storageBucket: "nishad-agro.firebasestorage.app",
  messagingSenderId: "984825143099",
  appId: "1:984825143099:web:c48e6e399fc98ee257211e"
};

// Safety Initialization
let firebaseApp, auth, db;
try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.error("Firebase Init Failed:", e);
}

const APP_DB_ID = 'nishad-agro-live';

// --- Constants ---
const EGG_TYPES = ['লাল ডিম', 'সাদা ডিম', 'হাঁসের ডিম'];
const EXPENSE_TYPES = ['গাড়ির তেল খরচ', 'ড্রাইভার ও হেল্পার খরচ']; // 'অন্যান্য' niche map function-e add kora hoyeche duplicate key avoid korte.
const SELL_UNITS = {
  'pis': { label: 'পিস', value: 1 },
  'hali': { label: 'হালি (৪)', value: 4 },
  'dojon': { label: 'ডজন (১২)', value: 12 },
  'case': { label: 'কেস (৩০)', value: 30 },
  'soto': { label: 'শত (১০০)', value: 100 }
};

// --- Helpers ---
const getCalculatedTotal = (data) => {
  if (data.type === 'expense') return parseFloat(data.amount || 0);
  const raw = (parseFloat(data.quantity) || 0) * (parseFloat(data.rate) || 0);
  return Math.max(0, raw - (parseFloat(data.discount) || 0));
};

const getHistoryStats = (data) => {
  let s = 0, b = 0, e = 0;
  data.forEach(t => {
    const a = parseFloat(t.amount || 0);
    if (t.type === 'sell') s += a; else if (t.type === 'buy') b += a; else if (t.type === 'expense') e += a;
  });
  return { s, b, e };
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-red-100 max-w-md w-full">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Info size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Error Hoyeche</h2>
            <p className="text-sm text-slate-400 mb-6 font-medium">{this.state.error?.toString()}</p>
            <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all">RELOAD APP</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Reusable Components ---
const InputField = ({ label, type = "text", value, onChange, placeholder, required, readOnly }) => (
  <div className="group">
    {label && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1 group-focus-within:text-orange-500 transition-colors">{label}</label>}
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      readOnly={readOnly} 
      className={`w-full px-5 py-4 rounded-2xl border-2 text-slate-700 font-bold transition-all outline-none
        ${readOnly 
          ? 'bg-slate-50 border-slate-100 text-slate-400' 
          : 'bg-white border-slate-100 focus:border-orange-400 focus:ring-8 focus:ring-orange-50'}`} 
      required={required} 
    />
  </div>
);

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, blurred }) => {
  const IconComp = Icon || Circle;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all hover:shadow-xl hover:translate-y-[-4px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 shadow-inner`}>
          <IconComp size={22} className={colorClass.replace('bg-', 'text-')} />
        </div>
        {subValue && !blurred && <span className="text-[9px] font-black px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-400 uppercase tracking-widest">{subValue}</span>}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">
          {blurred ? <span className="blur-sm text-slate-200">৳ 0000</span> : value}
        </h3>
      </div>
    </div>
  );
};

// --- Main Logic Component ---
function EggBusinessApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [userRole, setUserRole] = useState('guest');
  const [rates, setRates] = useState({ retail: {}, wholesale: {} });
  const [submitting, setSubmitting] = useState(false);

  const [passwordInput, setPasswordInput] = useState('');
  const [adminPass, setAdminPass] = useState('665911');
  const [subAdminPass, setSubAdminPass] = useState('1234');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newSubPass, setNewSubPass] = useState('');
  
  const [historyFilter, setHistoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    type: 'sell', saleCategory: 'retail', eggType: 'লাল ডিম', unit: 'pis', quantity: '', rate: '', description: '', customerName: '', discount: '', paidAmount: '', amount: '', date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    signInAnonymously(auth).catch(() => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubTrans = onSnapshot(collection(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'egg_transactions_v2'), snap => {
      setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    });
    onSnapshot(doc(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'settings', 'rates'), s => { if(s.exists()) setRates(s.data()); });
    onSnapshot(doc(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'settings', 'auth'), s => {
      if(s.exists()) {
        const d = s.data();
        if(d.adminPassword) setAdminPass(d.adminPassword);
        if(d.subAdminPassword) setSubAdminPass(d.subAdminPassword);
      }
    });
    return () => unsubTrans();
  }, [user]);

  useEffect(() => {
    if (formData.type === 'sell' && rates) {
      let r = '';
      if (formData.saleCategory === 'retail' && rates.retail?.[formData.eggType]) {
        r = rates.retail[formData.eggType][formData.unit] || '';
      } else if (formData.saleCategory === 'wholesale' && rates.wholesale) {
        if(formData.unit !== 'pis') setFormData(prev => ({...prev, unit: 'pis'}));
        r = rates.wholesale[formData.eggType] || '';
      }
      if(r) setFormData(p => ({ ...p, rate: r }));
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, formData.type, rates]);

  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let buyCosts = { 'লাল ডিম': {qty:0, total:0}, 'সাদা ডিম': {qty:0, total:0}, 'হাঁসের ডিম': {qty:0, total:0} };
    let sales=0, expenses=0, cash=0, profit=0, custDue=0, suppDue=0;
    const today = new Date().toISOString().split('T')[0];

    transactions.forEach(t => {
      const q = parseInt(t.quantityInPieces || 0);
      const amt = parseFloat(t.amount || 0);
      const paid = parseFloat(t.paidAmount || 0);
      const due = parseFloat(t.dueAmount || 0);

      if(t.type === 'buy') {
        if(t.eggType && stock[t.eggType] !== undefined) {
           stock[t.eggType] += q;
           buyCosts[t.eggType].qty += q;
           buyCosts[t.eggType].total += amt;
        }
        cash -= paid;
        suppDue += due;
      } else if(t.type === 'sell') {
        if(t.eggType && stock[t.eggType] !== undefined) stock[t.eggType] -= q;
        cash += paid;
        custDue += due;
        if(t.date === today) {
          sales += amt;
          const avg = buyCosts[t.eggType]?.qty > 0 ? (buyCosts[t.eggType].total / buyCosts[t.eggType].qty) : 0;
          profit += (amt - (q * avg));
        }
      } else if(t.type === 'expense') {
        cash -= amt;
        if(t.date === today) { expenses += amt; profit -= amt; }
      }
    });
    return { stock, sales, expenses, cash, profit, custDue, suppDue };
  }, [transactions]);

  const handleLogin = (e) => {
    e.preventDefault();
    if(passwordInput === adminPass) { setUserRole('admin'); setPasswordInput(''); }
    else if(passwordInput === subAdminPass) { setUserRole('subadmin'); setPasswordInput(''); }
    else alert('Invalid PIN!');
  };

  const handleLogout = () => { setUserRole('guest'); setActiveTab('dashboard'); setPasswordInput(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!user || submitting) return;
    setSubmitting(true);
    try {
      let finalAmt = getCalculatedTotal(formData);
      let qPieces = 0;
      if(formData.type !== 'expense') {
        finalAmt = (parseFloat(formData.quantity) * parseFloat(formData.rate)) - (parseFloat(formData.discount)||0);
        qPieces = parseInt(formData.quantity) * (formData.type === 'buy' ? 1 : SELL_UNITS[formData.unit].value);
      }
      const paid = formData.paidAmount === '' ? finalAmt : parseFloat(formData.paidAmount);
      
      await addDoc(collection(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'egg_transactions_v2'), {
        ...formData,
        amount: finalAmt,
        quantityInPieces: qPieces,
        paidAmount: paid,
        dueAmount: Math.max(0, finalAmt - paid),
        createdAt: new Date().toISOString()
      });
      alert('Safolbhabe Save Hoyeche!');
      setFormData(prev => ({...prev, quantity:'', rate:'', description:'', customerName:'', discount:'', paidAmount:'', amount:''}));
    } catch(err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const getFilteredData = () => {
    let list = transactions;
    const today = new Date().toISOString().split('T')[0];
    if(dateFilter === 'today') list = list.filter(t => t.date === today);
    else if(dateFilter === 'last7') {
       const d = new Date(); d.setDate(d.getDate()-7);
       list = list.filter(t => t.date >= d.toISOString().split('T')[0]);
    } else if(dateFilter === 'last30') {
       const d = new Date(); d.setDate(d.getDate()-30);
       list = list.filter(t => t.date >= d.toISOString().split('T')[0]);
    } else if(dateFilter === 'custom') list = list.filter(t => t.date === customDate);

    if(historyFilter !== 'all') {
      if(historyFilter === 'due') list = list.filter(t => t.type === 'sell' && t.dueAmount > 0);
      else if(historyFilter === 'supplier_due') list = list.filter(t => t.type === 'buy' && t.dueAmount > 0);
      else list = list.filter(t => t.type === historyFilter);
    }
    return list;
  };

  const filteredList = getFilteredData();
  const summary = useMemo(() => {
    let stats = getHistoryStats(filteredList);
    let d = 0;
    if (historyFilter === 'due' || historyFilter === 'supplier_due') {
      filteredList.forEach(t => d += (parseFloat(t.dueAmount) || 0));
    }
    return { ...stats, d };
  }, [filteredList, historyFilter]);

  const saveSettings = async () => {
    if(!user) return;
    try {
      await setDoc(doc(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'settings', 'rates'), rates);
      alert('Rates Update Hoyeche!');
    } catch(err) { alert(err.message); }
  };

  const changePass = async (type) => {
    if(!user) return;
    const upd = type==='admin' ? {adminPassword: newAdminPass} : {subAdminPassword: newSubPass};
    try {
      await setDoc(doc(db, 'artifacts', APP_DB_ID, 'users', user.uid, 'settings', 'auth'), upd, {merge:true});
      alert('PIN Changed!');
      setNewAdminPass(''); setNewSubPass('');
    } catch(err) { alert(err.message); }
  };

  if (loading) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50">
      <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-slate-400 font-black tracking-[0.4em] text-[10px] animate-pulse uppercase">Nishad Agro Booting...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32 md:pb-10 text-slate-800 antialiased">
      {userRole === 'guest' && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[100] flex justify-center items-center p-6 text-center">
          <div className="bg-white p-12 rounded-[4rem] w-full max-sm shadow-2xl border border-white/20 animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-orange-200 rotate-6 hover:rotate-0 transition-transform">
               <Egg size={48} className="text-white -rotate-6" />
            </div>
            <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tighter">Nishad Agro</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12">Smart Enterprise Manager</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl text-center text-3xl outline-none focus:ring-8 focus:ring-orange-50 focus:border-orange-400 transition-all font-black tracking-widest placeholder:text-slate-200" placeholder="000000" autoFocus />
              <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3">LOG IN <CheckCircle2 size={20} className="text-orange-400"/></button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white px-8 pt-12 pb-20 sticky top-0 z-20 shadow-2xl rounded-b-[4rem]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-3xl border border-white/10 shadow-xl"><Egg size={28} className="text-orange-400" /></div>
            <div><h1 className="text-3xl font-black tracking-tighter">Nishad Agro</h1><p className="text-[10px] text-slate-400 font-black uppercase">Inventory Cloud</p></div>
          </div>
          <div className="text-right"><p className="text-[9px] text-slate-500 font-black uppercase mb-1">Available Balance</p><div className="text-4xl font-black text-emerald-400 tracking-tighter">৳ {stats.cash.toLocaleString()}</div></div>
        </div>
        <div className="max-w-4xl mx-auto flex justify-between items-center bg-white/5 p-5 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-inner mt-6">
          <div className="flex items-center gap-3 text-xs font-black text-slate-300"><Phone size={14} className="text-orange-400"/> <span>01979-665911</span></div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-[9px] font-black uppercase px-5 py-2.5 rounded-2xl bg-white/10 text-white hover:bg-rose-500 transition-colors"><LogOut size={12}/> Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 -mt-12 relative z-20">
        <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar mb-4 px-2">
          {[
            {id:'dashboard', label:'Stats', icon:LayoutDashboard},
            {id:'buy', label:'Stock In', icon:ArrowDownCircle},
            {id:'sell', label:'Sale', icon:ArrowUpCircle},
            {id:'expense', label:'Cost', icon:MinusCircle},
            {id:'history', label:'Records', icon:History},
            {id:'settings', label:'Setup', icon:Settings}
          ].map(t => {
            if (t.id === 'settings' && userRole !== 'admin') return null;
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-3 px-8 py-5 rounded-[2rem] whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${isActive ? 'bg-white text-slate-900 shadow-2xl scale-110 border-b-4 border-orange-500' : 'bg-white/60 text-slate-400 border border-white/20 hover:bg-white'}`}>
                <t.icon size={18} className={isActive ? 'text-orange-500' : 'text-slate-300'}/> {t.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 px-1">
            <div className="grid grid-cols-3 gap-5">
              <StatCard title="Red Eggs" value={stats.stock['লাল ডিম']} colorClass="bg-rose-500" icon={Egg} subValue="Stock" />
              <StatCard title="White Eggs" value={stats.stock['সাদা ডিম']} colorClass="bg-slate-500" icon={Egg} subValue="Stock" />
              <StatCard title="Duck Eggs" value={stats.stock['হাঁসের ডিম']} colorClass="bg-cyan-500" icon={Egg} subValue="Stock" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <StatCard title="Market Due" value={`৳${stats.custDue.toLocaleString()}`} colorClass="bg-emerald-500" icon={Users} subValue="Receivable" />
              <StatCard title="Payable" value={`৳${stats.suppDue.toLocaleString()}`} colorClass="bg-rose-600" icon={Store} subValue="Suppliers" />
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[4rem] p-12 text-white shadow-3xl shadow-slate-300 relative overflow-hidden group border border-white/5">
               <div className="relative z-10 flex justify-between items-center">
                 <div><p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.3em] mb-3">Today's Net Profit</p><h2 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-200">{userRole === 'admin' ? `৳ ${stats.profit.toLocaleString()}` : '***'}</h2></div>
                 <div className="bg-gradient-to-tr from-orange-400 to-rose-500 p-6 rounded-[2.5rem] shadow-2xl group-hover:scale-110 transition-transform"><CreditCard size={42} className="text-white"/></div>
               </div>
               <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            </div>
          </div>
        )}

        {(activeTab === 'buy' || activeTab === 'sell' || activeTab === 'expense') && (
          <div className="bg-white p-12 rounded-[4rem] shadow-3xl border border-slate-50 animate-in fade-in zoom-in-95 duration-500">
             <div className="flex items-center gap-6 mb-12 border-b border-slate-100 pb-10">
                <div className={`p-5 rounded-[2rem] shadow-inner ${activeTab==='buy'?'bg-blue-50 text-blue-600':activeTab==='sell'?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-600'}`}>
                  {activeTab==='buy' ? <ArrowDownCircle size={36}/> : activeTab==='sell' ? <ArrowUpCircle size={36}/> : <MinusCircle size={36}/>}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{activeTab} Entry</h2>
             </div>
             <form onSubmit={handleSubmit} className="space-y-8">
               <InputField label="Entry Date" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} required/>
               {activeTab === 'sell' && (
                <div className="flex gap-4 bg-slate-50 p-2.5 rounded-[2rem] border border-slate-100">
                  <label className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl cursor-pointer font-black text-xs uppercase tracking-widest transition-all ${formData.saleCategory==='retail' ? 'bg-white text-emerald-600 shadow-2xl' : 'text-slate-300'}`}>
                    <input type="radio" className="hidden" checked={formData.saleCategory==='retail'} onChange={()=>setFormData({...formData, saleCategory:'retail'})}/> <User size={16}/> Retail
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl cursor-pointer font-black text-xs uppercase tracking-widest transition-all ${formData.saleCategory==='wholesale' ? 'bg-white text-purple-600 shadow-2xl' : 'text-slate-300'}`}>
                    <input type="radio" className="hidden" checked={formData.saleCategory==='wholesale'} onChange={()=>setFormData({...formData, saleCategory:'wholesale'})}/> <Store size={16}/> Wholesale
                  </label>
                </div>
               )}
               {activeTab !== 'expense' ? (
                 <>
                   <div className="grid grid-cols-2 gap-8">
                     <select value={formData.eggType} onChange={e=>setFormData({...formData, eggType:e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white font-bold outline-none appearance-none">
                       {EGG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                     <select value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})} disabled={formData.saleCategory==='wholesale' && activeTab==='sell'} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white font-bold outline-none appearance-none">
                       {Object.entries(SELL_UNITS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                     <InputField label="Quantity" type="number" value={formData.quantity} onChange={e=>setFormData({...formData, quantity:e.target.value})} required placeholder="0"/>
                     <InputField label="Rate" type="number" value={formData.rate} onChange={e=>setFormData({...formData, rate:e.target.value})} required readOnly={activeTab==='sell'&&userRole==='subadmin'} placeholder="0.00"/>
                   </div>
                   <div className="p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 mb-12 shadow-inner">
                     <InputField label={activeTab==='buy'?"Vendor Name":"Customer Name"} value={formData.customerName} onChange={e=>setFormData({...formData, customerName:e.target.value})} required={activeTab==='buy' || formData.saleCategory==='wholesale'} placeholder="Full Name..."/>
                     {activeTab==='sell' && <InputField label="Adjustment / Discount" type="number" value={formData.discount} onChange={e=>setFormData({...formData, discount:e.target.value})} placeholder="0.00"/>}
                     <div className="flex justify-between items-center py-10 border-t border-slate-200 mt-8 mb-8"><span className="font-black text-slate-400 text-xs uppercase">Final Amount</span><span className="font-black text-5xl text-slate-900 tracking-tighter">৳ {getCalculatedTotal(formData).toLocaleString()}</span></div>
                     <InputField label="Paid Amount" type="number" value={formData.paidAmount} onChange={e=>setFormData({...formData, paidAmount:e.target.value})} placeholder={getCalculatedTotal(formData).toString()}/>
                   </div>
                 </>
               ) : (
                 <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 mb-12">
                   <select value={EXPENSE_TYPES.includes(formData.description)?formData.description:'অন্যান্য'} onChange={e=>setFormData({...formData, description:e.target.value==='অন্যান্য'?'':e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white font-bold mb-6 appearance-none">
                     {[...EXPENSE_TYPES, 'অন্যান্য'].map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                   {(!EXPENSE_TYPES.includes(formData.description)) && <InputField label="Description" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} required/>}
                   <InputField label="Amount" type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} required/>
                 </div>
               )}
               <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-5 group">{submitting ? 'SYNCING...' : <><Save size={28}/> SAVE ENTRY</>}</button>
             </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10 animate-in fade-in duration-700">
             <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100">
               <div className="flex gap-4 flex-wrap mb-12">
                  {['all','today','last7','last30'].map(d => (
                    <button key={d} onClick={() => setDateFilter(d)} className={`px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest border transition-all ${dateFilter === d ? 'bg-orange-500 text-white border-orange-500 shadow-2xl shadow-orange-100 scale-105' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>{d}</button>
                  ))}
               </div>
               <div className="flex gap-4 flex-wrap">
                  {['all','sell','buy','expense','due','supplier_due'].map(f => (
                    <button key={f} onClick={() => setHistoryFilter(f)} className={`px-6 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all ${historyFilter === f ? 'bg-slate-900 text-white shadow-2xl' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}>{f}</button>
                  ))}
               </div>
             </div>
             <div className="bg-white rounded-[4rem] border border-slate-50 shadow-sm overflow-hidden">
               {filteredList.map(t => (
                 <div key={t.id} className="p-10 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all flex justify-between items-center group">
                   <div className="flex items-center gap-8">
                     <div className={`p-6 rounded-[2.5rem] shadow-sm ${t.type==='sell'?'bg-emerald-50 text-emerald-600':t.type==='buy'?'bg-blue-50 text-blue-600':'bg-rose-50 text-rose-600'}`}>{t.type==='sell'?<ArrowUpCircle size={28}/>:t.type==='buy'?<ArrowDownCircle size={28}/>:<MinusCircle size={28}/>}</div>
                     <div><h4 className="font-black text-slate-800 text-xl tracking-tighter">{t.customerName || 'Unnamed'}</h4><p className="text-xs text-slate-400 font-bold uppercase">{t.description || `${t.quantity} ${t.unit} • ${t.eggType}`}</p></div>
                   </div>
                   <div className="text-right"><div className={`text-3xl font-black tracking-tighter ${t.type==='sell'?'text-emerald-600':t.type==='buy'?'text-blue-600':'text-rose-600'}`}>৳ {parseFloat(t.amount || 0).toLocaleString()}</div><button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db,'artifacts',APP_DB_ID,'users',user.uid,'egg_transactions_v2',t.id))}} className="opacity-0 group-hover:opacity-100 text-slate-200 mt-4"><Trash2 size={18}/></button></div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-12 rounded-[4rem] border border-slate-50 shadow-3xl animate-in zoom-in-95 duration-500 text-center">
             <button onClick={saveSettings} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-3xl hover:bg-slate-800 transition-all uppercase tracking-[0.4em] text-sm">DEPLOY GLOBAL CATALOG</button>
          </div>
        )}
      </main>
    </div>
  );
}

// Global App Wrapper
export default function App() {
  return (
    <ErrorBoundary>
      <EggBusinessApp />
    </ErrorBoundary>
  );
}
