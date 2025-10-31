// FIX: Create the App component which was missing.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import { AppShell } from './components/AppShell';
// FIX: Import Status, Priority, and WorkItemType enums to fix type errors.
import { WorkItem, Notification, ItemUpdateEvent, Epic, Team, Status, Priority, WorkItemType, Sprint, ToastNotification, EpicStatus, SprintState } from './types';
import { getMockWorkItems, getMockNotifications, getMockEpics, getMockTeams, getMockSprints } from './services/mockDataService';
import { WorkItemDetailModal } from './components/WorkItemDetailModal';
import { WorkItemEditor } from './components/WorkItemEditor';
import { UserSettingsModal } from './components/UserSettingsModal';
import { useRealtime } from './hooks/useRealtime';
import { useSettings } from './context/SettingsContext';
import { EpicEditor } from './components/EpicEditor';
import { useIdleReminder } from './hooks/useIdleReminder';
import { useBoard } from './context/BoardContext';
import { ToastManager } from './components/ToastManager';
import { useLocale } from './context/LocaleContext';
import { ALL_USERS } from './constants';
import DevCrashInspector from './pages/DevCrashInspector';

const App: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const { settings } = useSettings();
    const { activeBoard, can } = useBoard();
    const { t, locale } = useLocale();

    // Main data state
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // UI state
    const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
    const [editingWorkItem, setEditingWorkItem] = useState<Partial<WorkItem> | null>(null);
    const [editingEpic, setEditingEpic] = useState<Partial<Epic> | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isNewItem, setIsNewItem] = useState(false);
    const [isNewEpic, setIsNewEpic] = useState(false);
    const [toastQueue, setToastQueue] = useState<ToastNotification[]>([]);
    const [highlightSection, setHighlightSection] = useState<string | undefined>(undefined);
    const coalescingRef = useRef<Map<string, { data: ToastNotification, timer: number }>>(new Map());

    // Dev route state
    const [isDevRoute, setIsDevRoute] = useState(false);

    // FIX: Move sprint selection state up from AppShell to App
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

    // Check for dev route on mount
    useEffect(() => {
        if (window.location.pathname === '/dev/crash') {
            setIsDevRoute(true);
        }
    }, []);

    // Fetch initial data
    useEffect(() => {
        if (isAuthenticated) {
            const mockEpics = getMockEpics();
            const mockTeams = getMockTeams();
            const mockWorkItems = getMockWorkItems(30);
            const mockSprints = getMockSprints();
            setEpics(mockEpics);
            setTeams(mockTeams);
            setSprints(mockSprints);
            setWorkItems(mockWorkItems);
            setNotifications(getMockNotifications(15, mockWorkItems));
        } else {
            // Clear data on logout
            setWorkItems([]);
            setEpics([]);
            setTeams([]);
            setSprints([]);
            setNotifications([]);
            setToastQueue([]);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'fa-IR' ? 'rtl' : 'ltr';
    }, [locale]);
    
    // Real-time message handler for Toasts
    const handleRealtimeMessage = useCallback((event: ItemUpdateEvent) => {
        if (!user) return;
        
        // Relevance Guard
        const isRelevant = user.id === event.item.createdBy || user.id === event.item.assigneeId || event.watchers.includes(user.id);
        if (!isRelevant) return;

        const { item, change } = event;
        const existing = coalescingRef.current.get(item.id);

        if (existing) {
            clearTimeout(existing.timer);
        }
        
        const formatChange = (): string => {
            switch (change.field) {
                case 'status': return t('toast_change_status').replace('{status}', change.to);
                case 'assignee': return t('toast_change_assignee').replace('{assignee}', change.to);
                case 'dueDate': return t('toast_change_due').replace('{date}', new Date(change.to).toLocaleDateString());
                case 'comment': return t('toast_change_comment');
                default: return t('toast_change_generic').replace('{field}', change.field);
            }
        };

        const mapFieldToSection = (field: string): string => {
            const map: { [key: string]: string } = {
                status: 'status',
                assignee: 'assignee',
                dueDate: 'dueDate',
            };
            return map[field] || 'title';
        };

        const newChangeSummary = formatChange();
        const mergedChanges = existing ? [...existing.data.changes, newChangeSummary] : [newChangeSummary];

        const toastData: ToastNotification = {
            id: `toast-${item.id}-${Date.now()}`,
            itemId: item.id,
            title: item.title,
            changes: [...new Set(mergedChanges)], // Unique changes
            highlightSection: mapFieldToSection(change.field),
        };

        const timer = window.setTimeout(() => {
            setToastQueue(prev => [toastData, ...prev]);
            coalescingRef.current.delete(item.id);
        }, 3000);

        coalescingRef.current.set(item.id, { data: toastData, timer });

    }, [user, t]);
    
    // FIX: Destructure connectionStatus from the useRealtime hook.
    const { connectionStatus } = useRealtime(settings.enableRealtime, workItems, user, handleRealtimeMessage);

    // FIX: Moved sprint-related memos and effects from AppShell to App
    const activeSprints = useMemo(() => sprints.filter(s => s.state === SprintState.ACTIVE), [sprints]);

    const availableActiveSprints = useMemo(() => {
        if (!user) return [];
        if (can('sprint.manage')) {
            return activeSprints;
        }
        const sprintsWithUserItems = new Set(
            workItems
                .filter(item => item.assignee.id === user.id && item.sprint)
                .map(item => item.sprint)
        );
        return activeSprints.filter(s => sprintsWithUserItems.has(s.name));
    }, [activeSprints, workItems, user, can]);

    useEffect(() => {
        const currentSelectionStillAvailable = availableActiveSprints.some(s => s.id === selectedSprintId);

        if (availableActiveSprints.length > 0 && !currentSelectionStillAvailable) {
            const mostRecent = [...availableActiveSprints].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];
            setSelectedSprintId(mostRecent.id);
        } else if (availableActiveSprints.length === 0) {
            setSelectedSprintId(null);
        }
    }, [availableActiveSprints, selectedSprintId]);
    
    const selectedSprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);

    // Handlers for modals and actions
    const handleSelectWorkItem = (item: WorkItem) => {
        // FIX: Explicitly clear editing state to prevent modal conflicts.
        setEditingWorkItem(null);
        setSelectedWorkItem(item);
    };

    const handleEditWorkItem = (item: WorkItem) => {
        setSelectedWorkItem(null);
        setEditingWorkItem(item);
        setIsNewItem(false);
    };
    
    const handleOpenItem = (itemId: string, highlight?: string) => {
         const item = workItems.find(w => w.id === itemId);
         if (item) {
             setEditingWorkItem(item);
             setIsNewItem(false);
             setHighlightSection(highlight);
         }
    };

    const handleOpenItemForView = (itemId: string) => {
        const item = workItems.find(w => w.id === itemId);
        if (item) {
            setEditingWorkItem(null);
            setSelectedWorkItem(item);
        }
    };

    const handleNewItem = (options?: { epicId?: string }) => {
        if (!user || !activeBoard) return;
        const linkedEpic = options?.epicId ? epics.find(e => e.id === options.epicId) : undefined;
        setEditingWorkItem({
            reporter: user,
            status: Status.TODO,
            type: WorkItemType.TASK,
            priority: Priority.MEDIUM,
            boardId: activeBoard.id,
            epicId: options?.epicId,
            epicInfo: linkedEpic ? { id: linkedEpic.id, name: linkedEpic.name, color: linkedEpic.color } : undefined,
            assignee: user,
            attachments: [],
            checklist: [],
            labels: [],
            watchers: [user.id], // Creator watches by default
            description: '', // FIX: Initialize description to prevent .replace on undefined error
            // FIX: Assign the new item to the currently selected sprint
            sprint: selectedSprint ? selectedSprint.name : '',
        });
        setIsNewItem(true);
    };

    const handleSaveWorkItem = (itemToSave: Partial<WorkItem>) => {
        const linkedTeam = itemToSave.teamId ? teams.find(t => t.id === itemToSave.teamId) : undefined;
        const itemWithTeamInfo = {
            ...itemToSave,
            teamInfo: linkedTeam ? { id: linkedTeam.id, name: linkedTeam.name } : undefined,
        };

        if (isNewItem) {
            const newWorkItem: WorkItem = {
                id: `PROJ-${Math.floor(Math.random() * 1000) + 100}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
                ...itemWithTeamInfo
            } as WorkItem;
            setWorkItems(prev => [newWorkItem, ...prev]);
        } else {
            setWorkItems(prev => prev.map(item => item.id === itemWithTeamInfo.id ? { ...item, ...itemWithTeamInfo, updatedAt: new Date().toISOString() } as WorkItem : item));
        }
        setEditingWorkItem(null);
        setIsNewItem(false);
    };
    
    const handleNewEpic = () => {
        if (!activeBoard) return;
        setEditingEpic({ boardId: activeBoard.id, impact: 5, confidence: 5, ease: 5, attachments: [], status: EpicStatus.ACTIVE });
        setIsNewEpic(true);
    };
    
    const handleEditEpic = (epic: Epic) => {
        setEditingEpic(epic);
        setIsNewEpic(false);
    };

    const handleSaveEpic = (epicToSave: Partial<Epic>) => {
        const score = ((epicToSave.impact || 0) + (epicToSave.confidence || 0) + (epicToSave.ease || 0)) / 3;
        const epicWithScore = { ...epicToSave, iceScore: parseFloat(score.toFixed(2)) };

         if (isNewEpic) {
            const newEpic: Epic = {
                id: `epic-${Math.floor(Math.random() * 100) + 10}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attachments: [],
                status: EpicStatus.ACTIVE,
                ...epicWithScore
            } as Epic;
            setEpics(prev => [newEpic, ...prev]);
        } else {
            setEpics(prev => prev.map(item => item.id === epicWithScore.id ? { ...item, ...epicWithScore, updatedAt: new Date().toISOString() } as Epic : item));
        }
        setEditingEpic(null);
        setIsNewEpic(false);
    };
    
    const handleUpdateEpicStatus = (epicId: string, newStatus: EpicStatus) => {
        setEpics(prev => prev.map(epic => {
            if (epic.id === epicId) {
                const updatedEpic = { ...epic, status: newStatus, updatedAt: new Date().toISOString() };
                if (newStatus === EpicStatus.ARCHIVED) {
                    updatedEpic.archivedAt = new Date().toISOString();
                }
                return updatedEpic;
            }
            return epic;
        }));
    };

    // FIX-07: Handle saving sprints and automatically assigning work items.
    const handleSaveSprint = (sprintToSave: Partial<Sprint>) => {
        const sprintName = sprintToSave.name || (sprintToSave.id ? sprints.find(s => s.id === sprintToSave.id)?.name : '');
        if (!sprintName) {
            console.error("Sprint save failed: sprint name is missing.");
            return;
        }

        // 1. Find newly added epics
        let newlyAddedEpicIds: string[] = [];
        const originalSprint = sprintToSave.id ? sprints.find(s => s.id === sprintToSave.id) : null;

        if (originalSprint) { // Existing sprint
            const originalEpicIds = new Set(originalSprint.epicIds);
            newlyAddedEpicIds = (sprintToSave.epicIds || []).filter(id => !originalEpicIds.has(id));
        } else { // New sprint
            newlyAddedEpicIds = sprintToSave.epicIds || [];
        }

        // 2. Business Rule: If an epic is assigned to a sprint, automatically assign its items.
        if (newlyAddedEpicIds.length > 0) {
            setWorkItems(prevWorkItems =>
                prevWorkItems.map(item =>
                    item.epicId && newlyAddedEpicIds.includes(item.epicId)
                        ? { ...item, sprint: sprintName }
                        : item
                )
            );
        }
        
        // 3. Update sprints state
        if (sprintToSave.id) { // Update existing
            setSprints(prev => prev.map(s => s.id === sprintToSave.id ? { ...s, ...sprintToSave } as Sprint : s));
        } else { // Create new
            const newSprint: Sprint = {
                id: `sprint-${Date.now()}`,
                boardId: activeBoard!.id,
                number: sprints.reduce((max, s) => Math.max(s.number, max), 0) + 1,
                ...sprintToSave
            } as Sprint;
            setSprints(prev => [newSprint, ...prev]);
        }
    };


    const handleMarkAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleShowNotification = (notification: Notification) => {
        const { target } = notification;
        if (!target) return;

        setSelectedWorkItem(null);
        setEditingWorkItem(null);
        setEditingEpic(null);
        setHighlightSection(undefined);

        if (target.entity === 'work_item') {
            handleOpenItem(target.id, target.section);
        } else if (target.entity === 'epic') {
             const epic = epics.find(e => e.id === target.id);
             if (epic) {
                 setEditingEpic(epic);
                 setIsNewEpic(false);
                 setHighlightSection(target.section);
             }
        }
    };
    
    const { isIdle, handleContinue, handleSave, handleIgnore } = useIdleReminder(
        !!editingWorkItem,
        () => {
            if (editingWorkItem) handleSaveWorkItem(editingWorkItem);
        },
        settings.enableFinishDraftReminder,
    );
    
    const handleDismissToast = (toastId: string) => {
        setToastQueue(prev => prev.filter(t => t.id !== toastId));
    };

    if (isDevRoute) {
        return <DevCrashInspector />;
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }
    
    if (!activeBoard) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Loading board...</p>
            </div>
        );
    }

    return (
        <div className={`h-screen w-screen bg-[#F0F4F4] text-[#3B3936] flex flex-col overflow-hidden ${locale === 'fa-IR' ? 'font-vazir' : 'font-sans'}`}>
            <AppShell
                workItems={workItems}
                setWorkItems={setWorkItems}
                epics={epics}
                teams={teams}
                setTeams={setTeams}
                sprints={sprints}
                onSaveSprint={handleSaveSprint}
                onSelectWorkItem={handleSelectWorkItem}
                notifications={notifications}
                onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                onShowNotification={handleShowNotification}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onNewItem={handleNewItem}
                onNewEpic={handleNewEpic}
                onEditEpic={handleEditEpic}
                onUpdateEpicStatus={handleUpdateEpicStatus}
                onEditWorkItem={handleEditWorkItem}
                realtimeStatus={connectionStatus}
                selectedSprint={selectedSprint}
                setSelectedSprintId={setSelectedSprintId}
                availableActiveSprints={availableActiveSprints}
            />
            
            {selectedWorkItem && (
                <WorkItemDetailModal
                    workItem={selectedWorkItem}
                    onClose={() => setSelectedWorkItem(null)}
                    onEdit={handleEditWorkItem}
                />
            )}
            
            {editingWorkItem && (
                <WorkItemEditor
                    workItem={editingWorkItem}
                    epics={epics}
                    teams={teams}
                    onSave={handleSaveWorkItem}
                    onCancel={() => setEditingWorkItem(null)}
                    isNew={isNewItem}
                    highlightSection={highlightSection}
                />
            )}
            
            {editingEpic && (
                <EpicEditor
                    epic={editingEpic}
                    onSave={handleSaveEpic}
                    onCancel={() => setEditingEpic(null)}
                    isNew={isNewEpic}
                    highlightSection={highlightSection}
                />
            )}

            {isSettingsModalOpen && (
                <UserSettingsModal onClose={() => setIsSettingsModalOpen(false)} />
            )}
            
            <ToastManager
                toasts={toastQueue}
                onDismiss={handleDismissToast}
                onOpen={handleOpenItemForView}
            />
            
             {isIdle && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 py-2 px-4 rounded-md shadow-lg text-sm z-[100] flex items-center gap-4">
                    <p>You've been idle for a while. Want to save your draft?</p>
                    <button onClick={handleSave} className="font-bold underline">Save now</button>
                    <button onClick={handleContinue} className="font-bold underline">Continue editing</button>
                    <button onClick={handleIgnore} className="text-xs underline">Ignore</button>
                </div>
            )}
        </div>
    );
};

export default App;
