import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { QrCode, Eye, Check, TrendingUp, Calendar as CalendarIcon, DollarSign, ShoppingCart } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: { menuItemId: string; quantity: number; name: string; price: number }[];
  totalPrice: number;
  createdAt: string;
  pickedUp: boolean;
}

export function OrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('獲取訂單失敗:', error);
    }
  };

  const handleTogglePickedUp = async (orderId: string, currentStatus: boolean) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ pickedUp: !currentStatus }),
      });
      toast.success(!currentStatus ? '已標記為取餐' : '已取消取餐狀態');
      fetchOrders();
    } catch (error) {
      console.error('更新訂單失敗:', error);
      toast.error('更新失敗，請重試');
    }
  };

  const handleScanQRCode = () => {
    if (!scannedCode.trim()) {
      toast.error('請輸入訂單編號或掃描 QR code');
      return;
    }

    const order = orders.find(o => o.id === scannedCode.trim());
    if (order) {
      if (!order.pickedUp) {
        handleTogglePickedUp(order.id, false);
        setSelectedOrder(order);
      } else {
        toast.info('此訂單已經取餐完成');
      }
      setScannedCode('');
      setScannerOpen(false);
    } else {
      toast.error('找不到此訂單');
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.pickedUp !== b.pickedUp) {
      return a.pickedUp ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 根據時間範圍篩選訂單
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const daysAgo = timeRange === 'week' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    return orders.filter(order => new Date(order.createdAt) >= cutoffDate);
  }, [orders, timeRange]);

  // 統計數據
  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((acc, order) => acc + order.totalPrice, 0);
    const orderCount = filteredOrders.length;
    const pickedUpCount = filteredOrders.filter(o => o.pickedUp).length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    return {
      revenue,
      orderCount,
      pickedUpCount,
      avgOrderValue,
      pickupRate: orderCount > 0 ? (pickedUpCount / orderCount) * 100 : 0,
    };
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, order) => acc + order.totalPrice, 0);
  }, [orders]);

  const dailyRevenueData = useMemo(() => {
    const dateMap: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
      });
      if (!dateMap[date]) {
        dateMap[date] = 0;
      }
      dateMap[date] += order.totalPrice;
    });

    const data = Object.entries(dateMap).map(([date, revenue]) => ({
      date,
      營收: revenue,
    }));

    return data.sort((a, b) => {
      const [aMonth, aDay] = a.date.split('/').map(Number);
      const [bMonth, bDay] = b.date.split('/').map(Number);
      return aMonth !== bMonth ? aMonth - bMonth : aDay - bDay;
    });
  }, [filteredOrders]);

  const dailyOrderData = useMemo(() => {
    const dateMap: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
      });
      if (!dateMap[date]) {
        dateMap[date] = 0;
      }
      dateMap[date] += 1;
    });

    const data = Object.entries(dateMap).map(([date, count]) => ({
      date,
      訂單數: count,
    }));

    return data.sort((a, b) => {
      const [aMonth, aDay] = a.date.split('/').map(Number);
      const [bMonth, bDay] = b.date.split('/').map(Number);
      return aMonth !== bMonth ? aMonth - bMonth : aDay - bDay;
    });
  }, [filteredOrders]);

  const itemSalesData = useMemo(() => {
    const itemMap: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = 0;
        }
        itemMap[item.name] += item.quantity;
      });
    });

    const data = Object.entries(itemMap).map(([name, sales]) => ({
      name,
      銷售數量: sales,
    }));

    return data.sort((a, b) => b.銷售數量 - a.銷售數量).slice(0, 10);
  }, [filteredOrders]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#D084D0', '#A4DE6C'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">訂單管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {orders.length} 筆訂單，已取餐 {orders.filter(o => o.pickedUp).length} 筆
          </p>
        </div>
        <Button onClick={() => setScannerOpen(true)}>
          <QrCode className="w-4 h-4 mr-2" />
          掃描取餐
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>訂單列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">狀態</TableHead>
                <TableHead>訂購人</TableHead>
                <TableHead>電話</TableHead>
                <TableHead>餐點</TableHead>
                <TableHead>總金額</TableHead>
                <TableHead>訂購時間</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                    暫無訂單
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => (
                  <TableRow key={order.id} className={order.pickedUp ? 'opacity-50 bg-gray-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={order.pickedUp}
                          onCheckedChange={() => handleTogglePickedUp(order.id, order.pickedUp)}
                        />
                        {order.pickedUp && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            已取餐
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell className="text-gray-600">{order.customerPhone}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(order.items || []).map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.name} × {item.quantity}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">NT$ {order.totalPrice}</TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 訂單詳情對話框 */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>訂單詳情</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="text-center bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">訂單編號</p>
                <p className="text-lg font-mono font-bold">{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <QRCodeCanvas
                  value={selectedOrder.id}
                  size={200}
                  level="H"
                  className="mx-auto"
                />
                <p className="text-sm text-gray-600 text-center mt-4">
                  <QrCode className="w-4 h-4 inline mr-1" />
                  取餐 QR Code
                </p>
              </div>

              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">訂購人</span>
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">電話</span>
                  <span className="font-medium">{selectedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">訂購時間</span>
                  <span className="font-medium text-sm">{formatDateTime(selectedOrder.createdAt)}</span>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">訂購內容</h4>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-medium">NT$ {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                  <span>總計</span>
                  <span className="text-orange-600">NT$ {selectedOrder.totalPrice}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!selectedOrder.pickedUp && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleTogglePickedUp(selectedOrder.id, false);
                      setSelectedOrder(null);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    確認取餐
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>
                  關閉
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 掃碼取餐對話框 */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>掃描取餐 QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center">
              <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">請掃描顧客的取餐 QR Code</p>
              <p className="text-sm text-gray-500">或手動輸入訂單編號</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">訂單編號</label>
              <input
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScanQRCode()}
                placeholder="輸入訂單編號或掃描 QR code"
                className="w-full px-3 py-2 border rounded-md"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleScanQRCode}>
                確認取餐
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                setScannerOpen(false);
                setScannedCode('');
              }}>
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 統計圖表 */}
      <div className="space-y-6">
        {/* 時間範圍選擇和統計卡片 */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">訂餐分析</h3>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">近 7 天</TabsTrigger>
                <TabsTrigger value="month">近 30 天</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">總營收</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      NT$ {stats.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {timeRange === 'week' ? '近 7 天' : '近 30 天'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">訂單數量</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stats.orderCount}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <ShoppingCart className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {timeRange === 'week' ? '近 7 天' : '近 30 天'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">平均訂單金額</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      NT$ {Math.round(stats.avgOrderValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {timeRange === 'week' ? '近 7 天' : '近 30 天'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">取餐率</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stats.pickupRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Check className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.pickedUpCount} / {stats.orderCount} 已取餐
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 圖表區 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">每日營收趨勢</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={dailyRevenueData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#999"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#999"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="營收" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">每日訂單數量</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dailyOrderData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#999"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#999"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="訂單數" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">熱門商品排行（Top 10）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={itemSalesData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#999" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                  width={90}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="銷售數量" radius={[0, 8, 8, 0]}>
                  {itemSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}