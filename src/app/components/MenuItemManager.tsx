import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Pencil, Trash2, Plus, Sparkles, Loader2, Search } from 'lucide-react';
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

export function MenuItemManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    restaurantId: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d0f4f75c`;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurantId) {
      fetchMenuItems(selectedRestaurantId);
    }
  }, [selectedRestaurantId]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${API_URL}/restaurants`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setRestaurants(data.restaurants || []);
      if (data.restaurants && data.restaurants.length > 0) {
        setSelectedRestaurantId(data.restaurants[0].id);
      }
    } catch (error) {
      console.error('獲取餐廳失敗:', error);
    }
  };

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const response = await fetch(`${API_URL}/menu-items/${restaurantId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setMenuItems(data.menuItems || []);
    } catch (error) {
      console.error('獲取餐點失敗:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('restaurantId', formData.restaurantId || selectedRestaurantId);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      
      if (editingItem) {
        formDataToSend.append('currentImageUrl', editingItem.imageUrl);
      }

      const url = editingItem
        ? `${API_URL}/menu-items/${editingItem.id}`
        : `${API_URL}/menu-items`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formDataToSend,
      });

      setIsDialogOpen(false);
      setFormData({ name: '', description: '', price: '', restaurantId: '' });
      setImageFile(null);
      setEditingItem(null);
      if (selectedRestaurantId) {
        fetchMenuItems(selectedRestaurantId);
      }
      toast.success(editingItem ? '餐點已更新' : '餐點已新增');
    } catch (error) {
      console.error('儲存餐點失敗:', error);
      toast.error('儲存餐點失敗');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      restaurantId: item.restaurantId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm('確定要刪除此餐點嗎？')) return;
    
    try {
      await fetch(`${API_URL}/menu-items/${item.restaurantId}/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      if (selectedRestaurantId) {
        fetchMenuItems(selectedRestaurantId);
      }
      toast.success('餐點已刪除');
    } catch (error) {
      console.error('刪除餐點失敗:', error);
      toast.error('刪除餐點失敗');
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData({ name: '', description: '', price: '', restaurantId: '' });
    setImageFile(null);
    setEditingItem(null);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error('請先輸入餐點名稱');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/ai/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ dishName: formData.name }),
      });

      const data = await response.json();
      
      if (response.ok && data.description) {
        setFormData({ ...formData, description: data.description });
        toast.success('AI 描述已生成！您可以繼續編輯');
      } else {
        toast.error(data.error || 'AI 生成失敗');
      }
    } catch (error) {
      console.error('AI 生成描述失敗:', error);
      toast.error('AI 生成描述失敗，請稍後再試');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">餐點管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理餐廳的餐點、價格和圖片</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="w-full sm:w-[200px]">
            <SearchableSelect
              value={selectedRestaurantId}
              onValueChange={setSelectedRestaurantId}
              options={restaurants.map((restaurant) => ({
                value: restaurant.id,
                label: restaurant.name,
              }))}
              placeholder="選擇餐廳"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedRestaurantId} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                新增餐點
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? '編輯餐點' : '新增餐點'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? '編輯現有的餐點細節' : '新增一個新的餐點'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="restaurantId">所屬餐廳</Label>
                  <SearchableSelect
                    value={formData.restaurantId || selectedRestaurantId}
                    onValueChange={(value) => setFormData({ ...formData, restaurantId: value })}
                    options={restaurants.map((restaurant) => ({
                      value: restaurant.id,
                      label: restaurant.name,
                    }))}
                    placeholder="選擇餐廳"
                    searchPlaceholder="搜尋餐廳..."
                    emptyText="找不到相符的餐廳"
                  />
                </div>
                <div>
                  <Label htmlFor="name">餐點名稱</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="例如：紅燒牛肉麵"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description">餐點描述</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGenerating || !formData.name}
                      className="border-gray-300"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI 生成建議描述
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="描述餐點的特色、口味、食材等...&#10;或點擊「AI 生成建議描述」讓 AI 幫您生成！"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 提示：先輸入餐點名稱，再使用 AI 生成描述。生成後可自由修改。
                  </p>
                </div>
                <div>
                  <Label htmlFor="price">價格</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">餐點照片</Label>
                  <Input
                    id="image"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImageFile(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        setImagePreview('');
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    支援 JPG、JPEG、PNG 格式
                  </p>
                  {editingItem && editingItem.imageUrl && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {imageFile ? '將更新為新圖片' : '保留現有圖片'}
                    </p>
                  )}
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    取消
                  </Button>
                  <Button type="submit">
                    {editingItem ? '更新' : '新增'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedRestaurant && (
        <div className="text-sm text-muted-foreground">
          目前選擇：{selectedRestaurant.name}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-md mb-2"
                />
              )}
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold">${item.price}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  編輯
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  刪除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}