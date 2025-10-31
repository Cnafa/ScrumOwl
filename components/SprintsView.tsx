// components/SprintsView.tsx
import React, { useState, useMemo } from 'react';
import { Sprint, SprintState, Epic } from '../types';
import { useLocale } from '../context/LocaleContext';
import { useBoard } from '../context/BoardContext';
import { SprintEditorModal } from './SprintEditorModal';

interface SprintsViewProps {
    sprints: Sprint[];
    onSaveSprint: (sprint: Partial<Sprint>) => void;
    onDeleteSprint: (sprintId: string) => void;
    onRestoreSprint: (sprintId: string) => void;
    epics: Epic[];
}

type Tab = 'ACTIVE' | 'UPCOMING' | 'PAST' | 'DELETED';

export const SprintsView: React.FC<SprintsViewProps> = ({ sprints, onSaveSprint, onDeleteSprint, onRestoreSprint, epics }) => {
    const { t } = useLocale();
    const { can } = useBoard();
    const [activeTab, setActiveTab] = useState<Tab>('ACTIVE');
    const [editingSprint, setEditingSprint] = useState<Partial<Sprint> | null>(null);
    const canManage = can('sprint.manage');

    const filteredSprints = useMemo(() => {
        switch (activeTab) {
            case 'ACTIVE':
                return sprints.filter(s => s.state === SprintState.ACTIVE);
            case 'UPCOMING':
                return sprints.filter(s => s.state === SprintState.PLANNED).sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            case 'PAST':
                 return sprints.filter(s => s.state === SprintState.CLOSED).sort((a,b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());
            case 'DELETED':
                 return sprints.filter(s => s.state === SprintState.DELETED).sort((a,b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());
            default:
                return [];
        }
    }, [sprints, activeTab]);
    
    const handleNewSprint = () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 14);
        setEditingSprint({
            name: '',
            goal: '',
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            state: SprintState.PLANNED,
            epicIds: []
        });
    };

    const handleSaveSprint = (sprintToSave: Partial<Sprint>) => {
        onSaveSprint(sprintToSave);
        setEditingSprint(null);
    };

    const handleDelete = (sprintId: string) => {
        if (window.confirm('Are you sure you want to delete this sprint? Work items will remain, but will be unassigned from it.')) {
            onDeleteSprint(sprintId);
        }
    };

    const handleRestore = (sprintId: string) => {
        onRestoreSprint(sprintId);
    };

    const TabButton: React.FC<{ tab: Tab, label: string }> = ({ tab, label }) => (
         <button 
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-[#486966] text-white' : 'text-gray-600 hover:bg-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 bg-white rounded-lg shadow space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#3B3936]">{t('sprints')}</h2>
                {canManage && (
                    <button onClick={handleNewSprint} className="py-2 px-4 text-sm font-medium rounded-md text-white bg-[#486966] hover:bg-[#3a5a58]">
                        {t('newSprint')}
                    </button>
                )}
            </div>

            <div className="border-b border-gray-200">
                 <nav className="flex space-x-2">
                    <TabButton tab="ACTIVE" label="Active" />
                    <TabButton tab="UPCOMING" label="Upcoming" />
                    <TabButton tab="PAST" label="Past" />
                    <TabButton tab="DELETED" label="Deleted" />
                </nav>
            </div>
            
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sprint Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Epics</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Goal</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                       {filteredSprints.map(sprint => (
                           <tr key={sprint.id} className={sprint.state === SprintState.DELETED ? 'bg-red-50' : ''}>
                               <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sprint.name}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                   {new Date(sprint.startAt).toLocaleDateString()} - {new Date(sprint.endAt).toLocaleDateString()}
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{sprint.epicIds.length}</td>
                               <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{sprint.goal}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                                   {canManage && activeTab !== 'DELETED' && (
                                       <button onClick={() => setEditingSprint(sprint)} className="text-indigo-600 hover:text-indigo-900">
                                           Edit
                                       </button>
                                   )}
                                   {canManage && (activeTab === 'ACTIVE' || activeTab === 'UPCOMING') && (
                                       <button onClick={() => handleDelete(sprint.id)} className="text-red-600 hover:text-red-900">
                                           Delete
                                       </button>
                                   )}
                                   {canManage && activeTab === 'DELETED' && (
                                       <button onClick={() => handleRestore(sprint.id)} className="text-green-600 hover:text-green-900">
                                            Restore
                                       </button>
                                   )}
                               </td>
                           </tr>
                       ))}
                       {filteredSprints.length === 0 && (
                           <tr><td colSpan={5} className="text-center py-6 text-sm text-gray-500">No sprints in this category.</td></tr>
                       )}
                    </tbody>
                 </table>
            </div>

            {editingSprint && (
                <SprintEditorModal 
                    sprint={editingSprint}
                    allEpics={epics}
                    onSave={handleSaveSprint}
                    onClose={() => setEditingSprint(null)}
                />
            )}
        </div>
    );
};