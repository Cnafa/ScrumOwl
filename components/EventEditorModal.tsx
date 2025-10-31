import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { CalendarEvent, WorkItem, User, Team, Conflict } from '../types';
import { XMarkIcon } from './icons';
import { ALL_USERS } from '../constants';
import * as calendarService from '../services/calendarService';
import { debounce } from 'lodash-es';
import { useLocale } from '../context/LocaleContext';

interface EventEditorModalProps {
    event: Partial<CalendarEvent> | null;
    workItems: WorkItem[];
    teams: Team[];
    onSave: (event: Partial<CalendarEvent>) => void;
    onClose: () => void;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({ event, workItems, teams, onSave, onClose }) => {
    const { t } = useLocale();
    const [localEvent, setLocalEvent] = useState<Partial<CalendarEvent>>(
        event || { title: '', start: new Date(), end: new Date(), allDay: false, attendees: [] }
    );
    
    // Work Item Linking State
    const [workItemSearch, setWorkItemSearch] = useState('');
    const [isWorkItemDropdownOpen, setIsWorkItemDropdownOpen] = useState(false);
    const workItemDropdownRef = useRef<HTMLDivElement>(null);

    // Attendee Selection State
    const [attendeeTab, setAttendeeTab] = useState<'users' | 'teams'>('users');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set(event?.attendees?.map(u => u.id) || []));
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set(event?.teamIds || []));

    // Conflict State
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

    const checkConflicts = useCallback(debounce(async (eventData: Partial<CalendarEvent>) => {
        setIsCheckingConflicts(true);
        const previewConflicts = await calendarService.getConflictsPreview(eventData, teams);
        setConflicts(previewConflicts);
        setIsCheckingConflicts(false);
    }, 500), [teams]);

    useEffect(() => {
        const selectedUsers = ALL_USERS.filter(u => selectedUserIds.has(u.id));
        const updatedEvent = { ...localEvent, attendees: selectedUsers, teamIds: Array.from(selectedTeamIds) };
        setLocalEvent(updatedEvent);
        checkConflicts(updatedEvent);
    }, [selectedUserIds, selectedTeamIds]);

    useEffect(() => {
        const selectedWorkItem = workItems.find(item => item.id === event?.linkedWorkItemId);
        if (selectedWorkItem) {
            setWorkItemSearch(`[${selectedWorkItem.id}] ${selectedWorkItem.title}`);
        }
    }, [event, workItems]);

    const filteredWorkItems = useMemo(() => {
        if (!workItemSearch || workItems.find(item => `[${item.id}] ${item.title}` === workItemSearch)) return workItems;
        const lowercasedQuery = workItemSearch.toLowerCase();
        return workItems.filter(item => item.title.toLowerCase().includes(lowercasedQuery) || item.id.toLowerCase().includes(lowercasedQuery));
    }, [workItems, workItemSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let newEventData: Partial<CalendarEvent>;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            newEventData = { ...localEvent, [name]: checked };
        } else if (type === 'datetime-local') {
            newEventData = {...localEvent, [name]: new Date(value)};
        } else {
            newEventData = { ...localEvent, [name]: value };
        }
        setLocalEvent(newEventData);
        checkConflicts(newEventData);
    };

    const handleSelectWorkItem = (item?: WorkItem) => {
        setLocalEvent(prev => ({ ...prev, linkedWorkItemId: item?.id }));
        setWorkItemSearch(item ? `[${item.id}] ${item.title}` : '');
        setIsWorkItemDropdownOpen(false);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(localEvent);
    };
    
    const formatDateForInput = (date?: Date): string => {
        if (!date) return '';
        const d = new Date(date);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <header className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-xl font-bold text-[#3B3936]">{event?.id ? 'Edit Event' : 'New Event'}</h2>
                        <button type="button" onClick={onClose}><XMarkIcon className="w-6 h-6 text-[#889C9B]" /></button>
                    </header>
                    <main className="p-6 space-y-4 flex-1 overflow-y-auto">
                        {conflicts.length > 0 && (
                            <div className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800">
                                <h4 className="font-bold">{t('conflict_warning_title')}</h4>
                                <p className="text-sm">{t('conflict_warning_body')}</p>
                                <ul className="text-xs list-disc pl-5 mt-1">
                                    {conflicts.map(c => <li key={c.user.id}><strong>{c.user.name}</strong> conflicts with {c.overlappingEvents.map(e => `"${e.title}"`).join(', ')}</li>)}
                                </ul>
                            </div>
                        )}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-[#486966] mb-1">{t('title')}</label>
                            <input type="text" id="title" name="title" value={localEvent.title || ''} onChange={handleChange} required className="w-full h-10 px-3 py-2 bg-white border border-[#B2BEBF] rounded-md"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="start" className="block text-sm font-medium text-[#486966] mb-1">Start Time</label>
                                <input type="datetime-local" id="start" name="start" value={formatDateForInput(localEvent.start)} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-white border border-[#B2BEBF] rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="end" className="block text-sm font-medium text-[#486966] mb-1">End Time</label>
                                <input type="datetime-local" id="end" name="end" value={formatDateForInput(localEvent.end)} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-white border border-[#B2BEBF] rounded-md"/>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="description" className="block text-sm font-medium text-[#486966] mb-1">{t('description')}</label>
                            <textarea id="description" name="description" value={localEvent.description || ''} onChange={handleChange} rows={3} className="w-full px-3 py-2 bg-white border border-[#B2BEBF] rounded-md"/>
                        </div>
                        <div ref={workItemDropdownRef}>
                           <label htmlFor="linkedWorkItemId" className="block text-sm font-medium text-[#486966] mb-1">Link to Work Item</label>
                           <div className="relative">
                               <input type="text" id="linkedWorkItemId" value={workItemSearch} onChange={(e) => setWorkItemSearch(e.target.value)} onFocus={() => setIsWorkItemDropdownOpen(true)} placeholder="Search by ID or title..." className="w-full h-10 px-3 py-2 bg-white border border-[#B2BEBF] rounded-md"/>
                               {isWorkItemDropdownOpen && (
                                   <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                       <li onClick={() => handleSelectWorkItem(undefined)} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100">None</li>
                                       {filteredWorkItems.map(item => <li key={item.id} onClick={() => handleSelectWorkItem(item)} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"><span className="font-semibold">[{item.id}]</span> {item.title}</li>)}
                                   </ul>
                               )}
                           </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[#486966] mb-1">{t('attendees')}</label>
                             <div className="border rounded-md">
                                 <div className="flex border-b">
                                     <button type="button" onClick={() => setAttendeeTab('users')} className={`flex-1 p-2 text-sm ${attendeeTab === 'users' ? 'bg-gray-100 font-semibold' : ''}`}>{t('users')}</button>
                                     <button type="button" onClick={() => setAttendeeTab('teams')} className={`flex-1 p-2 text-sm ${attendeeTab === 'teams' ? 'bg-gray-100 font-semibold' : ''}`}>{t('teams')}</button>
                                 </div>
                                 <div className="p-2 max-h-40 overflow-y-auto">
                                     {attendeeTab === 'users' && ALL_USERS.map(user => (
                                         <label key={user.id} className="flex items-center gap-2 p-1">
                                             <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => setSelectedUserIds(prev => { const n = new Set(prev); n.has(user.id) ? n.delete(user.id) : n.add(user.id); return n; })} />
                                             {user.name}
                                         </label>
                                     ))}
                                     {attendeeTab === 'teams' && teams.map(team => (
                                         <label key={team.id} className="flex items-center gap-2 p-1">
                                             <input type="checkbox" checked={selectedTeamIds.has(team.id)} onChange={() => setSelectedTeamIds(prev => { const n = new Set(prev); n.has(team.id) ? n.delete(team.id) : n.add(team.id); return n; })} />
                                             {team.name} ({team.members.length})
                                         </label>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    </main>
                    <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-[#889C9B] rounded-md text-sm font-medium text-[#3B3936] hover:bg-gray-100">{t('cancel')}</button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#486966] hover:bg-[#3a5a58]">{t('save')}</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
