// components/CalendarGrid.tsx
import React, { useState, useMemo } from 'react';
import { CalendarEvent } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarGridProps {
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ events, onSelectEvent }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);

    const daysInGrid = useMemo(() => {
        const days = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday of the first week

        for (let i = 0; i < 42; i++) { // 6 weeks grid for all month layouts
            days.push(new Date(startDate));
            startDate.setDate(startDate.getDate() + 1);
        }
        return days;
    }, [firstDayOfMonth]);
    
    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach(event => {
            const dateKey = new Date(event.start).toDateString();
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(event);
        });
        return map;
    }, [events]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="h-full flex flex-col bg-white">
            <header className="flex items-center justify-between p-2 border-b">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="w-5 h-5"/></button>
                <h2 className="font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100"><ChevronRightIcon className="w-5 h-5"/></button>
            </header>

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-600 border-b bg-gray-50">
                {weekDays.map(day => <div key={day} className="py-2 border-r last:border-r-0">{day}</div>)}
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l">
                {daysInGrid.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayEvents = eventsByDate.get(day.toDateString()) || [];
                    
                    return (
                        <div key={index} className={`relative p-1 border-r border-b ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/70'}`}>
                            <time
                                dateTime={day.toISOString()}
                                className={`text-xs font-semibold flex items-center justify-center h-6 w-6 rounded-full absolute top-1 right-1 ${isToday ? 'bg-primary text-white' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}
                            >
                                {day.getDate()}
                            </time>
                            <div className="mt-8 space-y-1 overflow-y-auto h-full">
                                {dayEvents.slice(0, 3).map(event => (
                                    <button key={event.id} onClick={() => onSelectEvent(event)} className="w-full text-left text-xs p-1 bg-blue-100 text-blue-800 rounded truncate hover:bg-blue-200">
                                        {event.title}
                                        {event.hasConflict && <span className="text-red-500 font-bold ml-1">!</span>}
                                    </button>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-xs text-center text-gray-500 pt-1">+{dayEvents.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
