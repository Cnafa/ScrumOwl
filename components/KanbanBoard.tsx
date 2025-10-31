
import React, { useMemo } from 'react';
import { WorkItem, Status, Epic, Sprint } from '../types';
import { WorkItemCard } from './WorkItemCard';
import { KANBAN_COLUMNS, WORKFLOW_RULES } from '../constants';
import { useLocale } from '../context/LocaleContext';
import { useNavigation } from '../context/NavigationContext';

interface KanbanBoardProps {
  workItems: WorkItem[];
  setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  onSelectWorkItem: (workItem: WorkItem) => void;
  groupBy: 'status' | 'epic';
  epics: Epic[];
  collapsedEpics: Set<string>;
  onToggleEpic: (epicId: string) => void;
  activeSprint: Sprint | null | undefined;
}

const EpicGroupHeader: React.FC<{ epic?: Epic; onToggle: () => void; isCollapsed: boolean, itemsCount: number }> = ({ epic, onToggle, isCollapsed, itemsCount }) => {
    return (
        <button 
            onClick={onToggle} 
            className="w-full flex items-center gap-3 text-left p-3 border-b hover:bg-gray-100"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform text-gray-500 ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            {epic && <div className="w-2 h-6 rounded-full" style={{backgroundColor: epic.color}}></div>}
            <span className="font-semibold text-[#3B3936]">{epic ? epic.name : 'No Epic'}</span>
            <span className="text-sm font-normal text-[#889C9B]">({itemsCount})</span>
        </button>
    );
};


export const KanbanBoard: React.FC<KanbanBoardProps> = ({ workItems, setWorkItems, onSelectWorkItem, groupBy, epics, collapsedEpics, onToggleEpic, activeSprint }) => {
  const { t } = useLocale();
  const { setCurrentView } = useNavigation();

  if (!activeSprint) {
        return (
             <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-10 bg-white/60 rounded-lg">
                    <h3 className="text-lg font-semibold text-[#3B3936]">{t('no_active_sprint_title')}</h3>
                    <button onClick={() => setCurrentView('SPRINTS')} className="mt-2 text-sm text-[#486966] hover:underline">
                        {t('no_active_sprint_cta')}
                    </button>
                </div>
            </div>
        );
    }

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('workItemId', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, newStatus: Status) => {
    e.preventDefault();
    e.stopPropagation();
    const workItemId = e.dataTransfer.getData('workItemId');
    const item = workItems.find((i) => i.id === workItemId);
    
    if (!item) return;

    const allowedTransitions = WORKFLOW_RULES[item.status];
    if (allowedTransitions && allowedTransitions.includes(newStatus)) {
        setWorkItems((prevItems) =>
            prevItems.map((i) =>
                i.id === workItemId ? { ...i, status: newStatus } : i
            )
        );
        // The global toast system will handle this now.
        // setToast({ message: t('itemMovedSuccess'), type: 'success' });
    } else if (item.status !== newStatus) {
        // This could be a client-side alert or handled differently.
        // setToast({ message: t('itemMoveFailed'), type: 'error' });
    }
  };

  if (groupBy === 'status') {
    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((column) => (
            <div
            key={column.status}
            className="bg-white/60 rounded-lg p-3 flex flex-col"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, column.status)}
            >
            <h2 className="text-lg font-semibold text-[#486966] mb-4 px-1">{column.title} <span className="text-sm font-normal text-[#889C9B]">({workItems.filter(item => item.status === column.status).length})</span></h2>
            <div className="flex-1 space-y-3 overflow-y-auto h-full pr-1">
                {workItems
                .filter((item) => item.status === column.status)
                .map((item) => (
                    <WorkItemCard 
                    key={item.id} 
                    workItem={item} 
                    onDragStart={onDragStart}
                    onSelect={() => onSelectWorkItem(item)}
                    />
                ))}
            </div>
            </div>
        ))}
        </div>
    );
  }

  const itemsByEpic = useMemo(() => {
        const grouped: Record<string, WorkItem[]> = { 'no-epic': [] };
        epics.forEach(e => grouped[e.id] = []);
        
        workItems.forEach(item => {
            if (item.epicId && grouped.hasOwnProperty(item.epicId)) {
                grouped[item.epicId].push(item);
            } else {
                grouped['no-epic'].push(item);
            }
        });
        return grouped;
    }, [workItems, epics]);

    const epicsWithItems = useMemo(() => {
        return epics
            .filter(e => itemsByEpic[e.id]?.length > 0)
            .sort((a,b) => b.iceScore - a.iceScore);
    }, [epics, itemsByEpic]);

    const noEpicItems = itemsByEpic['no-epic'];


  return (
    <div className="flex-1 flex flex-col gap-4">
        {epicsWithItems.map(epic => {
            const isCollapsed = collapsedEpics.has(epic.id);
            return (
                <div key={epic.id} className="bg-white/60 rounded-lg">
                    <EpicGroupHeader epic={epic} onToggle={() => onToggleEpic(epic.id)} isCollapsed={isCollapsed} itemsCount={itemsByEpic[epic.id].length} />
                    {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-3">
                            {KANBAN_COLUMNS.map(col => (
                                <div key={col.status} className="bg-gray-100/50 rounded p-2 min-h-[100px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.status)}>
                                    <h3 className="text-sm font-semibold text-[#486966] mb-2 px-1">{col.title} <span className="font-normal text-[#889C9B]">({itemsByEpic[epic.id].filter(i => i.status === col.status).length})</span></h3>
                                    <div className="space-y-3">
                                        {itemsByEpic[epic.id]
                                            .filter(item => item.status === col.status)
                                            .map(item => <WorkItemCard key={item.id} workItem={item} onDragStart={onDragStart} onSelect={() => onSelectWorkItem(item)} />)
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        })}
        {noEpicItems.length > 0 && (
            <div className="bg-white/60 rounded-lg">
                <EpicGroupHeader onToggle={() => onToggleEpic('no-epic')} isCollapsed={collapsedEpics.has('no-epic')} itemsCount={noEpicItems.length} />
                {!collapsedEpics.has('no-epic') && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-3">
                        {KANBAN_COLUMNS.map(col => (
                            <div key={col.status} className="bg-gray-100/50 rounded p-2 min-h-[100px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.status)}>
                                <h3 className="text-sm font-semibold text-[#486966] mb-2 px-1">{col.title} <span className="font-normal text-[#889C9B]">({noEpicItems.filter(i => i.status === col.status).length})</span></h3>
                                <div className="space-y-3">
                                    {noEpicItems
                                        .filter(item => item.status === col.status)
                                        .map(item => <WorkItemCard key={item.id} workItem={item} onDragStart={onDragStart} onSelect={() => onSelectWorkItem(item)} />)
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};