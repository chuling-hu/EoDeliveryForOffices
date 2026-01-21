import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { ChevronLeft, ChevronRight, Check, Search, X, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address?: string;
  phone?: string;
  contactName?: string;
  googleMapsUrl?: string;
}

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

interface DailyMenu {
  date: string;
  menuItemIds: string[];
  updatedAt?: string;
  weekendReason?: string; // 週末開放原因
}

interface WeekendStatus {
  [date: string]: {
    isEnabled: boolean;
    reason: string;
  };
}

// 2026 年台灣國定假日
const TAIWAN_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': '元旦',
  '2026-02-16': '農曆除夕',
  '2026-02-17': '春節',
  '2026-02-18': '春節',
  '2026-02-19': '春節',
  '2026-02-20': '春節',
  '2026-02-28': '和平紀念日',
  '2026-04-03': '清明節',
  '2026-04-04': '清明節',
  '2026-04-05': '清明節',
  '2026-06-25': '端午節',
  '2026-06-26': '端午節',
  '2026-06-27': '端午節',
  '2026-10-01': '中秋節',
  '2026-10-02': '中秋節',
  '2026-10-09': '國慶日',
  '2026-10-10': '國慶日',
};

export function CalendarMenuManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [monthlyMenus, setMonthlyMenus] = useState<Record<string, Set<string>>>({});
  const [weekendStatus, setWeekendStatus] = useState<WeekendStatus>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [weekendReason, setWeekendReason] = useState('');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  // 獲取台灣時間的今天日期
  const getTaiwanToday = (): string => {
    const now = new Date();
    // 轉換為台灣時區 (UTC+8)
    const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    return taiwanTime.toISOString().split('T')[0];
  };

  // 檢查是否為週末
  const isWeekend = (date: string): boolean => {
    // 使用 UTC 日期避免時區問題
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = 週日, 6 = 週六
  };

  // 檢查週末是否已啟用
  const isWeekendEnabled = (date: string): boolean => {
    return weekendStatus[date]?.isEnabled || false;
  };

  // 檢查是否為國定假日
  const isHoliday = (date: string): boolean => {
    return date in TAIWAN_HOLIDAYS_2026;
  };

  // 獲取國定假日名稱
  const getHolidayName = (date: string): string => {
    return TAIWAN_HOLIDAYS_2026[date] || '';
  };

  // 獲取月份的所有日期
  const getMonthDates = (date: Date): string[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: string[] = [];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const currentDate = new Date(year, month, d);
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // 獲取月份第一天是星期幾（調整為週日開始，0 = 週日）
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      fetchAllMenuItems();
    }
  }, [restaurants]);

  useEffect(() => {
    if (allMenuItems.length > 0) {
      fetchMonthlyMenus();
    }
  }, [currentMonth, allMenuItems]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${API_URL}/restaurants`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      setRestaurants(data.restaurants || []);
    } catch (error) {
      console.error('獲取餐廳失敗:', error);
    }
  };

  const fetchAllMenuItems = async () => {
    try {
      const items: MenuItem[] = [];
      for (const restaurant of restaurants) {
        const response = await fetch(`${API_URL}/menu-items/${restaurant.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        const data = await response.json();
        items.push(...(data.menuItems || []));
      }
      setAllMenuItems(items);
    } catch (error) {
      console.error('獲取餐點失敗:', error);
    }
  };

  const fetchMonthlyMenus = async () => {
    try {
      const dates = getMonthDates(currentMonth);
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const response = await fetch(
        `${API_URL}/weekly-menu?startDate=${startDate}&endDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();

      const menusMap: Record<string, Set<string>> = {};
      dates.forEach(date => {
        menusMap[date] = new Set();
      });

      (data.weeklyMenus || []).forEach((menu: DailyMenu) => {
        menusMap[menu.date] = new Set(menu.menuItemIds);
      });

      setMonthlyMenus(menusMap);
    } catch (error) {
      console.error('獲取月份菜單失敗:', error);
    }
  };

  const handleToggleItem = (date: string, itemId: string) => {
    setMonthlyMenus(prev => {
      const newMenus = { ...prev };
      const dateSet = new Set(newMenus[date] || []);
      if (dateSet.has(itemId)) {
        dateSet.delete(itemId);
      } else {
        dateSet.add(itemId);
      }
      newMenus[date] = dateSet;
      return newMenus;
    });
  };

  const handleToggleRestaurant = (date: string, restaurantId: string) => {
    const restaurantItems = allMenuItems.filter(item => item.restaurantId === restaurantId);
    const restaurantItemIds = restaurantItems.map(item => item.id);
    const allSelected = restaurantItemIds.every(id => monthlyMenus[date]?.has(id));

    setMonthlyMenus(prev => {
      const newMenus = { ...prev };
      const dateSet = new Set(newMenus[date] || []);

      if (allSelected) {
        restaurantItemIds.forEach(id => dateSet.delete(id));
      } else {
        restaurantItemIds.forEach(id => dateSet.add(id));
      }

      newMenus[date] = dateSet;
      return newMenus;
    });
  };

  const handleSaveDate = async (date: string) => {
    try {
      await fetch(`${API_URL}/weekly-menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          menus: [{
            date,
            menuItemIds: Array.from(monthlyMenus[date] || []),
          }]
        }),
      });

      toast.success(`${new Date(date).toLocaleDateString('zh-TW')} 的菜單已儲存`);
      fetchMonthlyMenus();
    } catch (error) {
      console.error('儲存菜單失敗:', error);
      toast.error('儲存失敗，請重試');
    }
  };

  const handleDateClick = (date: string) => {
    // 如果是週末且未啟用，先詢問是否要啟用
    if (isWeekend(date) && !isWeekendEnabled(date)) {
      // 暫時設定選擇的日期，以便顯示週末啟用表單
      setSelectedDate(date);
      setWeekendReason(weekendStatus[date]?.reason || '');
      setIsSidebarOpen(true);
      return;
    }
    
    setSelectedDate(date);
    setWeekendReason(weekendStatus[date]?.reason || '');
    setIsSidebarOpen(true);
  };

  const handleEnableWeekend = (date: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('請填寫開放週末的原因');
      return;
    }
    
    setWeekendStatus(prev => ({
      ...prev,
      [date]: {
        isEnabled: true,
        reason: reason.trim(),
      }
    }));
    
    setWeekendReason(reason.trim());
    toast.success('週末日期已啟用');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setTimeout(() => setSelectedDate(null), 300); // 等待動畫完成
  };

  // 過濾餐廳
  const filteredRestaurants = restaurants.filter(restaurant => 
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按餐廳分組餐點
  const groupedByRestaurant = filteredRestaurants.reduce((acc, restaurant) => {
    const items = allMenuItems.filter(item => item.restaurantId === restaurant.id);
    if (items.length > 0) {
      acc[restaurant.id] = items;
    }
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const monthDates = getMonthDates(currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentMonth);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 創建日曆格子（包括空白日期）
  const calendarDays: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  calendarDays.push(...monthDates);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">上架管理</h2>
          <p className="text-sm text-gray-500 mt-1">使用月曆方式管理每日上架餐點</p>
        </div>
      </div>

      {/* 月份選擇器 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentMonth(newDate);
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentMonth(newDate);
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 月曆 */}
      <Card>
        <CardContent className="p-4">
          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const hasMenu = (monthlyMenus[date]?.size || 0) > 0;
              const isToday = date === getTaiwanToday();
              const isPast = new Date(date) < new Date(getTaiwanToday());
              const [year, month, day] = date.split('-').map(Number);
              const dayOfWeek = new Date(year, month - 1, day).getDay();
              const weekend = isWeekend(date);
              const weekendAllowed = weekend && isWeekendEnabled(date);
              const holiday = isHoliday(date);
              const holidayName = getHolidayName(date);
              const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
              const weekDayName = weekDayNames[dayOfWeek];

              return (
                <button
                  key={date}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "aspect-square rounded-md border-2 transition-all hover:shadow-md relative",
                    "flex flex-col items-center justify-center p-1",
                    isToday && "ring-2 ring-primary ring-offset-1",
                    hasMenu ? "border-green-500 bg-green-50 hover:bg-green-100" : "border-gray-200 hover:bg-gray-50",
                    isPast && !hasMenu && "bg-gray-50 text-gray-400",
                    weekend && !weekendAllowed && !holiday && "bg-gray-100 border-gray-300 opacity-60",
                    holiday && "bg-pink-50 border-pink-300"
                  )}
                >
                  <div className={cn(
                    "text-sm font-semibold flex items-baseline gap-1",
                    holiday || (weekend && !weekendAllowed) ? "text-red-600" : "text-gray-900"
                  )}>
                    <span>{new Date(date).getDate()}</span>
                    <span className="text-[10px] font-normal text-gray-500">(週{weekDayName})</span>
                  </div>
                  
                  {holiday && (
                    <div className="text-[9px] text-red-600 font-medium leading-tight">
                      {holidayName}
                    </div>
                  )}
                  
                  {!holiday && weekend && !weekendAllowed && (
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                      週末
                    </div>
                  )}
                  
                  {!holiday && weekendAllowed && (
                    <div className="text-[9px] text-orange-600 font-medium leading-tight">
                      營業
                    </div>
                  )}
                  
                  {hasMenu && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-[10px] text-green-700 font-medium">
                        {monthlyMenus[date]?.size}
                      </span>
                    </div>
                  )}
                  
                  {isToday && (
                    <div className="absolute top-0.5 right-0.5">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 側邊欄 - 從右側滑出 */}
      {selectedDate && (
        <>
          {/* 遮罩 */}
          <div 
            className={cn(
              "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
              isSidebarOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={closeSidebar}
          />
          
          {/* 側邊欄 */}
          <div 
            className={cn(
              "fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50",
              "transform transition-transform duration-300 ease-out",
              "flex flex-col",
              isSidebarOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* 標題列 */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                  {new Date(selectedDate).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                  {isHoliday(selectedDate) && (
                    <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                      {getHolidayName(selectedDate)}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  已選擇 {monthlyMenus[selectedDate]?.size || 0} 個餐點
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeSidebar}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 國定假日提示 */}
            {isHoliday(selectedDate) && (
              <div className="p-4 bg-pink-50 border-b border-pink-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-pink-900 text-sm mb-1">國定假日</h4>
                    <p className="text-sm text-pink-800">
                      此日期為國定假日（{getHolidayName(selectedDate)}），預設不開放預訂。如需開放請聯繫管理員。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 週末處理區塊 */}
            {isWeekend(selectedDate) && !isWeekendEnabled(selectedDate) && (
              <div className="p-6 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">週末預訂功能</h4>
                    <p className="text-sm text-amber-800 mb-3">
                      此日期為週末，預設不開放預訂。如需開放，請填寫原因後啟用。
                    </p>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-amber-900">
                        開放原因 <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        placeholder="例如：配合特殊活動、補班日、應客戶要求等..."
                        value={weekendReason}
                        onChange={(e) => setWeekendReason(e.target.value)}
                        className="bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                        rows={3}
                      />
                      <Button
                        onClick={() => handleEnableWeekend(selectedDate, weekendReason)}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        disabled={!weekendReason.trim()}
                      >
                        啟用此週末日期
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 週末已啟用顯示原因 */}
            {isWeekend(selectedDate) && isWeekendEnabled(selectedDate) && (
              <div className="p-4 bg-orange-50 border-b border-orange-200">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 text-sm mb-1">週末營業原因</h4>
                    <p className="text-sm text-orange-800">{weekendStatus[selectedDate]?.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 搜尋欄 */}
            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜尋餐廳名稱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* 餐點列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.keys(groupedByRestaurant).length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {searchQuery ? '找不到符合的餐廳' : '暫無餐廳資料'}
                </div>
              ) : (
                Object.entries(groupedByRestaurant).map(([restaurantId, items]) => {
                  const restaurant = restaurants.find(r => r.id === restaurantId);
                  const allSelected = items.every(item => monthlyMenus[selectedDate]?.has(item.id));
                  const someSelected = items.some(item => monthlyMenus[selectedDate]?.has(item.id));
                  const selectedCount = items.filter(item => monthlyMenus[selectedDate]?.has(item.id)).length;

                  return (
                    <Card key={restaurantId} className="border-2">
                      <CardContent className="p-4">
                        {/* 餐廳標題 */}
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => handleToggleRestaurant(selectedDate, restaurantId)}
                            className={cn(
                              "w-5 h-5",
                              someSelected && !allSelected && "data-[state=checked]:bg-primary/50"
                            )}
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{restaurant?.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {selectedCount} / {items.length} 個餐點已選
                            </p>
                          </div>
                        </div>

                        {/* 餐點列表 */}
                        <div className="space-y-2">
                          {items.map(item => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Checkbox
                                checked={monthlyMenus[selectedDate]?.has(item.id)}
                                onCheckedChange={() => handleToggleItem(selectedDate, item.id)}
                                className="w-4 h-4"
                              />
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded-md"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {item.description}
                                </div>
                                <div className="text-sm font-semibold text-primary mt-0.5">
                                  ${item.price}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* 底部操作按鈕 */}
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <Button 
                variant="outline" 
                onClick={closeSidebar}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={() => {
                  handleSaveDate(selectedDate);
                  closeSidebar();
                }}
                className="flex-1"
              >
                儲存此日期
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}