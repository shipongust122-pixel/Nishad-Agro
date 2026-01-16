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
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  TrendingUp, 
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
  AlertCircle,
  UserMinus,
  Store,
  User,
  Settings,
  Percent,
  Coins,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  KeyRound,
  Filter,
  ListFilter,
  Calendar,
  UserCheck,
  Phone
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Fixed App ID for data path
const appId = 'nishad-agro-live';

// --- Constants ---
const EGG_TYPES = ['লাল ডিম', 'সাদা ডিম', 'হাঁসের ডিম'];
const EXPENSE_TYPES = ['গাড়ির তেল খরচ', 'ড্রাইভার ও হেল্পার খরচ', 'অন্যান্য'];

const SELL_UNITS = {
  'pis': { label: 'পিস', value: 1 },
  'hali': { label: 'হালি (৪)', value: 4 },
  'dojon': { label: 'ডজন (১২)', value: 12 },
  'case': { label: 'কেস (৩০)', value: 30 },
  'soto': { label: 'শত (১০০)', value: 100 }
};

// --- Components ---

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, readOnly = false, className = "" }) => (
  <div className={`mb-3 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border ${required && !value ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-orange-500'} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
      required={required}
    />
  </div>
);

const Select = ({ label, value, onChange, options, disabled = false }) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Card = ({ title, value, subValue, icon: Icon, color, blurred = false }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden h-full">
    <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-4 -translate-y-4 rounded-full opacity-10 ${color.replace('text', 'bg')}`}></div>
    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1 relative z-10">{title}</h3>
    {blurred ? (
      <div className="flex items-center gap-2 mt-1">
        <div className="text-2xl font-bold text-gray-300 blur-sm select-none">৳৳৳৳</div>
        <Lock size={16} className="text-gray-400"/>
      </div>
    ) : (
      <div className="text-2xl font-bold text-gray-800 relative z-10">{value}</div>
    )}
    {subValue && !blurred && <div className="text-xs text-gray-500 mt-1 relative z-10">{subValue}</div>}
  </div>
);

