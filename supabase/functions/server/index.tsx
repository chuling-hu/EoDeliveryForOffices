import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client for storage
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Bucket name for menu item images
const bucketName = 'make-d0f4f75c-menu-images';

// Create bucket on startup
(async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
  }
  
  // 初始化預設管理員
  const admins = await kv.getByPrefix('admin:');
  if (admins.length === 0) {
    const defaultAdmin = {
      id: crypto.randomUUID(),
      name: 'cindyhu',
      email: 'cindyhu@eating-out.co',
      username: 'cindyhu',
      password: 'admin123', // 預設密碼，應該要求首次登入修改
      role: 'system', // 系統管理員
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`admin:${defaultAdmin.id}`, defaultAdmin);
    console.log('預設管理員已創建:', defaultAdmin.email);
  }
})();

// Health check endpoint
app.get("/make-server-d0f4f75c/health", (c) => {
  return c.json({ status: "ok" });
});

// ============ 餐廳管理 API ============

// 獲取所有餐廳
app.get("/make-server-d0f4f75c/restaurants", async (c) => {
  try {
    const restaurants = await kv.getByPrefix("restaurant:");
    return c.json({ restaurants });
  } catch (error) {
    console.log(`Error fetching restaurants: ${error}`);
    return c.json({ error: "Failed to fetch restaurants" }, 500);
  }
});

// 新增餐廳
app.post("/make-server-d0f4f75c/restaurants", async (c) => {
  try {
    const { name, description, address, phone, contactName, googleMapsUrl } = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const restaurant = { 
      id, 
      name, 
      description, 
      address: address || '', 
      phone: phone || '', 
      contactName: contactName || '', 
      googleMapsUrl: googleMapsUrl || '', 
      createdAt: now, 
      updatedAt: now 
    };
    await kv.set(`restaurant:${id}`, restaurant);
    return c.json({ restaurant });
  } catch (error) {
    console.log(`Error creating restaurant: ${error}`);
    return c.json({ error: "Failed to create restaurant" }, 500);
  }
});

// 更新餐廳
app.put("/make-server-d0f4f75c/restaurants/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { name, description, address, phone, contactName, googleMapsUrl } = await c.req.json();
    const existing = await kv.get(`restaurant:${id}`);
    const restaurant = { 
      id, 
      name, 
      description, 
      address: address || '', 
      phone: phone || '', 
      contactName: contactName || '', 
      googleMapsUrl: googleMapsUrl || '', 
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    };
    await kv.set(`restaurant:${id}`, restaurant);
    return c.json({ restaurant });
  } catch (error) {
    console.log(`Error updating restaurant: ${error}`);
    return c.json({ error: "Failed to update restaurant" }, 500);
  }
});

// 刪除餐廳
app.delete("/make-server-d0f4f75c/restaurants/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`restaurant:${id}`);
    // Also delete all menu items for this restaurant
    const menuItems = await kv.getByPrefix(`menuItem:${id}:`);
    for (const item of menuItems) {
      await kv.del(`menuItem:${id}:${item.id}`);
    }
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting restaurant: ${error}`);
    return c.json({ error: "Failed to delete restaurant" }, 500);
  }
});

// ============ 餐點管理 API ============

// 獲取餐廳的所有餐點
app.get("/make-server-d0f4f75c/menu-items/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param('restaurantId');
    const menuItems = await kv.getByPrefix(`menuItem:${restaurantId}:`);
    return c.json({ menuItems });
  } catch (error) {
    console.log(`Error fetching menu items: ${error}`);
    return c.json({ error: "Failed to fetch menu items" }, 500);
  }
});

// 新增餐點（包含圖片上傳）
app.post("/make-server-d0f4f75c/menu-items", async (c) => {
  try {
    const formData = await c.req.formData();
    const restaurantId = formData.get('restaurantId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const image = formData.get('image') as File;

    const id = crypto.randomUUID();
    let imageUrl = '';

    // Upload image to Supabase Storage
    if (image) {
      // 驗證圖片格式
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(image.type)) {
        return c.json({ error: "只支援 JPG、JPEG、PNG 格式的圖片" }, 400);
      }

      const fileName = `${id}-${image.name}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, image, {
          contentType: image.type,
        });

      if (error) {
        console.log(`Error uploading image: ${error}`);
        return c.json({ error: "Failed to upload image" }, 500);
      }

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year

      imageUrl = signedData?.signedUrl || '';
    }

    const menuItem = { id, restaurantId, name, description, price, imageUrl };
    await kv.set(`menuItem:${restaurantId}:${id}`, menuItem);
    return c.json({ menuItem });
  } catch (error) {
    console.log(`Error creating menu item: ${error}`);
    return c.json({ error: "Failed to create menu item" }, 500);
  }
});

