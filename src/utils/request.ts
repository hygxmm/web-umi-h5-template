import axios, {AxiosResponse,InternalAxiosRequestConfig} from 'axios';

// 创建axios实例
const instance = axios.create({
  baseURL: process.env.API_URL, // 接口地址
  timeout: 10000, // 超时时间 10s
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
  withCredentials: true, // 是否携带cookie
});

