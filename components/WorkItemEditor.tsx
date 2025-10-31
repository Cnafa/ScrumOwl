// components/WorkItemEditor.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkItem, Status, Priority, WorkItemType, Epic, Team } from '../types';
import { useLocale } from '../context/LocaleContext';
// FIX: Add missing LayoutKanbanIcon and ClipboardCheckIcon.
import { XMarkIcon, TypeIcon, FileTextIcon, UserRoundIcon, MilestoneIcon, BoxesIcon, TimerIcon, CalendarIcon, FlagIcon, PaperclipIcon, CheckSquareIcon, GitBranchIcon, TagIcon, UsersRoundIcon, MountainIcon, LayoutKanbanIcon, ClipboardCheckIcon } from './icons';
import { ALL_USERS, PRIORITIES, SPRINTS, STACKS, WORK_ITEM_TYPES, WORKFLOW_RULES } from '../constants';
import { LabelInput } from './LabelInput';
import { ChecklistInput } from './ChecklistInput';
import { AttachmentsManager } from './AttachmentsManager';
import { generateSummary } from '../services/geminiService';
import { isEqual } from 'lodash-es';
import { RichTextEditor } from './RichTextEditor';
import { DateField } from './DateField';

interface WorkItemEditorProps {
  workItem: Partial<WorkItem>;
  epics: Epic[];
  teams: Team[];
  onSave: (item: Partial<WorkItem>) => void;
  onCancel: () => void;
  isNew: boolean;
  highlightSection?: string;
}

const FieldWrapper: React.FC<{ icon: React.ReactNode, label: string, children: React.ReactNode, highlightKey?: string }> = ({ icon, label, children, highlightKey }) => (
    <div className="grid grid-cols-[36px_1fr] items-center gap-x-3" data-highlight-key={highlightKey}>
        <div className="flex items-center justify-center text-slate-500">{icon}</div>
        <div>{children}</div>
    </div>
);


