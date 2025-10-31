// components/AppShell.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FilterBar } from './FilterBar';
import { KanbanBoard } from './KanbanBoard';
import { EpicsView } from './EpicsView';
import { MembersView } from './MembersView';
import { EventsView } from './EventsView';
import { SprintsView } from './SprintsView';
import { ReportsDashboard } from './ReportsDashboard';
import { SettingsPlaceholder } from './SettingsPlaceholder';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { WorkItem, Notification, Epic, FilterSet, SavedView, ViewVisibility, Team, Sprint, SprintState, Status, EpicStatus } from '../types';
import { SaveViewModal } from './SaveViewModal';
import { ManageViewsModal } from './ManageViewsModal';
import { faker } from 'https://cdn.skypack.dev/@faker-js/faker';
import { ALL_USERS } from '../constants';

interface AppShellProps {
    workItems: WorkItem[];
    setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
    epics: Epic[];
    teams: Team[];
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
    sprints: Sprint[];
    onSaveSprint: (sprint: Partial<Sprint>) => void;
    onSelectWorkItem: (workItem: WorkItem) => void;
    notifications: Notification[];
    onMarkAllNotificationsRead: () => void;
    onShowNotification: (notification: Notification) => void;
    onOpenSettings: () => void;
    onNewItem: (options?: { epicId?: string }) => void;
    onNewEpic: () => void;
    onEditEpic: (epic: Epic) => void;
    onUpdateEpicStatus: (epicId: string, newStatus: EpicStatus) => void;
    onEditWorkItem: (workItem: WorkItem) => void;
    realtimeStatus: any; // ConnectionStatus
}

// Mock saved views
const createMockSavedView = (id: number, ownerId: string): SavedView => ({
    id: `view-${id}`,
    name: faker.commerce.productAdjective() + ' View',
    ownerId: ownerId,
    visibility: faker.helpers.arrayElement([ViewVisibility.PRIVATE, ViewVisibility.GROUP]),
    filterSet: { searchQuery: '', assignee: 'ALL', type: 'ALL', team: 'ALL' },
    isDefault: false,
    isPinned: faker.datatype.boolean(0.4),
});

