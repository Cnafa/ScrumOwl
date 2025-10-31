import React, { useState, useRef, useEffect } from 'react';
import { Notification, ConnectionStatus, Sprint } from '../types';
import { NotificationPanel } from './NotificationPanel';
import { QuickSwitcher } from './QuickSwitcher';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useBoard } from '../context/BoardContext';
import { useNavigation } from '../context/NavigationContext';

interface TopbarProps {
    notifications: Notification[];
    onMarkAllNotificationsRead: () => void;
    onShowNotification: (notification: Notification) => void;
    onOpenSettings: () => void;
    onLogout: () => void;
    realtimeStatus: ConnectionStatus;
    onNewItem: () => void;
    availableSprints: Sprint[];
    selectedSprint: Sprint | null;
    onSelectSprint: (sprintId: string) => void;
}

const ConnectionIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    const colorMap: Record<ConnectionStatus, string> = {
        'CONNECTED': 'bg-green-500',
        'DISCONNECTED': 'bg-gray-400',
        'CONNECTING': 'bg-yellow-500 animate-pulse',
        'ERROR': 'bg-red-500',
    };
    return <span className={`w-2.5 h-2.5 rounded-full ${colorMap[status]}`} title={`Real-time: ${status}`}></span>;
};

const calculateDaysLeft = (endDateString: string, t: Function): string => {
    const end = new Date(endDateString);
    const now = new Date();
    // Compare against the very end of the sprint day
    end.setHours(23, 59, 59, 999);
    
    const diffTime = end.getTime() - now.getTime();
    
    // Check if the current time is past the end date
    if (diffTime < 0) {
        const pastDiffDays = Math.ceil(-diffTime / (1000 * 60 * 60 * 24));
        return t('sprint_ended_ago').replace('{days}', pastDiffDays.toString());
    }
    
    // It's today or in the future
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (new Date().toDateString() === end.toDateString()) {
        return t('sprint_ends_today');
    }

    return t('sprint_days_left').replace('{days}', diffDays.toString());
};


const SprintSwitcher: React.FC<{
    sprints: Sprint[];
    selected: Sprint;
    onSelect: (id: string) => void;
    locale: string;
    t: Function;
}> = ({ sprints, selected, onSelect, locale, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const daysLeftText = calculateDaysLeft(selected.endAt, t);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    const localeCode = locale.startsWith('fa') ? 'fa-IR' : 'en-US';
    const startDate = new Date(selected.startAt).toLocaleDateString(localeCode, { month: 'short', day: 'numeric' });
    const endDate = new Date(selected.endAt).toLocaleDateString(localeCode, { month: 'short', day: 'numeric' });
    const sprintDateRange = `${startDate} – ${endDate}`;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm text-gray-700 font-semibold ml-4 border-l pl-4"
            >
                <span>{selected.name}</span>
                <span className="font-normal text-gray-500">•</span>
                <span className="font-normal text-gray-500">{sprintDateRange}</span>
                 <span className="font-normal text-gray-500">•</span>
                 <span className="font-semibold text-[#486966]">{daysLeftText}</span>
                 {sprints.length > 1 && (
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                 )}
            </button>
            {isOpen && sprints.length > 1 && (
                <div className="absolute top-full mt-2 w-64 bg-white rounded-md shadow-lg border z-10">
                    <ul className="py-1">
                        {sprints.map(sprint => (
                            <li key={sprint.id}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onSelect(sprint.id); setIsOpen(false); }}
                                    className={`block px-4 py-2 text-sm ${selected.id === sprint.id ? 'font-bold text-[#486966]' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {sprint.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


export const Topbar: React.FC<TopbarProps> = ({ notifications, onMarkAllNotificationsRead, onShowNotification, onOpenSettings, onLogout, realtimeStatus, onNewItem, availableSprints, selectedSprint, onSelectSprint }) => {
    const { user } = useAuth();
    const { t, locale, setLocale } = useLocale();
    const { can } = useBoard();
    const { currentView } = useNavigation();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setIsSwitcherOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    const closeNotifications = () => setIsNotificationsOpen(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                closeNotifications();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageToggle = () => {
        setLocale(locale === 'en-US' ? 'fa-IR' : 'en-US');
    };

    const renderSprintHeader = () => {
        if (!selectedSprint || currentView !== 'KANBAN') return null;
        return (
            <SprintSwitcher 
                sprints={availableSprints}
                selected={selectedSprint}
                onSelect={onSelectSprint}
                locale={locale}
                t={t}
            />
        );
    };

    return (
        <>
        <header className="relative z-30 flex-shrink-0 bg-white/70 backdrop-blur-sm h-16 flex items-center justify-between px-4 border-b border-gray-200/80">
            <div className="flex items-center">
                <Breadcrumbs />
                {renderSprintHeader()}
            </div>
            <div className="flex items-center gap-4">
                {currentView !== 'EPICS' && can('item.create') && (
                     <button 
                        onClick={onNewItem} 
                        className="py-2 px-4 text-sm font-medium rounded-md text-white bg-[#486966] hover:bg-[#3a5a58]"
                    >
                        {t('newItem')}
                    </button>
                )}
                <button
                    onClick={handleLanguageToggle}
                    className="text-sm font-medium text-gray-700 hover:text-black px-3 py-1.5 rounded-md hover:bg-gray-200/80"
                >
                    {locale === 'en-US' ? 'فارسی' : 'English'}
                </button>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-2 text-sm text-[#3B3936]">
                    <ConnectionIndicator status={realtimeStatus} />
                    <span>{user?.name}</span>
                </div>

                <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 rounded-full hover:bg-gray-200/80 relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {unreadCount > 0 && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationPanel notifications={notifications} onClose={closeNotifications} onMarkAllAsRead={onMarkAllNotificationsRead} onShow={onShowNotification} />
                    )}
                </div>
                <button onClick={onOpenSettings} className="text-sm text-gray-700 hover:text-black">{t('settings')}</button>
                <button onClick={onLogout} className="text-sm text-gray-700 hover:text-black">{t('logout')}</button>
            </div>
            <QuickSwitcher isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
        </header>
        {isNotificationsOpen && (
             <div className="fixed top-16 left-0 right-0 bottom-0 bg-black bg-opacity-20 z-20" onClick={closeNotifications} />
        )}
        </>
    );
};