export const WorkItemEditor: React.FC<WorkItemEditorProps> = ({ workItem, epics, teams, onSave, onCancel, isNew, highlightSection }) => {
  const { t } = useLocale();
  const [localWorkItem, setLocalWorkItem] = useState<Partial<WorkItem>>(workItem);
  const [originalWorkItem, setOriginalWorkItem] = useState<Partial<WorkItem>>(workItem);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isDescriptionOverLimit, setIsDescriptionOverLimit] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const epicDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setLocalWorkItem(workItem);
    setOriginalWorkItem(workItem);
    const selectedEpic = epics.find(e => e.id === workItem.epicId);
    // setEpicSearch(selectedEpic ? `[${selectedEpic.id}] ${selectedEpic.name}`: '');
    const selectedTeam = teams.find(t => t.id === workItem.teamId);
    // setTeamSearch(selectedTeam ? selectedTeam.name : '');
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

    const handleSelectEpic = (epic?: Epic) => {
        setLocalWorkItem(prev => ({ ...prev, epicId: epic?.id, epicInfo: epic ? { id: epic.id, name: epic.name, color: epic.color } : undefined }));
    };

    const handleSelectTeam = (team?: Team) => {
        setLocalWorkItem(prev => ({ ...prev, teamId: team?.id, teamInfo: team ? { id: team.id, name: team.name } : undefined }));
    };

    const SelectWithIcon: React.FC<{ icon: React.ReactNode, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, name: string, highlightKey: string, disabled?: boolean }> = ({ icon, value, onChange, children, name, highlightKey, disabled }) => (
        <div className="relative w-full" data-highlight-key={highlightKey}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">{icon}</div>
            <select name={name} value={value} onChange={onChange} disabled={disabled} className="w-full pl-10 pr-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50">
                {children}
            </select>
        </div>
    );
  
  const availableStatuses = isNew ? [Status.BACKLOG, Status.TODO] : [originalWorkItem.status, ...(WORKFLOW_RULES[originalWorkItem.status!] || [])];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4" onMouseDown={handleBackdropMouseDown}>
      <div ref={editorContainerRef} className="bg-slate-50 rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-3 border-b bg-white rounded-t-lg">
          <h2 className="text-lg font-bold text-slate-800">
            {isNew ? t('createNewItem') : `${t('editing')} ${originalWorkItem.id}`}
          </h2>
          <button onClick={handleCancel} className="p-1 rounded-full hover:bg-slate-200">
            <XMarkIcon className="w-6 h-6 text-slate-500" />
          </button>
        </header>
        
        <main className="flex-1 flex overflow-hidden p-3 gap-3">
          <div className="flex-[2] overflow-y-auto pr-2 space-y-4">
            {/* Title */}
            <FieldWrapper icon={<TypeIcon className="w-5 h-5"/>} label={t('title')} highlightKey="title">
                <input
                  type="text" name="title" value={localWorkItem.title || ''} onChange={handleChange}
                  placeholder={t('title')} required
                  className="w-full text-lg font-semibold px-2 py-1 border-b-2 border-transparent focus:border-primary focus:outline-none bg-transparent text-slate-800 rounded"
                />
            </FieldWrapper>

            {/* Summary */}
            <FieldWrapper icon={<FileTextIcon className="w-5 h-5"/>} label={t('aiPoweredSummary')} highlightKey="summary">
                <textarea
                    name="summary" value={localWorkItem.summary || ''} onChange={handleChange}
                    placeholder="A concise AI-generated summary will appear here." rows={2}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="button" onClick={handleGenerateSummary} disabled={isGeneratingSummary}
                    className="mt-1 text-xs text-primary hover:underline disabled:text-slate-400">
                    {isGeneratingSummary ? 'Generating...' : t('generateSummary')}
                </button>
            </FieldWrapper>
            
            <RichTextEditor
                value={localWorkItem.description || ''}
                onChange={handleDescriptionChange}
                onValidityChange={setIsDescriptionOverLimit}
            />
            
            <FieldWrapper icon={<CheckSquareIcon className="w-5 h-5"/>} label={t('checklist')} highlightKey="checklist">
              <ChecklistInput items={localWorkItem.checklist || []} onChange={(items) => setLocalWorkItem(prev => ({...prev, checklist: items}))} />
            </FieldWrapper>

             <FieldWrapper icon={<PaperclipIcon className="w-5 h-5"/>} label={t('attachments')} highlightKey="attachments">
              <AttachmentsManager attachments={localWorkItem.attachments || []} onChange={(atts) => setLocalWorkItem(prev => ({...prev, attachments: atts}))} />
            </FieldWrapper>
            
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 bg-white/50 p-3 rounded-lg">
            
            <SelectWithIcon icon={<LayoutKanbanIcon className="w-4 h-4" />} name="status" value={localWorkItem.status || ''} onChange={handleChange} highlightKey="status">
                {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectWithIcon>

            <SelectWithIcon icon={<UserRoundIcon className="w-4 h-4" />} name="assignee" value={localWorkItem.assignee?.id || ''} onChange={(e) => handleUserChange('assignee', e.target.value)} highlightKey="assignee">
                {ALL_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </SelectWithIcon>

            <SelectWithIcon icon={<UserRoundIcon className="w-4 h-4" />} name="reporter" value={localWorkItem.reporter?.id || ''} onChange={(e) => handleUserChange('reporter', e.target.value)} highlightKey="reporter" disabled={!isNew}>
                {ALL_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </SelectWithIcon>
            
            <SelectWithIcon icon={<ClipboardCheckIcon className="w-4 h-4" />} name="type" value={localWorkItem.type || ''} onChange={handleChange} highlightKey="type">
                {WORK_ITEM_TYPES.filter(t => t !== WorkItemType.EPIC && t !== WorkItemType.TICKET).map(type => <option key={type} value={type}>{type}</option>)}
            </SelectWithIcon>

            <SelectWithIcon icon={<FlagIcon className="w-4 h-4" />} name="priority" value={localWorkItem.priority || ''} onChange={handleChange} highlightKey="priority">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </SelectWithIcon>
            
            <SelectWithIcon icon={<UsersRoundIcon className="w-4 h-4" />} name="teamId" value={localWorkItem.teamId || ''} onChange={e => handleSelectTeam(teams.find(t => t.id === e.target.value))} highlightKey="teamId">
                <option value="">No Team</option>
                {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
            </SelectWithIcon>
            
            <SelectWithIcon icon={<MountainIcon className="w-4 h-4" />} name="epicId" value={localWorkItem.epicId || ''} onChange={e => handleSelectEpic(epics.find(epic => epic.id === e.target.value))} highlightKey="epicId">
                 <option value="">No Epic</option>
                {epics.map(item => <option key={item.id} value={item.id}>[{item.id}] {item.name}</option>)}
            </SelectWithIcon>

             <SelectWithIcon icon={<MilestoneIcon className="w-4 h-4" />} name="sprint" value={localWorkItem.sprint || ''} onChange={handleChange} highlightKey="sprint">
                {SPRINTS.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectWithIcon>
            
             <SelectWithIcon icon={<BoxesIcon className="w-4 h-4" />} name="stack" value={localWorkItem.stack || ''} onChange={handleChange} highlightKey="stack">
                {STACKS.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectWithIcon>

            <div className="relative" data-highlight-key="dueDate">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500"><CalendarIcon className="w-4 h-4" /></div>
                <DateField 
                    value={localWorkItem.dueDate || null}
                    onChange={(date) => setLocalWorkItem(prev => ({ ...prev, dueDate: date || '' }))}
                    minDate={new Date()}
                    className="pl-10"
                />
            </div>
            
             <div className="relative" data-highlight-key="estimationPoints">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500"><TimerIcon className="w-4 h-4" /></div>
                <input type="number" name="estimationPoints" value={(localWorkItem as any).estimationPoints || ''} onChange={handleChange} className="w-full pl-10 pr-3 py-2 min-h-[36px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" placeholder={t('estimationPoints')} />
            </div>

            <div data-highlight-key="labels">
              <LabelInput labels={localWorkItem.labels || []} onChange={(labels) => setLocalWorkItem(prev => ({...prev, labels }))} />
            </div>
            
          </div>
        </main>
        
        <footer className="p-3 border-t bg-slate-100 flex justify-end gap-2 rounded-b-lg">
          <button onClick={handleCancel} className="py-2 px-3 border border-slate-400 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-200">{t('cancel')}</button>
          <button onClick={handleSave} disabled={!hasChanges || isDescriptionOverLimit} className="py-2 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">{t('saveChanges')}</button>
        </footer>
      </div>
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <div className="bg-white p-6 rounded-lg shadow-xl text-center" onMouseDown={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2 text-slate-800">{t('discardChangesTitle')}</h3>
                <p className="mb-4 text-slate-700">{t('discardChangesBody')}</p>
                <div className="flex justify-center gap-3">
                    <button onClick={handleConfirmDiscard} className="bg-red-600 text-white px-4 py-2 rounded-lg">{t('yesDiscard')}</button>
                    <button onClick={handleKeepEditing} className="bg-slate-200 px-4 py-2 rounded-lg text-slate-800">{t('noKeepEditing')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};