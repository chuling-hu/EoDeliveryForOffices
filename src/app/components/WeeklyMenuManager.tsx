import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ChevronLeft, ChevronRight, Save, History, Check, Search, X, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

interface Restaurant {
  id: string;
  name: string;
  description: string;
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
  weekendReason?: string;
}

interface WeekendStatus {
  [date: string]: {
    isEnabled: boolean;
    reason: string;
  };
}

export function WeeklyMenuManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [weeklyMenus, setWeeklyMenus] = useState<Record<string, Set<string>>>({});
  const [weekendStatus, setWeekendStatus] = useState<WeekendStatus>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [historyMenus, setHistoryMenus] = useState<DailyMenu[]>([]);
  const [activeTab, setActiveTab] = useState('weekly');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  const weekDays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

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

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getWeekDates(startDate: Date): string[] {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  useEffect(() => {
    fetchRestaurants();
    fetchHistoryMenus();
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      fetchAllMenuItems();
    }
  }, [restaurants]);

  useEffect(() => {
    if (allMenuItems.length > 0) {
      fetchWeeklyMenus();
    }
  }, [currentWeekStart, allMenuItems]);

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

  const fetchWeeklyMenus = async () => {
    try {
      const dates = getWeekDates(currentWeekStart);
      const startDate = dates[0];
      const endDate = dates[6];

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

      setWeeklyMenus(menusMap);
    } catch (error) {
      console.error('獲取每週菜單失敗:', error);
    }
  };

  const fetchHistoryMenus = async () => {
    try {
      const response = await fetch(`${API_URL}/menu-history`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      setHistoryMenus(data.historyMenus || []);
    } catch (error) {
      console.error('獲取歷史記錄失敗:', error);
    }
  };

  const handleToggleItem = (date: string, itemId: string) => {
    setWeeklyMenus(prev => {
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
    const allSelected = restaurantItemIds.every(id => weeklyMenus[date]?.has(id));

    setWeeklyMenus(prev => {
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

  const copyFromPreviousDay = (currentDate: string, currentIndex: number) => {
    if (currentIndex === 0) {
      toast.info('這是本週的第一天，無法複製前一天的菜單');
      return;
    }

    const dates = getWeekDates(currentWeekStart);
    const previousDate = dates[currentIndex - 1];
    const previousMenu = weeklyMenus[previousDate];

    setWeeklyMenus(prev => ({
      ...prev,
      [currentDate]: new Set(previousMenu),
    }));

    toast.success('已複製前一天的菜單');
  };

  const handleSave = async () => {
    try {
      const dates = getWeekDates(currentWeekStart);
      const menus = dates.map(date => ({
        date,
        menuItemIds: Array.from(weeklyMenus[date] || []),
        weekendReason: isWeekend(date) && !isWeekendEnabled(date) ? weekendStatus[date]?.reason : undefined,
      }));

      await fetch(`${API_URL}/weekly-menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ menus }),
      });

      toast.success('每週菜單已儲存！');
      fetchWeeklyMenus();
      fetchHistoryMenus();
    } catch (error) {
      console.error('儲存每週菜單失敗:', error);
      toast.error('儲存失敗，請重試');
    }
  };

  const groupedByRestaurant = allMenuItems.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = [];
    }
    acc[item.restaurantId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const dates = getWeekDates(currentWeekStart);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">每週上架管理</h2>
          <p className="text-sm text-gray-500 mt-1">一次設定整週的菜單，或查看歷史記錄</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          儲存本週菜單
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="weekly">每週設定</TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            歷史記錄
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4 mt-6">
          {/* 週選擇器 */}
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentWeekStart);
                newDate.setDate(newDate.getDate() - 7);
                setCurrentWeekStart(newDate);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {currentWeekStart.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })} - {' '}
                {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              </div>
              <div className="text-sm text-gray-500">
                {currentWeekStart.getFullYear()} 年
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentWeekStart);
                newDate.setDate(newDate.getDate() + 7);
                setCurrentWeekStart(newDate);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 週視圖 */}
          <div className="grid grid-cols-7 gap-3">
            {dates.map((date, index) => {
              const selectedCount = weeklyMenus[date]?.size || 0;
              const isToday = date === getTaiwanToday();
              const weekend = isWeekend(date);
              const weekendAllowed = weekend && isWeekendEnabled(date);

              return (
                <Card 
                  key={date} 
                  className={cn(
                    isToday && 'ring-2 ring-primary',
                    weekend && !weekendAllowed && 'bg-gray-50 opacity-70'
                  )}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className={cn(
                      "text-sm flex items-center justify-between",
                      weekend && 'text-red-600'
                    )}>
                      <span>
                        {weekDays[index]}
                        {isToday && <span className="ml-2 text-xs text-primary">(今天)</span>}
                      </span>
                      {weekend && !weekendAllowed && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          週末
                        </span>
                      )}
                      {weekendAllowed && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                          營業
                        </span>
                      )}
                    </CardTitle>
                    <div className="text-xs text-gray-500">
                      {new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                    </div>
                    <div className={cn(
                      "text-xs font-medium",
                      selectedCount > 0 ? "text-green-600" : "text-gray-400"
                    )}>
                      {selectedCount} 個餐點
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* 週末警告 */}
                    {weekend && !weekendAllowed && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] text-amber-800 leading-tight">
                            週末預設不開放，如需上架請聯繫管理員
                          </p>
                        </div>
                      </div>
                    )}

                    {index > 0 && !(weekend && !weekendAllowed) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => copyFromPreviousDay(date, index)}
                      >
                        複製前一天
                      </Button>
                    )}
                    
                    <div className={cn(
                      "space-y-2 max-h-[400px] overflow-y-auto",
                      weekend && !weekendAllowed && "opacity-50 pointer-events-none"
                    )}>
                      {Object.entries(groupedByRestaurant).map(([restaurantId, items]) => {
                        const restaurant = restaurants.find(r => r.id === restaurantId);
                        const allSelected = items.every(item => weeklyMenus[date]?.has(item.id));
                        const someSelected = items.some(item => weeklyMenus[date]?.has(item.id));

                        return (
                          <div key={restaurantId} className="border rounded-md p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => handleToggleRestaurant(date, restaurantId)}
                                className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                              />
                              <label className="text-xs font-medium flex-1 cursor-pointer">
                                {restaurant?.name}
                              </label>
                            </div>
                            <div className="space-y-1 pl-6">
                              {items.map(item => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={weeklyMenus[date]?.has(item.id)}
                                    onCheckedChange={() => handleToggleItem(date, item.id)}
                                    className="scale-75"
                                  />
                                  <label className="text-xs truncate flex-1 cursor-pointer">
                                    {item.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>上架歷史記錄</CardTitle>
            </CardHeader>
            <CardContent>
              {historyMenus.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  暫無歷史記錄
                </div>
              ) : (
                <div className="space-y-4">
                  {historyMenus.map((menu) => {
                    const menuItems = allMenuItems.filter(item => menu.menuItemIds.includes(item.id));
                    const groupedItems = menuItems.reduce((acc, item) => {
                      const restaurant = restaurants.find(r => r.id === item.restaurantId);
                      const restaurantName = restaurant?.name || '未知餐廳';
                      if (!acc[restaurantName]) {
                        acc[restaurantName] = [];
                      }
                      acc[restaurantName].push(item);
                      return acc;
                    }, {} as Record<string, MenuItem[]>);

                    return (
                      <Card key={menu.date}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              {new Date(menu.date).toLocaleDateString('zh-TW', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                              })}
                            </CardTitle>
                            <div className="text-sm text-gray-500">
                              共 {menu.menuItemIds.length} 個餐點
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(groupedItems).map(([restaurantName, items]) => (
                              <div key={restaurantName}>
                                <div className="font-medium text-sm mb-2">{restaurantName}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {items.map(item => (
                                    <div key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                                      {item.imageUrl && (
                                        <img
                                          src={item.imageUrl}
                                          alt={item.name}
                                          className="w-8 h-8 object-cover rounded"
                                        />
                                      )}
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}