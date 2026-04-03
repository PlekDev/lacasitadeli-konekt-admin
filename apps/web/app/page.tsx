"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  AlertCircle,
  MapPin,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Filter,
  Calendar,
  MoreVertical,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Box,
  Plus,
  Trash2,
  PieChart as PieChartIcon,
  Home,
  Layers,
  ChevronDown,
  Download,
  ExternalLink,
  RefreshCw,
  X,
  Edit,
  Save,
  Image as ImageIcon,
  Scan
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Mock Data for UI Reference ---
const SALES_DATA = [
  { time: '8am', sales: 1200 },
  { time: '10am', sales: 4500 },
  { time: '12pm', sales: 7200 },
  { time: '2pm', sales: 4800 },
  { time: '4pm', sales: 3800 },
  { time: '6pm', sales: 5200 },
  { time: '8pm', sales: 3100 },
];

const CATEGORY_DATA = [
  { name: 'Lácteos', value: 32, color: '#063b2a' },
  { name: 'Embutidos', value: 22, color: '#10b981' },
  { name: 'Vinos', value: 18, color: '#3b82f6' },
  { name: 'Pastas', value: 12, color: '#f59e0b' },
  { name: 'Conservas', value: 9, color: '#6366f1' },
  { name: 'Otros', value: 7, color: '#94a3b8' },
];

