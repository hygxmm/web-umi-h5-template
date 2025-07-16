# Axios 请求库使用指南

这是一个基于 axios 的完整请求库，提供了丰富的功能和最佳实践。

## 🚀 主要特性

- ✅ **请求/响应拦截器**：自动处理 token、loading 状态等
- ✅ **自动 Token 管理**：自动添加、刷新、清除 token
- ✅ **请求取消功能**：防重复请求、批量取消
- ✅ **重试机制**：网络错误自动重试
- ✅ **Loading 状态管理**：智能显示/隐藏 loading
- ✅ **统一错误处理**：标准化错误提示
- ✅ **TypeScript 支持**：完整的类型定义
- ✅ **文件上传下载**：支持单文件、多文件操作
- ✅ **Token 自动刷新**：无感刷新过期 token

## 📦 快速开始

### 1. 基础导入

```typescript
import request from '@/utils/request';

// 或者导入类型
import request, { ApiResponse, RequestConfig } from '@/utils/request';
```

### 2. 基础请求

```typescript
// GET请求
const getUserInfo = async (userId: string) => {
  const response = await request.get(`/user/${userId}`);
  return response.data;
};

// POST请求
const createUser = async (userData: any) => {
  const response = await request.post('/user', userData);
  return response.data;
};

// 带参数的GET请求
const getUserList = async (params: { page: number; size: number }) => {
  const response = await request.get('/user/list', { params });
  return response.data;
};
```

## 🛠️ 高级功能

### Token 管理

```typescript
// 登录后设置token
const login = async (loginData: any) => {
  const response = await request.post('/auth/login', loginData, {
    skipAuth: true, // 登录接口跳过token验证
  });

  // 设置token
  request.setToken(response.data.token);
  return response;
};

// 获取当前token
const token = request.getToken();

// 清除token（退出登录）
request.clearToken();
```

### 请求配置选项

```typescript
interface RequestConfig {
  skipAuth?: boolean; // 跳过token验证
  skipErrorHandler?: boolean; // 跳过统一错误处理
  retryTimes?: number; // 重试次数
  showLoading?: boolean; // 是否显示loading
  loadingText?: string; // loading文本
}
```

### Loading 控制

```typescript
// 显示自定义loading
const response = await request.post('/data', data, {
  showLoading: true,
  loadingText: '数据处理中...',
});

// 不显示loading
const response = await request.get('/config', {
  showLoading: false,
});
```

### 重试机制

```typescript
// 网络错误时重试3次
const response = await request.get('/important-data', {
  retryTimes: 3,
});
```

### 错误处理

```typescript
// 使用统一错误处理
const response = await request.get('/data');

// 跳过统一错误处理，自定义处理
const checkUser = async (username: string) => {
  try {
    return await request.get(`/user/check/${username}`, {
      skipErrorHandler: true,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return { exists: false };
    }
    throw error;
  }
};
```

## 📁 文件操作

### 文件上传

```typescript
// 单文件上传
const uploadAvatar = async (file: File) => {
  const response = await request.upload('/user/avatar', file, {
    loadingText: '上传头像中...',
  });
  return response.data;
};

// 多文件上传
const uploadMultipleFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`file${index}`, file);
  });

  const response = await request.upload('/files/multiple', formData);
  return response.data;
};
```

### 文件下载

```typescript
// 下载文件
const downloadReport = async (reportId: string) => {
  await request.download(`/report/${reportId}/download`, 'report.pdf');
};
```

## 🔄 请求取消

```typescript
// 组件卸载时取消所有请求
const useEffect(() => {
  return () => {
    request.cancelAllRequests();
  };
}, []);

// 相同请求会自动取消前一个，无需手动处理
```

## 📝 TypeScript 支持

