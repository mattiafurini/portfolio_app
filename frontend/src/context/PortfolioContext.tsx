
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getPortfolios, createPortfolio as apiCreatePortfolio, updatePortfolio as apiUpdatePortfolio, deletePortfolio as apiDeletePortfolio, Portfolio } from '@/lib/api';

interface PortfolioContextType {
    portfolios: Portfolio[];
    currentPortfolio: Portfolio | null;
    isLoading: boolean;
    refreshPortfolios: () => Promise<void>;
    selectPortfolio: (portfolioId: string) => void;
    createPortfolio: (name: string) => Promise<void>;
    updatePortfolioName: (portfolioId: string, name: string) => Promise<void>;
    deletePortfolio: (portfolioId: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedPortfolioId';

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshPortfolios = useCallback(async () => {
        if (!isAuthenticated) {
            setPortfolios([]);
            setCurrentPortfolio(null);
            return;
        }

        setIsLoading(true);
        try {
            const data = await getPortfolios();
            setPortfolios(data);

            // Restore selection or select first default
            const savedId = localStorage.getItem(STORAGE_KEY);
            let selected = null;

            if (savedId) {
                selected = data.find(p => p.id === savedId);
            }

            if (!selected && data.length > 0) {
                // Default to first one (usually "Default" if created first)
                selected = data[0];
            }

            if (selected) {
                setCurrentPortfolio(selected);
                localStorage.setItem(STORAGE_KEY, selected.id);
            } else if (data.length === 0) {
                setCurrentPortfolio(null);
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to load portfolios:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Initial load
    useEffect(() => {
        refreshPortfolios();
    }, [refreshPortfolios]);

    const selectPortfolio = (portfolioId: string) => {
        const portfolio = portfolios.find(p => p.id === portfolioId);
        if (portfolio) {
            setCurrentPortfolio(portfolio);
            localStorage.setItem(STORAGE_KEY, portfolio.id);
        }
    };

    const createPortfolio = async (name: string) => {
        try {
            const newPortfolio = await apiCreatePortfolio(name);
            // Refresh list to include new one
            const updatedPortfolios = await getPortfolios();
            setPortfolios(updatedPortfolios);

            // Immediately select the new one using the API response
            setCurrentPortfolio(newPortfolio);
            localStorage.setItem(STORAGE_KEY, newPortfolio.id);
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    };

    const updatePortfolioName = async (portfolioId: string, name: string) => {
        try {
            await apiUpdatePortfolio(portfolioId, name);
            await refreshPortfolios();
        } catch (error) {
            console.error('Failed to update portfolio:', error);
            throw error;
        }
    };

    const deletePortfolio = async (portfolioId: string) => {
        try {
            // Prevent deleting the last portfolio
            if (portfolios.length <= 1) {
                alert("You cannot delete your only portfolio. Create another one first.");
                return;
            }

            await apiDeletePortfolio(portfolioId);
            await refreshPortfolios();
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    };

    return (
        <PortfolioContext.Provider value={{
            portfolios,
            currentPortfolio,
            isLoading,
            refreshPortfolios,
            selectPortfolio,
            createPortfolio,
            updatePortfolioName,
            deletePortfolio
        }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}