const BRANCH_DATA = [
  { name: 'Centro', actual: 14200, meta: 15500 },
  { name: 'Norte', actual: 8800, meta: 11000 },
  { name: 'Plaza', actual: 5450, meta: 7000 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [inventoryView, setInventoryView] = useState<'list' | 'grid'>('list');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // UI States
  const [timeFilter, setTimeFilter] = useState('Hoy');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart for POS
  const [cart, setCart] = useState<any[]>([]);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Calculate start date based on timeFilter
      let startDate = today;
      if (timeFilter === 'Esta semana') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
      } else if (timeFilter === 'Este mes') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split('T')[0];
      }

      const [prodRes, catRes, locRes, salesRes] = await Promise.all([
        fetch('/api/products?locationId=loc1').then(res => res.json()),
        fetch('/api/products/categories').then(res => res.json()),
        fetch('/api/locations').then(res => res.json()),
        fetch(`/api/sales/report?date=${startDate}`).then(res => res.json())
      ]);

      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(catRes)) setCategories(catRes);
      if (Array.isArray(locRes)) setLocations(locRes);
      if (salesRes && salesRes.summary) setSalesSummary(salesRes.summary);
      if (salesRes && salesRes.ventas) setRecentSales(salesRes.ventas);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  // For Zebra scanning: handle 'Enter' key as scan completion
  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const scanned = barcodeInput.trim();
      if (scanned) {
        // In Ventas, maybe add to cart automatically?
        if (activeTab === 'Ventas') {
          const product = products.find(p => p.barcode === scanned);
          if (product) addToCart(product);
        }
        setBarcodeInput('');
      }
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const submitSale = async () => {
    if (cart.length === 0) return;

    const saleData = {
      locationId: 'loc1',
      cashierId: 'user1',
      paymentMethod: 'efectivo',
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.salePrice,
        costPrice: item.costPrice
      }))
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });
      if (res.ok) {
        alert('Venta completada con éxito');
        setCart([]);
        fetchData();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      console.error(e);
      alert('Error al procesar venta');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const productData = Object.fromEntries(formData.entries());

    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          salePrice: parseFloat(productData.salePrice as string),
          costPrice: parseFloat(productData.costPrice as string),
          stock: parseFloat(productData.stock as string || '0'),
          initialStock: parseFloat(productData.stock as string || '0'),
        })
      });
      if (res.ok) {
        setShowProductModal(false);
        setEditingProduct(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const renderProductModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ingresa los detalles del artículo</p>
          </div>
          <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSaveProduct} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Producto</label>
              <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-medium" placeholder="Ej: Queso Manchego 250g" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código de Barras</label>
              <div className="relative">
                <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="barcode" defaultValue={editingProduct?.barcode} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-mono" placeholder="Escanea o escribe..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
              <select name="categoryId" defaultValue={editingProduct?.categoryId || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                <option value="">Seleccionar...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio Venta</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="salePrice" type="number" step="0.01" defaultValue={editingProduct?.salePrice} required className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-bold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice} required className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-bold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock {editingProduct ? 'Actual' : 'Inicial'}</label>
              <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Imagen</label>
              <input name="image" defaultValue={editingProduct?.image} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all" placeholder="https://..." />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-wider">Cancelar</button>
            <button type="submit" className="flex-2 py-3 bg-[#063b2a] text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/10 hover:bg-[#042b1f] active:scale-[0.98] transition-all uppercase tracking-wider px-12">Guardar Producto</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'VENTAS', value: salesSummary?.totalVentas || '0', trend: '+12% vs ayer', icon: ShoppingCart, trendColor: 'text-emerald-500' },
                { label: 'INGRESOS TOTALES', value: `$${(salesSummary?.totalIngresos || 0).toLocaleString()}`, trend: '+8% vs ayer', icon: Wallet, trendColor: 'text-emerald-500' },
                { label: 'TICKET PROMEDIO', value: `$${(salesSummary?.ticketPromedio || 0).toFixed(2)}`, icon: CreditCard },
                { label: 'STOCK BAJO', value: products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).length || '0', trend: 'Requieren atención', icon: AlertCircle, trendColor: 'text-amber-500' },
                { label: 'SOBRESTOCK', value: '0', icon: Box },
                { label: 'PRODUCTOS ACTIVOS', value: products.length || '0', icon: Box },
              ].map((card, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{card.label}</span>
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <card.icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{card.value}</h3>
                    {card.trend && (
                      <p className={cn("text-[10px] font-medium mt-1", card.trendColor)}>
                        {card.trend}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">TENDENCIA</h4>
                    <p className="text-xs font-semibold text-slate-600">Ventas por hora</p>
                  </div>
                  <BarChart3 className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SALES_DATA}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#063b2a" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#063b2a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} dy={10} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#063b2a" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">POR CATEGORÍA</h4>
                    <p className="text-xs font-semibold text-slate-600">Distribución de ventas</p>
                  </div>
                  <PieChartIcon className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="h-48 flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={CATEGORY_DATA}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {CATEGORY_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-1.5 pl-4">
                    {CATEGORY_DATA.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-500 truncate max-w-[60px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-700">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SUCURSALES</h4>
                    <p className="text-xs font-semibold text-slate-600">Ventas vs meta del día</p>
                  </div>
                  <Home className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BRANCH_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }} />
                      <Bar dataKey="actual" fill="#063b2a" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="meta" fill="#f1f5f9" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                   <div>
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">INVENTARIO</h4>
                    <p className="text-xs font-semibold text-slate-600">Estado actual de productos</p>
                  </div>
                  <button onClick={() => setActiveTab('Inventario')} className="text-emerald-600 text-[10px] font-bold uppercase hover:underline">Ver todo</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">PRODUCTO</th>
                        <th className="px-5 py-3">CATEGORÍA</th>
                        <th className="px-5 py-3 text-right">EXISTENCIA</th>
                        <th className="px-5 py-3">ESTADO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {products.slice(0, 5).map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-700 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                               {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-slate-300" />}
                            </div>
                            {p.name}
                          </td>
                          <td className="px-5 py-3 text-slate-500">{p.category || 'General'}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-700">{p.stock}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "w-1 h-1 rounded-full",
                                parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "bg-emerald-500" : "bg-amber-500"
                              )} />
                              <span className={cn(
                                "font-bold uppercase text-[8px]",
                                parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "text-emerald-500" : "text-amber-500"
                              )}>
                                {parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "OK" : "Bajo"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4">RESUMEN POR SUCURSAL</h4>
                  <div className="space-y-4">
                    {BRANCH_DATA.map((branch, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                          <Home className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700">{branch.name}</span>
                            <span className="text-xs font-bold text-slate-800">${branch.actual.toLocaleString()}</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", i === 0 ? "bg-emerald-500" : "bg-amber-500")}
                              style={{ width: `${(branch.actual/branch.meta)*100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">ALERTAS</h4>
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).slice(0, 3).map(p => (
                      <div key={p.id} className="flex flex-col gap-0.5">
                        <p className="text-[11px] font-bold text-slate-700">{p.name}</p>
                        <p className="text-[9px] text-slate-400">Solo quedan {p.stock} unidades (min: {p.minStock || 5})</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Inventario':
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">Inventario Global</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de existencias y productos</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto o código..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-emerald-500 w-64 transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 mr-2">
                  <button
                    onClick={() => setInventoryView('list')}
                    className={cn("p-1.5 rounded-lg transition-all", inventoryView === 'list' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInventoryView('grid')}
                    className={cn("p-1.5 rounded-lg transition-all", inventoryView === 'grid' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={fetchData} className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-emerald-600 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                  className="bg-[#063b2a] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/10 hover:bg-[#042b1f] transition-all"
                >
                  <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              {inventoryView === 'list' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Precio Venta</th>
                    <th className="px-6 py-4 text-center">Existencia</th>
                    <th className="px-6 py-4 text-center">Mín.</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map((p, i) => (
                    <tr key={p.id || i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                           </div>
                           <div>
                              <p className="font-bold text-slate-800">{p.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.barcode || 'SIN CÓDIGO'}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">${p.salePrice}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("font-black text-sm", parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "text-slate-700" : "text-amber-600")}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400 font-bold">{p.minStock || 5}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                          )} />
                          <span className={cn(
                            "font-black uppercase text-[9px] tracking-tight",
                            parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "text-emerald-500" : "text-amber-500"
                          )}>
                            {parseFloat(p.stock) > (parseFloat(p.minStock) || 5) ? "Disponible" : "Bajo Stock"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(p)} className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              ) : (
                <div className="p-8 grid grid-cols-5 gap-6">
                   {filteredProducts.map(p => (
                     <div key={p.id} className="group bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-xl hover:border-emerald-200 transition-all">
                        <div className="aspect-square bg-slate-50 rounded-xl mb-4 overflow-hidden relative border border-slate-50">
                           {p.image ? (
                             <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           ) : (
                             <ImageIcon className="w-10 h-10 text-slate-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                           )}
                           <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(p)} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-slate-600 hover:text-emerald-600 transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-slate-600 hover:text-rose-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{p.category || 'General'}</p>
                           <h4 className="font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                           <div className="flex justify-between items-end pt-2">
                              <div>
                                 <p className="text-xs text-slate-400 font-medium">Existencia</p>
                                 <p className={cn("text-sm font-black", parseFloat(p.stock) <= (parseFloat(p.minStock) || 5) ? "text-amber-500" : "text-slate-700")}>{p.stock} {p.unit || 'pz'}</p>
                              </div>
                              <p className="text-lg font-black text-[#063b2a]">${p.salePrice}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
            {filteredProducts.length === 0 && (
               <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                  <Package className="w-16 h-16 opacity-10 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No se encontraron productos</p>
               </div>
            )}
          </div>
        );
      case 'Ventas':
        return (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            <div className="col-span-8 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col min-h-0 flex-1">
                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código de barras..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative w-48">
                    <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                      ref={barcodeRef}
                      type="text"
                      placeholder="SCANNER..."
                      className="w-full pl-10 pr-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl outline-none focus:border-emerald-500 transition-all text-xs font-mono text-emerald-700"
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      className="p-3 border border-slate-100 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all text-left space-y-2 bg-white group relative overflow-hidden"
                      onClick={() => addToCart(p)}
                    >
                      <div className="w-full aspect-square bg-slate-50 rounded-lg flex items-center justify-center text-slate-200 group-hover:text-emerald-100 transition-colors overflow-hidden">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <Package className="w-8 h-8" />}
                      </div>
                      <p className="font-bold text-xs text-slate-700 line-clamp-1">{p.name}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-emerald-600 font-black text-sm">${p.salePrice}</p>
                        <p className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded font-bold">Stock: {p.stock}</p>
                      </div>
                      <div className="absolute top-2 right-2 p-1.5 bg-emerald-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 duration-200">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <ShoppingCart className="w-4 h-4 text-emerald-500" /> Carrito
                  </h3>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {cart.length} productos
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] text-slate-400">{item.quantity} x ${item.salePrice}</p>
                           {item.barcode && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-500 font-mono">{item.barcode}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-slate-800">${(item.quantity * item.salePrice).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-rose-400 p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                      <ShoppingCart className="w-12 h-12 opacity-10 mb-2" />
                      <p className="text-xs font-medium uppercase tracking-widest">El carrito está vacío</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>${cart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span>Total</span>
                      <span>
                        ${cart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="w-full bg-[#063b2a] text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-900/10 hover:bg-[#042b1f] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-xs"
                    disabled={cart.length === 0}
                    onClick={submitSale}
                  >
                    Completar Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Reportes':
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">Reporte de Ventas</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Historial de transacciones de hoy</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-100 hover:bg-slate-100 transition-all">
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Folio</th>
                    <th className="px-6 py-4">Hora</th>
                    <th className="px-6 py-4">Cajero</th>
                    <th className="px-6 py-4">Método de Pago</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSales.map((sale: any, i) => (
                    <tr key={sale.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                          {sale.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{sale.cajero || 'Administrador'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           {sale.paymentMethod === 'efectivo' ? <Wallet className="w-3.5 h-3.5 text-emerald-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                           <span className="capitalize font-bold text-slate-600">{sale.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                        ${Number(sale.total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentSales.length === 0 && (
               <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                  <ShoppingCart className="w-16 h-16 opacity-10 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Aún no hay ventas registradas hoy</p>
               </div>
            )}
          </div>
        );
      case 'Alertas':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Centro de Alertas</h3>
                <p className="text-xs text-slate-500">Monitoreo de inventario crítico y notificaciones</p>
              </div>
              <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold border border-rose-100">
                {products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).length} Alertas Activas
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).map((p, i) => (
                <div key={p.id || i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 hover:border-rose-200 transition-all group">
                   <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-6 h-6" />
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prioridad Alta</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">El stock actual es de <span className="font-bold text-rose-600">{p.stock}</span> unidades, lo cual es inferior al mínimo configurado de <span className="font-bold">{p.minStock || 5}</span>.</p>
                   </div>
                   <button onClick={() => openEditModal(p)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all">
                      Reabastecer
                   </button>
                </div>
              ))}

              {products.filter(p => parseFloat(p.stock) <= (parseFloat(p.minStock) || 5)).length === 0 && (
                 <div className="bg-emerald-50 p-12 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-emerald-600">
                    <Trophy className="w-12 h-12 mb-4 opacity-40" />
                    <p className="text-sm font-bold uppercase tracking-widest">¡Todo en orden!</p>
                    <p className="text-xs mt-1 text-emerald-600/60 font-medium">No hay alertas de stock bajo en este momento.</p>
                 </div>
              )}
            </div>
          </div>
        );
      case 'Sucursales':
      case 'Configuracion':
      default:
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-slate-300">
            <Settings className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-sm font-medium">Módulo {activeTab} en desarrollo</p>
            <button onClick={() => setActiveTab('Dashboard')} className="mt-4 text-emerald-600 font-bold text-xs uppercase hover:underline">
              Volver al Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-slate-900 font-sans">
      {showProductModal && renderProductModal()}

      {/* Sidebar */}
      <aside className="w-60 bg-[#042b1f] flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0a5c42] rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
               <img src="https://lacasitadeli.com/wp-content/uploads/2021/04/Logo-La-Casita-Deli-1.png" className="w-full p-1" alt="Logo" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm tracking-tight">La Casita</h1>
              <p className="text-emerald-500/60 text-[10px] uppercase font-black tracking-widest leading-tight">Delicatessen</p>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-emerald-500/40 text-[9px] font-black uppercase tracking-[0.2em] mb-4 pl-3">Principal</p>
            {[
              { id: 'Dashboard', name: 'Dashboard', icon: LayoutDashboard },
              { id: 'Inventario', name: 'Inventario', icon: Layers },
              { id: 'Ventas', name: 'Ventas', icon: ShoppingCart },
              { id: 'Reportes', name: 'Reportes', icon: BarChart3 },
              { id: 'Alertas', name: 'Alertas', icon: AlertCircle },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                  activeTab === item.id
                    ? "bg-white text-[#042b1f] font-bold shadow-xl"
                    : "text-emerald-100/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-colors", activeTab === item.id ? "text-emerald-600" : "group-hover:text-emerald-400")} />
                {item.name}
              </button>
            ))}

            <p className="text-emerald-500/40 text-[9px] font-black uppercase tracking-[0.2em] mt-8 mb-4 pl-3">Sistema</p>
            {[
              { id: 'Sucursales', name: 'Sucursales', icon: Home },
              { id: 'Configuracion', name: 'Configuración', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                  activeTab === item.id
                    ? "bg-white text-[#042b1f] font-bold shadow-xl"
                    : "text-emerald-100/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-colors", activeTab === item.id ? "text-emerald-600" : "group-hover:text-emerald-400")} />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-white/5 bg-[#032118]/30">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-emerald-700/50 flex items-center justify-center text-white text-[10px] font-bold border border-emerald-500/20">
              B
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">Bernardo</p>
              <p className="text-emerald-500/50 text-[9px] font-medium">Administrador</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-emerald-500/30 group-hover:text-rose-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-50 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">{activeTab}</h2>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider -mt-0.5">Resumen general del negocio</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
               {['Hoy', 'Esta semana', 'Este mes'].map((p, i) => (
                 <button
                  key={i}
                  onClick={() => setTimeFilter(p)}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", timeFilter === p ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
                 >
                   {p}
                 </button>
               ))}
            </div>
            <div className="h-6 w-px bg-slate-100 mx-1" />
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <span>Matriz (Todas)</span>
              <ChevronDown className="w-3 h-3 opacity-30" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg">
              <Calendar className="w-3 h-3 opacity-40" />
              <span>Sábado, 28 de Marzo de 2026</span>
            </div>
          </div>
        </header>

        <div className="p-8 pb-12 overflow-y-auto">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando datos...</p>
            </div>
          ) : renderContent()}
        </div>
      </main>
    </div>
  );
}
