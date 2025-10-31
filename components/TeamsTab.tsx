// components/TeamsTab.tsx
import React, { useState } from 'react';
import { Team, BoardMember, User } from '../types';
import { TeamEditorModal } from './TeamEditorModal';
import { ManageTeamMembersModal } from './ManageTeamMembersModal';
import { ALL_USERS } from '../constants';

interface TeamsTabProps {
    teams: Team[];
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
    allMembers: BoardMember[];
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ teams, setTeams, allMembers }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);
    const [managingMembersOf, setManagingMembersOf] = useState<Team | null>(null);

    const handleNewTeam = () => {
        setEditingTeam({});
        setIsEditorOpen(true);
    };

    const handleEditTeam = (team: Team) => {
        setEditingTeam(team);
        setIsEditorOpen(true);
    };

    const handleDeleteTeam = (teamId: string) => {
        if (window.confirm('Are you sure you want to delete this team? This cannot be undone.')) {
            setTeams(prev => prev.filter(t => t.id !== teamId));
            // Global toast will handle this
        }
    };

    const handleSaveTeam = (teamToSave: Partial<Team>, memberIds: string[]) => {
        if (teamToSave.id) { // Editing existing team
            setTeams(prev => prev.map(t => t.id === teamToSave.id ? { ...t, ...teamToSave, members: memberIds } as Team : t));
            // Global toast will handle this
        } else { // Creating new team
            const newTeam: Team = {
                id: `team-${Date.now()}`,
                name: teamToSave.name || 'New Team',
                description: teamToSave.description || '',
                members: memberIds,
            };
            setTeams(prev => [newTeam, ...prev]);
            // Global toast will handle this
        }
        setIsEditorOpen(false);
        setEditingTeam(null);
    };

    const handleSaveMembers = (teamId: string, memberIds: string[]) => {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: memberIds } : t));
        // Global toast will handle this
        setManagingMembersOf(null);
    };

    const getMemberAvatars = (memberIds: string[], max: number = 5): User[] => {
        return memberIds.map(id => ALL_USERS.find(u => u.id === id)).filter((u): u is User => !!u).slice(0, max);
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Teams</h3>
                <button onClick={handleNewTeam} className="py-2 px-4 text-sm font-medium rounded-md text-white bg-[#486966] hover:bg-[#3a5a58]">
                    New Team
                </button>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map(team => (
                        <tr key={team.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{team.name}</div>
                                <div className="text-xs text-gray-500">{team.description}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex -space-x-2">
                                    {getMemberAvatars(team.members).map(member => (
                                        <img key={member.id} src={member.avatarUrl} title={member.name} className="h-6 w-6 rounded-full ring-2 ring-white" />
                                    ))}
                                     {team.members.length > 5 && (
                                        <div className="h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-medium">
                                            +{team.members.length - 5}
                                        </div>
                                     )}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                                <button onClick={() => handleEditTeam(team)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                <button onClick={() => setManagingMembersOf(team)} className="text-indigo-600 hover:text-indigo-900">Manage Members</button>
                                <button onClick={() => handleDeleteTeam(team.id)} className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                        </tr>
                    ))}
                    {teams.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-center py-6 text-sm text-gray-500">No teams created yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {isEditorOpen && (
                <TeamEditorModal
                    team={editingTeam}
                    onSave={handleSaveTeam}
                    onClose={() => setIsEditorOpen(false)}
                    allMembers={allMembers.map(m => m.user)}
                />
            )}

            {managingMembersOf && (
                <ManageTeamMembersModal
                    team={managingMembersOf}
                    onSave={handleSaveMembers}
                    onClose={() => setManagingMembersOf(null)}
                    allMembers={allMembers.map(m => m.user)}
                />
            )}
        </div>
    );
};
