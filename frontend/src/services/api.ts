import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { message } from 'antd';

// 定义统一响应结构
interface ApiResponse<T = unknown> {
  data: T;
  requestId: string;
}

// 定义错误结构
interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

const api: AxiosInstance = axios.create({
  baseURL: '/api', // 预留后续配置环境变量
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加 Token 等 Header
    // const token = useAuthStore.getState().token;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    return response;
  },
  (error: AxiosError<ApiResponse<ApiError>>) => {
    const errorData = error.response?.data;
    const errorMessage = errorData?.data?.message || error.message || '请求失败';
    
    // 全局错误提示，避免每个请求都写 catch
    // 可以通过 config 自定义是否屏蔽全局提示
    const skipErrorHandler = Boolean((error.config as Record<string, unknown> | undefined)?.skipErrorHandler);
    if (!skipErrorHandler) {
      message.error(errorMessage);
    }

    return Promise.reject(errorData || error);
  }
);

export default api;
