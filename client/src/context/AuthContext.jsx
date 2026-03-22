import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(token);
      setUser(userData);
      return response.data;
    } catch (err) {
      // If account exists but email not verified, surface the email so the UI can redirect
      if (err.response?.data?.message === 'EMAIL_NOT_VERIFIED') {
        throw { notVerified: true, email: err.response.data.email };
      }
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  // register — no longer logs in. Returns the email so caller can redirect to /verify-otp
  const register = async (name, email, password) => {
    const response = await axios.post('/api/auth/register', { name, email, password });
    return response.data; // { message, email }
  };

  const verifyOtp = async (email, otp) => {
    const response = await axios.post('/api/auth/verify-otp', { email, otp });
    const { token, ...userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
    return response.data;
  };

  const resendOtp = async (email) => {
    const response = await axios.post('/api/auth/resend-otp', { email });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOtp, resendOtp, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
