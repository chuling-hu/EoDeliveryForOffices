import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/app/components/ui/dropdown-menu';
import { Pencil, Trash2, Plus, MapPin, Phone, User, ExternalLink, MoreVertical, Eye } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address?: string;
  phone?: string;
  contactName?: string;
  googleMapsUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function RestaurantManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [viewingRestaurant, setViewingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', address: '', phone: '', contactName: '', googleMapsUrl: '' });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    fetchRestaurants();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRestaurant
        ? `${API_URL}/restaurants/${editingRestaurant.id}`
        : `${API_URL}/restaurants`;
      
      const method = editingRestaurant ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      toast.success(editingRestaurant ? '餐廳已更新' : '餐廳已新增');
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', address: '', phone: '', contactName: '', googleMapsUrl: '' });
      setEditingRestaurant(null);
      fetchRestaurants();
    } catch (error) {
      console.error('儲存餐廳失敗:', error);
      toast.error('儲存失敗，請重試');
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({ name: restaurant.name, description: restaurant.description, address: restaurant.address || '', phone: restaurant.phone || '', contactName: restaurant.contactName || '', googleMapsUrl: restaurant.googleMapsUrl || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此餐廳嗎？這將同時刪除該餐廳的所有餐點。')) return;
    
    try {
      await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      toast.success('餐廳已刪除');
      fetchRestaurants();
    } catch (error) {
      console.error('刪除餐廳失敗:', error);
      toast.error('刪除失敗，請重試');
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData({ name: '', description: '', address: '', phone: '', contactName: '', googleMapsUrl: '' });
    setEditingRestaurant(null);
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">餐廳管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理您的餐廳資料和資訊</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              新增餐廳
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRestaurant ? '編輯餐廳' : '新增餐廳'}</DialogTitle>
              <DialogDescription>
                {editingRestaurant ? '編輯現有的餐廳資料' : '新增一個新的餐廳'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">餐廳名稱</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">餐廳描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">電話</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactName">聯絡人姓名</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                <Input
                  id="googleMapsUrl"
                  value={formData.googleMapsUrl}
                  onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  取消
                </Button>
                <Button type="submit">
                  {editingRestaurant ? '更新' : '新增'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>餐廳列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>餐廳名稱</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[180px]">建立時間</TableHead>
                  <TableHead className="w-[180px]">修改時間</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                      暫無餐廳資料，請點擊右上角「新增餐廳」按鈕開始新增
                    </TableCell>
                  </TableRow>
                ) : (
                  restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell className="max-w-md truncate text-gray-600">
                        {restaurant.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(restaurant.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(restaurant.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setViewingRestaurant(restaurant);
                              setIsDetailDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              詳細資料
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(restaurant)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(restaurant.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 手機版卡片列表 */}
          <div className="md:hidden space-y-3">
            {restaurants.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                暫無餐廳資料，請點擊右上角「新增餐廳」按鈕開始新增
              </div>
            ) : (
              restaurants.map((restaurant) => (
                <Card key={restaurant.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setViewingRestaurant(restaurant);
                          setIsDetailDialogOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          詳細資料
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(restaurant)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(restaurant.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {restaurant.description || '-'}
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>建立時間</span>
                      <span>{formatDateTime(restaurant.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>修改時間</span>
                      <span>{formatDateTime(restaurant.updatedAt)}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 詳細資料 Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>餐廳詳細資料</DialogTitle>
          </DialogHeader>
          {viewingRestaurant && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{viewingRestaurant.name}</h3>
                <p className="text-gray-600">{viewingRestaurant.description || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                {viewingRestaurant.address && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">地址</p>
                      <p className="text-sm text-gray-900">{viewingRestaurant.address}</p>
                    </div>
                  </div>
                )}

                {viewingRestaurant.phone && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">聯絡電話</p>
                      <p className="text-sm text-gray-900">{viewingRestaurant.phone}</p>
                    </div>
                  </div>
                )}

                {viewingRestaurant.contactName && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">聯絡人姓名</p>
                      <p className="text-sm text-gray-900">{viewingRestaurant.contactName}</p>
                    </div>
                  </div>
                )}

                {viewingRestaurant.googleMapsUrl && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">Google Maps</p>
                      <a 
                        href={viewingRestaurant.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        開啟地圖 <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">建立時間</span>
                  <span className="font-medium text-gray-900">{formatDateTime(viewingRestaurant.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">最後修改</span>
                  <span className="font-medium text-gray-900">{formatDateTime(viewingRestaurant.updatedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}