// components/FilterBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FilterSet, Team, Sprint, User } from '../types';
import { ALL_USERS, WORK_ITEM_TYPES } from '../constants';
import { useLocale } from '../context/LocaleContext';
import { BookmarkPlusIcon, FolderCogIcon, XMarkIcon, UserRoundIcon } from './icons';

interface FilterBarProps {
  filterSet: FilterSet;
  onFilterChange: (filters: FilterSet) => void;
  onResetFilters: () => void;
  onOpenSaveViewModal: () => void;
  onOpenManageViewsModal: () => void;
  teams: Team[];
  groupBy: 'status' | 'epic';
  onGroupByChange: (groupBy: 'status' | 'epic') => void;
  activeSprint: Sprint | null | undefined;
  includeUnassignedEpicItems: boolean;
  onIncludeUnassignedEpicItemsChange: (checked: boolean) => void;
}

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};

const AssigneeFilter: React.FC<{ selected: string, onChange: (assigneeName: string) => void, users: User[] }> = ({ selected, onChange, users }) => {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickOutside(dropdownRef, () => setIsOpen(false));

    const selectedUser = users.find(u => u.name === selected);

    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-36 flex items-center justify-between px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-start">
                <span className="flex items-center gap-1 text-xs">
                    {selectedUser ? (
                        <>
                            <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-4 h-4 rounded-full" />
                            <span className="truncate">{selectedUser.name}</span>
                        </>
                    ) : (
                        t('allAssignees')
                    )}
                </span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto text-start">
                    <ul>
                        <li onClick={() => { onChange('ALL'); setIsOpen(false); }} className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100">{t('allAssignees')}</li>
                        {users.map(user => (
                            <li key={user.id} onClick={() => { onChange(user.name); setIsOpen(false); }} className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2">
                                <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full" />
                                <span>{user.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const FilterChip: React.FC<{ onRemove: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
    <div className="flex items-center gap-1 bg-primarySoft text-primary font-medium ps-2 pe-1 py-0.5 rounded-full text-xs">
        {children}
        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-blue-200">
            <XMarkIcon className="w-3 h-3"/>
        </button>
    </div>
);

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filterSet, onFilterChange, onResetFilters, onOpenSaveViewModal, onOpenManageViewsModal, teams, groupBy, onGroupByChange,
    activeSprint, includeUnassignedEpicItems, onIncludeUnassignedEpicItemsChange
}) => {
  const { t } = useLocale();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFilterChange({ ...filterSet, [e.target.name]: e.target.value });
  };

  const isFiltered = filterSet.searchQuery !== '' || filterSet.assignee !== 'ALL' || filterSet.type !== 'ALL' || filterSet.team !== 'ALL';

  const selectedAssignee = ALL_USERS.find(u => u.name === filterSet.assignee);

  return (
    <div className="h-10 flex-shrink-0 bg-white/70 backdrop-blur-sm flex items-center justify-between px-2 border-b border-slate-200/80">
      <div className="flex items-center gap-2">
        <input
          type="search"
          name="searchQuery"
          value={filterSet.searchQuery}
          onChange={handleInputChange}
          placeholder={t('searchPlaceholder')}
          className="w-64 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        
        {/* Active Filters as Chips */}
        {selectedAssignee && (
            <FilterChip onRemove={() => onFilterChange({ ...filterSet, assignee: 'ALL' })}>
                <img src={selectedAssignee.avatarUrl} className="w-4 h-4 rounded-full me-1" alt={selectedAssignee.name} />
                {selectedAssignee.name}
            </FilterChip>
        )}
        {filterSet.type !== 'ALL' && (
             <FilterChip onRemove={() => onFilterChange({ ...filterSet, type: 'ALL' })}>
                {filterSet.type}
            </FilterChip>
        )}
         {filterSet.team !== 'ALL' && (
             <FilterChip onRemove={() => onFilterChange({ ...filterSet, team: 'ALL' })}>
                {teams.find(t => t.id === filterSet.team)?.name || 'Unknown Team'}
            </FilterChip>
        )}
        {isFiltered && (
            <button onClick={onResetFilters} className="text-xs font-medium text-primary hover:underline">
                {t('clearFilters')}
            </button>
        )}
      </div>

      <div className="flex items-center gap-2">
         {/* Filter Selectors */}
        <AssigneeFilter selected={filterSet.assignee} onChange={(name) => onFilterChange({...filterSet, assignee: name})} users={ALL_USERS} />

        <select
          name="type"
          value={filterSet.type}
          onChange={handleInputChange}
          className="w-32 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">{t('allTypes')}</option>
          {WORK_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          name="groupBy"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as 'status' | 'epic')}
          className="w-32 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="status">{t('groupBy')}: {t('status')}</option>
          <option value="epic">{t('groupBy')}: {t('epic')}</option>
        </select>

        {activeSprint && (
            <div className="flex items-center gap-2 ps-2 ms-2 border-s">
                <input
                    type="checkbox"
                    id="include-unassigned"
                    checked={includeUnassignedEpicItems}
                    onChange={(e) => onIncludeUnassignedEpicItemsChange(e.target.checked)}
                />
                <label htmlFor="include-unassigned" className="text-xs font-medium text-slate-700">{t('include_items_without_epic')}</label>
            </div>
        )}
        
        <div className="h-4 w-px bg-slate-300 mx-1" />

         <button onClick={onOpenSaveViewModal} title={t('saveView')} className="p-1.5 rounded-md hover:bg-slate-200">
            <BookmarkPlusIcon className="w-4 h-4 text-slate-600" />
        </button>
        <button onClick={onOpenManageViewsModal} title={t('manageViews')} className="p-1.5 rounded-md hover:bg-slate-200">
            <FolderCogIcon className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
};