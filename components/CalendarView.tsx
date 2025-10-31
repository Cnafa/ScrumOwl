// FIX: Rewritten to fix multiple errors by adopting the structure of the more complete EventsView.tsx
import React, { useState, useEffect } from 'react';
import { CalendarEvent, WorkItem, Team } from '../types';
import * as calendarService from '../services/calendarService';
import { EventEditorModal } from './EventEditorModal';
import { useAuth } from '../context/AuthContext';
import { useBoard } from '../context/BoardContext';
import { useLocale } from '../context/LocaleContext';
import { CalendarGrid } from './CalendarGrid';

interface EventsViewProps {
    workItems: WorkItem[];
    // FIX: Add teams prop which is required by child components and service calls
    teams: Team[];
}

export const EventsView: React.FC<EventsViewProps> = ({ workItems, teams }) => {
    const { user } = useAuth();
    const { can } = useBoard();
    const { t } = useLocale();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    // FIX: Change state to allow partial event for creating new events
    const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    
    // US-30 State
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [scope, setScope] = useState<'my' | 'all'>('my');
    const isScrumMaster = can('sprint.manage');

    // FIX: (Line 17) Create a fetchEvents function to correctly call the service with required arguments.
    const fetchEvents = async () => {
        if (!user) return;
        const effectiveScope = isScrumMaster ? scope : 'my';
        const fetchedEvents = await calendarService.getEvents(effectiveScope, user);
        setEvents(fetchedEvents);
    };

    useEffect(() => {
        calendarService.initializeCalendarEvents(workItems);
        fetchEvents();
    }, [workItems, scope, isScrumMaster, user]);

    // FIX: (Lines 21, 33, 36, 38) Rewrite function to handle create/update correctly and pass all required arguments.
    const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
        if (!user) return;

        if (eventData.id) {
            // This is an update
            const originalEvent = events.find(e => e.id === eventData.id)!;
            const eventToSave: CalendarEvent = {
                ...originalEvent,
                ...eventData,
            };
            await calendarService.updateEvent(eventToSave, teams);
        } else {
            // This is a new event
            const { id, ...newEventData } = eventData;
            await calendarService.createEvent(newEventData as any, user, teams);
        }
        
        await fetchEvents();
        setIsEditorOpen(false);
        setSelectedEvent(null);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsEditorOpen(true);
    };

    const handleAddNewEvent = () => {
        const start = new Date();
        const end = new Date();
        end.setHours(start.getHours() + 1);
        setSelectedEvent({
            title: '',
            start,
            end,
            allDay: false,
            attendees: user ? [user] : [],
            teamIds: []
        });
        setIsEditorOpen(true);
    };
    
    const ViewButton: React.FC<{ mode: 'calendar' | 'list', label: string }> = ({ mode, label }) => (
         <button 
            onClick={() => setView(mode)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${view === mode ? 'bg-[#486966] text-white' : 'text-gray-600 hover:bg-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 bg-white rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div className="flex items-center gap-4">
                     <h2 className="text-xl font-bold text-[#3B3936]">{t('eventsView')}</h2>
                     {isScrumMaster && (
                        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                             <button onClick={() => setScope('my')} className={`px-3 py-1 text-sm rounded-md ${scope === 'my' ? 'bg-white shadow-sm' : ''}`}>{t('my_events')}</button>
                             <button onClick={() => setScope('all')} className={`px-3 py-1 text-sm rounded-md ${scope === 'all' ? 'bg-white shadow-sm' : ''}`}>{t('all_events')}</button>
                        </div>
                     )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        <ViewButton mode="calendar" label={t('calendar_view')} />
                        <ViewButton mode="list" label={t('list_view')} />
                    </div>
                    <button onClick={handleAddNewEvent} className="py-2 px-4 text-sm font-medium rounded-md text-white bg-[#486966] hover:bg-[#3a5a58]">
                        New Event
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
                {view === 'calendar' ? (
                     <CalendarGrid events={events} onSelectEvent={handleSelectEvent} />
                ) : (
                    <div className="overflow-y-auto h-full">
                        <ul className="space-y-2">
                            {events.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(event => (
                                <li key={event.id} onClick={() => handleSelectEvent(event)} className="p-3 border rounded cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-sm text-[#3B3936] flex items-center gap-2">
                                            {event.title}
                                            {event.hasConflict && <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{t('conflict_badge')}</span>}
                                        </p>
                                        <p className="text-xs text-gray-600">{new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}</p>
                                    </div>
                                    <div className="text-xs text-gray-500">{event.attendees.length} attendees</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {isEditorOpen && (
                <EventEditorModal 
                    event={selectedEvent}
                    workItems={workItems}
                    teams={teams}
                    onSave={handleSaveEvent} 
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    );
};
