import React from 'react';
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

const FilterChip: React.FC<{ onRemove: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
    <div className="flex items-center gap-1 bg-primarySoft text-primary font-medium pl-2 pr-1 py-0.5 rounded-full text-sm">
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
    <div className="h-14 flex-shrink-0 bg-white/70 backdrop-blur-sm flex items-center justify-between px-3 border-b border-slate-200/80">
      <div className="flex items-center gap-2">
        <input
          type="search"
          name="searchQuery"
          value={filterSet.searchQuery}
          onChange={handleInputChange}
          placeholder={t('searchPlaceholder')}
          className="w-56 px-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        
        {/* Active Filters as Chips */}
        {selectedAssignee && (
            <FilterChip onRemove={() => onFilterChange({ ...filterSet, assignee: 'ALL' })}>
                {selectedAssignee.avatarUrl 
                    ? <img src={selectedAssignee.avatarUrl} className="w-4 h-4 rounded-full mr-1" />
                    : <UserRoundIcon className="w-4 h-4 mr-1" />}
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
            <button onClick={onResetFilters} className="text-sm font-medium text-primary hover:underline">
                {t('clearFilters')}
            </button>
        )}
      </div>

      <div className="flex items-center gap-2">
         {/* Filter Selectors */}
        <select
          name="assignee"
          value={filterSet.assignee}
          onChange={handleInputChange}
          className="w-40 px-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">{t('allAssignees')}</option>
          {ALL_USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        <select
          name="type"
          value={filterSet.type}
          onChange={handleInputChange}
          className="w-40 px-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">{t('allTypes')}</option>
          {WORK_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          name="groupBy"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as 'status' | 'epic')}
          className="w-40 px-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="status">{t('groupBy')}: {t('status')}</option>
          <option value="epic">{t('groupBy')}: {t('epic')}</option>
        </select>

        {activeSprint && (
            <div className="flex items-center gap-2 pl-2 ml-2 border-l">
                <input
                    type="checkbox"
                    id="include-unassigned"
                    checked={includeUnassignedEpicItems}
                    onChange={(e) => onIncludeUnassignedEpicItemsChange(e.target.checked)}
                />
                <label htmlFor="include-unassigned" className="text-sm font-medium text-slate-700">{t('include_items_without_epic')}</label>
            </div>
        )}
        
        <div className="h-5 w-px bg-slate-300 mx-1" />

         <button onClick={onOpenSaveViewModal} title={t('saveView')} className="p-2 rounded-lg hover:bg-slate-200">
            <BookmarkPlusIcon className="w-5 h-5 text-slate-600" />
        </button>
        <button onClick={onOpenManageViewsModal} title={t('manageViews')} className="p-2 rounded-lg hover:bg-slate-200">
            <FolderCogIcon className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
};