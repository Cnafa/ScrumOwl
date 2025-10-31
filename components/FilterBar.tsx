

import React, { useState } from 'react';
import { FilterSet, SavedView, User, ViewVisibility, WorkItem, WorkItemType, Team, Sprint } from '../types';
import { ALL_USERS, WORK_ITEM_TYPES } from '../constants';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { ManageViewsModal } from './ManageViewsModal';

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

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filterSet, onFilterChange, onResetFilters, onOpenSaveViewModal, onOpenManageViewsModal, teams, groupBy, onGroupByChange,
    activeSprint, includeUnassignedEpicItems, onIncludeUnassignedEpicItemsChange
}) => {
  const { t } = useLocale();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFilterChange({ ...filterSet, [e.target.name]: e.target.value });
  };

  const isFiltered = filterSet.searchQuery !== '' || filterSet.assignee !== 'ALL' || filterSet.type !== 'ALL' || filterSet.team !== 'ALL';

  return (
    <div className="h-16 flex-shrink-0 bg-white/70 backdrop-blur-sm flex items-center justify-between px-4 border-b border-gray-200/80">
      <div className="flex items-center gap-3">
        {/* Search */}
        <input
          type="search"
          name="searchQuery"
          value={filterSet.searchQuery}
          onChange={handleInputChange}
          placeholder={t('searchPlaceholder')}
          className="w-64 px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
        />
        {/* Assignee Filter */}
        <select
          name="assignee"
          value={filterSet.assignee}
          onChange={handleInputChange}
          className="w-48 px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
        >
          <option value="ALL">{t('allAssignees')}</option>
          {ALL_USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        {/* Type Filter */}
        <select
          name="type"
          value={filterSet.type}
          onChange={handleInputChange}
          className="w-48 px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
        >
          <option value="ALL">{t('allTypes')}</option>
          {WORK_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
         {/* Team Filter */}
        <select
          name="team"
          value={filterSet.team}
          onChange={handleInputChange}
          className="w-48 px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
        >
          <option value="ALL">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
         {/* Group By */}
        <select
          name="groupBy"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as 'status' | 'epic')}
          className="w-48 px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
        >
          <option value="status">{t('groupBy')}: {t('status')}</option>
          <option value="epic">{t('groupBy')}: {t('epic')}</option>
        </select>
        {isFiltered && (
            <button onClick={onResetFilters} className="text-sm font-medium text-[#486966] hover:underline">
                {t('clearFilters')}
            </button>
        )}
        {activeSprint && (
            <div className="flex items-center gap-2 pl-3 ml-3 border-l">
                <input
                    type="checkbox"
                    id="include-unassigned"
                    checked={includeUnassignedEpicItems}
                    onChange={(e) => onIncludeUnassignedEpicItemsChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#486966] focus:ring-[#486966]"
                />
                <label htmlFor="include-unassigned" className="text-sm font-medium text-gray-700">{t('include_items_without_epic')}</label>
            </div>
        )}
      </div>

      <div className="flex items-center gap-3">
         <button onClick={onOpenSaveViewModal} className="text-sm font-medium text-[#486966] hover:underline">
            {t('saveView')}
        </button>
        <button onClick={onOpenManageViewsModal} className="text-sm font-medium text-[#486966] hover:underline">
            {t('manageViews')}
        </button>
      </div>
    </div>
  );
};