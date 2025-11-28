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
      // Ideally verify token with backend here, for now just decode or assume valid if present
      // For this MVP, we'll just set a dummy user object if token exists, 
      // or rely on the login response to set the user.
      // A better approach is to have a /me endpoint.
      // We will persist user data in localStorage for simplicity in this step if needed,
      // or just rely on the fact that we have a token.
      
      // Let's try to decode or just set a flag. 
      // Actually, let's store user info in localStorage too for this simple implementation.
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    const { token, ...userData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await axios.post('/api/auth/register', { name, email, password });
    const { token, ...userData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
