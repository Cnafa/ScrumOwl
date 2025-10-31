// components/CalendarGrid.tsx
import React from 'react';
import { CalendarEvent } from '../types';
import { useLocale } from '../context/LocaleContext';

interface CalendarGridProps {
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({ events, onSelectEvent }) => {
    const { t } = useLocale();

    const renderEventsForDay = (dayIndex: number) => {
        // This is a simplified logic for placing events. A real implementation would handle multi-day events and precise time positioning.
        const dayEvents = events.filter(e => new Date(e.start).getDay() === dayIndex)
            .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return dayEvents.map(event => (
            <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                title={
                    event.hasConflict
                        ? `Conflicts:\n${event.conflicts?.map(c => `- ${c.user.name} with "${c.overlappingEvents[0].title}"`).join('\n')}`
                        : ''
                }
                className="bg-blue-100 border-l-4 border-blue-500 rounded p-2 text-xs cursor-pointer hover:bg-blue-200"
            >
                <p className="font-semibold truncate">{event.title}</p>
                <p>{new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                {event.hasConflict && (
                    <span className="mt-1 inline-block text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                        {t('conflict_badge')}
                    </span>
                )}
            </div>
        ));
    };

    return (
        <div className="grid grid-cols-7 h-full border-t border-l">
            {daysOfWeek.map((day, index) => (
                <div key={day} className="border-r border-b">
                    <div className="text-center font-semibold text-sm py-2 border-b">{day}</div>
                    <div className="p-2 space-y-2 overflow-y-auto h-[calc(100%-41px)]">
                        {renderEventsForDay(index)}
                    </div>
                </div>
            ))}
        </div>
    );
};
