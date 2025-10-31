// FIX: Create the App component which was missing.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import { AppShell } from './components/AppShell';
// FIX: Import Status, Priority, and WorkItemType enums to fix type errors.
import { WorkItem, Notification, ItemUpdateEvent, Epic, Team, Status, Priority, WorkItemType, Sprint, ToastNotification, EpicStatus, SprintState, Board, JoinRequest, InviteCode } from './types';
import { getMockWorkItems, getMockNotifications, getMockEpics, getMockTeams, getMockSprints, getMockJoinRequests, getMockInviteCodes } from './services/mockDataService';
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
import OnboardingScreen from './components/OnboardingScreen';
import CreateBoardModal from './components/CreateBoardModal';
import JoinBoardModal from './components/JoinBoardModal';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import { DeleteEpicModal } from './components/DeleteEpicModal';
import { DeleteSprintModal } from './components/DeleteSprintModal';
import LandingPage from './components/LandingPage';
import { useSessionIdleTimer } from './hooks/useSessionIdleTimer';
import { ReAuthModal } from './components/ReAuthModal';
import LegalPage from './components/LegalPage';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const App: React.FC = () => {
    const { isAuthenticated, user, logout, lastAuthTime, updateLastAuthTime } = useAuth();
    const { settings } = useSettings();
    const { activeBoard, boards, setActiveBoard, can, createBoard, activeBoardMembers } = useBoard();
    const { t, locale } = useLocale();
    
    // App Flow State
    const [viewState, setViewState] = useState<'LANDING' | 'APP'>('LANDING');
    const prevIsAuthenticated = useRef(isAuthenticated);

    // ONB-01: Onboarding state management
    type OnboardingStatus = 'UNKNOWN' | 'NEEDS_ONBOARDING' | 'PENDING_APPROVAL' | 'COMPLETED';
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('UNKNOWN');
    const [onboardingModal, setOnboardingModal] = useState<'CREATE_BOARD' | 'JOIN_BOARD' | null>(null);

    // Main data state
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
    
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

    // Re-authentication state
    const [isReAuthModalOpen, setIsReAuthModalOpen] = useState(false);
    const [actionToReAuth, setActionToReAuth] = useState<(() => void) | null>(null);

    // US-42: State for read-only view mode
    const [isReadOnlyView, setIsReadOnlyView] = useState(false);

    // EP-DEL-001: State for delete modals
    const [deletingEpic, setDeletingEpic] = useState<Epic | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);


    // Dev route state
    const [isDevRoute, setIsDevRoute] = useState(false);
    const [isLegalPage, setIsLegalPage] = useState(false);

    // FIX: Move sprint selection state up from AppShell to App
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

     // Idle Timer Integration
    useSessionIdleTimer(
        isAuthenticated,
        () => { // onIdleWarning
            setToastQueue(prev => [{
                id: `toast-idle-warning-${Date.now()}`,
                itemId: '',
                title: 'Session Expiring Soon',
                changes: ['You will be logged out in 1 hour due to inactivity.'],
            }, ...prev]);
        },
        () => { // onIdleLogout
            logout();
        }
    );

    // US-44: Redirect to landing page on logout
    useEffect(() => {
        // Only trigger the redirect to landing if the user was previously authenticated and now is not (i.e., they logged out).
        // This prevents an infinite loop when an unauthenticated user tries to navigate from the landing page to the app.
        if (prevIsAuthenticated.current && !isAuthenticated && viewState === 'APP') {
            setViewState('LANDING');
        }

        // Update the ref to the current authentication state for the next render.
        prevIsAuthenticated.current = isAuthenticated;
    }, [isAuthenticated, viewState]);

    // US-44: Listen for logout events from other tabs
    useEffect(() => {
        const channel = new BroadcastChannel('auth');
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'LOGOUT') {
                logout();
            }
        };
        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [logout]);


    // Check for dev route on mount
    useEffect(() => {
        if (window.location.pathname === '/dev/crash') {
            setIsDevRoute(true);
        }
        if (window.location.pathname === '/legal') {
            setIsLegalPage(true);
        }
    }, []);
    
    // ONB-01: Determine user status after login
    useEffect(() => {
        if (isAuthenticated) {
            if (boards.length === 0) {
                setOnboardingStatus('NEEDS_ONBOARDING');
            } else {
                if (!activeBoard) {
                    setActiveBoard(boards[0].id);
                }
                setOnboardingStatus('COMPLETED');
            }
        } else {
            setOnboardingStatus('UNKNOWN');
        }
    }, [isAuthenticated, boards, activeBoard, setActiveBoard]);

    // Fetch initial data
    useEffect(() => {
        if (isAuthenticated && onboardingStatus === 'COMPLETED') {
            // US-43: Disable fake data generators. Initialize with empty state.
            // A real app would fetch data from an API here.
            setEpics([]);
            setTeams([]);
            setSprints([]);
            setWorkItems([]);
            setNotifications([]);
            setJoinRequests([]);
            setInviteCodes([]);

            if (!activeBoard && boards.length > 0) {
                setActiveBoard(boards[0].id);
            }

        } else if (!isAuthenticated) {
            // Clear data on logout
            setWorkItems([]);
            setEpics([]);
            setTeams([]);
            setSprints([]);
            setNotifications([]);
            setToastQueue([]);
            setJoinRequests([]);
            setInviteCodes([]);
            setOnboardingStatus('UNKNOWN');
        }
    }, [isAuthenticated, onboardingStatus, activeBoard, setActiveBoard, boards.length]);

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
    // BUG-FIX: Disabled mock real-time generator to prevent fake notifications.
    const { connectionStatus } = useRealtime(false, workItems, user, handleRealtimeMessage);

    // Automatically update sprint states based on dates
    useEffect(() => {
        const updateSprintStates = () => {
            setSprints(prevSprints => {
                const now = new Date();
                let hasChanged = false;

                const updatedSprints = prevSprints.map(sprint => {
                    if (sprint.state === SprintState.DELETED || sprint.state === SprintState.CLOSED) {
                        return sprint;
                    }

                    const start = new Date(sprint.startAt);
                    const end = new Date(sprint.endAt);
                    end.setHours(23, 59, 59, 999); 

                    let newState = sprint.state;
                    if (sprint.state === SprintState.PLANNED && start <= now && end >= now) {
                        newState = SprintState.ACTIVE;
                    } else if (sprint.state === SprintState.ACTIVE && end < now) {
                        newState = SprintState.CLOSED;
                    }
                    
                    if (newState !== sprint.state) {
                        hasChanged = true;
                        return { ...sprint, state: newState };
                    }
                    return sprint;
                });

                return hasChanged ? updatedSprints : prevSprints;
            });
        };

        updateSprintStates();
        const intervalId = setInterval(updateSprintStates, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, []);


    // FIX: Moved sprint-related memos and effects from AppShell to App
    const activeSprints = useMemo(() => sprints.filter(s => s.state === SprintState.ACTIVE && s.state !== SprintState.DELETED), [sprints]);

    const availableActiveSprints = useMemo(() => {
        if (!user) return [];
        if (can('sprint.manage')) {
            return activeSprints;
        }
        const sprintsWithUserItems = new Set(
            workItems
                .filter(item => item.sprintId && item.assignees?.some(a => a.id === user.id))
                .map(item => item.sprintId)
        );
        return activeSprints.filter(s => sprintsWithUserItems.has(s.id));
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
    const activeEpics = useMemo(() => epics.filter(e => (e.status === EpicStatus.ACTIVE || e.status === EpicStatus.ON_HOLD) && e.status !== EpicStatus.DELETED), [epics]);
    const boardUsers = useMemo(() => activeBoardMembers.map(m => m.user), [activeBoardMembers]);

    // US-42: Clear highlight states when modals are closed
    useEffect(() => {
        if (!selectedWorkItem && !editingEpic && !editingWorkItem) {
            setHighlightSection(undefined);
            setIsReadOnlyView(false);
        }
    }, [selectedWorkItem, editingEpic, editingWorkItem]);

    const confirmAndExecute = (action: () => void) => {
        if (!lastAuthTime || (new Date().getTime() - lastAuthTime > TWELVE_HOURS)) {
            setActionToReAuth(() => action);
            setIsReAuthModalOpen(true);
        } else {
            action();
        }
    };

    const handleReAuthSuccess = () => {
        updateLastAuthTime();
        if (actionToReAuth) {
            actionToReAuth();
        }
        setIsReAuthModalOpen(false);
        setActionToReAuth(null);
    };

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

    // US-42: Refactored to open VIEW modal instead of edit.
    const handleOpenItemForView = (itemId: string, highlight?: string) => {
        const item = workItems.find(w => w.id === itemId);
        if (item) {
            setEditingWorkItem(null); // Close editor if open
            setEditingEpic(null);
            setHighlightSection(highlight);
            setSelectedWorkItem(item); // Open viewer
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
            assignees: [user],
            attachments: [],
            checklist: [],
            labels: [],
            watchers: [user.id], // Creator watches by default
            description: '', // FIX: Initialize description to prevent .replace on undefined error
            // FIX: Assign the new item to the currently selected sprint
            sprint: selectedSprint ? selectedSprint.name : '',
            sprintId: selectedSprint ? selectedSprint.id : undefined,
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

    const handleItemUpdate = (updatedItem: WorkItem) => {
        const updatedItemWithTimestamp = { ...updatedItem, updatedAt: new Date().toISOString() };
        setWorkItems(prev => prev.map(item => item.id === updatedItemWithTimestamp.id ? updatedItemWithTimestamp : item));
        if (selectedWorkItem && selectedWorkItem.id === updatedItem.id) {
            setSelectedWorkItem(updatedItemWithTimestamp);
        }
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
                if (newStatus === EpicStatus.DELETED) { // EP-DEL-001
                    updatedEpic.deletedAt = new Date().toISOString();
                }
                return updatedEpic;
            }
            return epic;
        }));
    };

    // EP-DEL-001: Delete/Restore Handlers
    const handleConfirmDeleteEpic = (epicId: string, itemAction: 'detach') => {
        confirmAndExecute(() => {
            console.log(`TELEMETRY: epic.deleted`, { epicId, itemAction }); // Simulate telemetry
            // 1. Update related work items
            if (itemAction === 'detach') {
                setWorkItems(prev => prev.map(item => item.epicId === epicId ? { ...item, epicId: undefined, epicInfo: undefined } : item));
            }
            // 2. Soft delete the epic
            handleUpdateEpicStatus(epicId, EpicStatus.DELETED);
            // 3. Close the modal
            setDeletingEpic(null);
            // 4. Show Undo toast
            setToastQueue(prev => [{
                id: `undo-epic-${epicId}-${Date.now()}`,
                itemId: epicId,
                title: `Epic "${epics.find(e => e.id === epicId)?.name}" deleted.`,
                changes: [],
                undoAction: () => handleRestoreEpic(epicId),
            }, ...prev]);
        });
    };

    const handleRestoreEpic = (epicId: string) => {
        console.log(`TELEMETRY: epic.restored`, { epicId }); // Simulate telemetry
        // Note: Restoring items is complex. This simple restore just brings back the epic.
        handleUpdateEpicStatus(epicId, EpicStatus.ACTIVE);
    };
    
    const handleConfirmDeleteSprint = (sprintId: string, itemAction: 'unassign' | 'move', targetSprintId?: string) => {
        confirmAndExecute(() => {
            console.log(`TELEMETRY: sprint.deleted`, { sprintId, itemAction, targetSprintId }); // Simulate telemetry
            // 1. Update related work items
            if (itemAction === 'unassign') {
                setWorkItems(prev => prev.map(item => item.sprintId === sprintId ? { ...item, sprintId: undefined, sprint: '' } : item));
            } else if (itemAction === 'move' && targetSprintId) {
                const targetSprint = sprints.find(s => s.id === targetSprintId);
                if (targetSprint) {
                    setWorkItems(prev => prev.map(item => item.sprintId === sprintId ? { ...item, sprintId: targetSprint.id, sprint: targetSprint.name } : item));
                }
            }
            // 2. Soft delete the sprint
            setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, state: SprintState.DELETED, deletedAt: new Date().toISOString() } : s));
            // 3. Close modal
            setDeletingSprint(null);
            // 4. Show Undo toast
             setToastQueue(prev => [{
                id: `undo-sprint-${sprintId}-${Date.now()}`,
                itemId: sprintId,
                title: `Sprint "${sprints.find(s => s.id === sprintId)?.name}" deleted.`,
                changes: [],
                undoAction: () => handleRestoreSprint(sprintId),
            }, ...prev]);
        });
    };

    const handleRestoreSprint = (sprintId: string) => {
        console.log(`TELEMETRY: sprint.restored`, { sprintId }); // Simulate telemetry
        setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, state: SprintState.PLANNED } : s));
    };


    // FIX-07: Handle saving sprints and automatically assigning work items.
    const handleSaveSprint = (sprintToSave: Partial<Sprint>) => {
        const isNew = !sprintToSave.id;
        const sprintId = isNew ? `sprint-${Date.now()}` : sprintToSave.id!;
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
                        ? { ...item, sprint: sprintName, sprintId: sprintId }
                        : item
                )
            );
        }
        
        // 3. Update sprints state
        if (sprintToSave.id) { // Update existing
            setSprints(prev => prev.map(s => s.id === sprintToSave.id ? { ...s, ...sprintToSave } as Sprint : s));
        } else { // Create new
            const newSprint: Sprint = {
                id: sprintId,
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

    // US-42: Refactored notification handler to open VIEW modals instead of EDIT modals.
    const handleShowNotification = (notification: Notification) => {
        const { target } = notification;
        if (!target) return;

        // Close any open modals
        setSelectedWorkItem(null);
        setEditingWorkItem(null);
        setEditingEpic(null);
        setIsReadOnlyView(false);

        // Set highlight for the modal that is about to open
        setHighlightSection(target.section); 

        if (target.entity === 'work_item') {
            const item = workItems.find(w => w.id === target.id);
            if (item) {
                setSelectedWorkItem(item); // This opens WorkItemDetailModal (the VIEW modal)
            } else {
                setToastQueue(prev => [{ id: `toast-notfound-${Date.now()}`, itemId: '', title: 'Item not found', changes: [`The requested item ${target.id} could not be found.`], highlightSection: undefined }, ...prev]);
            }
        } else if (target.entity === 'epic') {
             const epic = epics.find(e => e.id === target.id);
             if (epic) {
                 setIsReadOnlyView(true); // Trigger read-only mode
                 setEditingEpic(epic); // This opens EpicEditor in view mode
                 setIsNewEpic(false); 
             } else {
                setToastQueue(prev => [{ id: `toast-notfound-${Date.now()}`, itemId: '', title: 'Epic not found', changes: [`The requested epic ${target.id} could not be found.`], highlightSection: undefined }, ...prev]);
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

    // ONB-02: Onboarding action handlers
    const handleCreateBoard = (boardName: string) => {
        const newBoard = createBoard(boardName);
        setActiveBoard(newBoard.id);
        setOnboardingStatus('COMPLETED');
        setOnboardingModal(null);
    };

    const handleJoinRequest = () => {
        setOnboardingStatus('PENDING_APPROVAL');
        setOnboardingModal(null);
    };
    
    // --- Render Logic ---

    if (isLegalPage) {
        return <LegalPage />;
    }

    if (viewState === 'LANDING') {
        return <LandingPage onStart={() => setViewState('APP')} />;
    }

    if (isDevRoute) {
        return <DevCrashInspector />;
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }
    
    if (onboardingStatus === 'NEEDS_ONBOARDING') {
        return (
            <>
                <OnboardingScreen onShowCreate={() => setOnboardingModal('CREATE_BOARD')} onShowJoin={() => setOnboardingModal('JOIN_BOARD')} />
                {onboardingModal === 'CREATE_BOARD' && <CreateBoardModal onClose={() => setOnboardingModal(null)} onCreate={handleCreateBoard} />}
                {onboardingModal === 'JOIN_BOARD' && <JoinBoardModal onClose={() => setOnboardingModal(null)} onJoinRequest={handleJoinRequest} />}
            </>
        );
    }
    
    if (onboardingStatus === 'PENDING_APPROVAL') {
        return <PendingApprovalScreen />;
    }

    if (onboardingStatus === 'COMPLETED' && !activeBoard) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Loading board...</p>
            </div>
        );
    }

    if (!activeBoard) {
        // This case should ideally not be hit if logic is correct, but it's a safe fallback.
         return <div className="flex items-center justify-center h-screen"><p>No active board. Please select a board.</p></div>
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
                onDeleteEpic={(epic) => setDeletingEpic(epic)}
                onRestoreEpic={handleRestoreEpic}
                onDeleteSprint={(sprint) => setDeletingSprint(sprint)}
                onRestoreSprint={handleRestoreSprint}
                onEditWorkItem={handleEditWorkItem}
                realtimeStatus={connectionStatus}
                selectedSprint={selectedSprint}
                setSelectedSprintId={setSelectedSprintId}
                availableActiveSprints={availableActiveSprints}
                onLogout={logout}
            />
            
            {selectedWorkItem && (
                <WorkItemDetailModal
                    workItem={selectedWorkItem}
                    onClose={() => setSelectedWorkItem(null)}
                    onEdit={handleEditWorkItem}
                    onItemUpdate={handleItemUpdate}
                    highlightSection={highlightSection}
                />
            )}
            
            {editingWorkItem && (
                <WorkItemEditor
                    workItem={editingWorkItem}
                    epics={activeEpics}
                    teams={teams}
                    sprints={sprints.filter(s => s.state !== SprintState.DELETED)}
                    onSave={handleSaveWorkItem}
                    onCancel={() => setEditingWorkItem(null)}
                    isNew={isNewItem}
                    highlightSection={highlightSection}
                    boardUsers={boardUsers}
                />
            )}
            
            {editingEpic && (
                <EpicEditor
                    epic={editingEpic}
                    onSave={handleSaveEpic}
                    onCancel={() => { setEditingEpic(null); setIsReadOnlyView(false); }}
                    isNew={isNewEpic}
                    highlightSection={highlightSection}
                    readOnly={isReadOnlyView}
                />
            )}

            {deletingEpic && (
                <DeleteEpicModal
                    epic={deletingEpic}
                    workItems={workItems}
                    onClose={() => setDeletingEpic(null)}
                    onConfirm={handleConfirmDeleteEpic}
                />
            )}

            {deletingSprint && (
                <DeleteSprintModal
                    sprint={deletingSprint}
                    sprints={sprints}
                    onClose={() => setDeletingSprint(null)}
                    onConfirm={handleConfirmDeleteSprint}
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

            {isReAuthModalOpen && (
                <ReAuthModal
                    onClose={() => {
                        setIsReAuthModalOpen(false);
                        setActionToReAuth(null);
                    }}
                    onSuccess={handleReAuthSuccess}
                />
            )}
            
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