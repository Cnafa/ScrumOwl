// context/BoardContext.tsx
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { Board, BoardMember, Role, Permission } from '../types';
import { BOARDS, ALL_USERS, ROLES } from '../constants';

// Mock data for members and roles on each board
const MOCK_BOARD_MEMBERS: Record<string, BoardMember[]> = {
    'board-1': [
        { user: ALL_USERS[0], roleId: 'role-1' }, // Alice is Owner
        { user: ALL_USERS[1], roleId: 'role-2' }, // Bob is Admin
        { user: ALL_USERS[2], roleId: 'role-3' }, // Charlie is Member
    ],
    'board-2': [
        { user: ALL_USERS[0], roleId: 'role-3' }, // Alice is Member
        { user: ALL_USERS[3], roleId: 'role-2' }, // Diana is Admin
    ],
     'board-3': [
        { user: ALL_USERS[0], roleId: 'role-3' }, // Alice is Member
        { user: ALL_USERS[4], roleId: 'role-2' }, // Ethan is Admin
    ],
};

interface BoardContextType {
  boards: Board[];
  activeBoard: Board | null;
  setActiveBoard: (boardId: string) => void;
  can: (permission: Permission) => boolean;
  activeBoardMembers: BoardMember[];
  roles: Role[];
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [boards] = useState<Board[]>(BOARDS);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(BOARDS[0]?.id || null);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId) || null, [boards, activeBoardId]);
  
  const activeBoardMembers = useMemo(() => {
    if (!activeBoardId) return [];
    return MOCK_BOARD_MEMBERS[activeBoardId] || [];
  }, [activeBoardId]);

  const can = useCallback((permission: Permission): boolean => {
    // In a real app, we'd get the current user from AuthContext. For now, assume it's Alice.
    const currentUser = ALL_USERS[0]; 
    if (!activeBoardId || !currentUser) return false;

    const memberInfo = MOCK_BOARD_MEMBERS[activeBoardId]?.find(m => m.user.id === currentUser.id);
    if (!memberInfo) return false;

    const role = ROLES.find(r => r.id === memberInfo.roleId);
    if (!role) return false;

    return role.permissions.includes(permission);
  }, [activeBoardId]);

  const setActiveBoard = (boardId: string) => {
    setActiveBoardId(boardId);
  };
  
  const value = useMemo(() => ({
    boards,
    activeBoard,
    setActiveBoard,
    can,
    activeBoardMembers,
    roles: ROLES,
  }), [boards, activeBoard, can, activeBoardMembers]);

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};
