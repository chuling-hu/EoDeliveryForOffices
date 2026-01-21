import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Lock, UserCog, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface LoginProps {
  onLoginSuccess: (admin: any) => void;
  onSwitchToCustomer: () => void;
}

export function Login({ onLoginSuccess, onSwitchToCustomer }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('請輸入帳號和密碼');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`歡迎回來，${data.admin.name}！`);
        // 保存登入資訊到 localStorage
        localStorage.setItem('admin', JSON.stringify(data.admin));
        onLoginSuccess(data.admin);
      } else {
        toast.error(data.error || '登入失敗');
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      toast.error('登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl font-bold mb-4 shadow-lg">
            點
          </div>
          <h1 className="text-3xl font-bold text-gray-900">線上點餐系統</h1>
          <p className="text-gray-600">管理員登入</p>
        </div>

        {/* 登入卡片 */}
        <Card className="shadow-xl border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              管理員登入
            </CardTitle>
            <CardDescription>
              請輸入您的管理員帳號密碼
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">帳號</Label>
                <div className="relative">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="請輸入帳號"
                    className="pl-10"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入密碼"
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登入中...' : '登入'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">預設管理員帳號：</p>
              <div className="pl-4 space-y-1 text-blue-700">
                <p>帳號：cindyhu</p>
                <p>密碼：admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 顧客端切換按鈕 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onSwitchToCustomer}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          前往顧客端
        </Button>
      </div>
    </div>
  );
}