// Main Application Component
export default function EggBusinessApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter State
  const [historyFilter, setHistoryFilter] = useState('all'); // all, sell, buy, expense, due, supplier_due
  const [dateFilter, setDateFilter] = useState('all'); // all, today, last7, last30, custom
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Admin & Security State
  const [userRole, setUserRole] = useState('guest'); // 'guest', 'subadmin', 'admin'
  const [passwordInput, setPasswordInput] = useState('');
  
  // Default Passwords
  const [adminPassword, setAdminPassword] = useState('665911');
  const [subAdminPassword, setSubAdminPassword] = useState('1234');
  
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newSubAdminPassword, setNewSubAdminPassword] = useState('');

  // Rate Settings State
  const [rates, setRates] = useState({
    retail: { 
      'লাল ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' }, 
      'সাদা ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' }, 
      'হাঁসের ডিম': { pis: '', hali: '', case: '', dojon: '', soto: '' } 
    },
    wholesale: { 
      'লাল ডিম': '', 'সাদা ডিম': '', 'হাঁসের ডিম': '' 
    }
  });

  // Form States
  const [formData, setFormData] = useState({
    type: 'sell', 
    saleCategory: 'retail', 
    eggType: 'লাল ডিম',
    unit: 'pis', 
    quantity: '',
    rate: '',
    description: '', 
    customerName: '', 
    discount: '', 
    paidAmount: '',
    amount: '', 
    date: new Date().toISOString().split('T')[0]
  });

  // --- Authentication & Data Loading ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Transactions
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Data Fetch Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Rates & Auth Settings
  useEffect(() => {
    if (!user) return;
    
    // Rates
    const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates');
    const unsubRates = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let newRates = { ...data };
        if (data.retail) {
           EGG_TYPES.forEach(egg => {
              if (typeof data.retail[egg] !== 'object') {
                 newRates.retail[egg] = { pis: data.retail[egg], hali: '', case: '', dojon: '', soto: '' };
              }
           });
        }
        setRates(newRates);
      }
    });

    // Auth (Passwords)
    const authDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubAuth = onSnapshot(authDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.subAdminPassword) setSubAdminPassword(data.subAdminPassword);
        // Fallback for older version
        if (data.password && !data.adminPassword) setAdminPassword(data.password);
      }
    });

    return () => {
      unsubRates();
      unsubAuth();
    };
  }, [user]);

  // Auto-populate Rate
  useEffect(() => {
    if (formData.type === 'sell' && rates) {
      if (formData.saleCategory === 'wholesale') {
         // RULE: Wholesale unit MUST be 'pis'
         if (formData.unit !== 'pis') {
           setFormData(prev => ({ ...prev, unit: 'pis' }));
           return; 
         }

         const wholesaleRate = rates.wholesale?.[formData.eggType];
         if (wholesaleRate) {
           setFormData(prev => ({ ...prev, rate: wholesaleRate || '' }));
         }
      } else if (formData.saleCategory === 'retail') {
         const retailRates = rates.retail?.[formData.eggType];
         if (retailRates && typeof retailRates === 'object') {
            const unitRate = retailRates[formData.unit];
            setFormData(prev => ({ ...prev, rate: unitRate || '' }));
         }
      }
    }
  }, [formData.saleCategory, formData.eggType, formData.unit, formData.type, rates]);


  // --- Calculations ---
  const stats = useMemo(() => {
    let stock = { 'লাল ডিম': 0, 'সাদা ডিম': 0, 'হাঁসের ডিম': 0 };
    let buyStats = { 
      'লাল ডিম': { qty: 0, cost: 0 }, 
      'সাদা ডিম': { qty: 0, cost: 0 }, 
      'হাঁসের ডিম': { qty: 0, cost: 0 } 
    };

    let totalSalesToday = 0;
    let totalExpenseToday = 0;
    let cashInHand = 0;
    let totalCustomerDue = 0; 
    let totalSupplierDue = 0; 
    let todayProfit = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(t => {
      if (t.type === 'buy') {
        const qty = parseInt(t.quantityInPieces) || 0;
        const amount = parseFloat(t.amount) || 0;
        if (buyStats[t.eggType]) {
          buyStats[t.eggType].qty += qty;
          buyStats[t.eggType].cost += amount;
        }
      }
    });

    let avgCostPerPiece = {};
    for (const [key, val] of Object.entries(buyStats)) {
      avgCostPerPiece[key] = val.qty > 0 ? (val.cost / val.qty) : 0;
    }

    transactions.forEach(t => {
      const qtyPieces = parseInt(t.quantityInPieces) || 0;
      const amount = parseFloat(t.amount) || 0;
      const paid = parseFloat(t.paidAmount) || 0;
      const due = parseFloat(t.dueAmount) || 0;
      const isToday = t.date === todayStr;

      if (t.type === 'buy') {
        if (stock[t.eggType] !== undefined) stock[t.eggType] += qtyPieces;
        cashInHand -= paid; 
        totalSupplierDue += due; 
      } else if (t.type === 'sell') {
        if (stock[t.eggType] !== undefined) stock[t.eggType] -= qtyPieces;
        cashInHand += paid; 
        totalCustomerDue += due;
        
        if (isToday) {
          totalSalesToday += amount;
          const cogs = qtyPieces * (avgCostPerPiece[t.eggType] || 0);
          todayProfit += (amount - cogs);
        }
      } else if (t.type === 'expense') {
        cashInHand -= amount;
        if (isToday) {
          totalExpenseToday += amount;
          todayProfit -= amount;
        }
      }
    });

    return { stock, totalSalesToday, totalExpenseToday, cashInHand, totalCustomerDue, totalSupplierDue, todayProfit };
  }, [transactions]);

  // --- Filtered Transactions for History Tab ---
  const filteredHistory = useMemo(() => {
    let data = transactions;

    // 1. Date Filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      data = data.filter(t => t.date === todayStr);
    } else if (dateFilter === 'last7') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString().split('T')[0];
      data = data.filter(t => t.date >= cutoff);
    } else if (dateFilter === 'last30') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
      data = data.filter(t => t.date >= cutoff);
    } else if (dateFilter === 'custom') {
      data = data.filter(t => t.date === customDate);
    }

    // 2. Type Filtering
    if (historyFilter !== 'all') {
      if (historyFilter === 'due') {
        data = data.filter(t => t.type === 'sell' && t.dueAmount > 0);
      } else if (historyFilter === 'supplier_due') {
        data = data.filter(t => t.type === 'buy' && t.dueAmount > 0);
      } else {
        data = data.filter(t => t.type === historyFilter);
      }
    }
    return data;
  }, [transactions, historyFilter, dateFilter, customDate]);

  // --- History Tab Stats (Based on Filtered Data) ---
  const historyStats = useMemo(() => {
    let totalSell = 0;
    let totalBuy = 0;
    let totalExpense = 0;

    filteredHistory.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'sell') totalSell += amount;
      else if (t.type === 'buy') totalBuy += amount;
      else if (t.type === 'expense') totalExpense += amount;
    });

    return { totalSell, totalBuy, totalExpense };
  }, [filteredHistory]);

  const filteredTotalDue = useMemo(() => {
    if (historyFilter === 'due') {
      return filteredHistory.reduce((sum, t) => sum + (parseFloat(t.dueAmount) || 0), 0);
    } else if (historyFilter === 'supplier_due') {
      return filteredHistory.reduce((sum, t) => sum + (parseFloat(t.dueAmount) || 0), 0);
    }
    return 0;
  }, [filteredHistory, historyFilter]);


  // --- Handlers ---
  
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setUserRole('admin');
      setPasswordInput('');
    } else if (passwordInput === subAdminPassword) {
      setUserRole('subadmin');
      setPasswordInput('');
    } else {
      alert('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    setUserRole('guest');
    setActiveTab('dashboard');
    setPasswordInput('');
  };

  const handleChangePassword = async (type) => {
    if (!user) return;
    try {
      const updateData = {};
      if (type === 'admin') {
        if (!newAdminPassword) return;
        updateData.adminPassword = newAdminPassword;
      } else {
        if (!newSubAdminPassword) return;
        updateData.subAdminPassword = newSubAdminPassword;
      }

      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth'), updateData, { merge: true });
      
      if (type === 'admin') setNewAdminPassword('');
      else setNewSubAdminPassword('');
      
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!');
    } catch (error) {
      console.error("Error saving password:", error);
      alert('সমস্যা হয়েছে।');
    }
  };

  const handleInputChange = (e, field) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleRetailRateChange = (eggType, unit, value) => {
    setRates(prev => ({
      ...prev,
      retail: {
        ...prev.retail,
        [eggType]: {
           ...prev.retail[eggType],
           [unit]: value
        }
      }
    }));
  };

  const handleWholesaleRateChange = (eggType, value) => {
    setRates(prev => ({
      ...prev,
      wholesale: {
        ...prev.wholesale,
        [eggType]: value
      }
    }));
  };

  const saveRates = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rates'), rates);
      alert('রেট আপডেট করা হয়েছে!');
    } catch (error) {
      console.error("Error saving rates:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let finalAmount = parseFloat(formData.amount);
      let qtyPieces = 0;
      let paid = 0;
      let due = 0;
      let discountAmount = 0;

      if (formData.type === 'sell') {
        const subTotal = parseFloat(formData.quantity) * parseFloat(formData.rate);
        discountAmount = parseFloat(formData.discount) || 0;
        finalAmount = subTotal - discountAmount;
        
        qtyPieces = parseInt(formData.quantity) * SELL_UNITS[formData.unit].value;
        paid = formData.paidAmount === '' ? finalAmount : parseFloat(formData.paidAmount);
        due = finalAmount - paid;
      } else if (formData.type === 'buy') {
        finalAmount = parseFloat(formData.quantity) * parseFloat(formData.rate);
        qtyPieces = parseInt(formData.quantity);
        paid = formData.paidAmount === '' ? finalAmount : parseFloat(formData.paidAmount);
        due = finalAmount - paid;
      } else {
        // Expense
        finalAmount = parseFloat(formData.amount);
        paid = finalAmount;
      }

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2'), {
        type: formData.type,
        saleCategory: formData.type === 'sell' ? formData.saleCategory : '', 
        eggType: formData.type === 'expense' ? '' : formData.eggType,
        unit: formData.type === 'sell' ? formData.unit : 'pis',
        quantity: formData.type === 'expense' ? 0 : parseFloat(formData.quantity),
        quantityInPieces: qtyPieces,
        rate: formData.type === 'expense' ? 0 : parseFloat(formData.rate),
        description: formData.description,
        customerName: formData.customerName, 
        discount: discountAmount, 
        amount: finalAmount,
        paidAmount: paid,
        dueAmount: due,
        date: formData.date,
        createdAt: new Date().toISOString()
      });

      // Reset
      setFormData({
        type: activeTab === 'dashboard' ? 'sell' : activeTab,
        saleCategory: 'retail', 
        eggType: 'লাল ডিম',
        unit: 'pis',
        quantity: '',
        rate: '',
        description: '',
        customerName: '',
        discount: '',
        paidAmount: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("সমস্যা হয়েছে, আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      alert("শুধুমাত্র অ্যাডমিন এন্ট্রি ডিলিট করতে পারবে।");
      return;
    }
    if (!user || !window.confirm("মুছে ফেলতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'egg_transactions_v2', id));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // --- Render Helpers ---

  const renderForm = (type) => {
    const isExpense = type === 'expense';
    const isSell = type === 'sell';
    const isBuy = type === 'buy';
    
    // Calculate totals for UI
    const rawTotal = !isExpense && formData.quantity && formData.rate 
      ? (parseFloat(formData.quantity) * parseFloat(formData.rate)) 
      : 0;
    
    const discountVal = parseFloat(formData.discount) || 0;
    const finalTotal = Math.max(0, rawTotal - discountVal);
    
    // Sub-admin Check for Rate ReadOnly
    const isSubAdmin = userRole === 'subadmin';
    const isRateReadOnly = isSell && isSubAdmin;
    
    // Wholesale Check
    const isWholesale = isSell && formData.saleCategory === 'wholesale';

    return (
      <div className={`p-6 rounded-2xl border shadow-sm mb-6 ${isBuy ? 'bg-blue-50 border-blue-100' : isSell ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
          {isBuy && <PlusCircle className="text-blue-600"/>}
          {isSell && <ShoppingCart className="text-green-600"/>}
          {isExpense && <Wallet className="text-red-600"/>}
          {isBuy ? 'স্টক কেনা ও মহাজন হিসাব' : isSell ? 'বিক্রি ও কাস্টমার হিসাব' : 'খরচ এন্ট্রি'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" value={type} />
          
          <Input label="তারিখ" type="date" value={formData.date} onChange={(e) => handleInputChange(e, 'date')} required />

          {/* Sale Type Selector (Retail/Wholesale) */}
          {isSell && (
            <div className="grid grid-cols-2 gap-3 mb-2">
              <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.saleCategory === 'retail' ? 'bg-green-600 text-white border-green-600 font-bold shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="saleCategory" 
                  value="retail" 
                  checked={formData.saleCategory === 'retail'} 
                  onChange={(e) => handleInputChange(e, 'saleCategory')} 
                  className="hidden" 
                />
                <User size={18} /> খুচরা বিক্রি
              </label>
              <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.saleCategory === 'wholesale' ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="saleCategory" 
                  value="wholesale" 
                  checked={formData.saleCategory === 'wholesale'} 
                  onChange={(e) => handleInputChange(e, 'saleCategory')} 
                  className="hidden" 
                />
                <Store size={18} /> পাইকারি বিক্রি
              </label>
            </div>
          )}

          {!isExpense && (
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="ডিমের ধরণ" 
                value={formData.eggType} 
                onChange={(e) => handleInputChange(e, 'eggType')} 
                options={EGG_TYPES.map(t => ({ label: t, value: t }))} 
              />
              
              {/* Unit Selection: Fixed to 'pis' for Wholesale */}
              {isWholesale ? (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">বিক্রির একক</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-purple-50 text-purple-700 font-bold flex items-center justify-between">
                    পিস (ফিক্সড) <Lock size={14}/>
                  </div>
                </div>
              ) : isSell ? (
                <Select 
                  label="বিক্রির একক" 
                  value={formData.unit} 
                  onChange={(e) => handleInputChange(e, 'unit')} 
                  options={Object.entries(SELL_UNITS).map(([k, v]) => ({ label: v.label, value: k }))} 
                />
              ) : (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">একক</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500">পিস</div>
                </div>
              )}
            </div>
          )}

          {!isExpense && (
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="পরিমাণ" 
                type="number" 
                value={formData.quantity} 
                onChange={(e) => handleInputChange(e, 'quantity')} 
                placeholder="0" 
                required 
              />
              <Input 
                label={`দর ${isRateReadOnly ? '(লকড)' : ''} (প্রতি ${isSell ? SELL_UNITS[formData.unit].label.split(' ')[0] : 'পিস'})`} 
                type="number" 
                value={formData.rate} 
                onChange={(e) => handleInputChange(e, 'rate')} 
                placeholder="0.00" 
                required 
                readOnly={isRateReadOnly}
              />
            </div>
          )}

          {(isSell || isBuy) && (
            <div className={`space-y-3 p-4 bg-white rounded-xl border ${isBuy ? 'border-blue-100' : 'border-green-100'}`}>
               <h3 className={`font-medium flex items-center gap-2 ${isBuy ? 'text-blue-700' : 'text-green-700'}`}>
                 <Users size={16}/> {isBuy ? 'পাইকার / মহাজন তথ্য' : 'কাস্টমার ও পেমেন্ট'}
               </h3>
               
               <Input 
                label={isBuy ? "মহাজন / পাইকারের নাম (আবশ্যক)" : (isWholesale ? "কাস্টমারের নাম (আবশ্যক)" : "কাস্টমারের নাম (অপশনাল)")} 
                value={formData.customerName} 
                onChange={(e) => handleInputChange(e, 'customerName')} 
                placeholder="নাম লিখুন..." 
                required={isWholesale || isBuy}
              />
              
              {isSell && (
                <div className="grid grid-cols-2 gap-4 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <div className="text-right text-sm text-gray-500">মোট বিল: ৳{rawTotal.toLocaleString()}</div>
                  <Input 
                    label="ডিসকাউন্ট (টাকা)" 
                    type="number" 
                    value={formData.discount} 
                    onChange={(e) => handleInputChange(e, 'discount')} 
                    placeholder="0" 
                    className="mb-0"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isSell ? 'সর্বমোট' : 'মোট বিল'}</label>
                  <div className="w-full px-3 py-2 bg-gray-100 rounded-lg font-bold text-gray-800 text-lg">৳ {finalTotal.toLocaleString()}</div>
                </div>
                <Input 
                  label={isBuy ? "নগদ দিলেন" : "জমা নিলেন"} 
                  type="number" 
                  value={formData.paidAmount} 
                  onChange={(e) => handleInputChange(e, 'paidAmount')} 
                  placeholder={finalTotal.toString()} 
                />
              </div>
              
              <div className="flex justify-between text-sm pt-1">
                 <span className="text-gray-500">{isBuy ? 'মহাজন পাবে (বাকি):' : 'কাস্টমার বাকি:'}</span>
                 <span className={`font-bold ${(finalTotal - (parseFloat(formData.paidAmount) || 0)) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                   ৳ {Math.max(0, finalTotal - (parseFloat(formData.paidAmount) || (formData.paidAmount === '' ? finalTotal : 0))).toLocaleString()}
                 </span>
              </div>
            </div>
          )}

          {isExpense && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">খরচের খাত</label>
              <select
                value={EXPENSE_TYPES.includes(formData.description) ? formData.description : 'অন্যান্য'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    description: val === 'অন্যান্য' ? '' : val 
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white mb-2"
              >
                <option value="অন্যান্য">অন্যান্য (নিজে লিখুন)</option>
                {EXPENSE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {(!EXPENSE_TYPES.includes(formData.description)) && (
                <Input 
                  value={formData.description} 
                  onChange={(e) => handleInputChange(e, 'description')} 
                  placeholder="বিবরণ লিখুন (যেমন: নাস্তা খরচ)" 
                  required 
                />
              )}
            </div>
          )}
          
          {isExpense && (
            <Input label="টাকার পরিমাণ" type="number" value={formData.amount} onChange={(e) => handleInputChange(e, 'amount')} placeholder="0.00" required />
          )}

          <button
            type="submit"
            onClick={() => setFormData(prev => ({ ...prev, type }))}
            disabled={submitting}
            className={`w-full py-3 px-6 rounded-xl text-white font-bold shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 
              ${isBuy ? 'bg-blue-600 hover:bg-blue-700' : isSell ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {submitting ? 'সেভ হচ্ছে...' : <><Save size={18} /> সেভ করুন</>}
          </button>
        </form>
      </div>
    );
  };

  if (loading) return <div className="flex h-screen justify-center items-center text-orange-600">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24 md:pb-0">
      
      {/* Universal Login Modal */}
      {userRole === 'guest' && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="flex justify-center mb-6">
               <div className="p-4 bg-orange-100 rounded-full">
                 <Egg size={40} className="text-orange-600"/>
               </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">নিশাদ এগ্রো</h2>
            <p className="text-sm text-gray-500 mb-6">ম্যানেজমেন্ট সিস্টেমে স্বাগতম</p>
            
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <input 
                  type="password" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন" 
                  className="w-full text-center text-xl tracking-widest px-4 py-4 border-2 border-orange-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                লগইন করুন
              </button>
            </form>
            <div className="mt-6 text-xs text-gray-400 space-y-1">
               <p>সাব-এডমিন: 1234 | অ্যাডমিন: 665911</p>
               <p className="pt-2 border-t border-gray-100">Developer: Shipon Talukdar</p>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* Top Row: Logo/Title & Cash */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Egg size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">নিশাদ এগ্রো</h1>
                <p className="text-[10px] text-orange-100 opacity-90">Proprietor: Ratan Talukdar</p>
              </div>
            </div>
            <div className="text-right">
               <div className="text-xs text-orange-100">ক্যাশ বক্স</div>
               <div className="font-bold text-lg">৳ {stats.cashInHand.toLocaleString()}</div>
            </div>
          </div>
          
          {/* Second Row: Mobile & Role */}
          <div className="flex justify-between items-center text-xs text-orange-100 border-t border-orange-400 pt-2 mt-1">
             <div className="flex items-center gap-1"><Phone size={10}/> 01979665911</div>
             <div className="flex items-center gap-1">
                {userRole === 'admin' ? <><Unlock size={10}/> অ্যাডমিন মোড</> : <><Lock size={10}/> সাব-এডমিন</>}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
          {[
            { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
            { id: 'buy', label: 'মাল কেনা', icon: ArrowDownCircle },
            { id: 'sell', label: 'বিক্রি', icon: ArrowUpCircle },
            { id: 'expense', label: 'খরচ', icon: MinusCircle },
            { id: 'history', label: 'রেজিস্টার', icon: History },
            { id: 'settings', label: 'রেট সেটআপ', icon: Settings }, 
          ].map(tab => {
             if (tab.id === 'settings' && userRole !== 'admin') return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-gray-800 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* --- DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stock Cards */}
            <h3 className="font-bold text-gray-700 ml-1">বর্তমান স্টক</h3>
            <div className="grid grid-cols-3 gap-3">
              <Card title="লাল ডিম" value={stats.stock['লাল ডিম']} subValue="পিস" icon={Egg} color="bg-red-500 text-red-600" />
              <Card title="সাদা ডিম" value={stats.stock['সাদা ডিম']} subValue="পিস" icon={Egg} color="bg-gray-400 text-gray-600" />
              <Card title="হাঁসের ডিম" value={stats.stock['হাঁসের ডিম']} subValue="পিস" icon={Egg} color="bg-blue-400 text-blue-600" />
            </div>

            {/* Financial Stats */}
            <h3 className="font-bold text-gray-700 ml-1 mt-6">টাকার হিসাব</h3>
            <div className="grid grid-cols-2 gap-4">
              <Card title="মার্কেটে পাবো" value={`৳${stats.totalCustomerDue.toLocaleString()}`} icon={Users} color="bg-green-500 text-green-600" />
              <Card title="মহাজন পাবে" value={`৳${stats.totalSupplierDue.toLocaleString()}`} icon={UserMinus} color="bg-red-500 text-red-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Card title="আজকের বিক্রি" value={`৳${stats.totalSalesToday.toLocaleString()}`} icon={TrendingUp} color="bg-blue-500 text-blue-600" />
              <Card 
                title="আজকের লাভ" 
                value={userRole === 'admin' ? `৳${stats.todayProfit.toLocaleString()}` : ""} 
                subValue={userRole === 'admin' ? (stats.todayProfit >= 0 ? "লাভ" : "লস") : ""}
                icon={Coins} 
                color={stats.todayProfit >= 0 ? "bg-emerald-500 text-emerald-600" : "bg-rose-500 text-rose-600"} 
                blurred={userRole !== 'admin'} // Blur profit if not admin
              />
            </div>
            <div className="mt-4">
                <Card title="আজকের খরচ" value={`৳${stats.totalExpenseToday.toLocaleString()}`} icon={Wallet} color="bg-orange-400 text-orange-600" />
            </div>

            <div className="mt-6 flex justify-center">
               <button 
                 onClick={handleLogout}
                 className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 font-medium transition-colors"
               >
                 <LogOut size={16}/> লগআউট
               </button>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">সর্বশেষ লেনদেন</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs text-orange-600 font-medium hover:underline">সব দেখুন</button>
              </div>
              <div className="divide-y divide-gray-100">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-full ${
                          t.type === 'sell' ? 'bg-green-100 text-green-600' : 
                          t.type === 'buy' ? 'bg-blue-100 text-blue-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {t.type === 'sell' ? <ArrowUpCircle size={16}/> : t.type === 'buy' ? <ArrowDownCircle size={16}/> : <MinusCircle size={16}/>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {t.customerName ? `${t.customerName} (${t.eggType})` : t.description || t.eggType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.type === 'sell' ? (
                                <>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] mr-1 ${t.saleCategory === 'wholesale' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {t.saleCategory === 'wholesale' ? 'পাইকারি' : 'খুচরা'}
                                  </span>
                                  {`${t.quantity} ${SELL_UNITS[t.unit]?.label.split(' ')[0]}`}
                                  {t.discount > 0 && <span className="ml-1 text-orange-600">(ছাড়: ৳{t.discount})</span>}
                                </>
                            ) : t.date}
                            {t.dueAmount > 0 && (
                              <span className={`ml-2 font-bold px-1 rounded ${t.type === 'buy' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'}`}>
                                {t.type === 'buy' ? 'মহাজন পাবে' : 'বাকি'}: ৳{t.dueAmount}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-sm ${t.type === 'sell' ? 'text-green-600' : 'text-gray-800'}`}>
                          {t.type === 'sell' ? '+' : '-'} ৳ {t.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forms */}
        {activeTab === 'buy' && renderForm('buy')}
        {activeTab === 'sell' && renderForm('sell')}
        {activeTab === 'expense' && renderForm('expense')}

        {/* History / Register */}
        {activeTab === 'history' && (
          <div className="space-y-4">
             {/* Summary Cards */}
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                   <div className="text-xs text-green-600 font-bold">মোট বিক্রি</div>
                   <div className="text-sm font-extrabold text-green-700">৳ {historyStats.totalSell.toLocaleString()}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                   <div className="text-xs text-blue-600 font-bold">মোট কেনা</div>
                   <div className="text-sm font-extrabold text-blue-700">৳ {historyStats.totalBuy.toLocaleString()}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                   <div className="text-xs text-red-600 font-bold">মোট খরচ</div>
                   <div className="text-sm font-extrabold text-red-700">৳ {historyStats.totalExpense.toLocaleString()}</div>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                <h3 className="font-bold text-gray-700">লেনদেনের খাতা</h3>
                
                {/* Date Filters */}
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => { setDateFilter('all'); setHistoryFilter('all'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${dateFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>সব সময়</button>
                   <button onClick={() => setDateFilter('today')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${dateFilter === 'today' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>আজ</button>
                   <button onClick={() => setDateFilter('last7')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${dateFilter === 'last7' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>গত ৭ দিন</button>
                   <button onClick={() => setDateFilter('last30')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${dateFilter === 'last30' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>গত ৩০ দিন</button>
                   <div className="relative">
                      <input 
                        type="date" 
                        value={customDate}
                        onChange={(e) => { setCustomDate(e.target.value); setDateFilter('custom'); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all outline-none ${dateFilter === 'custom' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-600'}`}
                      />
                   </div>
                </div>

                {/* Type Filters */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-200">
                  <button onClick={() => setHistoryFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'all' ? 'bg-gray-200 text-gray-800' : 'bg-white border text-gray-500'}`}>সব টাইপ</button>
                  <button onClick={() => setHistoryFilter('sell')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'sell' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border text-gray-500'}`}>বিক্রি</button>
                  <button onClick={() => setHistoryFilter('buy')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'buy' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white border text-gray-500'}`}>কেনা</button>
                  <button onClick={() => setHistoryFilter('expense')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'expense' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border text-gray-500'}`}>খরচ</button>
                  <button onClick={() => setHistoryFilter('due')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'due' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white border text-gray-500'}`}>কাস্টমার বাকি</button>
                  <button onClick={() => setHistoryFilter('supplier_due')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${historyFilter === 'supplier_due' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white border text-gray-500'}`}>মহাজন পাবে</button>
                </div>
              </div>

              {/* Total Due Summary */}
              {historyFilter === 'due' && (
                <div className="bg-orange-50 p-3 flex justify-between items-center border-b border-orange-100">
                  <span className="text-orange-800 font-bold text-sm">মার্কেটে মোট বাকি (ফিল্টার করা):</span>
                  <span className="text-orange-600 font-extrabold text-lg">৳ {filteredTotalDue.toLocaleString()}</span>
                </div>
              )}
              {historyFilter === 'supplier_due' && (
                <div className="bg-purple-50 p-3 flex justify-between items-center border-b border-purple-100">
                  <span className="text-purple-800 font-bold text-sm">মহাজন মোট পাবে:</span>
                  <span className="text-purple-600 font-extrabold text-lg">৳ {filteredTotalDue.toLocaleString()}</span>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {filteredHistory.map(t => (
                  <div key={t.id} className="p-4 flex flex-col gap-2 hover:bg-orange-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                         <div className={`mt-1 w-2 h-2 rounded-full ${
                          t.type === 'sell' ? 'bg-green-500' : 
                          t.type === 'buy' ? 'bg-blue-500' : 
                          'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            {t.type === 'sell' ? 'বিক্রি' : t.type === 'buy' ? 'কেনা' : 'খরচ'} 
                            {t.saleCategory && t.type === 'sell' && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-normal ${t.saleCategory === 'wholesale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                    {t.saleCategory === 'wholesale' ? 'পাইকারি' : 'খুচরা'}
                                </span>
                            )}
                            {t.customerName && <span className="text-orange-600"> • {t.customerName}</span>}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {t.eggType && <span className="bg-gray-100 px-1 rounded mr-1">{t.eggType}</span>}
                            {t.quantity > 0 && <span>{t.quantity} {t.unit ? SELL_UNITS[t.unit]?.label.split(' ')[0] : 'পিস'} @ ৳{t.rate}</span>}
                            {t.discount > 0 && <span className="text-orange-600 ml-1"> (ডিসকাউন্ট: ৳{t.discount})</span>}
                            {t.description && !t.eggType && <span>{t.description}</span>}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">৳ {t.amount.toLocaleString()}</div>
                        {t.dueAmount > 0 && (
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${t.type === 'buy' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                            {t.type === 'buy' ? 'পাবে: ' : 'বাকি: '} ৳ {t.dueAmount}
                          </div>
                        )}
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="text-red-300 hover:text-red-500 text-xs mt-2 block ml-auto p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredHistory.length === 0 && (
                  <div className="p-10 text-center text-gray-500">কোনো তথ্য নেই</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                 <Settings className="text-gray-600" /> সেটিংস
               </h2>
               <button 
                 onClick={handleLogout}
                 className="text-red-600 font-medium text-xs border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 flex items-center gap-1"
               >
                 <LogOut size={12}/> লগআউট
               </button>
            </div>
            
            <div className="space-y-6">
              
              {/* Retail Section */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2"><User size={18}/> খুচরা বিক্রির রেট (Retail)</h3>
                <div className="grid gap-6">
                  {EGG_TYPES.map(egg => (
                    <div key={`retail-${egg}`} className="border-b border-green-100 pb-4 last:border-0 last:pb-0">
                      <h4 className="font-bold text-gray-700 mb-2">{egg}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">পিস</label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={rates.retail[egg]?.pis || ''}
                            onChange={(e) => handleRetailRateChange(egg, 'pis', e.target.value)}
                            className="w-full px-2 py-1.5 border border-green-200 rounded-lg text-sm font-bold text-right"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">হালি</label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={rates.retail[egg]?.hali || ''}
                            onChange={(e) => handleRetailRateChange(egg, 'hali', e.target.value)}
                            className="w-full px-2 py-1.5 border border-green-200 rounded-lg text-sm font-bold text-right"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">কেস</label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={rates.retail[egg]?.case || ''}
                            onChange={(e) => handleRetailRateChange(egg, 'case', e.target.value)}
                            className="w-full px-2 py-1.5 border border-green-200 rounded-lg text-sm font-bold text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wholesale Section */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2"><Store size={18}/> পাইকারি বিক্রির রেট (Wholesale)</h3>
                <div className="grid gap-3">
                  {EGG_TYPES.map(egg => (
                    <div key={`wholesale-${egg}`} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">{egg} (প্রতি পিস)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={rates.wholesale[egg] || ''}
                        onChange={(e) => handleWholesaleRateChange(egg, e.target.value)}
                        className="w-32 px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={saveRates}
                className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-700 transition-all flex justify-center items-center gap-2"
              >
                <Save size={18}/> সেটিংস সেভ করুন
              </button>

              {/* Password Change Section */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><ShieldCheck size={18}/> পাসওয়ার্ড পরিবর্তন</h3>
                
                {/* Change Admin Pass */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">অ্যাডমিন পাসওয়ার্ড</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="নতুন অ্যাডমিন পাসওয়ার্ড"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    <button 
                      onClick={() => handleChangePassword('admin')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                    >
                      বদলে দিন
                    </button>
                  </div>
                </div>

                {/* Change Sub-Admin Pass */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">সাব-এডমিন পাসওয়ার্ড</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="নতুন সাব-এডমিন পাসওয়ার্ড"
                      value={newSubAdminPassword}
                      onChange={(e) => setNewSubAdminPassword(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    <button 
                      onClick={() => handleChangePassword('subadmin')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                    >
                      বদলে দিন
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </main>
      
      {/* Footer Credit */}
      <footer className="bg-gray-100 text-center py-4 text-xs text-gray-400 border-t border-gray-200">
        <p>Developer: Shipon Talukdar</p>
      </footer>
    </div>
  );
}