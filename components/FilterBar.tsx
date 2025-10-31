// components/FilterBar.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FilterSet, Team, Sprint, User, WorkItemType } from '../types';
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


const FilterChip: React.FC<{ onRemove: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
    <div className="flex items-center gap-1 bg-primarySoft text-primary font-medium ps-2 pe-1 py-0.5 rounded-full text-xs">
        {children}
        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-blue-200">
            <XMarkIcon className="w-3 h-3"/>
        </button>
    </div>
);

const MultiSelectDropdown: React.FC<{
  buttonContent: React.ReactNode;
  items: { id: string, name: string, content: React.ReactNode }[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  searchable?: boolean;
}> = ({ buttonContent, items, selectedIds, onSelectionChange, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setIsOpen(false));

  const filteredItems = useMemo(() => {
    if (!searchable || !search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(lowerSearch));
  }, [items, search, searchable]);

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
    onSelectionChange(Array.from(newSet));
  };

  return (
    <div className="relative" ref={dropdownRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-36 flex items-center justify-between px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-start">
           <span className="text-xs truncate">{buttonContent}</span>
           <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        {isOpen && (
            <div className="absolute z-10 w-64 mt-1 bg-white border rounded-md shadow-lg text-start">
                {searchable && <div className="p-1 border-b"><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full px-2 py-1 border rounded-md text-xs"/></div>}
                <ul className="max-h-60 overflow-auto p-1">
                    {filteredItems.map(item => (
                        <li key={item.id} className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 rounded-md flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleToggle(item.id)} />
                            {item.content}
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
};

const FILTERABLE_TYPES = [
    WorkItemType.STORY,
    WorkItemType.TASK,
    WorkItemType.BUG_URGENT,
    WorkItemType.BUG_MINOR,
];


export const FilterBar: React.FC<FilterBarProps> = ({ 
    filterSet, onFilterChange, onResetFilters, onOpenSaveViewModal, onOpenManageViewsModal, teams, groupBy, onGroupByChange,
    activeSprint, includeUnassignedEpicItems, onIncludeUnassignedEpicItemsChange
}) => {
  const { t } = useLocale();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filterSet, [e.target.name]: e.target.value });
  };
  
  const isFiltered = filterSet.searchQuery !== '' || filterSet.assigneeIds.length > 0 || filterSet.typeIds.length > 0 || filterSet.teamIds.length > 0;

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
        {filterSet.assigneeIds.map(id => {
          const user = ALL_USERS.find(u => u.id === id);
          if (!user) return null;
          return <FilterChip key={id} onRemove={() => onFilterChange({...filterSet, assigneeIds: filterSet.assigneeIds.filter(i => i !== id)})}>
              <img src={user.avatarUrl} className="w-4 h-4 rounded-full me-1" alt={user.name} />
              {user.name}
          </FilterChip>
        })}

        {filterSet.teamIds.map(id => {
          const team = teams.find(t => t.id === id);
          if (!team) return null;
          return <FilterChip key={id} onRemove={() => onFilterChange({...filterSet, teamIds: filterSet.teamIds.filter(i => i !== id)})}>
              {team.name}
          </FilterChip>
        })}

        {filterSet.typeIds.map(typeId => (
             <FilterChip key={typeId} onRemove={() => onFilterChange({ ...filterSet, typeIds: filterSet.typeIds.filter(id => id !== typeId) })}>
                {typeId}
            </FilterChip>
        ))}
        
        {isFiltered && (
            <button onClick={onResetFilters} className="text-xs font-medium text-primary hover:underline">
                {t('clearFilters')}
            </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <MultiSelectDropdown
            buttonContent={filterSet.assigneeIds.length > 0 ? `${filterSet.assigneeIds.length} Assignee(s)`: 'All Assignees'}
            items={ALL_USERS.map(u => ({ id: u.id, name: u.name, content: <><img src={u.avatarUrl} alt={u.name} className="w-4 h-4 rounded-full" /><span>{u.name}</span></> }))}
            selectedIds={filterSet.assigneeIds}
            onSelectionChange={(ids) => onFilterChange({...filterSet, assigneeIds: ids})}
            searchable
        />
        {filterSet.assigneeIds.length > 0 && (
            <div className="flex items-center text-xs p-0.5 bg-slate-200 rounded-md">
                <button onClick={() => onFilterChange({...filterSet, assigneeMatch: 'any'})} className={`px-1.5 py-0.5 rounded ${filterSet.assigneeMatch === 'any' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>Any</button>
                <button onClick={() => onFilterChange({...filterSet, assigneeMatch: 'all'})} className={`px-1.5 py-0.5 rounded ${filterSet.assigneeMatch === 'all' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>All</button>
            </div>
        )}
        
        <MultiSelectDropdown
            buttonContent={filterSet.teamIds.length > 0 ? `${filterSet.teamIds.length} Team(s)` : 'All Teams'}
            items={teams.map(t => ({ id: t.id, name: t.name, content: t.name }))}
            selectedIds={filterSet.teamIds}
            onSelectionChange={(ids) => onFilterChange({...filterSet, teamIds: ids})}
        />

        <MultiSelectDropdown
            buttonContent={filterSet.typeIds.length > 0 ? `${filterSet.typeIds.length} Type(s)` : t('allTypes')}
            items={FILTERABLE_TYPES.map(type => ({id: type, name: type, content: type}))}
            selectedIds={filterSet.typeIds}
            onSelectionChange={(ids) => onFilterChange({...filterSet, typeIds: ids})}
        />

        <select
          name="groupBy"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as 'status' | 'epic')}
          className="w-32 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="status">{t('groupBy')}: {t('status')}</option>
          <option value="epic">{t('groupBy')}: {t('epic')}</option>
        </select>

        {activeSprint && groupBy === 'epic' && (
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
