import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Save } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

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
}

export function DailyMenuManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [dailyMenu, setDailyMenu] = useState<DailyMenu>({ date: '', menuItemIds: [] });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    fetchRestaurants();
    fetchDailyMenu();
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      fetchAllMenuItems();
    }
  }, [restaurants]);

  useEffect(() => {
    setSelectedItems(new Set(dailyMenu.menuItemIds));
  }, [dailyMenu]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${API_URL}/restaurants`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
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
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        const data = await response.json();
        items.push(...(data.menuItems || []));
      }
      setAllMenuItems(items);
    } catch (error) {
      console.error('獲取餐點失敗:', error);
    }
  };

  const fetchDailyMenu = async () => {
    try {
      const response = await fetch(`${API_URL}/daily-menu`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setDailyMenu(data.dailyMenu);
    } catch (error) {
      console.error('獲取每日菜單失敗:', error);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleRestaurant = (restaurantId: string) => {
    const restaurantItems = allMenuItems.filter(item => item.restaurantId === restaurantId);
    const restaurantItemIds = restaurantItems.map(item => item.id);
    const allSelected = restaurantItemIds.every(id => selectedItems.has(id));
    
    const newSelected = new Set(selectedItems);
    if (allSelected) {
      // 取消選擇該餐廳的所有餐點
      restaurantItemIds.forEach(id => newSelected.delete(id));
    } else {
      // 選擇該餐廳的所有餐點
      restaurantItemIds.forEach(id => newSelected.add(id));
    }
    setSelectedItems(newSelected);
  };

  const isRestaurantSelected = (restaurantId: string) => {
    const restaurantItems = allMenuItems.filter(item => item.restaurantId === restaurantId);
    if (restaurantItems.length === 0) return false;
    return restaurantItems.every(item => selectedItems.has(item.id));
  };

  const isRestaurantPartiallySelected = (restaurantId: string) => {
    const restaurantItems = allMenuItems.filter(item => item.restaurantId === restaurantId);
    if (restaurantItems.length === 0) return false;
    const selectedCount = restaurantItems.filter(item => selectedItems.has(item.id)).length;
    return selectedCount > 0 && selectedCount < restaurantItems.length;
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/daily-menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ menuItemIds: Array.from(selectedItems) }),
      });
      toast.success('每日菜單已更新！');
      fetchDailyMenu();
    } catch (error) {
      console.error('保存每日菜單失敗:', error);
      toast.error('保存失敗，請重試');
    }
  };

  const groupedByRestaurant = allMenuItems.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = [];
    }
    acc[item.restaurantId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">每日上架管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            今日日期：{new Date().toLocaleDateString('zh-TW')} | 已選擇 {selectedItems.size} 個餐點上架
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          儲存今日上架
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 左側列表 */}
        <div className="col-span-5 space-y-4 h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {Object.entries(groupedByRestaurant).map(([restaurantId, items]) => {
            const restaurant = restaurants.find(r => r.id === restaurantId);
            const isFullySelected = isRestaurantSelected(restaurantId);
            const isPartiallySelected = isRestaurantPartiallySelected(restaurantId);
            
            return (
              <Card key={restaurantId} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`restaurant-${restaurantId}`}
                      checked={isFullySelected}
                      onCheckedChange={() => handleToggleRestaurant(restaurantId)}
                      className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                    <label
                      htmlFor={`restaurant-${restaurantId}`}
                      className="flex-1 cursor-pointer"
                    >
                      <CardTitle className="text-lg">
                        {restaurant?.name || '未知餐廳'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {items.length} 個餐點
                        {isPartiallySelected && ` (已選 ${items.filter(item => selectedItems.has(item.id)).length} 個)`}
                      </p>
                    </label>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          id={item.id}
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <label
                          htmlFor={item.id}
                          className="flex-1 cursor-pointer flex gap-3"
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </div>
                            <div className="text-sm font-bold text-primary mt-1">
                              ${item.price}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 右側預覽 */}
        <div className="col-span-7">
          <Card className="h-[calc(100vh-250px)]">
            <CardHeader>
              <CardTitle>今日上架預覽</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[calc(100%-80px)]">
              {selectedItems.size === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg mb-2">尚未選擇任何餐點</p>
                    <p className="text-sm">請從左側選擇要上架的餐點或餐廳</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {allMenuItems
                    .filter(item => selectedItems.has(item.id))
                    .map((item) => {
                      const restaurant = restaurants.find(r => r.id === item.restaurantId);
                      return (
                        <Card key={item.id} className="overflow-hidden">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <CardContent className="p-3">
                            <div className="font-medium mb-1">{item.name}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {restaurant?.name}
                            </div>
                            <div className="text-sm font-bold text-primary">
                              ${item.price}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}