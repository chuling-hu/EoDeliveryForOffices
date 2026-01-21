import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Pencil, Trash2, Plus, UserCog, Mail, Lock, User, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface Admin {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'system' | 'helper';
  createdAt: string;
  updatedAt: string;
}

export function AdminManager() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'helper' as 'system' | 'helper',
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch(`${API_URL}/admins`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('獲取管理員失敗:', error);
      toast.error('獲取管理員列表失敗');
    }
  };

  const handleAddAdmin = async () => {
    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      toast.error('請填寫所有欄位');
      return;
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('請輸入有效的 Email');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('管理員新增成功！');
        setIsAddDialogOpen(false);
        setFormData({ name: '', email: '', username: '', password: '', role: 'helper' });
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || '新增失敗');
      }
    } catch (error) {
      console.error('新增管理員失敗:', error);
      toast.error('新增管理員失敗，請重試');
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    if (!formData.name || !formData.email || !formData.username) {
      toast.error('請填寫所有必填欄位');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('請輸入有效的 Email');
      return;
    }

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
      };

      // 只有在有新密碼時才更新密碼
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`${API_URL}/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('管理員更新成功！');
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
        setFormData({ name: '', email: '', username: '', password: '', role: 'helper' });
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新管理員失敗:', error);
      toast.error('更新管理員失敗，請重試');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const response = await fetch(`${API_URL}/admins/${selectedAdmin.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        toast.success('管理員刪除成功！');
        setDeleteDialogOpen(false);
        setSelectedAdmin(null);
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除管理員失敗:', error);
      toast.error('刪除管理員失敗，請重試');
    }
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      username: admin.username,
      password: '',
      role: admin.role,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setDeleteDialogOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理人員</h2>
          <p className="text-sm text-gray-500 mt-1">管理系統管理員帳號</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新增管理員
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增管理員</DialogTitle>
              <DialogDescription>新增一個新的管理員帳號</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">姓名 *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="add-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    placeholder="請輸入姓名"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="add-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="example@eating-out.co"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-username">帳號 *</Label>
                <div className="relative">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="add-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10"
                    placeholder="請輸入帳號"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-password">密碼 *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="add-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    placeholder="請輸入密碼"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-role">角色 *</Label>
                <Select
                  id="add-role"
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as 'system' | 'helper' })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選擇角色">{formData.role}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="helper">助手</SelectItem>
                    <SelectItem value="system">系統管理員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddAdmin} className="flex-1">
                  新增
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setFormData({ name: '', email: '', username: '', password: '', role: 'helper' });
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>管理員列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>帳號</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead>最後更新</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                    暫無管理員
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.username}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          admin.role === 'system'
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }
                      >
                        {admin.role === 'system' ? '系統管理員' : '助手'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(admin.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(admin)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(admin)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯管理員</DialogTitle>
            <DialogDescription>修改管理員資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">姓名 *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-username">帳號 *</Label>
              <div className="relative">
                <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-password">新密碼（留空表示不變更）</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  placeholder="輸入新密碼或留空"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">角色 *</Label>
              <Select
                id="edit-role"
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as 'system' | 'helper' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇角色">{formData.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="helper">助手</SelectItem>
                  <SelectItem value="system">系統管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateAdmin} className="flex-1">
                更新
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedAdmin(null);
                  setFormData({ name: '', email: '', username: '', password: '', role: 'helper' });
                }}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除管理員「{selectedAdmin?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAdmin(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdmin} className="bg-red-600 hover:bg-red-700">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}