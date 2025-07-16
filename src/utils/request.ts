import axios, { 
  AxiosResponse, 
  InternalAxiosRequestConfig, 
  AxiosError,
  AxiosRequestConfig,
  CancelTokenSource
} from 'axios';

// 定义响应数据结构
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  success: boolean;
}

// 请求配置扩展
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean; // 跳过token验证
  skipErrorHandler?: boolean; // 跳过错误处理
  retryTimes?: number; // 重试次数
  showLoading?: boolean; // 是否显示loading
  loadingText?: string; // loading文本
}

// Loading状态管理
class LoadingManager {
  private loadingCount = 0;
  private loadingInstance: any = null;

  show(text?: string) {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      // 这里可以替换为你的Loading组件实现
      console.log(`Loading: ${text || '加载中...'}`);
      // 例如: this.loadingInstance = Toast.loading(text || '加载中...');
    }
  }

  hide() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0 && this.loadingInstance) {
      // 这里可以替换为你的Loading组件实现
      console.log('Loading hidden');
      // 例如: this.loadingInstance.close();
      this.loadingInstance = null;
    }
  }

  clear() {
    this.loadingCount = 0;
    if (this.loadingInstance) {
      console.log('Loading cleared');
      this.loadingInstance = null;
    }
  }
}

// Token管理
class TokenManager {
  private tokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

// 请求取消管理
class CancelManager {
  private pendingRequests = new Map<string, CancelTokenSource>();

  // 生成请求key
  private generateReqKey(config: InternalAxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return [method, url, JSON.stringify(params), JSON.stringify(data)].join('&');
  }

  // 添加请求
  addPending(config: InternalAxiosRequestConfig): void {
    const reqKey = this.generateReqKey(config);
    
    // 如果存在相同请求，取消之前的请求
    if (this.pendingRequests.has(reqKey)) {
      const cancelToken = this.pendingRequests.get(reqKey);
      cancelToken?.cancel('重复请求被取消');
    }

    // 创建新的取消token
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    this.pendingRequests.set(reqKey, source);
  }

  // 移除请求
  removePending(config: InternalAxiosRequestConfig | AxiosResponse): void {
    const reqKey = this.generateReqKey(config as InternalAxiosRequestConfig);
    this.pendingRequests.delete(reqKey);
  }

  // 取消所有请求
  cancelAllPending(): void {
    this.pendingRequests.forEach((source) => {
      source.cancel('页面切换，取消所有请求');
    });
    this.pendingRequests.clear();
  }
}

// HTTP状态码处理
const HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// 创建请求类
class HttpRequest {
  private instance;
  private loadingManager: LoadingManager;
  private tokenManager: TokenManager;
  private cancelManager: CancelManager;
  private isRefreshing = false; // 是否正在刷新token
  private failedQueue: Array<{ resolve: Function; reject: Function }> = []; // 失败队列

