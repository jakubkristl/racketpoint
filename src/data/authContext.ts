// User authentication and account management
import { useReducer, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  language: 'bg' | 'en';
  addresses: Address[];
  createdAt: string;
  role: 'user' | 'admin';
}

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

type AuthAction =
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'REGISTER_ERROR'; payload: string }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  token: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false, error: action.payload, isLoggedIn: false };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGOUT':
      localStorage.removeItem('racketpoint-auth-token');
      localStorage.removeItem('racketpoint-user');
      return initialState;
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    case 'RESTORE_SESSION':
      return {
        ...state,
        isLoggedIn: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    default:
      return state;
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from localStorage on mount
  const restoreSession = useCallback(() => {
    const token = localStorage.getItem('racketpoint-auth-token');
    const userJson = localStorage.getItem('racketpoint-user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        dispatch({ type: 'RESTORE_SESSION', payload: { user, token } });
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, language: 'bg' }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('racketpoint-auth-token', data.token);
      localStorage.setItem('racketpoint-user', JSON.stringify(data.user));
      dispatch({ type: 'REGISTER_SUCCESS', payload: data });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration error';
      dispatch({ type: 'REGISTER_ERROR', payload: message });
      return { success: false, error: message };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('racketpoint-auth-token', data.token);
      localStorage.setItem('racketpoint-user', JSON.stringify(data.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_ERROR', payload: message });
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!state.token) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedUser = await response.json();
      localStorage.setItem('racketpoint-user', JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error' };
    }
  }, [state.token]);

  return {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    restoreSession,
  };
}
