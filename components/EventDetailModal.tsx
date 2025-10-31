
// components/EventDetailModal.tsx
import React from 'react';
import { CalendarEvent, User } from '../types';
import { XMarkIcon } from './icons';
import { useLocale } from '../context/LocaleContext';
import { useBoard } from '../context/BoardContext';

interface EventDetailModalProps {
    event: CalendarEvent;
    onClose: () => void;
    onEdit: (event: CalendarEvent) => void;
    onOpenWorkItem: (workItemId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onEdit, onOpenWorkItem }) => {
    const { t } = useLocale();
    const { can } = useBoard();

    const canEditEvent = can('sprint.manage'); // Or a more specific permission if available

    const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation(); // Prevent modal from closing if link is clicked
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]" onMouseDown={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onMouseDown={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">{event.title}</h2>
                    <div className="flex items-center gap-2">
                        {canEditEvent && (
                             <button onClick={() => onEdit(event)} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#486966] hover:bg-[#3a5a58]">{t('edit')}</button>
                        )}
                        <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
                        </button>
                    </div>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-gray-500">Start Time</p>
                            <p>{new Date(event.start).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-500">End Time</p>
                            <p>{new Date(event.end).toLocaleString()}</p>
                        </div>
                    </div>
                     {event.onlineLink && (
                        <div>
                            <p className="font-semibold text-gray-500 text-sm">{t('online_meeting_link')}</p>
                            <a href={event.onlineLink} target="_blank" rel="noopener noreferrer" onClick={handleOpenLink} className="text-blue-600 hover:underline break-all">
                                {event.onlineLink}
                            </a>
                        </div>
                    )}
                     {event.linkedWorkItemId && (
                        <div>
                            <p className="font-semibold text-gray-500 text-sm">Linked Work Item</p>
                            <button onClick={() => onOpenWorkItem(event.linkedWorkItemId!)} className="text-blue-600 hover:underline">
                                View Task {event.linkedWorkItemId}
                            </button>
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-gray-500 text-sm">{t('description')}</p>
                        <p className="whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-500 text-sm">{t('attendees')}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {event.attendees.map(user => (
                                <div key={user.id} className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                                    <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full" />
                                    <span className="text-xs">{user.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                     {event.hasConflict && (
                        <div className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800">
                            <h4 className="font-bold">{t('conflict_warning_title')}</h4>
                            <p className="text-sm">{t('conflict_warning_body')}</p>
                            <ul className="text-xs list-disc pl-5 mt-1">
                                {event.conflicts?.map(c => <li key={c.user.id}><strong>{c.user.name}</strong> conflicts with {c.overlappingEvents.map(e => `"${e.title}"`).join(', ')}</li>)}
                            </ul>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
      