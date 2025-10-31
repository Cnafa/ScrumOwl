import React from 'react';
import { WorkItem, WorkItemType } from '../types';
import { UserIcon, UsersIcon } from './icons';

interface WorkItemCardProps {
  workItem: WorkItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSelect: (workItem: WorkItem) => void;
}

const typeColorConfig: Record<WorkItemType, { border: string; bg: string; text: string }> = {
    [WorkItemType.EPIC]: { border: 'border-l-purple-500', bg: 'bg-purple-100', text: 'text-purple-800' },
    [WorkItemType.STORY]: { border: 'border-l-[#486966]', bg: 'bg-[#486966]/20', text: 'text-[#486966]' },
    [WorkItemType.TASK]: { border: 'border-l-yellow-400', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    [WorkItemType.BUG_URGENT]: { border: 'border-l-[#BD2A2E]', bg: 'bg-[#BD2A2E]/20', text: 'text-[#BD2A2E]' },
    [WorkItemType.BUG_MINOR]: { border: 'border-l-orange-400', bg: 'bg-orange-100', text: 'text-orange-800' },
    [WorkItemType.TICKET]: { border: 'border-l-gray-400', bg: 'bg-gray-200', text: 'text-gray-800' },
};

export const WorkItemCard: React.FC<WorkItemCardProps> = ({ workItem, onDragStart, onSelect }) => {
  const colors = typeColorConfig[workItem.type] || typeColorConfig[WorkItemType.TICKET];

  // US-09: Add highlight effect for real-time updates
  const highlightClass = workItem.isUpdated ? 'shadow-lg shadow-blue-400/50 animate-pulse-once ring-2 ring-blue-500' : 'shadow-sm';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, workItem.id)}
      onClick={() => onSelect(workItem)}
      className={`bg-white rounded-lg p-4 border-l-4 ${colors.border} cursor-pointer hover:shadow-md transition-all duration-300 ${highlightClass} space-y-2`}
      aria-label={`View details for ${workItem.title}`}
    >
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-[#889C9B]">{workItem.id}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {workItem.type}
        </span>
      </div>
      <h3 className="font-semibold text-[#3B3936]">{workItem.title}</h3>
      <div className="flex justify-between items-center">
        {workItem.teamInfo ? (
            <div className="flex items-center gap-1 text-xs text-gray-500" title={`Team: ${workItem.teamInfo.name}`}>
                <UsersIcon className="w-4 h-4"/>
                <span>{workItem.teamInfo.name}</span>
            </div>
        ) : <div />}
        {workItem.assignee.avatarUrl ? (
          <img src={workItem.assignee.avatarUrl} alt={workItem.assignee.name} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#B2BEBF] flex items-center justify-center" title={workItem.assignee.name}>
            <UserIcon className="w-4 h-4 text-[#889C9B]" />
          </div>
        )}
      </div>
    </div>
  );
};