// 更新餐點
app.put("/make-server-d0f4f75c/menu-items/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const formData = await c.req.formData();
    const restaurantId = formData.get('restaurantId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const image = formData.get('image') as File | null;
    const currentImageUrl = formData.get('currentImageUrl') as string;

    let imageUrl = currentImageUrl;

    // Upload new image if provided
    if (image && image.size > 0) {
      // 驗證圖片格式
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(image.type)) {
        return c.json({ error: "只支援 JPG、JPEG、PNG 格式的圖片" }, 400);
      }

      const fileName = `${id}-${image.name}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, image, {
          contentType: image.type,
          upsert: true,
        });

      if (!error) {
        const { data: signedData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 365 * 24 * 60 * 60);
        imageUrl = signedData?.signedUrl || currentImageUrl;
      }
    }

    const menuItem = { id, restaurantId, name, description, price, imageUrl };
    await kv.set(`menuItem:${restaurantId}:${id}`, menuItem);
    return c.json({ menuItem });
  } catch (error) {
    console.log(`Error updating menu item: ${error}`);
    return c.json({ error: "Failed to update menu item" }, 500);
  }
});

// 刪除餐點
app.delete("/make-server-d0f4f75c/menu-items/:restaurantId/:id", async (c) => {
  try {
    const restaurantId = c.req.param('restaurantId');
    const id = c.req.param('id');
    await kv.del(`menuItem:${restaurantId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting menu item: ${error}`);
    return c.json({ error: "Failed to delete menu item" }, 500);
  }
});

// ============ 每日上架管理 API ============

// 獲取指定日期的上架餐點
app.get("/make-server-d0f4f75c/daily-menu/:date", async (c) => {
  try {
    const date = c.req.param('date');
    const dailyMenu = await kv.get(`dailyMenu:${date}`);
    return c.json({ dailyMenu: dailyMenu || { date, menuItemIds: [] } });
  } catch (error) {
    console.log(`Error fetching daily menu: ${error}`);
    return c.json({ error: "Failed to fetch daily menu" }, 500);
  }
});

// 獲取日期範圍的上架餐點（用於週視圖）
app.get("/make-server-d0f4f75c/weekly-menu", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    
    if (!startDate || !endDate) {
      return c.json({ error: "startDate and endDate are required" }, 400);
    }

    const allMenus = await kv.getByPrefix("dailyMenu:");
    const weeklyMenus = allMenus.filter((menu: any) => {
      return menu.date >= startDate && menu.date <= endDate;
    });

    return c.json({ weeklyMenus });
  } catch (error) {
    console.log(`Error fetching weekly menu: ${error}`);
    return c.json({ error: "Failed to fetch weekly menu" }, 500);
  }
});

// 設定指定日期的上架餐點
app.post("/make-server-d0f4f75c/daily-menu/:date", async (c) => {
  try {
    const date = c.req.param('date');
    const { menuItemIds } = await c.req.json();
    const dailyMenu = { date, menuItemIds, updatedAt: new Date().toISOString() };
    await kv.set(`dailyMenu:${date}`, dailyMenu);
    return c.json({ dailyMenu });
  } catch (error) {
    console.log(`Error setting daily menu: ${error}`);
    return c.json({ error: "Failed to set daily menu" }, 500);
  }
});

// 批量設定多天的上架餐點
app.post("/make-server-d0f4f75c/weekly-menu", async (c) => {
  try {
    const { menus } = await c.req.json(); // menus: { date: string, menuItemIds: string[] }[]
    
    for (const menu of menus) {
      const dailyMenu = { 
        date: menu.date, 
        menuItemIds: menu.menuItemIds,
        updatedAt: new Date().toISOString() 
      };
      await kv.set(`dailyMenu:${menu.date}`, dailyMenu);
    }
    
    return c.json({ success: true, count: menus.length });
  } catch (error) {
    console.log(`Error setting weekly menu: ${error}`);
    return c.json({ error: "Failed to set weekly menu" }, 500);
  }
});

// 獲取歷史記錄（已過期的日期）
app.get("/make-server-d0f4f75c/menu-history", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allMenus = await kv.getByPrefix("dailyMenu:");
    const historyMenus = allMenus
      .filter((menu: any) => menu.date < today && menu.menuItemIds.length > 0)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));

    return c.json({ historyMenus });
  } catch (error) {
    console.log(`Error fetching menu history: ${error}`);
    return c.json({ error: "Failed to fetch menu history" }, 500);
  }
});

// ============ 訂單管理 API ============

// 獲取所有訂單
app.get("/make-server-d0f4f75c/orders", async (c) => {
  try {
    const orders = await kv.getByPrefix("order:");
    return c.json({ orders });
  } catch (error) {
    console.log(`Error fetching orders: ${error}`);
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

// 新增訂單（顧客端會使用）
app.post("/make-server-d0f4f75c/orders", async (c) => {
  try {
    const { customerName, customerPhone, customerOffice, items, totalPrice, orderDate } = await c.req.json();
    const id = crypto.randomUUID();
    const order = {
      id,
      customerName,
      customerPhone,
      customerOffice: customerOffice || '', // 辦公室欄位
      items, // [{ menuItemId, quantity, name, price }]
      totalPrice,
      orderDate: orderDate || new Date().toISOString().split('T')[0], // 預訂取餐日期
      createdAt: new Date().toISOString(),
      pickedUp: false,
    };
    await kv.set(`order:${id}`, order);
    return c.json({ order });
  } catch (error) {
    console.log(`Error creating order: ${error}`);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

// 更新訂單取餐狀態
app.put("/make-server-d0f4f75c/orders/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { pickedUp } = await c.req.json();
    const order = await kv.get(`order:${id}`);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    const updatedOrder = { ...order, pickedUp };
    await kv.set(`order:${id}`, updatedOrder);
    return c.json({ order: updatedOrder });
  } catch (error) {
    console.log(`Error updating order: ${error}`);
    return c.json({ error: "Failed to update order" }, 500);
  }
});

// 產生取餐連結（返回取餐 token 的連結）
app.get("/make-server-d0f4f75c/orders/:id/pickup-link", async (c) => {
  try {
    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    const pickupLink = `${Deno.env.get('SUPABASE_URL') || ''}/pickup?token=${order.pickupToken}`;
    return c.json({ pickupLink });
  } catch (error) {
    console.log(`Error generating pickup link: ${error}`);
    return c.json({ error: "Failed to generate pickup link" }, 500);
  }
});

// ============ 管理員管理 API ============

// AI 生成餐點描述
app.post("/make-server-d0f4f75c/ai/generate-description", async (c) => {
  try {
    const { dishName } = await c.req.json();
    
    if (!dishName) {
      return c.json({ error: "請提供餐點名稱" }, 400);
    }

    // 使用 OpenAI API 生成描述
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      // 如果沒有設定 API Key，返回一個通用的描述模板
      const fallbackDescription = `精心烹製的${dishName}，選用新鮮食材，口感豐富，風味獨特。每一口都能感受到用心的烹調，是您品嚐美食的絕佳選擇。`;
      return c.json({ 
        description: fallbackDescription,
        note: "使用預設描述模板（未設定 OpenAI API Key）"
      });
    }

    // 調用 OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一位專業的美食文案撰寫專家，擅長撰寫吸引人的餐點描述。請用繁體中文撰寫，描述要簡潔、吸引人，大約50-80字。'
          },
          {
            role: 'user',
            content: `請為「${dishName}」這道餐點撰寫一段吸引人的描述，包含特色、口味、食材等，讓顧客想要品嚐。`
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.log(`OpenAI API error: ${JSON.stringify(error)}`);
      
      // API 失敗時返回預設描述
      const fallbackDescription = `精心烹製的${dishName}，選用新鮮食材，口感豐富，風味獨特。每一口都能感受到用心的烹調，是您品嚐美食的絕佳選擇。`;
      return c.json({ 
        description: fallbackDescription,
        note: "使用預設描述（AI 服務暫時無法使用）"
      });
    }

    const aiData = await openaiResponse.json();
    const description = aiData.choices?.[0]?.message?.content?.trim() || '';

    if (!description) {
      const fallbackDescription = `精心烹製的${dishName}，選用新鮮食材，口感豐富，風味獨特。每一口都能感受到用心的烹調，是您品嚐美食的絕佳選擇。`;
      return c.json({ description: fallbackDescription });
    }

    return c.json({ description });
  } catch (error) {
    console.log(`Error generating description: ${error}`);
    
    // 錯誤時返回預設描述
    const { dishName } = await c.req.json().catch(() => ({ dishName: '此餐點' }));
    const fallbackDescription = `精心烹製的${dishName}，選用新鮮食材，口感豐富，風味獨特。每一口都能感受到用心的烹調，是您品嚐美食的絕佳選擇。`;
    return c.json({ 
      description: fallbackDescription,
      note: "使用預設描述"
    });
  }
});

// 管理員登入驗證
app.post("/make-server-d0f4f75c/auth/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: "請提供帳號和密碼" }, 400);
    }
    
    // 獲取所有管理員
    const allAdmins = await kv.getByPrefix("admin:");
    
    // 查找匹配的管理員
    const admin = allAdmins.find((a: any) => 
      a.username === username && a.password === password
    );
    
    if (!admin) {
      return c.json({ error: "帳號或密碼錯誤" }, 401);
    }
    
    // 返回管理員資訊（不包含密碼）
    const { password: _, ...safeAdmin } = admin;
    return c.json({ 
      admin: safeAdmin,
      message: "登入成功" 
    });
  } catch (error) {
    console.log(`Error during login: ${error}`);
    return c.json({ error: "登入失敗" }, 500);
  }
});

// 獲取所有管理員
app.get("/make-server-d0f4f75c/admins", async (c) => {
  try {
    const admins = await kv.getByPrefix("admin:");
    // 移除密碼欄位不返回給前端
    const safeAdmins = admins.map((admin: any) => {
      const { password, ...safeAdmin } = admin;
      return safeAdmin;
    });
    return c.json({ admins: safeAdmins });
  } catch (error) {
    console.log(`Error fetching admins: ${error}`);
    return c.json({ error: "Failed to fetch admins" }, 500);
  }
});

// 新增管理員
app.post("/make-server-d0f4f75c/admins", async (c) => {
  try {
    const { name, email, username, password, role } = await c.req.json();
    
    // 檢查帳號或 email 是否已存在
    const allAdmins = await kv.getByPrefix("admin:");
    const existingUsername = allAdmins.find((admin: any) => admin.username === username);
    const existingEmail = allAdmins.find((admin: any) => admin.email === email);
    
    if (existingUsername) {
      return c.json({ error: "帳號已存在" }, 400);
    }
    if (existingEmail) {
      return c.json({ error: "Email 已存在" }, 400);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const admin = {
      id,
      name,
      email,
      username,
      password, // 實際應用中應該要加密
      role: role || 'helper', // 預設為送餐小幫手
      createdAt: now,
      updatedAt: now,
    };
    
    await kv.set(`admin:${id}`, admin);
    
    // 返回時移除密碼
    const { password: _, ...safeAdmin } = admin;
    return c.json({ admin: safeAdmin });
  } catch (error) {
    console.log(`Error creating admin: ${error}`);
    return c.json({ error: "Failed to create admin" }, 500);
  }
});

// 更新管理員
app.put("/make-server-d0f4f75c/admins/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { name, email, username, password, role } = await c.req.json();
    
    const existing = await kv.get(`admin:${id}`);
    if (!existing) {
      return c.json({ error: "Admin not found" }, 404);
    }
    
    // 檢查帳號或 email 是否與其他管理員衝突
    const allAdmins = await kv.getByPrefix("admin:");
    const conflictUsername = allAdmins.find((admin: any) => 
      admin.username === username && admin.id !== id
    );
    const conflictEmail = allAdmins.find((admin: any) => 
      admin.email === email && admin.id !== id
    );
    
    if (conflictUsername) {
      return c.json({ error: "帳號已被使用" }, 400);
    }
    if (conflictEmail) {
      return c.json({ error: "Email 已被使用" }, 400);
    }
    
    const updatedAdmin = {
      ...existing,
      name,
      email,
      username,
      role: role || existing.role, // 如果沒有提供角色，則保持原角色
      updatedAt: new Date().toISOString(),
    };
    
    // 只有在提供新密碼時才更新密碼
    if (password) {
      updatedAdmin.password = password;
    }
    
    await kv.set(`admin:${id}`, updatedAdmin);
    
    // 返回時移除密碼
    const { password: _, ...safeAdmin } = updatedAdmin;
    return c.json({ admin: safeAdmin });
  } catch (error) {
    console.log(`Error updating admin: ${error}`);
    return c.json({ error: "Failed to update admin" }, 500);
  }
});

// 刪除管理員
app.delete("/make-server-d0f4f75c/admins/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    // 檢查是否至少保留一個管理員
    const allAdmins = await kv.getByPrefix("admin:");
    if (allAdmins.length <= 1) {
      return c.json({ error: "至少需要保留一個管理員帳號" }, 400);
    }
    
    await kv.del(`admin:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting admin: ${error}`);
    return c.json({ error: "Failed to delete admin" }, 500);
  }
});

Deno.serve(app.fetch);