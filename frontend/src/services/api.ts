import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { message } from 'antd';

type FastApiErrorDetail = string | Array<{ loc?: unknown; msg?: string; type?: string }> | undefined;

interface FastApiErrorBody {
  detail?: FastApiErrorDetail;
}

const api: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, ''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ACCESS_TOKEN_KEY = 'access_token';

/** 获取当前登录 token */
const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/** 清理登录 token */
const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    return response;
  },
  (error: AxiosError<FastApiErrorBody>) => {
    const errorData = error.response?.data;
    const detail = errorData?.detail;
    const errorMessage =
      (typeof detail === 'string' && detail) ||
      (Array.isArray(detail) && detail[0]?.msg) ||
      error.message ||
      '请求失败';
    const statusCode = error.response?.status;

    // 全局错误提示，避免每个请求都写 catch
    // 可以通过 config 自定义是否屏蔽全局提示
    const skipErrorHandler = Boolean((error.config as Record<string, unknown> | undefined)?.skipErrorHandler);
    if (!skipErrorHandler) {
      message.error(errorMessage);
    }

    if (statusCode === 401) {
      clearAccessToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    return Promise.reject(errorData || error);
  }
);

export default api;
