import React from 'react';
import { WorkItem, WorkItemType } from '../types';
import { UserRoundIcon, UsersRoundIcon, BookOpenIcon, ClipboardCheckIcon, BugIcon, AlarmClockIcon } from './icons';

interface WorkItemCardProps {
  workItem: WorkItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSelect: (workItem: WorkItem) => void;
}

const typeConfig: Record<WorkItemType, { border: string; icon: React.ReactNode, name: string }> = {
    [WorkItemType.STORY]: { border: 'border-l-primary', icon: <BookOpenIcon className="w-4 h-4 text-primary"/>, name: "Story" },
    [WorkItemType.TASK]: { border: 'border-l-yellow-500', icon: <ClipboardCheckIcon className="w-4 h-4 text-yellow-600"/>, name: "Task" },
    [WorkItemType.BUG_URGENT]: { border: 'border-l-red-500', icon: <AlarmClockIcon className="w-4 h-4 text-red-600"/>, name: "Urgent Bug" },
    [WorkItemType.BUG_MINOR]: { border: 'border-l-orange-500', icon: <BugIcon className="w-4 h-4 text-orange-600"/>, name: "Bug" },
    [WorkItemType.TICKET]: { border: 'border-l-gray-400', icon: <ClipboardCheckIcon className="w-4 h-4 text-gray-500"/>, name: "Ticket" },
    [WorkItemType.EPIC]: { border: 'border-l-purple-500', icon: <BookOpenIcon className="w-4 h-4 text-purple-500"/>, name: "Epic" }, // Fallback
};

export const WorkItemCard: React.FC<WorkItemCardProps> = ({ workItem, onSelect }) => {
  const config = typeConfig[workItem.type] || typeConfig[WorkItemType.TICKET];
  const highlightClass = workItem.isUpdated ? 'shadow-lg shadow-blue-300 animate-pulse-once ring-2 ring-primary' : 'shadow-sm';

  // Draggable props are now applied directly in KanbanBoard to the wrapper for better drop zone handling
  return (
    <div
      onClick={() => onSelect(workItem)}
      className={`bg-white rounded-lg p-3 border-l-4 ${config.border} cursor-pointer hover:shadow-md transition-all duration-300 ${highlightClass} space-y-2`}
      aria-label={`View details for ${workItem.title}`}
    >
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-slate-500">{workItem.id}</p>
        <div title={config.name}>{config.icon}</div>
      </div>
      <h3 className="font-medium text-slate-800 text-sm">{workItem.title}</h3>
      <div className="flex justify-between items-center pt-1">
        {workItem.teamInfo ? (
            <div className="flex items-center gap-1 text-xs text-slate-500" title={`Team: ${workItem.teamInfo.name}`}>
                <UsersRoundIcon className="w-4 h-4"/>
            </div>
        ) : <div />}
        {workItem.assignee.avatarUrl ? (
          <img src={workItem.assignee.avatarUrl} alt={workItem.assignee.name} className="w-6 h-6 rounded-full" title={workItem.assignee.name} />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center" title={workItem.assignee.name}>
            <UserRoundIcon className="w-4 h-4 text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
};