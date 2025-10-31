import React, { useState } from 'react';
import { WorkItem, ActivityItem, User, ChecklistItem } from '../types';
// FIX: Removed unused and non-existent 'UserIcon' import.
import { XMarkIcon } from './icons';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { ActivityFeed } from './ActivityFeed';
import { getMockActivities } from '../services/mockDataService';
import { useBoard } from '../context/BoardContext';

interface WorkItemDetailModalProps {
  workItem: WorkItem;
  onClose: () => void;
  onEdit: (workItem: WorkItem) => void;
}

const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <p className="text-sm font-medium text-[#889C9B] mb-1">{label}</p>
        <div className="text-sm text-[#3B3936]">{children}</div>
    </div>
);

const UserDisplay: React.FC<{ user?: User }> = ({ user }) => {
    if (!user) return <span className="text-gray-400">Unassigned</span>;
    return (
        <div className="flex items-center gap-2">
            <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full" />
            <span>{user.name}</span>
        </div>
    );
};

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({ workItem, onClose, onEdit }) => {
  const { t } = useLocale();
  const { user } = useAuth();
  const { can } = useBoard();
  const [comment, setComment] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>(() => getMockActivities(5));

  const canEditItem = can('item.edit.any') || (can('item.edit.own') && workItem.assignee.id === user?.id);
  
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && user) {
      const newComment: ActivityItem = {
        type: 'COMMENT',
        data: {
          id: `comment-${Date.now()}`,
          user: { name: user.name, avatarUrl: user.avatarUrl },
          content: comment,
          mentions: [],
          timestamp: new Date().toISOString(),
        }
      };
      setActivities(prev => [newComment, ...prev]);
      setComment('');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onMouseDown={onClose}>
      <div 
        className="bg-[#F0F4F4] rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b bg-white/60 rounded-t-lg flex-shrink-0">
          <div>
             <p className="text-xs text-[#889C9B]">{workItem.id}</p>
             <h2 className="text-xl font-bold text-[#3B3936]">{workItem.title}</h2>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {canEditItem && (
                <button onClick={() => onEdit(workItem)} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#486966] hover:bg-[#3a5a58]">{t('edit')}</button>
            )}
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
              <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <h3 className="text-md font-semibold text-[#486966] mb-2">{t('aiPoweredSummary')}</h3>
                    <p className="text-sm text-[#3B3936] p-3 bg-[#B2BEBF]/50 rounded-lg">{workItem.summary || 'No summary available.'}</p>
                </div>
                <div>
                    <h3 className="text-md font-semibold text-[#486966] mb-2">{t('description')}</h3>
                    <div className="prose prose-sm max-w-none text-[#3B3936]" dangerouslySetInnerHTML={{ __html: workItem.description.replace(/\n/g, '<br />') }} />
                </div>
                
                {workItem.checklist && workItem.checklist.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold text-[#486966] mb-2">{t('checklist')}</h3>
                        <ul className="space-y-1">
                            {workItem.checklist.map(item => (
                                <li key={item.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={item.isCompleted} readOnly className="h-4 w-4 rounded border-gray-300 text-[#486966] focus:ring-[#486966]" />
                                    <span className={item.isCompleted ? 'line-through text-gray-500' : ''}>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <hr className="border-t border-[#B2BEBF]" />

                <div>
                    <h3 className="text-md font-semibold text-[#486966] mb-4">{t('activity')}</h3>
                    <form onSubmit={handleCommentSubmit} className="mb-6">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={t('addComment')}
                            className="w-full px-3 py-2 h-16 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
                            rows={2}
                        />
                        <div className="flex justify-end mt-2">
                            <button type="submit" className="py-2 px-4 text-sm font-medium rounded-md text-white bg-[#486966] hover:bg-[#3a5a58] disabled:bg-gray-400" disabled={!comment.trim()}>{t('comment')}</button>
                        </div>
                    </form>
                    <ActivityFeed 
                        activities={activities} 
                        onUpdateComment={(id, content) => { /* Logic to update comment */ }}
                        onDeleteComment={(id) => { /* Logic to delete comment */ }}
                    />
                </div>
            </main>
            
            {/* Sidebar with metadata */}
            <aside className="w-1/3 max-w-xs border-l border-[#B2BEBF] overflow-y-auto p-6 space-y-5 bg-white/50">
                 <DetailField label={t('status')}><span className="font-semibold px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-800">{workItem.status}</span></DetailField>
                 <DetailField label={t('assignee')}><UserDisplay user={workItem.assignee} /></DetailField>
                 <DetailField label={'Reporter'}><UserDisplay user={workItem.reporter} /></DetailField>
                 <DetailField label={t('priority')}><span className="font-bold">{workItem.priority}</span></DetailField>
                 <DetailField label={'Sprint'}>{workItem.sprint}</DetailField>
                 <DetailField label={'Group'}>{workItem.group}</DetailField>
                 <DetailField label={t('type')}>{workItem.type}</DetailField>
                 <DetailField label={t('stack')}>{workItem.stack || 'N/A'}</DetailField>
                 <DetailField label={t('estimationPoints')}>{workItem.estimationPoints || 'N/A'}</DetailField>
                 <DetailField label={t('effortHours')}>{workItem.effortHours ? `${workItem.effortHours}h` : 'N/A'}</DetailField>
                 <DetailField label={t('dueDate')}>{workItem.dueDate ? new Date(workItem.dueDate).toLocaleDateString() : 'N/A'}</DetailField>
                 <DetailField label={t('labels')}>
                    {workItem.labels && workItem.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {workItem.labels.map(label => (
                                <span key={label} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#486966]/20 text-[#486966]">
                                    {label}
                                </span>
                            ))}
                        </div>
                    ) : 'None'}
                 </DetailField>
            </aside>
        </div>
      </div>
    </div>
  );
};