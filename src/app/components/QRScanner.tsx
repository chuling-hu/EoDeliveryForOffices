import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Camera, XCircle, CheckCircle, Package } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerOffice: string;
  items: { menuItemId: string; quantity: number; name: string; price: number }[];
  totalPrice: number;
  orderDate?: string;
  createdAt: string;
  pickedUp: boolean;
}

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: () => void;
}

export function QRScanner({ open, onOpenChange, onScanSuccess }: QRScannerProps) {
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    if (open && !scannedOrder) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open, scannedOrder]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          // 掃描錯誤（正常情況，持續掃描中）
        }
      );
    } catch (err) {
      console.error('啟動掃描器失敗:', err);
      setError('無法開啟相機，請確認權限設定');
    }
  };

  const stopScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error('停止掃描器失敗:', err);
      }
      setScanner(null);
    }
  };

  const handleScan = async (scannedText: string) => {
    if (!scannedText || processing) return;
    
    setProcessing(true);
    
    try {
      const orderId = scannedText.trim();
      
      // 獲取訂單資訊
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      const data = await response.json();
      const order = data.orders?.find((o: Order) => o.id === orderId);
      
      if (!order) {
        setError('找不到此訂單，請確認 QR Code 是否正確');
        setProcessing(false);
        return;
      }
      
      // 停止掃描器
      await stopScanner();
      setScannedOrder(order);
      setError('');
    } catch (err) {
      console.error('掃描失敗:', err);
      setError('掃描失敗，請重試');
      setProcessing(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!scannedOrder) return;
    
    try {
      const response = await fetch(`${API_URL}/orders/${scannedOrder.id}/pickup`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('更新訂單狀態失敗');
      }
      
      toast.success(`✅ ${scannedOrder.customerName} 的訂單已完成取餐`);
      onScanSuccess();
      handleClose();
    } catch (err) {
      console.error('確認取餐失敗:', err);
      toast.error('確認取餐失敗，請重試');
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setScannedOrder(null);
    setError('');
    setProcessing(false);
    onOpenChange(false);
  };

  const handleRescan = async () => {
    setScannedOrder(null);
    setError('');
    setProcessing(false);
    await startScanner();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            掃描取餐 QR Code
          </DialogTitle>
          <DialogDescription>
            請將顧客的 QR Code 對準相機
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!scannedOrder && (
            <div className="relative">
              <div id="qr-reader" className="w-full"></div>
              <p className="text-xs text-center text-gray-500 mt-2">
                將 QR Code 對準相機鏡頭
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {scannedOrder && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  成功掃描訂單！
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Package className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">訂單資訊</h3>
                </div>
                
                {scannedOrder.orderDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">預訂日期</span>
                    <span className="font-medium text-orange-700">{formatDate(scannedOrder.orderDate)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">訂購人</span>
                  <span className="font-medium">{scannedOrder.customerName}</span>
                </div>
                
                {scannedOrder.customerOffice && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">辦公室</span>
                    <span className="font-medium">{scannedOrder.customerOffice}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">電話</span>
                  <span className="font-medium">{scannedOrder.customerPhone}</span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600 mb-2">訂購內容</div>
                  {scannedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span>NT$ {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>總金額</span>
                  <span className="text-orange-600">NT$ {scannedOrder.totalPrice}</span>
                </div>
                
                {scannedOrder.pickedUp && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      此訂單已經完成取餐
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRescan}
                >
                  重新掃描
                </Button>
                {!scannedOrder.pickedUp && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleConfirmPickup}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    確認取餐
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
