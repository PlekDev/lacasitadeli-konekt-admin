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
  Box
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

const PRODUCTS = [
  { id: 1, name: 'Queso Manchego 400g', category: 'Lácteos', stock: 45, minStock: 10, status: 'OK' },
  { id: 2, name: 'Jamón Serrano 200g', category: 'Embutidos', stock: 3, minStock: 8, status: 'Stock bajo' },
  { id: 3, name: 'Aceite de Oliva Extra Virgen 750ml', category: 'Aceites', stock: 82, minStock: 10, status: 'Sobrestock' },
  { id: 4, name: 'Vino Tinto Reserva 750ml', category: 'Vinos', stock: 22, minStock: 5, status: 'OK' },
  { id: 5, name: 'Pasta Fusilli 500g', category: 'Pastas', stock: 2, minStock: 15, status: 'Stock bajo' },
  { id: 6, name: 'Salsa Pesto Genovese 190g', category: 'Salsas', stock: 18, minStock: 5, status: 'OK' },
  { id: 7, name: 'Galletas Artesanales 250g', category: 'Panaderia', stock: 4, minStock: 10, status: 'Stock bajo' },
  { id: 8, name: 'Mermelada de Higo 300g', category: 'Conservas', stock: 67, minStock: 8, status: 'Sobrestock' },
];

