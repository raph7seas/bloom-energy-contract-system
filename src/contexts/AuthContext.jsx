import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE = '/api';

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Demo mode - allow demo token
      if (token === 'demo-token') {
        const demoUser = {
          id: 'demo-user',
          email: 'demo@bloom.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'USER'
        };

        // Ensure mock contracts are seeded (in case of page reload)
        if (!localStorage.getItem('bloom_contracts')) {
          const mockContracts = [
            {
              id: 'demo-contract-1',
              name: 'Tesla Gigafactory - Power Purchase Agreement',
              client: 'Tesla Inc.',
              site: 'Gigafactory Texas, Austin',
              type: 'PP',
              capacity: 975,
              term: 15,
              status: 'Active',
              uploadDate: '2024-01-15',
              effectiveDate: '2024-02-01',
              totalValue: 2850000,
              parameters: {
                financial: { baseRate: 0.12, escalation: 3.5, microgridAdder: 0, thermalCycleFee: 0, electricalBudget: 25000, commissioningAllowance: 15000 },
                technical: { voltage: '480V', servers: 3, components: ['RI', 'AC'], recType: 'CT-Class-I' },
                operating: { outputWarranty: 97, efficiency: 55, demandRange: { min: 195, max: 975 }, criticalOutput: 0 }
              },
              aiMetadata: { isAiExtracted: true, sourceDocument: { id: 'doc-1', name: 'Tesla_PPA_2024.pdf' }, overallConfidence: 95 },
              notes: 'High-capacity power purchase agreement with favorable terms'
            },
            {
              id: 'demo-contract-2',
              name: 'PG&E Microgrid Project',
              client: 'Pacific Gas & Electric',
              site: 'San Francisco Data Center',
              type: 'MG',
              capacity: 650,
              term: 10,
              status: 'Active',
              uploadDate: '2024-02-10',
              effectiveDate: '2024-03-01',
              totalValue: 1950000,
              parameters: {
                financial: { baseRate: 0.15, escalation: 2.5, microgridAdder: 0.02, thermalCycleFee: 500, electricalBudget: 18000, commissioningAllowance: 12000 },
                technical: { voltage: '4.16kV', servers: 2, components: ['RI', 'AC', 'UC'], recType: null },
                operating: { outputWarranty: 95, efficiency: 52, demandRange: { min: 130, max: 650 }, criticalOutput: 325 }
              },
              aiMetadata: { isAiExtracted: false },
              notes: 'Microgrid with island mode capabilities'
            },
            {
              id: 'demo-contract-3',
              name: 'Google Cloud - Onsite Generation',
              client: 'Google LLC',
              site: 'Mountain View Campus',
              type: 'OG',
              capacity: 1300,
              term: 20,
              status: 'Active',
              uploadDate: '2024-03-05',
              effectiveDate: '2024-04-01',
              totalValue: 4200000,
              parameters: {
                financial: { baseRate: 0.11, escalation: 3.0, microgridAdder: 0, thermalCycleFee: 0, electricalBudget: 35000, commissioningAllowance: 22000 },
                technical: { voltage: '13.2kV', servers: 4, components: ['RI', 'AC', 'UC', 'BESS'], recType: 'CA-Class-II' },
                operating: { outputWarranty: 98, efficiency: 58, demandRange: { min: 260, max: 1300 }, criticalOutput: 0 }
              },
              aiMetadata: { isAiExtracted: true, sourceDocument: { id: 'doc-3', name: 'Google_OG_Contract.pdf' }, overallConfidence: 92 },
              notes: 'Long-term onsite generation with battery storage'
            }
          ];
          localStorage.setItem('bloom_contracts', JSON.stringify(mockContracts));
        }

        setUser(demoUser);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Check if token is valid by calling /api/auth/me
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('authToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Demo mode - allow login without backend
      if (username === 'demo@bloom.com' && password === 'demo123') {
        const demoUser = {
          id: 'demo-user',
          email: 'demo@bloom.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'USER'
        };
        localStorage.setItem('authToken', 'demo-token');

        // Seed mock contracts for demo mode
        const mockContracts = [
          {
            id: 'demo-contract-1',
            name: 'Tesla Gigafactory - Power Purchase Agreement',
            client: 'Tesla Inc.',
            site: 'Gigafactory Texas, Austin',
            type: 'PP',
            capacity: 975,
            term: 15,
            status: 'Active',
            uploadDate: '2024-01-15',
            effectiveDate: '2024-02-01',
            totalValue: 2850000,
            parameters: {
              financial: { baseRate: 0.12, escalation: 3.5, microgridAdder: 0, thermalCycleFee: 0, electricalBudget: 25000, commissioningAllowance: 15000 },
              technical: { voltage: '480V', servers: 3, components: ['RI', 'AC'], recType: 'CT-Class-I' },
              operating: { outputWarranty: 97, efficiency: 55, demandRange: { min: 195, max: 975 }, criticalOutput: 0 }
            },
            aiMetadata: { isAiExtracted: true, sourceDocument: { id: 'doc-1', name: 'Tesla_PPA_2024.pdf' }, overallConfidence: 95 },
            notes: 'High-capacity power purchase agreement with favorable terms'
          },
          {
            id: 'demo-contract-2',
            name: 'PG&E Microgrid Project',
            client: 'Pacific Gas & Electric',
            site: 'San Francisco Data Center',
            type: 'MG',
            capacity: 650,
            term: 10,
            status: 'Active',
            uploadDate: '2024-02-10',
            effectiveDate: '2024-03-01',
            totalValue: 1950000,
            parameters: {
              financial: { baseRate: 0.15, escalation: 2.5, microgridAdder: 0.02, thermalCycleFee: 500, electricalBudget: 18000, commissioningAllowance: 12000 },
              technical: { voltage: '4.16kV', servers: 2, components: ['RI', 'AC', 'UC'], recType: null },
              operating: { outputWarranty: 95, efficiency: 52, demandRange: { min: 130, max: 650 }, criticalOutput: 325 }
            },
            aiMetadata: { isAiExtracted: false },
            notes: 'Microgrid with island mode capabilities'
          },
          {
            id: 'demo-contract-3',
            name: 'Google Cloud - Onsite Generation',
            client: 'Google LLC',
            site: 'Mountain View Campus',
            type: 'OG',
            capacity: 1300,
            term: 20,
            status: 'Active',
            uploadDate: '2024-03-05',
            effectiveDate: '2024-04-01',
            totalValue: 4200000,
            parameters: {
              financial: { baseRate: 0.11, escalation: 3.0, microgridAdder: 0, thermalCycleFee: 0, electricalBudget: 35000, commissioningAllowance: 22000 },
              technical: { voltage: '13.2kV', servers: 4, components: ['RI', 'AC', 'UC', 'BESS'], recType: 'CA-Class-II' },
              operating: { outputWarranty: 98, efficiency: 58, demandRange: { min: 260, max: 1300 }, criticalOutput: 0 }
            },
            aiMetadata: { isAiExtracted: true, sourceDocument: { id: 'doc-3', name: 'Google_OG_Contract.pdf' }, overallConfidence: 92 },
            notes: 'Long-term onsite generation with battery storage'
          }
        ];

        localStorage.setItem('bloom_contracts', JSON.stringify(mockContracts));

        setUser(demoUser);
        setIsAuthenticated(true);
        setLoading(false);
        return { success: true, user: demoUser };
      }

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store the token - use the correct field from backend response
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        } else if (data.accessToken) {
          localStorage.setItem('authToken', data.accessToken);
        }
        
        // Set user data and auth status - handle different response formats
        const userData = data.user || data;
        setUser(userData);
        setIsAuthenticated(true);
        setError(null); // Clear errors on successful login
        
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Login failed';
        setError(errorMessage);
        return { 
          success: false, 
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Network error. Please check your connection.';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    isDemoMode: user?.id === 'demo-user',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};