  constructor() {
    this.loadingManager = new LoadingManager();
    this.tokenManager = new TokenManager();
    this.cancelManager = new CancelManager();

    // 创建axios实例
    this.instance = axios.create({
      baseURL: process.env.API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  // 设置拦截器
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig & RequestConfig) => {
        // 处理请求取消
        this.cancelManager.addPending(config);

        // 显示loading
        if (config.showLoading !== false) {
          this.loadingManager.show(config.loadingText);
        }

        // 自动添加token
        if (!config.skipAuth) {
          const token = this.tokenManager.getToken();
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // 添加请求时间戳（防止缓存）
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        return config;
      },
      (error: AxiosError) => {
        this.loadingManager.hide();
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 移除pending请求
        this.cancelManager.removePending(response);
        this.loadingManager.hide();

        const { data } = response;
        
        // 统一处理响应数据
        if (data.code === 200 || data.success) {
          return data;
        }

        // 业务错误处理
        this.handleBusinessError(data);
        return Promise.reject(new Error(data.message || '请求失败'));
      },
      async (error: AxiosError) => {
        this.loadingManager.hide();
        
        const { config, response } = error;
        const originalRequest = config as RequestConfig;

        // 移除pending请求
        if (config) {
          this.cancelManager.removePending(config as InternalAxiosRequestConfig);
        }

        // 请求被取消
        if (axios.isCancel(error)) {
          console.log('Request canceled:', error.message);
          return Promise.reject(error);
        }

        // Token过期处理
        if (response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest.skipAuth) {
          return this.handleTokenExpired(originalRequest);
        }

        // 重试机制
        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(originalRequest);
        }

        // 统一错误处理
        if (!originalRequest.skipErrorHandler) {
          this.handleError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // 处理token过期
  private async handleTokenExpired(originalRequest: RequestConfig): Promise<any> {
    if (this.isRefreshing) {
      // 如果正在刷新token，将请求加入队列
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        return this.instance(originalRequest);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = this.tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      // 刷新token
      const response = await this.instance.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      // 更新token
      this.tokenManager.setToken(accessToken);
      if (newRefreshToken) {
        this.tokenManager.setRefreshToken(newRefreshToken);
      }

      // 处理队列中的请求
      this.failedQueue.forEach(({ resolve }) => {
        resolve();
      });
      this.failedQueue = [];

      // 重新发送原请求
      return this.instance(originalRequest);
    } catch (error) {
      // 刷新token失败，清除token并跳转登录
      this.failedQueue.forEach(({ reject }) => {
        reject(error);
      });
      this.failedQueue = [];
      
      this.tokenManager.clearTokens();
      this.handleAuthError();
      
      return Promise.reject(error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // 判断是否需要重试
  private shouldRetry(error: AxiosError, config?: RequestConfig): boolean {
    if (!config || config.retryTimes === 0) return false;
    
    // 网络错误或5xx错误才重试
    const shouldRetryStatus = !error.response || 
      (error.response.status >= 500 && error.response.status < 600);
    
    return shouldRetryStatus && (config.retryTimes || 0) > 0;
  }

  // 重试请求
  private async retryRequest(config: RequestConfig): Promise<any> {
    config.retryTimes = (config.retryTimes || 0) - 1;
    
    // 延迟重试
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.instance(config);
  }

  // 处理业务错误
  private handleBusinessError(data: ApiResponse): void {
    const { code, message } = data;
    
    switch (code) {
      case 401:
        this.handleAuthError();
        break;
      case 403:
        console.error('权限不足:', message);
        // 这里可以显示权限不足的提示
        break;
      default:
        console.error('业务错误:', message);
        // 这里可以显示通用错误提示
    }
  }

  // 处理网络错误
  private handleError(error: AxiosError): void {
    let message = '';

    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case HTTP_STATUS.BAD_REQUEST:
          message = '请求参数错误';
          break;
        case HTTP_STATUS.UNAUTHORIZED:
          message = '未授权，请重新登录';
          this.handleAuthError();
          break;
        case HTTP_STATUS.FORBIDDEN:
          message = '权限不足';
          break;
        case HTTP_STATUS.NOT_FOUND:
          message = '请求的资源不存在';
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          message = '服务器内部错误';
          break;
        case HTTP_STATUS.BAD_GATEWAY:
          message = '网关错误';
          break;
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          message = '服务不可用';
          break;
        case HTTP_STATUS.GATEWAY_TIMEOUT:
          message = '网关超时';
          break;
        default:
          message = `请求失败，状态码：${status}`;
      }
    } else if (error.request) {
      message = '网络请求失败，请检查网络连接';
    } else {
      message = '请求配置错误';
    }

    console.error('Request Error:', message, error);
    // 这里可以显示错误提示，例如 Toast.error(message)
  }

  // 处理认证错误
  private handleAuthError(): void {
    this.tokenManager.clearTokens();
    this.cancelManager.cancelAllPending();
    
    // 跳转到登录页
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // GET请求
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.instance.get(url, config);
  }

  // POST请求
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.instance.post(url, data, config);
  }

  // PUT请求
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.instance.put(url, data, config);
  }

  // DELETE请求
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.instance.delete(url, config);
  }

  // PATCH请求
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  // 上传文件
  upload<T = any>(url: string, file: File | FormData, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.instance.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      timeout: 30000, // 上传文件超时时间设置为30秒
    });
  }

  // 下载文件
  download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
    return this.instance.get(url, {
      ...config,
      responseType: 'blob',
    }).then((response) => {
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    });
  }

  // 取消所有请求
  cancelAllRequests(): void {
    this.cancelManager.cancelAllPending();
  }

  // 设置token
  setToken(token: string): void {
    this.tokenManager.setToken(token);
  }

  // 清除token
  clearToken(): void {
    this.tokenManager.clearTokens();
  }

  // 获取token
  getToken(): string | null {
    return this.tokenManager.getToken();
  }
}

// 创建请求实例
const request = new HttpRequest();

// 导出实例和类型
export default request;
export { HttpRequest };

