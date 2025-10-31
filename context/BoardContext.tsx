// context/BoardContext.tsx
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Board, BoardMember, Role, Permission } from '../types';
import { ALL_USERS, ROLES } from '../constants';
import { useAuth } from './AuthContext';

interface BoardContextType {
  boards: Board[];
  activeBoard: Board | null;
  setActiveBoard: (boardId: string) => void;
  createBoard: (boardName: string) => Board;
  can: (permission: Permission) => boolean;
  activeBoardMembers: BoardMember[];
  roles: Role[];
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMembers, setBoardMembers] = useState<Record<string, BoardMember[]>>({});
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  useEffect(() => {
      if (!user) {
          // Reset state on logout
          setBoards([]);
          setBoardMembers({});
          setActiveBoardId(null);
      }
      // In a real app, this is where you'd fetch boards for the logged-in user.
      // For this demo, we start with a clean slate to trigger onboarding.
  }, [user]);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId) || null, [boards, activeBoardId]);
  
  const activeBoardMembers = useMemo(() => {
    if (!activeBoardId) return [];
    return boardMembers[activeBoardId] || [];
  }, [activeBoardId, boardMembers]);

  const can = useCallback((permission: Permission): boolean => {
    if (!activeBoardId || !user) return false;

    const memberInfo = boardMembers[activeBoardId]?.find(m => m.user.id === user.id);
    if (!memberInfo) return false;

    const role = ROLES.find(r => r.id === memberInfo.roleId);
    if (!role) return false;

    return role.permissions.includes(permission);
  }, [activeBoardId, user, boardMembers]);

  const setActiveBoard = (boardId: string) => {
    setActiveBoardId(boardId);
  };

  const createBoard = useCallback((boardName: string): Board => {
    if (!user) {
      throw new Error("User must be logged in to create a board");
    }
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name: boardName,
    };
    const ownerRole = ROLES.find(r => r.name === 'Owner');
    if (!ownerRole) {
        throw new Error("Owner role not found");
    }
    
    setBoards(prev => [...prev, newBoard]);
    setBoardMembers(prev => ({
      ...prev,
      [newBoard.id]: [{ user, roleId: ownerRole.id }]
    }));
    
    return newBoard;
  }, [user]);
  
  const value = useMemo(() => ({
    boards,
    activeBoard,
    setActiveBoard,
    createBoard,
    can,
    activeBoardMembers,
    roles: ROLES,
  }), [boards, activeBoard, can, activeBoardMembers, createBoard, setActiveBoard]);

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