// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: global.config.server_url,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
