import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { ShoppingCart, Minus, Plus, QrCode, UtensilsCrossed, User, Phone, Calendar, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerOffice: string;
  items: { menuItemId: string; quantity: number; name: string; price: number }[];
  totalPrice: number;
  orderDate: string;
  createdAt: string;
  pickedUp: boolean;
}

export function CustomerApp() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerOffice, setCustomerOffice] = useState('');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    initializeWeek();
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchMenuForDate(selectedDate);
    }
  }, [selectedDate]);

  const initializeWeek = () => {
    const today = new Date();
    
    // 生成本週的所有日期（包含今天和過去，用於預覽）
    const dates: string[] = [];
    
    // 從今天開始，顯示未來7天
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    setWeekDates(dates);
    
    // 預設選擇明天（如果可以點餐）或今天（僅預覽）
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  };

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

  const fetchMenuForDate = async (date: string) => {
    try {
      const response = await fetch(`${API_URL}/daily-menu/${date}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      const menuItemIds = data.dailyMenu?.menuItemIds || [];

      // 獲取所有餐點
      const allItems: MenuItem[] = [];
      const restaurantsResponse = await fetch(`${API_URL}/restaurants`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const restaurantsData = await restaurantsResponse.json();

      for (const restaurant of restaurantsData.restaurants || []) {
        const itemsResponse = await fetch(`${API_URL}/menu-items/${restaurant.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        const itemsData = await itemsResponse.json();
        allItems.push(...(itemsData.menuItems || []));
      }

      // 過濾該日期的餐點
      const dateItems = allItems.filter(item => menuItemIds.includes(item.id));
      setMenuItems(dateItems);
      
      // 清空購物車（切換日期時）
      setCart([]);
    } catch (error) {
      console.error('獲取菜單失敗:', error);
    }
  };

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.name} 已加入購物車`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerOffice.trim()) {
      toast.error('請填寫完整的訂購資訊（姓名、電話、辦公室）');
      return;
    }

    if (cart.length === 0) {
      toast.error('購物車是空的');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerOffice,
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
          })),
          totalPrice: getTotalPrice(),
          orderDate: selectedDate, // 加入預訂日期
        }),
      });

      const data = await response.json();
      setOrderConfirmation(data.order);
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerOffice('');
      toast.success('訂單已成功建立！');
    } catch (error) {
      console.error('建立訂單失敗:', error);
      toast.error('建立訂單失敗，請重試');
    }
  };

  const getRestaurantName = (restaurantId: string) => {
    return restaurants.find(r => r.id === restaurantId)?.name || '未知餐廳';
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = [];
    }
    acc[item.restaurantId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const weekday = date.toLocaleDateString('zh-TW', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    
    if (isToday) return `今天 ${monthDay}`;
    if (isTomorrow) return `明天 ${monthDay}`;
    return `${weekday} ${monthDay}`;
  };

  const isDateSelectable = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    // 只能選擇明天以後的日期
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return date >= tomorrow;
  };

  const canOrderForDate = (dateString: string) => {
    // 檢查是否可以為該日期下單（明天以後）
    return isDateSelectable(dateString);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* 頂部欄 */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">線上點餐</h1>
              <p className="text-xs text-gray-500">
                提前一天預訂，輕鬆取餐
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="relative"
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            購物車
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* 日期選擇器 */}
      <div className="bg-white border-b sticky top-[73px] z-9">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">選擇取餐日期</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {weekDates.map(date => {
                const selectable = isDateSelectable(date);
                return (
                  <button
                    key={date}
                    onClick={() => selectable && setSelectedDate(date)}
                    disabled={!selectable}
                    className={`px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap ${
                      selectedDate === date
                        ? 'bg-orange-500 border-orange-500 text-white font-semibold'
                        : selectable
                        ? 'bg-white border-gray-200 text-gray-900 hover:border-orange-300 hover:bg-orange-50'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-sm">{formatDate(date)}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 提示：只能預訂明天以後的餐點
          </p>
        </div>
      </div>

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedDate && (
          <div className="mb-6 flex items-center gap-3">
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 px-3 py-1">
              <Calendar className="w-4 h-4 mr-1" />
              {canOrderForDate(selectedDate) ? '預訂日期' : '預覽日期'}：{formatDate(selectedDate)}
            </Badge>
            {!canOrderForDate(selectedDate) && (
              <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-600 px-3 py-1">
                僅供預覽，無法點餐
              </Badge>
            )}
          </div>
        )}

        {menuItems.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <UtensilsCrossed className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">此日期暫無供應餐點</h3>
              <p className="text-gray-500">請選擇其他日期或稍後再來查看</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([restaurantId, items]) => (
              <div key={restaurantId}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {getRestaurantName(restaurantId)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(item => {
                    const canOrder = canOrderForDate(selectedDate);
                    return (
                      <Card key={item.id} className={`overflow-hidden transition-shadow flex flex-col ${canOrder ? 'hover:shadow-lg' : 'opacity-70'}`}>
                        <div className="aspect-video bg-gray-200 relative overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UtensilsCrossed className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                          {!canOrder && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Badge variant="secondary" className="bg-white/90 text-gray-700 px-3 py-1">
                                僅供預覽
                              </Badge>
                            </div>
                          )}
                        </div>
                        <CardHeader className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">{item.name}</CardTitle>
                          {item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">{item.description}</p>
                          )}
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center pt-0">
                          <span className="text-2xl font-bold text-orange-600">NT$ {item.price}</span>
                          {canOrder ? (
                            <Button onClick={() => addToCart(item)}>
                              <Plus className="w-4 h-4 mr-1" />
                              加入
                            </Button>
                          ) : (
                            <Button disabled variant="secondary">
                              無法點餐
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 購物車對話框 */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>購物車</DialogTitle>
            <DialogDescription>
              預訂日期：{formatDate(selectedDate)} - 請填寫完整的取餐資訊
            </DialogDescription>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">購物車是空的</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 購物車項目 */}
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">NT$ {item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-right w-24">
                      <p className="font-bold">NT$ {item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 顧客資訊 */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-gray-900">取餐資訊（必填）</h3>
                <div>
                  <Label htmlFor="customerName">
                    姓名 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-10"
                      placeholder="請輸入您的姓名"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerPhone">
                    電話 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-10"
                      placeholder="請輸入您的電話"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerOffice">
                    辦公室 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="customerOffice"
                      value={customerOffice}
                      onChange={(e) => setCustomerOffice(e.target.value)}
                      className="pl-10"
                      placeholder="請輸入您的辦公室"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 總計 */}
              <div className="pt-4 border-t">
                <div className="bg-orange-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-600">取餐日期</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">總計</span>
                    <span className="text-2xl font-bold text-orange-600">NT$ {getTotalPrice()}</span>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  確認訂單
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 訂單確認對話框 */}
      <Dialog open={!!orderConfirmation} onOpenChange={() => setOrderConfirmation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>訂單已確認</DialogTitle>
            <DialogDescription>請於取餐日出示 QR Code</DialogDescription>
          </DialogHeader>

          {orderConfirmation && (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">訂單編號</p>
                <p className="text-2xl font-bold text-green-900">{orderConfirmation.id.slice(0, 8).toUpperCase()}</p>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <QRCodeCanvas
                  value={orderConfirmation.id}
                  size={200}
                  level="H"
                  className="mx-auto"
                />
                <p className="text-sm text-gray-600 mt-4">
                  <QrCode className="w-4 h-4 inline mr-1" />
                  請於取餐日出示此 QR Code
                </p>
              </div>

              <div className="text-left bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  取餐日期：{formatDate(orderConfirmation.orderDate)}
                </p>
                <p className="text-sm text-gray-600 mb-2">訂購人：{orderConfirmation.customerName}</p>
                <p className="text-sm text-gray-600 mb-2">電話：{orderConfirmation.customerPhone}</p>
                <p className="text-sm text-gray-600 mb-2">辦公室：{orderConfirmation.customerOffice}</p>
                <p className="text-sm text-gray-600">總金額：NT$ {orderConfirmation.totalPrice}</p>
              </div>

              <Button onClick={() => setOrderConfirmation(null)} className="w-full">
                完成
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}