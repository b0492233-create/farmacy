import React, { useState, useEffect } from 'react';
import { getCurrentUser, getProducts, getBatches } from './services/storageService';
import { User } from './types/pharmacy';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { ProductsView } from './components/products/ProductsView';
import { BatchesView } from './components/products/BatchesView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { ReturnsView } from './components/returns/ReturnsView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { CustomersView } from './components/customers/CustomersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ShiftsView } from './components/shifts/ShiftsView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { DevicesView } from './components/devices/DevicesView';
import { AuditView } from './components/audit/AuditView';
import { SettingsView } from './components/settings/SettingsView';
import { CodebaseViewer } from './components/codebase/CodebaseViewer';
import { DrugEyeView } from './components/drugeye/DrugEyeView';
import { compareInventoryWithDrugEye } from './services/drugEyeService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Compute alert badges
  const products = getProducts();
  const batches = getBatches();

  const lowStockCount = products.filter(p => (p.totalQuantity ?? 0) <= p.minimumStock).length;
  const nowMs = new Date().getTime();
  const DAY_MS = 24 * 3600 * 1000;
  const expiringCount = batches.filter(b => {
    const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - nowMs) / DAY_MS);
    return diffDays <= 90 && b.quantity > 0;
  }).length;

  const priceUpdatesCount = compareInventoryWithDrugEye().needsUpdateCount;

  // Keyboard shortcut listener: F1 for POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={user => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Top Navigation Bar */}
      <Navbar
        onNavigateToShifts={() => setActiveTab('shifts')}
        onNavigateToSync={() => setActiveTab('devices')}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          lowStockCount={lowStockCount}
          expiringCount={expiringCount}
          priceUpdatesCount={priceUpdatesCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/80">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
            {activeTab === 'pos' && <PosView onOpenShiftModal={() => setActiveTab('shifts')} />}
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'drugeye' && <DrugEyeView />}
            {activeTab === 'batches' && <BatchesView />}
            {activeTab === 'inventory' && <InventoryView />}
            {activeTab === 'purchases' && <PurchasesView />}
            {activeTab === 'sales' && <SalesHistoryView onInitiateReturn={() => setActiveTab('returns')} />}
            {activeTab === 'returns' && <ReturnsView />}
            {activeTab === 'suppliers' && <SuppliersView />}
            {activeTab === 'customers' && <CustomersView />}
            {activeTab === 'expenses' && <ExpensesView />}
            {activeTab === 'shifts' && <ShiftsView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'users' && <UsersView />}
            {activeTab === 'devices' && <DevicesView />}
            {activeTab === 'audit' && <AuditView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'codebase' && <CodebaseViewer />}
          </div>
        </main>
      </div>
    </div>
  );
}
