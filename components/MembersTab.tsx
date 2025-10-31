// components/MembersTab.tsx
import React from 'react';
import { useBoard } from '../context/BoardContext';
import { BoardMember, Role } from '../types';

interface MembersTabProps {
    boardMembers: BoardMember[];
    setBoardMembers: React.Dispatch<React.SetStateAction<BoardMember[]>>;
}

export const MembersTab: React.FC<MembersTabProps> = ({ boardMembers, setBoardMembers }) => {
    const { roles, can } = useBoard();
    const canManageMembers = can('member.manage');

    const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown Role';
    
    const editableRoles = roles.filter(r => r.name !== 'Owner');

    const handleRoleChange = (userId: string, newRoleId: string) => {
        // Last admin check
        const admins = boardMembers.filter(m => {
            const role = roles.find(r => r.id === m.roleId);
            return role?.name === 'Admin' || role?.name === 'Owner';
        });

        if (admins.length === 1 && admins[0].user.id === userId) {
            const newRole = roles.find(r => r.id === newRoleId);
            if (newRole?.name !== 'Admin' && newRole?.name !== 'Owner') {
                // In a real app, a global toast would show this error.
                alert("Action failed: Cannot demote the last administrator.");
                return;
            }
        }
        
        setBoardMembers(prev => prev.map(m => m.user.id === userId ? { ...m, roleId: newRoleId } : m));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Board Members</h3>
                <div className="text-right">
                    <button disabled className="py-2 px-4 text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed">
                        Invite Member
                    </button>
                     <p className="text-xs text-gray-500 mt-1">
                        Use the <strong>Invite Codes</strong> tab to add new members.
                    </p>
                </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {boardMembers.map(({ user, roleId }) => {
                        const isOwner = getRoleName(roleId) === 'Owner';
                        return (
                        <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {canManageMembers && !isOwner ? (
                                    <select
                                        value={roleId}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="w-full p-1 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {editableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                ) : (
                                    getRoleName(roleId)
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {/* Actions like remove could go here */}
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );
};