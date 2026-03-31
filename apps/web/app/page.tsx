"use client";

import React, { useState, useEffect } from 'react';
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
  Trash2
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

// --- Mock Data ---
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
  { name: 'Lácteos', value: 32, color: '#10b981' },
  { name: 'Embutidos', value: 22, color: '#f59e0b' },
  { name: 'Vinos', value: 18, color: '#ef4444' },
  { name: 'Pastas', value: 12, color: '#3b82f6' },
  { name: 'Conservas', value: 9, color: '#8b5cf6' },
  { name: 'Otros', value: 7, color: '#94a3b8' },
];

const BRANCH_DATA = [
  { name: 'Centro', current: 14200, target: 15000 },
  { name: 'Norte', current: 8800, target: 11000 },
  { name: 'Plaza', current: 5450, target: 7000 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart for POS
  const [cart, setCart] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [prodRes, catRes, locRes, salesRes] = await Promise.all([
        fetch('/api/products?locationId=loc1').then(res => res.json()),
        fetch('/api/products/categories').then(res => res.json()),
        fetch('/api/locations').then(res => res.json()),
        fetch(`/api/sales/report?date=${today}`).then(res => res.json())
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
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'VENTAS', value: salesSummary?.totalVentas || '0', icon: ShoppingCart, color: 'text-brand' },
                { label: 'INGRESOS TOTALES', value: `$${(salesSummary?.totalIngresos || 0).toLocaleString()}`, icon: Wallet, color: 'text-status-ok' },
                { label: 'TICKET PROMEDIO', value: `$${(salesSummary?.ticketPromedio || 0).toFixed(2)}`, icon: CreditCard },
                { label: 'STOCK BAJO', value: products.filter(p => p.stock <= (p.minStock || 5)).length, trend: 'Requieren atención', icon: AlertCircle, color: 'text-status-low' },
                { label: 'PRODUCTOS ACTIVOS', value: products.length, icon: Box, color: 'text-slate-600' },
              ].map((card, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-card-border shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{card.label}</span>
                    {card.icon && <card.icon className={cn("w-4 h-4 opacity-40", card.color)} />}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 bg-white p-6 rounded-2xl border border-card-border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">TENDENCIA</h3>
                    <p className="text-sm font-semibold text-slate-800">Ventas por hora (Mock)</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SALES_DATA}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0a5c42" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0a5c42" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `$${value/1000}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Ventas']}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#0a5c42" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-4 bg-white p-6 rounded-2xl border border-card-border shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4">RESUMEN POR SUCURSAL</h3>
                <div className="space-y-4">
                  {BRANCH_DATA.map((branch, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{branch.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">${branch.current.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            i === 0 ? "bg-status-ok" : "bg-status-low"
                          )}
                          style={{ width: `${(branch.current/branch.target)*100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Inventario':
        return (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-card-border flex justify-between items-center">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">INVENTARIO</h3>
                <p className="text-sm font-semibold text-slate-800">Estado actual de productos</p>
              </div>
              <button className="bg-brand text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2" onClick={() => console.log("Nuevo producto")}>
                <Plus className="w-4 h-4" /> Nuevo Producto
              </button>
            </div>
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en inventario..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand transition-colors"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Precio</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4">{p.stock} {p.unit}</td>
                      <td className="px-6 py-4">${p.salePrice}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          p.stock > p.minStock ? "bg-status-ok/10 text-status-ok" : "bg-status-low/10 text-status-low"
                        )}>
                          {p.stock > p.minStock ? "OK" : "Bajo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Ventas':
        return (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-card-border shadow-sm">
                <div className="relative mb-6">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto para vender..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand transition-colors"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {filteredProducts.slice(0, 9).map(p => (
                    <button
                      key={p.id}
                      className="p-4 border border-slate-100 rounded-xl hover:border-brand hover:shadow-md transition-all text-left space-y-2"
                      onClick={() => addToCart(p)}
                    >
                      <p className="font-bold text-sm line-clamp-1">{p.name}</p>
                      <p className="text-brand font-bold">${p.salePrice}</p>
                      <p className="text-[10px] text-slate-400">Stock: {p.stock}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-4">
              <div className="bg-white p-6 rounded-2xl border border-card-border shadow-sm flex flex-col h-[600px]">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Carrito
                </h3>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.quantity} x ${item.salePrice}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">${(item.quantity * item.salePrice).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-status-out p-1 hover:bg-status-out/10 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                      <ShoppingCart className="w-8 h-8 opacity-20" />
                      <p className="text-xs">Carrito vacío</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Total</span>
                    <span className="text-xl font-bold text-slate-800">
                      ${cart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    className="w-full bg-brand text-white py-3 rounded-xl font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-50"
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
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-card-border">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">REPORTES</h3>
              <p className="text-sm font-semibold text-slate-800">Ventas recientes</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Folio</th>
                  <th className="px-6 py-4">Cajero</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale: any) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 font-mono text-xs">{sale.invoiceNumber}</td>
                    <td className="px-6 py-4">{sale.cajero}</td>
                    <td className="px-6 py-4 capitalize">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 text-right font-bold">${sale.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'Alertas':
        return (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-card-border">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase text-status-out">ALERTAS DE STOCK</h3>
              <p className="text-sm font-semibold text-slate-800">Productos que requieren atención</p>
            </div>
            <div className="p-6 space-y-4">
              {products.filter(p => p.stock <= p.minStock).map(p => (
                <div key={p.id} className="flex items-center gap-4 p-4 bg-status-out/5 border border-status-out/10 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-status-out/20 flex items-center justify-center text-status-out">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Quedan {p.stock} unidades. Mínimo requerido: {p.minStock}</p>
                  </div>
                  <button className="text-brand text-xs font-bold uppercase tracking-wider">Reabastecer</button>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-bg flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-white font-bold">
              LC
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">La Casita</h1>
              <p className="text-sidebar-text text-xs">Delicatessen</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <p className="text-sidebar-text text-[10px] font-bold uppercase tracking-wider mb-2 px-2">Principal</p>
          {[
            { name: 'Dashboard', icon: LayoutDashboard },
            { name: 'Inventario', icon: Package },
            { name: 'Ventas', icon: ShoppingCart },
            { name: 'Reportes', icon: BarChart3 },
            { name: 'Alertas', icon: AlertCircle },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activeTab === item.name
                  ? "bg-white/10 text-white font-medium"
                  : "text-sidebar-text hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-white text-xs font-bold">
              B
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Bernardo</p>
              <p className="text-sidebar-text text-[10px] truncate">Administrador</p>
            </div>
            <LogOut className="w-4 h-4 text-sidebar-text" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-card-border flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <LayoutDashboard className="w-3 h-3" />
              <span>{activeTab}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <h2 className="font-semibold text-slate-800">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
              <Calendar className="w-3 h-3" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
          ) : renderContent()}
        </div>
      </main>
    </div>
  );
}
