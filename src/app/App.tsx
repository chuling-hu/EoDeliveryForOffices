import { useState, useEffect } from 'react';
import { RestaurantManager } from '@/app/components/RestaurantManager';
import { MenuItemManager } from '@/app/components/MenuItemManager';
import { CalendarMenuManager } from '@/app/components/CalendarMenuManager';
import { OrderList } from '@/app/components/OrderList';
import { OrderAnalytics } from '@/app/components/OrderAnalytics';
import { AdminManager } from '@/app/components/AdminManager';
import { CustomerApp } from '@/app/components/CustomerApp';
import { Login } from '@/app/components/Login';
import { Toaster } from '@/app/components/ui/sonner';
import { Store, UtensilsCrossed, Calendar, ClipboardList, Settings, Search, HelpCircle, Menu, ShoppingBag, Shield, UserCog, LogOut, TrendingUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // 檢查是否有已登入的管理員
  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin');
    if (savedAdmin) {
      try {
        setCurrentAdmin(JSON.parse(savedAdmin));
      } catch (error) {
        console.error('解析管理員資訊失敗:', error);
        localStorage.removeItem('admin');
      }
    }
  }, []);

  // 手機版預設收起側邊欄
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSuccess = (admin: any) => {
    setCurrentAdmin(admin);
    setIsAdminMode(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    setCurrentAdmin(null);
    setIsAdminMode(false);
    setActiveTab('restaurants');
    toast.success('已登出');
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // 在手機版點擊選單後自動收起側邊欄
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  // 根據管理員角色決定菜單項目
  const menuItems = currentAdmin?.role === 'helper' 
    ? [
        { id: 'orders', label: '訂單列表', icon: ClipboardList },
      ]
    : [
        { id: 'restaurants', label: '餐廳管理', icon: Store },
        { id: 'menu-items', label: '餐點管理', icon: UtensilsCrossed },
        { id: 'weekly-menu', label: '每週上架', icon: Calendar },
        { id: 'orders', label: '訂單列表', icon: ClipboardList },
        { id: 'analytics', label: '訂單分析', icon: TrendingUp },
        { id: 'admins', label: '管理人員', icon: UserCog },
      ];

  // 當登入後根據角色設定預設 tab
  useEffect(() => {
    if (currentAdmin) {
      if (currentAdmin.role === 'helper') {
        setActiveTab('orders');
      } else if (!activeTab || activeTab === 'orders') {
        setActiveTab('restaurants');
      }
    }
  }, [currentAdmin]);

  // 顧客端視圖
  if (!isAdminMode) {
    return (
      <>
        <CustomerApp />
        {/* 管理員切換按鈕 */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => setIsAdminMode(true)}
            className="rounded-full shadow-lg"
            size="lg"
          >
            <Shield className="w-5 h-5 mr-2" />
            管理端
          </Button>
        </div>
        <Toaster />
      </>
    );
  }

  // 管理端 - 如果未登入，顯示登入頁
  if (isAdminMode && !currentAdmin) {
    return (
      <>
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToCustomer={() => setIsAdminMode(false)}
        />
        <Toaster />
      </>
    );
  }

  // 管理端視圖
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 手機版遮罩層 */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* 側邊欄 */}
      <aside className={`
        bg-white border-r border-gray-200 transition-all duration-300 
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        flex flex-col
        fixed md:relative z-50 h-full
        ${sidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        {/* Logo/品牌區 */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
                點
              </div>
              <span className="font-semibold text-gray-900">線上點餐系統</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* 導航菜單 */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">
                管理功能
              </p>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>設定</span>}
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>幫助</span>}
          </button>
        </div>

        {/* 用戶資訊 */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => setIsAdminMode(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors mb-2"
          >
            <ShoppingBag className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>切換到顧客端</span>}
          </button>
          
          {/* 管理員資訊卡片 */}
          <div className="mb-2 p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {currentAdmin?.name?.charAt(0) || '管'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentAdmin?.name || '管理員'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentAdmin?.email || 'admin@example.com'}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            )}
          </div>
          
          {/* 收起時的登出按鈕 */}
          {sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* 主要內容區 */}
      <main className={`flex-1 flex flex-col overflow-hidden ${!sidebarCollapsed ? 'md:ml-0' : ''}`}>
        {/* 頂部欄 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 gap-2">
          {/* 手機版漢堡選單按鈕 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="md:hidden p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 max-w-2xl">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜尋餐廳、餐點或訂單..."
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-gray-600 hidden sm:block">
              {new Date().toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
              })}
            </span>
          </div>
        </header>

        {/* 內容區域 */}
        <div className="flex-1 overflow-auto p-3 md:p-6">
          {activeTab === 'restaurants' && <RestaurantManager />}
          {activeTab === 'menu-items' && <MenuItemManager />}
          {activeTab === 'weekly-menu' && <CalendarMenuManager />}
          {activeTab === 'orders' && <OrderList />}
          {activeTab === 'analytics' && <OrderAnalytics />}
          {activeTab === 'admins' && <AdminManager />}
        </div>
      </main>

      <Toaster />
    </div>
  );
}