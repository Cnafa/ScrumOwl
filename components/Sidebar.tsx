import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useLocale } from '../context/LocaleContext';
import { SavedView } from '../types';
import { ScrumOwlLogoIcon, UsersIcon } from './icons';
import { useBoard } from '../context/BoardContext';
import { BoardSwitcher } from './BoardSwitcher';

interface NavItemProps {
    view: 'KANBAN' | 'EPICS' | 'EVENTS' | 'REPORTS' | 'MEMBERS' | 'SPRINTS';
    label: string;
    icon: React.ReactNode;
    isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon, isCollapsed }) => {
    const { currentView, setCurrentView } = useNavigation();
    const isActive = currentView === view;
    
    return (
        <button
            onClick={() => setCurrentView(view)}
            className={`flex items-center w-full h-12 px-4 rounded-lg transition-colors duration-200 ${
                isActive
                    ? 'bg-[#486966] text-white'
                    : 'text-gray-700 hover:bg-[#B2BEBF]/50'
            }`}
        >
            <span className="flex-shrink-0 w-6 h-6">{icon}</span>
            {!isCollapsed && <span className="ml-3 font-medium">{label}</span>}
        </button>
    );
};

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    pinnedViews: SavedView[];
    onSelectView: (view: SavedView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, pinnedViews, onSelectView }) => {
    const { t } = useLocale();
    const { can } = useBoard();
    
    return (
        <aside className={`flex flex-col bg-white/60 backdrop-blur-sm border-r border-gray-200/80 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-16 flex items-center border-b border-gray-200/80 ${isCollapsed ? 'justify-center' : 'justify-between'} px-4`}>
                 <div className="flex items-center gap-2 overflow-hidden">
                    <ScrumOwlLogoIcon className="w-8 h-8 flex-shrink-0" />
                    {!isCollapsed && (
                         <h1 className={`font-bold text-xl text-[#3B3936] transition-opacity duration-200 whitespace-nowrap`}>
                             <span className="text-[#486966]">S</span>crumOw<span className="text-[#486966]">l</span>
                         </h1>
                    )}
                </div>
            </div>

            {/* US-23: Board Header & Switcher */}
            <div className="p-4 border-b border-gray-200/80">
                <BoardSwitcher isCollapsed={isCollapsed} />
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <NavItem view="KANBAN" label={t('sprintBoard')} isCollapsed={isCollapsed} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }/>
                {can('sprint.manage') && (
                    <NavItem view="SPRINTS" label={t('sprints')} isCollapsed={isCollapsed} icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a6 6 0 01-7.38 5.84m2.56-5.84a6 6 0 015.84-7.38m-5.84 2.56a6 6 0 017.38-5.84m-2.56 5.84a6 6 0 01-5.84 7.38m-2.56-5.84a6 6 0 01-7.38-5.84m5.84 2.56a6 6 0 01-5.84-7.38" /></svg>
                    }/>
                )}
                {can('epic.manage') && (
                    <NavItem view="EPICS" label={t('epics')} isCollapsed={isCollapsed} icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013.75 4.5h16.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 19.5m-16.5 0h16.5" /></svg>
                    }/>
                )}
                <NavItem view="EVENTS" label={t('eventsView')} isCollapsed={isCollapsed} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>
                }/>
                <NavItem view="REPORTS" label={t('reportsDashboard')} isCollapsed={isCollapsed} icon={
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM21 21l-5.197-5.197" /></svg>
                }/>
                
                {can('member.manage') && (
                    <NavItem 
                        view="MEMBERS"
                        label={t('membersAndRoles')}
                        isCollapsed={isCollapsed}
                        icon={<UsersIcon />}
                    />
                )}
                
                {/* US-21: Pinned Views Section */}
                {pinnedViews.length > 0 && (
                    <div className="pt-4 mt-2 border-t">
                        {!isCollapsed && <h3 className="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Pinned Views</h3>}
                        {pinnedViews.map(view => (
                             <button
                                key={view.id}
                                onClick={() => onSelectView(view)}
                                className="flex items-center w-full h-12 px-4 rounded-lg text-gray-700 hover:bg-[#B2BEBF]/50"
                                title={view.name}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5.05l3.707-3.707a1 1 0 011.414 1.414L12.414 10l3.707 3.707a1 1 0 01-1.414 1.414L11 11.414V17a1 1 0 11-2 0v-5.586L5.293 15.121a1 1 0 01-1.414-1.414L7.586 10 3.879 6.293a1 1 0 011.414-1.414L9 8.586V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {!isCollapsed && <span className="ml-4 font-medium truncate">{view.name}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </nav>
            <div className="p-4 border-t border-gray-200/80">
                <button onClick={onToggle} className="w-full h-12 flex items-center justify-center rounded-lg hover:bg-[#B2BEBF]/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
            </div>
        </aside>
    );
};