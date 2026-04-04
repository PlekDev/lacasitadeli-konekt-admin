"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3, AlertCircle,
  Settings, LogOut, Search, Bell, Filter, Calendar, MoreVertical,
  Trophy, Wallet, CreditCard, ArrowRightLeft, Box, Plus, Trash2,
  PieChart as PieChartIcon, Home, Layers, ChevronDown, Download,
  ExternalLink, RefreshCw, X, Edit, Save, Image as ImageIcon, Scan,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  barcode: string | null;
  name: string;
  description: string | null;
  costPrice: number;
  salePrice: number;
  wholesalePrice: number | null;
  wholesaleQuantity: number | null;
  stock: number;
  minStock: number;
  image: string | null;
  active: boolean;
  visibleWeb: boolean;
  category: string | null;
  categoryId: number | null;
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface SalesSummary {
  totalVentas: number;
  totalIngresos: number;
  ticketPromedio: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  gananciaEstimada: number;
}

interface Sale {
  id: number;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  canal: string;
  createdAt: string;
  cajero: string | null;
  numProductos: number;
}

interface TopProduct {
  name: string;
  unidadesVendidas: number;
  ingresos: number;
}

// ── Notification ──────────────────────────────────────────────────────────────
const Notification = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
  <div className={cn(
    "fixed top-4 right-4 z-[110] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 duration-300",
    type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : "bg-rose-500 text-white border-rose-400"
  )}>
    {type === 'success' ? <Save className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <p className="text-sm font-bold">{msg}</p>
  </div>
);

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab]               = useState('Dashboard');
  const [inventoryView, setInventoryView]       = useState<'list' | 'grid'>('list');
  const [products, setProducts]                 = useState<Product[]>([]);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [salesSummary, setSalesSummary]         = useState<SalesSummary | null>(null);
  const [recentSales, setRecentSales]           = useState<Sale[]>([]);
  const [topProducts, setTopProducts]           = useState<TopProduct[]>([]);
  const [searchQuery, setSearchQuery]           = useState('');
  const [loading, setLoading]                   = useState(true);
  const [notification, setNotification]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [timeFilter, setTimeFilter]             = useState('Hoy');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct]     = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter]     = useState('');
  const [cart, setCart]                         = useState<(Product & { quantity: number })[]>([]);
  const [barcodeInput, setBarcodeInput]         = useState('');
  const [paymentMethod, setPaymentMethod]       = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [dbStatus, setDbStatus]                 = useState<'unknown' | 'ok' | 'error'>('unknown');

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today  = new Date().toISOString().split('T')[0];
      let dateParam = today;
      if (timeFilter === 'Esta semana') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateParam = d.toISOString().split('T')[0];
      } else if (timeFilter === 'Este mes') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateParam = d.toISOString().split('T')[0];
      }

      const [prodRes, catRes, salesRes, healthRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/products/categories').then(r => r.json()),
        fetch(`/api/sales/report?date=${dateParam}`).then(r => r.json()),
        fetch('/api/health').then(r => r.json()).catch(() => ({ status: 'error' })),
      ]);

      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(catRes))  setCategories(catRes);
      if (salesRes?.summary)      setSalesSummary(salesRes.summary);
      if (salesRes?.ventas)       setRecentSales(salesRes.ventas);
      if (salesRes?.topProducts)  setTopProducts(salesRes.topProducts);
      setDbStatus(healthRes?.db === 'connected' ? 'ok' : 'error');
    } catch (err) {
      console.error('Error fetching data:', err);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered products ───────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery);
    const matchCat = !categoryFilter || String(p.categoryId) === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  // ── Cart ────────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (code && activeTab === 'Ventas') {
        const p = products.find(p => p.barcode === code);
        if (p) { addToCart(p); notify(`${p.name} agregado`); }
        else notify('Producto no encontrado', 'error');
      }
      setBarcodeInput('');
    }
  };

  const getEffectivePrice = (item: Product & { quantity: number }) => {
    if (item.wholesalePrice && item.wholesaleQuantity && item.quantity >= item.wholesaleQuantity) {
      return item.wholesalePrice;
    }
    return item.salePrice;
  };

  const cartTotal = cart.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);

  const submitSale = async () => {
    if (!cart.length) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            productId:  i.id,
            quantity:   i.quantity,
            unitPrice:  getEffectivePrice(i),
          })),
          paymentMethod,
          canal: 'caja',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Venta ${data.folio} completada — $${data.total.toFixed(2)}`);
        setCart([]);
        fetchData();
      } else {
        notify(data.error || 'Error al procesar venta', 'error');
      }
    } catch { notify('Error de conexión', 'error'); }
  };

  // ── Product CRUD ────────────────────────────────────────────────────────────
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd   = new FormData(form);
    const body: Record<string, any> = {};
    fd.forEach((v, k) => { body[k] = v; });

    ['salePrice', 'costPrice', 'wholesalePrice', 'stock', 'minStock'].forEach(f => {
      if (body[f] !== '') body[f] = parseFloat(body[f]);
    });
    if (body.wholesaleQuantity !== '') body.wholesaleQuantity = parseInt(body.wholesaleQuantity);
    if (body.categoryId === '') body.categoryId = null;
    body.visibleWeb = fd.get('visibleWeb') === 'on';

    const method = editingProduct ? 'PUT' : 'POST';
    const url    = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || 'Operación exitosa');
        setShowProductModal(false);
        setEditingProduct(null);
        fetchData();
      } else {
        notify(data.error || 'Error al guardar', 'error');
      }
    } catch { notify('Error de conexión', 'error'); }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) { notify('Producto eliminado'); fetchData(); }
      else notify('Error al eliminar', 'error');
    } catch { notify('Error de conexión', 'error'); }
  };

  // ── Product Modal ───────────────────────────────────────────────────────────
  const ProductModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Guarda en Neon PostgreSQL
            </p>
          </div>
          <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre *</label>
              <input name="name" defaultValue={editingProduct?.name} required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-medium"
                placeholder="Ej: Coca-Cola 600ml" />
            </div>
            {/* Código de barras */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código de barras</label>
              <div className="relative">
                <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="barcode" defaultValue={editingProduct?.barcode || ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-mono"
                  placeholder="7501234..." />
              </div>
            </div>
            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
              <select name="categoryId" defaultValue={editingProduct?.categoryId || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Precio venta */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio venta *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="salePrice" type="number" step="0.01" min="0"
                  defaultValue={editingProduct?.salePrice} required
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold" />
              </div>
            </div>
            {/* Precio Mayoreo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio Mayoreo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="wholesalePrice" type="number" step="0.01" min="0"
                  defaultValue={editingProduct?.wholesalePrice || ''}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold text-emerald-600" />
              </div>
            </div>
            {/* Cantidad Mayoreo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cant. Mayoreo</label>
              <input name="wholesaleQuantity" type="number" min="0"
                defaultValue={editingProduct?.wholesaleQuantity || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold text-emerald-600"
                placeholder="Ej: 6" />
            </div>
            {/* Costo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="costPrice" type="number" step="0.01" min="0"
                  defaultValue={editingProduct?.costPrice || 0}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold" />
              </div>
            </div>
            {/* Stock */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock</label>
              <input name="stock" type="number" min="0" defaultValue={editingProduct?.stock ?? 0}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold" />
            </div>
            {/* Stock mínimo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock mínimo</label>
              <input name="minStock" type="number" min="0" defaultValue={editingProduct?.minStock ?? 5}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none font-bold" />
            </div>
            {/* Imagen URL */}
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Imagen</label>
              <input name="image" defaultValue={editingProduct?.image || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
                placeholder="https://..." />
            </div>
            {/* Descripción */}
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción</label>
              <textarea name="description" defaultValue={editingProduct?.description || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none resize-none"
                rows={2} placeholder="Descripción opcional..." />
            </div>
            {/* Visible en web */}
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" name="visibleWeb" id="visibleWeb"
                defaultChecked={editingProduct?.visibleWeb ?? true}
                className="w-4 h-4 accent-emerald-600" />
              <label htmlFor="visibleWeb" className="text-sm text-slate-600 font-medium cursor-pointer">
                Visible en página web
              </label>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button"
              onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-wider">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-[#063b2a] text-white rounded-xl text-xs font-bold shadow-lg hover:bg-[#042b1f] active:scale-[0.98] transition-all uppercase tracking-wider">
              {editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Render tab content ──────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── DASHBOARD ────────────────────────────────────────────────────────────
      case 'Dashboard':
        return (
          <div className="space-y-6">
            {/* DB Status banner */}
            {dbStatus === 'error' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <p className="text-sm text-rose-700 font-medium">
                  No se pudo conectar a la base de datos. Verifica que la API esté corriendo y el <code>.env</code> esté configurado.
                </p>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'VENTAS HOY', value: salesSummary?.totalVentas ?? 0, icon: ShoppingCart, sub: `Ticket prom: $${(salesSummary?.ticketPromedio ?? 0).toFixed(2)}` },
                { label: 'INGRESOS', value: `$${(salesSummary?.totalIngresos ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: Wallet, sub: `Ganancia est: $${(salesSummary?.gananciaEstimada ?? 0).toFixed(2)}` },
                { label: 'PRODUCTOS', value: products.length, icon: Box, sub: `${lowStockProducts.length} con stock bajo` },
                { label: 'STOCK BAJO', value: lowStockProducts.length, icon: AlertCircle, sub: 'Requieren reabasto', danger: lowStockProducts.length > 0 },
              ].map((card, i) => (
                <div key={i} className={cn(
                  "bg-white p-5 rounded-xl border shadow-sm",
                  card.danger ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{card.label}</span>
                    <card.icon className={cn("w-4 h-4", card.danger ? "text-rose-400" : "text-slate-300")} />
                  </div>
                  <p className={cn("text-2xl font-black", card.danger ? "text-rose-600" : "text-slate-800")}>{card.value}</p>
                  {card.sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{card.sub}</p>}
                </div>
              ))}
            </div>

            {/* Payment breakdown + Top products */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4">INGRESOS POR MÉTODO</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Efectivo',      icon: Wallet,          value: salesSummary?.totalEfectivo ?? 0,      color: 'text-emerald-600' },
                    { label: 'Tarjeta',       icon: CreditCard,      value: salesSummary?.totalTarjeta ?? 0,       color: 'text-blue-600'    },
                    { label: 'Transferencia', icon: ArrowRightLeft,  value: salesSummary?.totalTransferencia ?? 0, color: 'text-violet-600'  },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <m.icon className={cn("w-4 h-4", m.color)} />
                        <span className="text-xs font-semibold text-slate-600">{m.label}</span>
                      </div>
                      <span className={cn("text-sm font-bold", m.color)}>
                        ${m.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-8 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4">TOP PRODUCTOS VENDIDOS</h4>
                {topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-300">
                    <p className="text-xs font-medium">Sin ventas en el periodo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topProducts.slice(0, 5).map((p, i) => {
                      const maxUnits = topProducts[0]?.unidadesVendidas ?? 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                              <span className="text-xs text-slate-500 ml-2 shrink-0">{p.unidadesVendidas} uds · ${p.ingresos.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.unidadesVendidas / maxUnits) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent sales table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">VENTAS RECIENTES</h4>
                  <p className="text-xs font-semibold text-slate-600">Últimas transacciones del periodo</p>
                </div>
                <button onClick={() => setActiveTab('Reportes')} className="text-emerald-600 text-[10px] font-bold uppercase hover:underline">Ver reporte completo</button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Folio</th>
                    <th className="px-5 py-3">Hora</th>
                    <th className="px-5 py-3">Cajero</th>
                    <th className="px-5 py-3">Método</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSales.slice(0, 5).map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3"><span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">{s.invoiceNumber}</span></td>
                      <td className="px-5 py-3 text-slate-500">{new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-5 py-3 font-bold text-slate-700">{s.cajero || 'Sistema'}</td>
                      <td className="px-5 py-3 capitalize text-slate-500">{s.paymentMethod}</td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">${s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentSales.length === 0 && (
                <div className="py-10 flex flex-col items-center text-slate-300">
                  <ShoppingCart className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-xs font-medium">Sin ventas en el periodo seleccionado</p>
                </div>
              )}
            </div>
          </div>
        );

      // ── INVENTARIO ───────────────────────────────────────────────────────────
      case 'Inventario':
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center sticky top-0 z-10 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-800">Inventario — Neon PostgreSQL</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {products.length} productos · {lowStockProducts.length} con stock bajo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar nombre o código..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-emerald-500 w-56"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-emerald-500">
                  <option value="">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button onClick={() => setInventoryView('list')}
                    className={cn("p-1.5 rounded-lg transition-all", inventoryView === 'list' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}>
                    <Layers className="w-4 h-4" />
                  </button>
                  <button onClick={() => setInventoryView('grid')}
                    className={cn("p-1.5 rounded-lg transition-all", inventoryView === 'grid' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}>
                    <LayoutDashboard className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={fetchData} className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-emerald-600">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                  className="bg-[#063b2a] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#042b1f]">
                  <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
              </div>
            </div>

            {inventoryView === 'list' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Costo</th>
                    <th className="px-6 py-4">Precio venta</th>
                    <th className="px-6 py-4 text-center">Stock</th>
                    <th className="px-6 py-4 text-center">Mín.</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} onError={e => (e.currentTarget.style.display = 'none')} /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{p.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.barcode || 'SIN CÓDIGO'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold">{p.category || '—'}</span></td>
                      <td className="px-6 py-4 text-slate-500">${Number(p.costPrice).toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">${Number(p.salePrice).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("font-black text-sm", p.stock <= p.minStock ? "text-rose-600" : "text-slate-700")}>{p.stock}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400 font-bold">{p.minStock}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", p.stock > p.minStock ? "bg-emerald-500" : "bg-rose-500")} />
                          <span className={cn("font-black uppercase text-[9px]", p.stock > p.minStock ? "text-emerald-500" : "text-rose-500")}>
                            {p.stock > p.minStock ? "Disponible" : "Stock bajo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                            className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 grid grid-cols-5 gap-5">
                {filteredProducts.map(p => (
                  <div key={p.id} className="group bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-xl hover:border-emerald-200 transition-all">
                    <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden relative border border-slate-50">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} /> : <ImageIcon className="w-10 h-10 text-slate-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-1.5 bg-white/90 rounded-lg text-slate-600 hover:text-emerald-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-white/90 rounded-lg text-slate-600 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{p.category || '—'}</p>
                    <h4 className="font-bold text-slate-800 line-clamp-1 text-sm mt-0.5">{p.name}</h4>
                    <div className="flex justify-between items-end pt-2">
                      <div>
                        <p className="text-[9px] text-slate-400">Stock</p>
                        <p className={cn("text-sm font-black", p.stock <= p.minStock ? "text-rose-500" : "text-slate-700")}>{p.stock}</p>
                      </div>
                      <p className="text-lg font-black text-[#063b2a]">${Number(p.salePrice).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="py-20 flex flex-col items-center text-slate-300">
                <Package className="w-16 h-16 opacity-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No se encontraron productos</p>
              </div>
            )}
          </div>
        );

      // ── VENTAS (POS) ──────────────────────────────────────────────────────────
      case 'Ventas':
        return (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            <div className="col-span-8 flex flex-col gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col min-h-0 flex-1">
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="relative w-44">
                    <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input type="text" placeholder="SCANNER..." className="w-full pl-10 pr-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl outline-none text-xs font-mono text-emerald-700"
                      value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} autoFocus />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 overflow-y-auto pr-1">
                  {filteredProducts.map(p => (
                    <button key={p.id}
                      className="p-3 border border-slate-100 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all text-left space-y-2 bg-white group relative overflow-hidden"
                      onClick={() => addToCart(p)}>
                      <div className="w-full aspect-square bg-slate-50 rounded-lg flex items-center justify-center text-slate-200 overflow-hidden">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={p.name} /> : <Package className="w-8 h-8" />}
                      </div>
                      <p className="font-bold text-xs text-slate-700 line-clamp-1">{p.name}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-emerald-600 font-black text-sm">${Number(p.salePrice).toFixed(2)}</p>
                        <p className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded font-bold">{p.stock}</p>
                      </div>
                      <div className="absolute top-2 right-2 p-1.5 bg-emerald-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-4 flex flex-col gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <ShoppingCart className="w-4 h-4 text-emerald-500" /> Carrito
                  </h3>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{cart.length} productos</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.quantity} × ${Number(getEffectivePrice(item)).toFixed(2)}
                          {item.wholesalePrice && item.wholesaleQuantity && item.quantity >= item.wholesaleQuantity && (
                            <span className="ml-2 text-emerald-600 font-bold text-[9px] uppercase">Mayoreo</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs text-slate-800">${(item.quantity * getEffectivePrice(item)).toFixed(2)}</span>
                        <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))}
                          className="text-rose-400 p-1 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!cart.length && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                      <ShoppingCart className="w-12 h-12 opacity-10 mb-2" />
                      <p className="text-xs font-medium uppercase tracking-widest">Carrito vacío</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {/* Método de pago */}
                  <div className="flex gap-2">
                    {(['efectivo', 'tarjeta', 'transferencia'] as const).map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                          paymentMethod === m ? "bg-[#063b2a] text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}>{m}</button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-slate-900 bg-slate-50 p-3 rounded-xl">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    className="w-full bg-[#063b2a] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#042b1f] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                    disabled={cart.length === 0} onClick={submitSale}>
                    Completar Venta · ${cartTotal.toFixed(2)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      // ── REPORTES ─────────────────────────────────────────────────────────────
      case 'Reportes':
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">Reporte de Ventas</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {recentSales.length} ventas · ${(salesSummary?.totalIngresos ?? 0).toFixed(2)} total
                </p>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Folio</th>
                  <th className="px-6 py-4">Hora</th>
                  <th className="px-6 py-4">Cajero</th>
                  <th className="px-6 py-4">Canal</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Artículos</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSales.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold">{s.invoiceNumber}</span></td>
                    <td className="px-6 py-4 text-slate-500">{new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{s.cajero || 'Sistema'}</td>
                    <td className="px-6 py-4 capitalize"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-bold text-[9px] uppercase">{s.canal}</span></td>
                    <td className="px-6 py-4 capitalize text-slate-500">{s.paymentMethod}</td>
                    <td className="px-6 py-4 text-slate-500">{s.numProductos}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">${s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recentSales.length && (
              <div className="py-20 flex flex-col items-center text-slate-300">
                <ShoppingCart className="w-16 h-16 opacity-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Sin ventas en el periodo</p>
              </div>
            )}
          </div>
        );

      // ── ALERTAS ───────────────────────────────────────────────────────────────
      case 'Alertas':
        return (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Alertas de Inventario</h3>
                <p className="text-xs text-slate-500">Productos que requieren reabastecimiento</p>
              </div>
              <span className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold border border-rose-100">
                {lowStockProducts.length} alertas activas
              </span>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="bg-emerald-50 p-12 rounded-xl border border-emerald-100 flex flex-col items-center text-emerald-600">
                <Trophy className="w-12 h-12 mb-4 opacity-40" />
                <p className="text-sm font-bold uppercase tracking-widest">¡Todo en orden!</p>
                <p className="text-xs mt-1 text-emerald-600/60">Todos los productos tienen stock suficiente.</p>
              </div>
            ) : (
              lowStockProducts.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex items-center gap-5 hover:border-rose-200 group">
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{p.barcode || 'Sin código'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Stock actual: <span className="font-bold text-rose-600">{p.stock}</span> · Mínimo: <span className="font-bold">{p.minStock}</span> · Categoría: {p.category || '—'}
                    </p>
                  </div>
                  <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                    className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all">
                    Reabastecer
                  </button>
                </div>
              ))
            )}
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-slate-300">
            <Settings className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-sm font-medium">Módulo en desarrollo</p>
          </div>
        );
    }
  };

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-slate-900 font-sans relative">
      {notification && <Notification msg={notification.message} type={notification.type} />}
      {showProductModal && <ProductModal />}

      {/* Sidebar */}
      <aside className="w-60 bg-[#042b1f] flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0a5c42] rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
              <img src="https://lacasitadeli.com/wp-content/uploads/2021/04/Logo-La-Casita-Deli-1.png" className="w-full p-1" alt="Logo" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm tracking-tight">La Casita</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", dbStatus === 'ok' ? "bg-emerald-400" : dbStatus === 'error' ? "bg-rose-400" : "bg-yellow-400")} />
                <p className="text-emerald-500/60 text-[9px] uppercase font-black tracking-widest">
                  {dbStatus === 'ok' ? 'Neon · Online' : dbStatus === 'error' ? 'DB · Error' : 'Verificando...'}
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'Dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
              { id: 'Inventario', label: 'Inventario', icon: Layers },
              { id: 'Ventas',     label: 'Ventas',     icon: ShoppingCart },
              { id: 'Reportes',   label: 'Reportes',   icon: BarChart3 },
              { id: 'Alertas',    label: 'Alertas',    icon: AlertCircle, badge: lowStockProducts.length },
            ].map(item => (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setSearchQuery(''); setCategoryFilter(''); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                  activeTab === item.id ? "bg-white text-[#042b1f] font-bold shadow-xl" : "text-emerald-100/50 hover:bg-white/5 hover:text-white"
                )}>
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-emerald-600" : "group-hover:text-emerald-400")} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-white/5 bg-[#032118]/30">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-emerald-700/50 flex items-center justify-center text-white text-[10px] font-bold border border-emerald-500/20">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">Admin</p>
              <p className="text-emerald-500/50 text-[9px]">Neon PostgreSQL</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-emerald-500/30 group-hover:text-rose-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-50 flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">{activeTab}</h2>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider -mt-0.5">
              La Casita · Neon PostgreSQL
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
              {['Hoy', 'Esta semana', 'Este mes'].map(p => (
                <button key={p} onClick={() => setTimeFilter(p)}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                    timeFilter === p ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"
                  )}>{p}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg">
              <Calendar className="w-3 h-3 opacity-40" />
              <span>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <button onClick={fetchData} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-emerald-600 border border-slate-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-8 pb-12 overflow-y-auto">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando desde Neon...</p>
            </div>
          ) : renderContent()}
        </div>
      </main>
    </div>
  );
}