// components/WorkItemEditor.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkItem, Status, Priority, WorkItemType, Epic, Team } from '../types';
import { useLocale } from '../context/LocaleContext';
import { XMarkIcon } from './icons';
import { ALL_USERS, PRIORITIES, SPRINTS, STACKS, WORK_ITEM_TYPES, WORKFLOW_RULES } from '../constants';
import { LabelInput } from './LabelInput';
import { ChecklistInput } from './ChecklistInput';
import { AttachmentsManager } from './AttachmentsManager';
import { generateSummary } from '../services/geminiService';
import { isEqual } from 'lodash-es';
import { RichTextEditor } from './RichTextEditor';

interface WorkItemEditorProps {
  workItem: Partial<WorkItem>;
  epics: Epic[];
  teams: Team[];
  onSave: (item: Partial<WorkItem>) => void;
  onCancel: () => void;
  isNew: boolean;
  highlightSection?: string;
}

export const WorkItemEditor: React.FC<WorkItemEditorProps> = ({ workItem, epics, teams, onSave, onCancel, isNew, highlightSection }) => {
  const { t } = useLocale();
  const [localWorkItem, setLocalWorkItem] = useState<Partial<WorkItem>>(workItem);
  const [originalWorkItem, setOriginalWorkItem] = useState<Partial<WorkItem>>(workItem);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isDescriptionOverLimit, setIsDescriptionOverLimit] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Refs for highlighting
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // Epic selector state
  const [epicSearch, setEpicSearch] = useState('');
  const [isEpicDropdownOpen, setIsEpicDropdownOpen] = useState(false);
  const epicDropdownRef = useRef<HTMLDivElement>(null);

  // Team selector state
  const [teamSearch, setTeamSearch] = useState('');
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setLocalWorkItem(workItem);
    setOriginalWorkItem(workItem);
    const selectedEpic = epics.find(e => e.id === workItem.epicId);
    setEpicSearch(selectedEpic ? `[${selectedEpic.id}] ${selectedEpic.name}`: '');
    const selectedTeam = teams.find(t => t.id === workItem.teamId);
    setTeamSearch(selectedTeam ? selectedTeam.name : '');
  }, [workItem, epics, teams]);

  useEffect(() => {
    if (highlightSection && editorContainerRef.current) {
        const elementToHighlight = editorContainerRef.current.querySelector(`[data-highlight-key="${highlightSection}"]`);
        if (elementToHighlight) {
            elementToHighlight.classList.add('animate-highlight-pulse');
            (elementToHighlight as HTMLElement).focus?.();
            const timer = setTimeout(() => {
                elementToHighlight.classList.remove('animate-highlight-pulse');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }
  }, [highlightSection]);

  const hasChanges = !isEqual(originalWorkItem, localWorkItem);

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmModal(true);
    } else {
      onCancel();
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmModal(false);
    onCancel();
  };

  const handleKeepEditing = () => {
    setShowConfirmModal(false);
  };
  
  const handleSave = () => {
    onSave(localWorkItem);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalWorkItem(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDescriptionChange = (html: string) => {
    setLocalWorkItem(prev => ({...prev, description: html }));
  };

  const handleUserChange = (fieldName: 'assignee' | 'reporter', userId: string) => {
    const user = ALL_USERS.find(u => u.id === userId);
    if (user) {
      setLocalWorkItem(prev => ({ ...prev, [fieldName]: user }));
    }
  };
  
  const handleGenerateSummary = async () => {
    if (!localWorkItem.title || !localWorkItem.description) {
      alert("Please provide a title and description before generating a summary.");
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const summary = await generateSummary(localWorkItem.title, localWorkItem.description);
      setLocalWorkItem(prev => ({ ...prev, summary }));
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("Could not generate summary. Please try again.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

    const filteredEpics = useMemo(() => {
        if (!epicSearch || epics.find(item => `[${item.id}] ${item.name}` === epicSearch)) {
            return epics;
        }
        const lowercasedQuery = epicSearch.toLowerCase();
        return epics.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) ||
            item.id.toLowerCase().includes(lowercasedQuery)
        );
    }, [epics, epicSearch]);

    const handleSelectEpic = (epic?: Epic) => {
        setLocalWorkItem(prev => ({ ...prev, epicId: epic?.id, epicInfo: epic ? { id: epic.id, name: epic.name, color: epic.color } : undefined }));
        setEpicSearch(epic ? `[${epic.id}] ${epic.name}` : '');
        setIsEpicDropdownOpen(false);
    };

    const filteredTeams = useMemo(() => {
        if (!teamSearch || teams.find(item => item.name === teamSearch)) {
            return teams;
        }
        const lowercasedQuery = teamSearch.toLowerCase();
        return teams.filter(item => item.name.toLowerCase().includes(lowercasedQuery));
    }, [teams, teamSearch]);

    const handleSelectTeam = (team?: Team) => {
        setLocalWorkItem(prev => ({ ...prev, teamId: team?.id, teamInfo: team ? { id: team.id, name: team.name } : undefined }));
        setTeamSearch(team ? team.name : '');
        setIsTeamDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (epicDropdownRef.current && !epicDropdownRef.current.contains(e.target as Node)) {
                setIsEpicDropdownOpen(false);
                const selected = epics.find(item => item.id === localWorkItem.epicId);
                setEpicSearch(selected ? `[${selected.id}] ${selected.name}` : '');
            }
            if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
                setIsTeamDropdownOpen(false);
                const selected = teams.find(item => item.id === localWorkItem.teamId);
                setTeamSearch(selected ? selected.name : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [localWorkItem.epicId, epics, localWorkItem.teamId, teams]);

  
  const availableStatuses = isNew ? [Status.BACKLOG, Status.TODO] : [originalWorkItem.status, ...(WORKFLOW_RULES[originalWorkItem.status!] || [])];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4" onMouseDown={handleBackdropMouseDown}>
      <div ref={editorContainerRef} className="bg-[#F0F4F4] rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b bg-white/60 rounded-t-lg">
          <h2 className="text-xl font-bold text-[#3B3936]">
            {isNew ? t('createNewItem') : `${t('editing')} ${originalWorkItem.id}`}
          </h2>
          <button onClick={handleCancel} className="p-1 rounded-full hover:bg-gray-200">
            <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
          </button>
        </header>
        
        <main className="flex-1 flex overflow-hidden p-4 gap-4">
          <div className="flex-[2] overflow-y-auto pr-2 space-y-4">
            {/* Title */}
            <input
              type="text"
              name="title"
              value={localWorkItem.title || ''}
              onChange={handleChange}
              placeholder={t('title')}
              className="w-full text-lg font-semibold px-2 py-1 border-b-2 border-transparent focus:border-[#486966] focus:outline-none bg-transparent text-[#3B3936] rounded"
              data-highlight-key="title"
              required
            />
            {/* Summary */}
            <div data-highlight-key="summary">
              <label className="block text-sm font-medium text-[#486966] mb-1">{t('aiPoweredSummary')}</label>
              <textarea
                name="summary"
                value={localWorkItem.summary || ''}
                onChange={handleChange}
                placeholder="A concise AI-generated summary will appear here."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
              />
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="mt-2 text-sm text-[#486966] hover:underline disabled:text-gray-400"
              >
                {isGeneratingSummary ? 'Generating...' : t('generateSummary')}
              </button>
            </div>
            
            {/* Description */}
            <div data-highlight-key="description">
              <label className="block text-sm font-medium text-[#486966] mb-1">{t('description')}</label>
               <RichTextEditor
                    value={localWorkItem.description || ''}
                    onChange={handleDescriptionChange}
                    onValidityChange={setIsDescriptionOverLimit}
                />
            </div>

            {/* Checklist */}
            <div data-highlight-key="checklist">
              <label className="block text-sm font-medium text-[#486966] mb-1">{t('checklist')}</label>
              <ChecklistInput items={localWorkItem.checklist || []} onChange={(items) => setLocalWorkItem(prev => ({...prev, checklist: items}))} />
            </div>

            {/* Attachments */}
             <div data-highlight-key="attachments">
              <label className="block text-sm font-medium text-[#486966] mb-1">{t('attachments')}</label>
              <AttachmentsManager attachments={localWorkItem.attachments || []} onChange={(atts) => setLocalWorkItem(prev => ({...prev, attachments: atts}))} />
            </div>
            
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 bg-white/50 p-4 rounded-lg">
            <h3 className="font-semibold border-b pb-2 text-[#3B3936]">Details</h3>
            
            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-[#3B3936] my-auto">{t('status')}</label>
              <select name="status" value={localWorkItem.status || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="status">
                {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
             {/* Assignee & Reporter */}
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-[#3B3936] my-auto">{t('assignee')}</label>
              <select value={localWorkItem.assignee?.id || ''} onChange={(e) => handleUserChange('assignee', e.target.value)} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="assignee">
                {ALL_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-[#3B3936] my-auto">{t('reporter')}</label>
              <select value={localWorkItem.reporter?.id || ''} onChange={(e) => handleUserChange('reporter', e.target.value)} disabled={!isNew} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966] disabled:bg-gray-100" data-highlight-key="reporter">
                {ALL_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
            
            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-[#3B3936] my-auto">{t('type')}</label>
              <select name="type" value={localWorkItem.type || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="type">
                {WORK_ITEM_TYPES.filter(t => t !== WorkItemType.EPIC).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-[#3B3936] my-auto">{t('priority')}</label>
              <select name="priority" value={localWorkItem.priority || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="priority">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Team */}
            <div className="grid grid-cols-2 gap-4" ref={teamDropdownRef} data-highlight-key="teamId">
                <label className="text-sm font-medium text-[#3B3936] my-auto">Team</label>
                <div className="relative">
                    <input
                        type="text"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        onFocus={() => setIsTeamDropdownOpen(true)}
                        placeholder="Assign to a team..."
                        className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
                    />
                    {isTeamDropdownOpen && (
                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                            <li onClick={() => handleSelectTeam(undefined)} className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">None</li>
                            {filteredTeams.map(item => (
                                <li key={item.id} onClick={() => handleSelectTeam(item)} className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

             {/* Epic */}
             <div className="grid grid-cols-2 gap-4" ref={epicDropdownRef} data-highlight-key="epicId">
                <label className="text-sm font-medium text-[#3B3936] my-auto">{t('epic')}</label>
                <div className="relative">
                    <input
                        type="text"
                        value={epicSearch}
                        onChange={(e) => setEpicSearch(e.target.value)}
                        onFocus={() => setIsEpicDropdownOpen(true)}
                        placeholder="Link to an epic..."
                        className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
                    />
                    {isEpicDropdownOpen && (
                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                            <li onClick={() => handleSelectEpic(undefined)} className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">None</li>
                            {filteredEpics.map(item => (
                                <li key={item.id} onClick={() => handleSelectEpic(item)} className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
                                    <span className="font-semibold">[{item.id}]</span> {item.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Other Fields */}
            {['sprint', 'stack', 'estimationPoints', 'effortHours', 'dueDate'].map(field => (
                 <div key={field} className="grid grid-cols-2 gap-4">
                    <label className="text-sm font-medium text-[#3B3936] my-auto">{t(field as any)}</label>
                    {field === 'dueDate' ? (
                       <input type="date" name="dueDate" value={localWorkItem.dueDate?.split('T')[0] || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="dueDate" />
                    ) : field === 'sprint' ? (
                       <select name="sprint" value={localWorkItem.sprint || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="sprint">
                         {SPRINTS.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    ) : field === 'stack' ? (
                        <select name="stack" value={localWorkItem.stack || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key="stack">
                          {STACKS.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    ) : (
                       <input type="number" name={field} value={(localWorkItem as any)[field] || ''} onChange={handleChange} className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]" data-highlight-key={field} />
                    )}
                 </div>
            ))}

            {/* Labels */}
            <div data-highlight-key="labels">
              <label className="block text-sm font-medium text-[#486966] mb-1">{t('labels')}</label>
              <LabelInput labels={localWorkItem.labels || []} onChange={(labels) => setLocalWorkItem(prev => ({...prev, labels }))} />
            </div>
            
          </div>
        </main>
        
        <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
          <button onClick={handleCancel} className="py-2 px-4 border border-[#889C9B] rounded-md text-sm font-medium text-[#3B3936] hover:bg-gray-100">{t('cancel')}</button>
          <button onClick={handleSave} disabled={!hasChanges || isDescriptionOverLimit} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#486966] hover:bg-[#3a5a58] disabled:bg-gray-400 disabled:cursor-not-allowed">{t('saveChanges')}</button>
        </footer>
      </div>
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <div className="bg-white p-6 rounded-lg shadow-xl text-center" onMouseDown={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2 text-[#3B3936]">{t('discardChangesTitle')}</h3>
                <p className="mb-4 text-[#3B3936]">{t('discardChangesBody')}</p>
                <div className="flex justify-center gap-3">
                    <button onClick={handleConfirmDiscard} className="bg-[#BD2A2E] text-white px-4 py-2 rounded">{t('yesDiscard')}</button>
                    <button onClick={handleKeepEditing} className="bg-gray-200 px-4 py-2 rounded text-[#3B3936]">{t('noKeepEditing')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};