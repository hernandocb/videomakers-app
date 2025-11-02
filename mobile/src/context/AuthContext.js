import React, { createContext, useState, useEffect, useContext } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authAPI } from '../services/api';
import StorageService from '../services/storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureGoogleSignIn();
    loadUser();
  }, []);

  const configureGoogleSignIn = () => {
    GoogleSignin.configure({
      webClientId: '886877475351-j91fi94vtft7t4f471vd8no2s28dqedb.apps.googleusercontent.com', // From Firebase Console
      offlineAccess: true,
    });
  };

  const loadUser = async () => {
    try {
      console.log('🔍 Loading user...');
      const storedUser = await StorageService.getUser();
      const token = await StorageService.getAccessToken();
      console.log('👤 Stored user:', storedUser);
      console.log('🔑 Token:', token ? 'exists' : 'null');
      if (storedUser && token) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('❌ Error loading user:', error);
    } finally {
      console.log('✅ Loading complete');
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      console.log('🔐 Attempting login...', { email: credentials.email });
      const { data } = await authAPI.login(credentials);
      console.log('✅ Login successful');
      await StorageService.saveTokens(data.access_token, data.refresh_token);
      await StorageService.saveUser(data.user);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        code: error.code,
      });
      
      let errorMessage = 'Erro ao fazer login';
      
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const signup = async (userData) => {
    try {
      console.log('📝 Attempting signup...', { email: userData.email, role: userData.role });
      const { data } = await authAPI.signup(userData);
      console.log('✅ Signup successful');
      await StorageService.saveTokens(data.access_token, data.refresh_token);
      await StorageService.saveUser(data.user);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('❌ Signup error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        code: error.code,
      });
      
      let errorMessage = 'Erro ao cadastrar';
      
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.detail || 'Dados inválidos';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    await StorageService.clearAll();
    setUser(null);
  };

  const googleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Send Google token to backend for verification
      const { data } = await authAPI.googleSignIn(userInfo.idToken);
      
      await StorageService.saveTokens(data.access_token, data.refresh_token);
      await StorageService.saveUser(data.user);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer login com Google',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        googleSignIn,
        setUser, // ✅ CORREÇÃO: Adicionando setUser ao contexto
        isAuthenticated: !!user,
        isClient: user?.role === 'client',
        isVideomaker: user?.role === 'videomaker',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
