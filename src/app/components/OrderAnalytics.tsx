import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { TrendingUp, Calendar as CalendarIcon, DollarSign, ShoppingCart, Check } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
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

type TimeRange = '7' | '30' | '180' | '360' | 'custom';

export function OrderAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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
      toast.error('獲取訂單失敗');
    }
  };

  // 根據時間範圍篩選訂單
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (timeRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        return [];
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const daysAgo = parseInt(timeRange);
      startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    }

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, timeRange, customStartDate, customEndDate]);

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

  // 每日營收數據
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

  // 每日訂單數量數據
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

  // 熱門商品排行
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

  const getTimeRangeText = () => {
    if (timeRange === 'custom') {
      if (customStartDate && customEndDate) {
        return `${customStartDate} ~ ${customEndDate}`;
      }
      return '請選擇日期';
    }
    const daysMap: { [key: string]: string } = {
      '7': '近 7 天',
      '30': '近 30 天',
      '180': '近 180 天',
      '360': '近 360 天',
    };
    return daysMap[timeRange];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">訂單分析</h2>
            <p className="text-sm text-gray-500 mt-1">查看訂餐統計與趨勢分析</p>
          </div>

          {/* 時間範圍選擇 */}
          <div className="flex flex-col gap-3">
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="7">7天</TabsTrigger>
                <TabsTrigger value="30">30天</TabsTrigger>
                <TabsTrigger value="180">180天</TabsTrigger>
                <TabsTrigger value="360">360天</TabsTrigger>
                <TabsTrigger value="custom">自訂</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 自訂日期範圍 */}
            {timeRange === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                  <Label htmlFor="start-date" className="text-xs text-gray-600 mb-1">開始日期</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="text-xs text-gray-600 mb-1">結束日期</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
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
              {getTimeRangeText()}
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
              {getTimeRangeText()}
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
              {getTimeRangeText()}
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

      {/* 圖表區 */}
      {filteredOrders.length > 0 ? (
        <>
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
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {timeRange === 'custom' && (!customStartDate || !customEndDate)
                ? '請選擇日期範圍以查看分析數據'
                : '此期間沒訂單數據'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}