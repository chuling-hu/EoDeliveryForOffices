import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { QrCode, Eye, Check, Package, X, Camera } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { QRScanner } from '@/app/components/QRScanner';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerOffice: string;
  items: { menuItemId: string; quantity: number; name: string; price: number }[];
  totalPrice: number;
  orderDate?: string; // 預訂日期
  createdAt: string;
  pickedUp: boolean;
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.pickedUp !== b.pickedUp) {
      return a.pickedUp ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">訂單列表</h2>
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
          <CardTitle>所有訂單</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">狀態</TableHead>
                  <TableHead>訂購人</TableHead>
                  <TableHead>辦公室</TableHead>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-32">
                      暫無訂單
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow key={order.id} className={order.pickedUp ? 'bg-green-50/50' : 'bg-white'}>
                      <TableCell>
                        {order.pickedUp ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePickedUp(order.id, order.pickedUp)}
                            className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 font-medium"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            已取餐
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePickedUp(order.id, order.pickedUp)}
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300 font-medium"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            待取餐
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell className="text-gray-600">{order.customerOffice || '-'}</TableCell>
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
          </div>

          {/* 手機版卡片列表 */}
          <div className="md:hidden space-y-3">
            {sortedOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                暫無訂單
              </div>
            ) : (
              sortedOrders.map((order) => (
                <Card key={order.id} className={order.pickedUp ? 'bg-green-50/50 border-green-200' : 'bg-white border-orange-200'}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                        <p className="text-sm text-gray-600">{order.customerPhone}</p>
                        {order.customerOffice && (
                          <p className="text-sm text-gray-500">{order.customerOffice}</p>
                        )}
                      </div>
                      {order.pickedUp ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePickedUp(order.id, order.pickedUp)}
                          className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 font-medium shrink-0"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          已取餐
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePickedUp(order.id, order.pickedUp)}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300 font-medium shrink-0"
                        >
                          <Package className="w-4 h-4 mr-1" />
                          待取餐
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 mb-3 p-3 bg-white rounded-lg border">
                      {(order.items || []).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-medium">NT$ {item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>總計</span>
                        <span className="text-orange-600">NT$ {order.totalPrice}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      查看詳細資料
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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
                {selectedOrder.orderDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">預訂日期</span>
                    <span className="font-medium text-orange-700">{formatDate(selectedOrder.orderDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">訂購人</span>
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                {selectedOrder.customerOffice && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">辦公室</span>
                    <span className="font-medium">{selectedOrder.customerOffice}</span>
                  </div>
                )}
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

      {/* 掃碼取餐對話框 - 使用 QRScanner 組件 */}
      <QRScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanSuccess={fetchOrders}
      />
    </div>
  );
}