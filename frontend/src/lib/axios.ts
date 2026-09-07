import axios from "axios";

// For development: your server runs on localhost:5000
// For production: your frontend and backend are served from the same domain
// const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "https://url-shortener-fbzr.onrender.com";

export const BASE_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === "production"
        ? "https://smart-url-shortener-backend-pixb.onrender.com"
        : "http://localhost:8000");

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Include cookies in requests
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach Authorization header if token exists in localStorage (cross-site fallback)
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token.replace("Bearer ", "")}`;
    }
    return config;
});