const ALERTS = [
  { id: 1, type: 'STOCK_BAJO', product: 'Jamón Serrano 200g', message: 'Solo quedan 3 unidades (min: 8)' },
  { id: 2, type: 'STOCK_BAJO', product: 'Pasta Fusilli 500g', message: 'Solo quedan 2 unidades (min: 15)' },
  { id: 3, type: 'STOCK_BAJO', product: 'Hummus Clásico 200g', message: 'Solo queda 1 unidad (min: 8)' },
  { id: 4, type: 'STOCK_BAJO', product: 'Galletas Artesanales 250g', message: 'Solo quedan 4 unidades (min: 10)' },
  { id: 5, type: 'STOCK_BAJO', product: 'Chocolate Amargo 70%', message: 'Solo quedan 5 unidades (min: 12)' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [products, setProducts] = useState(PRODUCTS);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes, locRes, salesRes] = await Promise.all([
          fetch('/api/products?locationId=').then(res => res.json()),
          fetch('/api/products/categories').then(res => res.json()),
          fetch('/api/locations').then(res => res.json()),
          fetch(`/api/sales/report?date=${new Date().toISOString().split('T')[0]}`).then(res => res.json())
        ]);

        if (Array.isArray(prodRes)) setProducts(prodRes);
        if (Array.isArray(catRes)) setCategories(catRes);
        if (Array.isArray(locRes)) setLocations(locRes);
        if (salesRes && salesRes.summary) setSalesSummary(salesRes.summary);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

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

          <div className="pt-8">
            <p className="text-sidebar-text text-[10px] font-bold uppercase tracking-wider mb-2 px-2">Sistema</p>
            {[
              { name: 'Sucursales', icon: MapPin },
              { name: 'Configuración', icon: Settings },
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
          </div>
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
              <span>Dashboard</span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <h2 className="font-semibold text-slate-800">Dashboard</h2>
            <p className="text-xs text-slate-400">Resumen general del negocio</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['Hoy', 'Esta semana', 'Este mes'].map((t) => (
                <button key={t} className={cn("px-3 py-1 text-[10px] font-medium rounded-md transition-all", t === 'Hoy' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-slate-300 cursor-pointer">
              <span>Todas las sucursales</span>
              <ChevronRight className="w-3 h-3 rotate-90" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
              <Calendar className="w-3 h-3" />
              <span>Sábado, 28 de Marzo de 2026</span>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: 'VENTAS', value: salesSummary?.totalVentas || '47', trend: '+12% vs ayer', icon: ShoppingCart, color: 'text-brand' },
              { label: 'INGRESOS TOTALES', value: salesSummary ? `$${salesSummary.totalIngresos.toLocaleString()}` : '$28,450', trend: '+8% vs ayer', icon: Wallet, color: 'text-status-ok' },
              { label: 'TICKET PROMEDIO', value: salesSummary ? `$${salesSummary.ticketPromedio.toFixed(2)}` : '$605.32', icon: CreditCard },
              { label: 'STOCK BAJO', value: products.filter(p => p.stock <= (p.minStock || 5)).length || '8', trend: 'Requieren atención', icon: AlertCircle, color: 'text-status-low' },
              { label: 'SOBRESTOCK', value: '3', icon: Package, color: 'text-status-over' },
              { label: 'PRODUCTOS ACTIVOS', value: products.length || '142', icon: Box, color: 'text-slate-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-card-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{card.label}</span>
                  {card.icon && <card.icon className={cn("w-4 h-4 opacity-40", card.color)} />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                  {card.trend && (
                    <p className={cn("text-[10px] font-medium flex items-center gap-1", card.trend.includes('+') ? "text-status-ok" : "text-status-low")}>
                      {card.trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {card.trend}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-12 gap-6">
            {/* Sales Trend Chart */}
            <div className="col-span-5 bg-white p-6 rounded-2xl border border-card-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">TENDENCIA</h3>
                  <p className="text-sm font-semibold text-slate-800">Ventas por hora</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-500">
                  <BarChart3 className="w-3 h-3" />
                  <span>Reporte</span>
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

            {/* Category Chart */}
            <div className="col-span-4 bg-white p-6 rounded-2xl border border-card-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">POR CATEGORÍA</h3>
                  <p className="text-sm font-semibold text-slate-800">Distribución de ventas</p>
                </div>
                <MoreVertical className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex items-center">
                <div className="h-48 w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={CATEGORY_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {CATEGORY_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">100%</span>
                    <span className="text-[10px] text-slate-400">Total</span>
                  </div>
                </div>
                <div className="flex-1 ml-6 space-y-3">
                  {CATEGORY_DATA.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-600">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Branch Sales Chart */}
            <div className="col-span-3 bg-white p-6 rounded-2xl border border-card-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SUCURSALES</h3>
                  <p className="text-sm font-semibold text-slate-800">Ventas vs meta del día</p>
                </div>
                <MapPin className="w-4 h-4 text-slate-300" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BRANCH_DATA} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 500}} />
                    <Tooltip
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="target" fill="#f1f5f9" radius={[0, 4, 4, 0]} barSize={24} />
                    <Bar dataKey="current" fill="#042b1f" radius={[0, 4, 4, 0]} barSize={24} style={{ marginTop: -24 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Inventory Table */}
            <div className="col-span-8 bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-card-border flex justify-between items-center">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">INVENTARIO</h3>
                  <p className="text-sm font-semibold text-slate-800">Estado actual de productos</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:border-brand-light transition-colors w-48"
                    />
                  </div>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <span>{products.length} productos</span>
                  </div>
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-bold">Producto</th>
                    <th className="px-6 py-3 font-bold">Categoría</th>
                    <th className="px-6 py-3 font-bold">Existencia</th>
                    <th className="px-6 py-3 font-bold">Mín.</th>
                    <th className="px-6 py-3 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const status = p.stock <= (p.minStock || 5) ? (p.stock <= 0 ? 'Sin stock' : 'Stock bajo') : 'OK';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 font-medium text-slate-700">{p.name}</td>
                        <td className="px-6 py-4 text-slate-500">{p.category || '—'}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{p.stock}</td>
                        <td className="px-6 py-4 text-slate-400">{p.minStock}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              status === 'OK' ? "bg-status-ok" : "bg-status-low"
                            )} />
                            <span className={cn(
                              "font-medium",
                              status === 'OK' ? "text-status-ok" : "text-status-low"
                            )}>{status}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                <button className="text-[10px] font-bold text-brand hover:text-brand-dark transition-colors inline-flex items-center gap-1 uppercase tracking-wider">
                  Ver todos los productos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Alerts & Top Products */}
            <div className="col-span-4 space-y-6">
              {/* Branch Summary - Replacement for Resumen por sucursal in Step 6 logic */}
              <div className="bg-white p-6 rounded-2xl border border-card-border shadow-sm">
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
                            i === 0 ? "bg-status-ok" : i === 1 ? "bg-status-low" : "bg-status-low opacity-70"
                          )}
                          style={{ width: `${(branch.current/branch.target)*100}%` }}
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {Math.round((branch.current/branch.target)*100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-card-border flex justify-between items-center">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">ALERTAS</h3>
                    <p className="text-sm font-semibold text-slate-800">Requieren atención</p>
                  </div>
                  <div className="w-5 h-5 bg-status-out rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    9
                  </div>
                </div>
                <div className="p-2">
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-status-out uppercase tracking-wider mb-2 px-2">Stock Bajo (5)</p>
                    <div className="space-y-1">
                  {products.filter(p => p.stock <= (p.minStock || 5) && p.stock > 0).slice(0, 5).map((p) => (
                    <div key={p.id} className="p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-status-out/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-status-out" />
                          </div>
                          <div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Solo quedan {p.stock} unidades (min: {p.minStock || 5})</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 pt-0">
                    <p className="text-[10px] font-bold text-status-low uppercase tracking-wider mb-2 px-2">Sobrestock (2)</p>
                    <div className="p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-lg bg-status-low/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-status-low" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Aceite de Oliva EV 750ml</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">82 unidades en stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
