// components/TeamEditorModal.tsx
import React, { useState } from 'react';
import { Team, User } from '../types';
import { XMarkIcon } from './icons';

interface TeamEditorModalProps {
    team: Partial<Team> | null;
    onSave: (team: Partial<Team>, memberIds: string[]) => void;
    onClose: () => void;
    allMembers: User[];
}

export const TeamEditorModal: React.FC<TeamEditorModalProps> = ({ team, onSave, onClose, allMembers }) => {
    const [localTeam, setLocalTeam] = useState<Partial<Team>>(team || { name: '', description: '' });
    const [selectedMembers, setSelectedMembers] = useState<string[]>(team?.members || []);
    const isNew = !team?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLocalTeam(prev => ({ ...prev, [name]: value }));
    };

    const handleMemberToggle = (memberId: string) => {
        setSelectedMembers(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleSave = () => {
        if (!localTeam.name?.trim()) {
            alert('Team name is required.');
            return;
        }
        onSave(localTeam, selectedMembers);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">{isNew ? 'Create New Team' : 'Edit Team'}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-[#486966] mb-1">Team Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={localTeam.name || ''}
                            onChange={handleChange}
                            required
                            autoFocus
                            className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-[#486966] mb-1">Description (Optional)</label>
                        <textarea
                            id="description"
                            name="description"
                            value={localTeam.description || ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
                        />
                    </div>
                    {isNew && (
                         <div>
                            <label className="block text-sm font-medium text-[#486966] mb-1">Add Members</label>
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                                {allMembers.map(member => (
                                    <label key={member.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(member.id)}
                                            onChange={() => handleMemberToggle(member.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-[#486966] focus:ring-[#486966]"
                                        />
                                        <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full"/>
                                        <span className="text-sm">{member.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-[#889C9B] rounded-md text-sm font-medium text-[#3B3936] hover:bg-gray-100">Cancel</button>
                    <button type="button" onClick={handleSave} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#486966] hover:bg-[#3a5a58]">Save Team</button>
                </footer>
            </div>
        </div>
    );
};
