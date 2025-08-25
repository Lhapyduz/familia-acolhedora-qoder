import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import { FamilyProvider } from './contexts/FamilyContext.js';
import { ChildrenProvider } from './contexts/ChildrenContext.js';
import { BudgetProvider } from './contexts/BudgetContext.js';
import { MatchingProvider } from './contexts/MatchingContext.js';
import { NotificationProvider } from './contexts/NotificationContext.js';
import LoginPage from './pages/LoginPage.js';
import ProtectedRoute from './components/auth/ProtectedRoute.js';
import MainLayout from './components/layout/MainLayout.js';
import Dashboard from './pages/Dashboard.js';
import FamiliesPage from './pages/FamiliesPage.js';
import ChildrenPage from './pages/ChildrenPage.js';
import MatchingPage from './pages/MatchingPage.js';
import BudgetPage from './pages/BudgetPage.js';
import ReportsPage from './pages/ReportsPage.js';
import NotificationsPage from './pages/NotificationsPage.js';
import SettingsPage from './pages/SettingsPage.js';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <FamilyProvider>
            <ChildrenProvider>
              <BudgetProvider>
                <MatchingProvider>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Dashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/families" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <FamiliesPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/children" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <ChildrenPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/matching" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <MatchingPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/budget" element={
                    <ProtectedRoute permissions={['budget:read']}>
                      <MainLayout>
                        <BudgetPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <ReportsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/notifications" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <NotificationsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute permissions={['settings:read']}>
                      <MainLayout>
                        <SettingsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Redirect unknown routes to dashboard */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
                </MatchingProvider>
              </BudgetProvider>
            </ChildrenProvider>
          </FamilyProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;