### 定义响应类型

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// 使用泛型指定响应类型
const getUser = async (userId: string) => {
  const response = await request.get<User>(`/user/${userId}`);
  // response.data 现在有完整的类型提示
  return response.data;
};
```

### API 响应格式

```typescript
interface ApiResponse<T = any> {
  code: number; // 状态码
  data: T; // 数据
  message: string; // 消息
  success: boolean; // 是否成功
}
```

## 🏗️ 业务模块封装

### 推荐的 API 组织方式

```typescript
// userApi.ts
export const userApi = {
  getInfo: (userId: string) => request.get<User>(`/user/${userId}`),
  update: (userId: string, data: Partial<User>) =>
    request.put(`/user/${userId}`, data),
  delete: (userId: string) => request.delete(`/user/${userId}`),
  getList: (params: ListParams) =>
    request.get<UserListResponse>('/user/list', { params }),
};

// orderApi.ts
export const orderApi = {
  create: (data: OrderData) =>
    request.post('/order', data, {
      loadingText: '创建订单中...',
    }),
  pay: (orderId: string, paymentData: PaymentData) =>
    request.post(`/order/${orderId}/pay`, paymentData, { retryTimes: 2 }),
};
```

## ⚙️ 配置说明

### 环境配置

在 `.env` 文件中配置 API 地址：

```bash
# 开发环境
API_URL=http://localhost:3000/api

# 生产环境
API_URL=https://api.yoursite.com
```

### 自定义配置

如需修改默认配置，可以在 `request.ts` 中调整：

```typescript
// 修改超时时间
timeout: 15000, // 15秒

// 修改默认headers
headers: {
  'Content-Type': 'application/json;charset=utf-8',
  'X-Requested-With': 'XMLHttpRequest',
},

// 修改token存储key
private tokenKey = 'your_token_key';
```

## 🔧 Loading 组件集成

### 替换 Loading 实现

在 `LoadingManager` 类中替换 loading 实现：

```typescript
show(text?: string) {
  this.loadingCount++;
  if (this.loadingCount === 1) {
    // 替换为你的Loading组件
    this.loadingInstance = YourToast.loading(text || '加载中...');

    // 或者使用其他UI库
    // this.loadingInstance = ElLoading.service({ text });
    // this.loadingInstance = message.loading(text);
  }
}

hide() {
  this.loadingCount = Math.max(0, this.loadingCount - 1);
  if (this.loadingCount === 0 && this.loadingInstance) {
    // 隐藏loading
    this.loadingInstance.close();
    this.loadingInstance = null;
  }
}
```

## 🚨 错误处理自定义

### 自定义错误提示

在相应的错误处理函数中替换提示实现：

```typescript
private handleError(error: AxiosError): void {
  // 替换为你的提示组件
  YourToast.error(message);

  // 或者使用其他UI库
  // ElMessage.error(message);
  // message.error(message);
}
```

## 📊 监控和调试

### 请求日志

所有请求错误都会在控制台输出详细信息，便于调试：

```javascript
console.error('Request Error:', message, error);
```

### 请求状态监控

可以通过浏览器开发者工具的 Network 面板监控所有请求状态。

## 🎯 最佳实践

1. **模块化管理**：按业务模块组织 API 接口
2. **类型定义**：为所有接口定义 TypeScript 类型
3. **错误处理**：合理使用统一错误处理和自定义错误处理
4. **Loading 控制**：根据用户体验需要控制 loading 显示
5. **请求取消**：在适当的时机取消不需要的请求
6. **Token 管理**：及时更新和清除 token
7. **重试机制**：仅对关键接口使用重试功能

## 🔍 常见问题

### Q: 如何修改 token 的存储方式？

A: 在 `TokenManager` 类中修改 `getToken`、`setToken` 等方法的实现。

### Q: 如何自定义请求头？

A: 可以在具体请求中传入 `headers` 配置，或修改默认配置。

### Q: 如何处理特殊的响应格式？

A: 在响应拦截器中修改数据处理逻辑，或使用 `skipErrorHandler` 自定义处理。

### Q: 如何集成第三方 UI 库的 Loading？

A: 在 `LoadingManager` 类中替换 `show` 和 `hide` 方法的实现。

---

这个请求库提供了生产级别的功能和最佳实践，可以满足大部分项目的需求。如有特殊需求，可以根据实际情况进行调整和扩展。