export const AppShell: React.FC<AppShellProps> = (props) => {
    const { user } = useAuth();
    const { currentView } = useNavigation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // View Management State
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
    const [isManageViewsModalOpen, setIsManageViewsModalOpen] = useState(false);

    // Filter and Grouping State
    const [filterSet, setFilterSet] = useState<FilterSet>({ searchQuery: '', assignee: 'ALL', type: 'ALL', team: 'ALL' });
    const [groupBy, setGroupBy] = useState<'status' | 'epic'>('epic');
    const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
    const [includeUnassignedEpicItems, setIncludeUnassignedEpicItems] = useState(false);

     useEffect(() => {
        if (user) {
            const userViews = Array.from({ length: 3 }, (_, i) => createMockSavedView(i + 1, user.id));
            const groupViews = Array.from({ length: 2 }, (_, i) => createMockSavedView(i + 4, 'user-2'));
            const initialViews = [...userViews, ...groupViews];
            initialViews[0].isDefault = true;
            setSavedViews(initialViews);
        }
    }, [user]);

    const activeSprint = useMemo(() => props.sprints.find(s => s.state === SprintState.ACTIVE), [props.sprints]);

    const enrichedEpics = useMemo(() => {
        return props.epics.map(epic => {
            const childItems = props.workItems.filter(item => item.epicId === epic.id);
            const openItems = childItems.filter(item => item.status !== Status.DONE);
            const totalEstimation = childItems.reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
            const doneEstimation = childItems.filter(i => i.status === Status.DONE).reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
            const percentDoneWeighted = totalEstimation > 0 ? (doneEstimation / totalEstimation) * 100 : (childItems.length > 0 && openItems.length === 0) ? 100 : 0;
            
            return { 
                ...epic, 
                openItemsCount: openItems.length, 
                totalEstimation,
                percentDoneWeighted
            };
        });
    }, [props.epics, props.workItems]);

    const sprintAndEpicFilteredItems = useMemo(() => {
        if (currentView !== 'KANBAN' || !activeSprint) {
            return props.workItems;
        }

        const sprintEpicIds = new Set(activeSprint.epicIds);
        
        return props.workItems.filter(item => {
            if (item.sprint !== activeSprint.name) return false;

            const hasAssignedEpic = item.epicId && sprintEpicIds.has(item.epicId);
            const isUnassignedAndIncluded = includeUnassignedEpicItems && !item.epicId;

            return hasAssignedEpic || isUnassignedAndIncluded;
        });
    }, [props.workItems, activeSprint, currentView, includeUnassignedEpicItems]);

    const filteredWorkItems = useMemo(() => {
        return sprintAndEpicFilteredItems.filter(item => {
            const searchMatch = !filterSet.searchQuery ||
                item.title.toLowerCase().includes(filterSet.searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(filterSet.searchQuery.toLowerCase());
            const assigneeMatch = filterSet.assignee === 'ALL' || item.assignee.name === filterSet.assignee;
            const typeMatch = filterSet.type === 'ALL' || item.type === filterSet.type;
            const teamMatch = filterSet.team === 'ALL' || item.teamId === filterSet.team;
            return searchMatch && assigneeMatch && typeMatch && teamMatch;
        });
    }, [sprintAndEpicFilteredItems, filterSet]);
    
    const handleFilterChange = (newFilters: FilterSet) => {
        setFilterSet(newFilters);
    };

    const handleResetFilters = () => {
        setFilterSet({ searchQuery: '', assignee: 'ALL', type: 'ALL', team: 'ALL' });
        setIncludeUnassignedEpicItems(false);
    };

    const handleToggleEpic = useCallback((epicId: string) => {
        setCollapsedEpics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(epicId)) {
                newSet.delete(epicId);
            } else {
                newSet.add(epicId);
            }
            return newSet;
        });
    }, []);
    
    const handleSaveView = (name: string, visibility: ViewVisibility) => {
        if (!user) return;
        const newView: SavedView = {
            id: `view-${Date.now()}`,
            name,
            visibility,
            ownerId: user.id,
            filterSet: { ...filterSet },
            isDefault: false,
            isPinned: false,
        };
        setSavedViews(prev => [...prev, newView]);
        setIsSaveViewModalOpen(false);
    };

    const handleDeleteView = (viewId: string) => {
        setSavedViews(prev => prev.filter(v => v.id !== viewId));
    };

    const handlePinView = (viewId: string) => {
        setSavedViews(prev => prev.map(v => v.id === viewId ? { ...v, isPinned: !v.isPinned } : v));
    };
    
    const handleSetDefaultView = (viewId: string) => {
        setSavedViews(prev => prev.map(v => ({ ...v, isDefault: v.id === viewId })));
    };

    const handleRenameView = (viewId: string, newName: string) => {
        setSavedViews(prev => prev.map(v => v.id === viewId ? { ...v, name: newName } : v));
    };

    const handleDuplicateView = (viewToDuplicate: SavedView) => {
        if (!user) return;
        const newView: SavedView = {
            ...viewToDuplicate,
            id: `view-${Date.now()}`,
            name: `${viewToDuplicate.name} (Copy)`,
            ownerId: user.id,
            isDefault: false,
            isPinned: false,
        };
        setSavedViews(prev => [...prev, newView]);
    };

    const handleSelectView = (view: SavedView) => {
        setFilterSet(view.filterSet);
    };


    const pinnedViews = useMemo(() => savedViews.filter(v => v.isPinned && v.ownerId === user?.id), [savedViews, user]);

    const renderContent = () => {
        switch (currentView) {
            case 'KANBAN':
                return (
                    <KanbanBoard
                        workItems={filteredWorkItems}
                        setWorkItems={props.setWorkItems}
                        onSelectWorkItem={props.onSelectWorkItem}
                        groupBy={groupBy}
                        epics={enrichedEpics}
                        collapsedEpics={collapsedEpics}
                        onToggleEpic={handleToggleEpic}
                        activeSprint={activeSprint}
                    />
                );
            case 'SPRINTS':
                return (
                    <SprintsView 
                        sprints={props.sprints}
                        onSaveSprint={props.onSaveSprint}
                        epics={enrichedEpics}
                    />
                );
            case 'EPICS':
                 return (
                    <EpicsView
                        epics={enrichedEpics}
                        workItems={props.workItems}
                        onNewEpic={props.onNewEpic}
                        onEditEpic={props.onEditEpic}
                        onNewItem={props.onNewItem}
                        onEditWorkItem={props.onEditWorkItem}
                        onUpdateStatus={props.onUpdateEpicStatus}
                    />
                 );
            case 'EVENTS':
                return <EventsView workItems={props.workItems} teams={props.teams} />;
            case 'REPORTS':
                return (
                    <ReportsDashboard 
                        workItems={props.workItems}
                        epics={props.epics}
                        teams={props.teams}
                        users={ALL_USERS}
                    />
                );
            case 'MEMBERS':
                return <MembersView teams={props.teams} setTeams={props.setTeams} />;
            case 'SETTINGS':
                 return <SettingsPlaceholder />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen w-screen bg-[#F0F4F4]">
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                pinnedViews={pinnedViews}
                onSelectView={handleSelectView}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar
                    notifications={props.notifications}
                    onMarkAllNotificationsRead={props.onMarkAllNotificationsRead}
                    onShowNotification={props.onShowNotification}
                    onOpenSettings={props.onOpenSettings}
                    onLogout={() => { /* Implement logout logic */ }}
                    realtimeStatus={props.realtimeStatus}
                    onNewItem={() => props.onNewItem()}
                    activeSprint={activeSprint}
                />
                
                {currentView === 'KANBAN' && (
                    <FilterBar
                        filterSet={filterSet}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                        onOpenSaveViewModal={() => setIsSaveViewModalOpen(true)}
                        onOpenManageViewsModal={() => setIsManageViewsModalOpen(true)}
                        teams={props.teams}
                        groupBy={groupBy}
                        onGroupByChange={setGroupBy}
                        activeSprint={activeSprint}
                        includeUnassignedEpicItems={includeUnassignedEpicItems}
                        onIncludeUnassignedEpicItemsChange={setIncludeUnassignedEpicItems}
                    />
                )}

                <main className="flex-1 p-4 overflow-auto">
                    {renderContent()}
                </main>
            </div>
            
            <SaveViewModal
                isOpen={isSaveViewModalOpen}
                onClose={() => setIsSaveViewModalOpen(false)}
                onSave={handleSaveView}
                savedViews={savedViews}
                currentUser={user}
            />

            <ManageViewsModal
                isOpen={isManageViewsModalOpen}
                onClose={() => setIsManageViewsModalOpen(false)}
                savedViews={savedViews}
                onDelete={handleDeleteView}
                onPin={handlePinView}
                onSetDefault={handleSetDefaultView}
                onRename={handleRenameView}
                onDuplicate={handleDuplicateView}
                onSelectView={handleSelectView}
            />
        </div>
    );
};
