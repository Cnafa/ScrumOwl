import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

type View = 'KANBAN' | 'EPICS' | 'EVENTS' | 'REPORTS' | 'SETTINGS' | 'MEMBERS' | 'SPRINTS';

interface NavigationContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  breadcrumbs: string[];
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>('KANBAN');

  const breadcrumbs = useMemo(() => {
    switch (currentView) {
        case 'KANBAN': return ['Sprint Board'];
        case 'SPRINTS': return ['Sprints'];
        case 'EPICS': return ['Epics'];
        case 'EVENTS': return ['Events'];
        case 'REPORTS': return ['Reports'];
        case 'SETTINGS': return ['Settings'];
        case 'MEMBERS': return ['Members & Roles'];
        default: return [];
    }
  }, [currentView]);

  const value = useMemo(() => ({
    currentView,
    setCurrentView,
    breadcrumbs,
  }), [currentView, breadcrumbs]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};