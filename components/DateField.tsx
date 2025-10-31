// components/DateField.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Helper Functions & Hooks ---

const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
    </svg>
);

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

// --- Sub-components ---

const TimeInput: React.FC<{ value: Date; onChange: (newDate: Date) => void }> = ({ value, onChange }) => {
    const handleTimeChange = (part: 'hours' | 'minutes', val: number) => {
        const newDate = new Date(value);
        if (part === 'hours') newDate.setHours(val);
        else newDate.setMinutes(val);
        onChange(newDate);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, part: 'hours' | 'minutes') => {
        let step = e.shiftKey ? 10 : 1;
        if (part === 'minutes') step = e.shiftKey ? 15 : 5;
        
        const current = part === 'hours' ? value.getHours() : value.getMinutes();
        let newValue = current;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            newValue = current + step;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            newValue = current - step;
        }

        if (part === 'hours') {
            newValue = (newValue + 24) % 24;
        } else {
            newValue = (newValue + 60) % 60;
        }

        handleTimeChange(part, newValue);
    };

    return (
        <div className="flex items-center gap-1 p-2 border-t">
            <input
                type="number"
                value={String(value.getHours()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('hours', parseInt(e.target.value, 10) || 0)}
                onKeyDown={(e) => handleKeyDown(e, 'hours')}
                className="w-14 p-1 text-center bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-[#486966]"
            />
            <span>:</span>
            <input
                type="number"
                value={String(value.getMinutes()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value, 10) || 0)}
                onKeyDown={(e) => handleKeyDown(e, 'minutes')}
                step={5}
                className="w-14 p-1 text-center bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-[#486966]"
            />
        </div>
    );
};

const CalendarPopover: React.FC<{
    displayDate: Date;
    setDisplayDate: (date: Date) => void;
    onSelect: (date: Date) => void;
    selectedDate: Date | null;
    minDate?: Date;
    maxDate?: Date;
    showTime?: boolean;
}> = ({ displayDate, setDisplayDate, onSelect, selectedDate, minDate, maxDate, showTime }) => {
    const month = displayDate.getMonth();
    const year = displayDate.getFullYear();

    const daysInMonth = useMemo(() => {
        const date = new Date(year, month, 1);
        const days = [];
        const firstDayIndex = date.getDay();
        
        // Add padding for previous month
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(null);
        }
        
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [month, year]);
    
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    
    const handleSelectDate = (day: Date) => {
        const newDate = new Date(day);
        if (selectedDate) {
            newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        }
        onSelect(newDate);
    };

    return (
        <div className="absolute top-full mt-2 w-72 bg-white rounded-lg z-[90] shadow-[4px_4px_0px_#889C9B] border-2 border-[#3B3936]">
            <div className="flex justify-between items-center p-2">
                <button onClick={() => setDisplayDate(new Date(year, month - 1))} className="p-1 rounded-full hover:bg-gray-100">&lt;</button>
                <span className="font-semibold">{displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setDisplayDate(new Date(year, month + 1))} className="p-1 rounded-full hover:bg-gray-100">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 pb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 p-1">
                {daysInMonth.map((day, i) => {
                    if (!day) return <div key={`pad-${i}`}></div>;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isDisabled = (minDate && day < minDate) || (maxDate && day > maxDate);
                    return (
                        <button
                            key={day.toISOString()}
                            disabled={isDisabled}
                            onClick={() => handleSelectDate(day)}
                            className={`p-1 text-center rounded aspect-square hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed ${isSelected ? 'bg-[#486966] text-white' : 'text-gray-800'}`}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>
            {showTime && selectedDate && <TimeInput value={selectedDate} onChange={onSelect} />}
        </div>
    );
};

// --- Main Components ---

interface DateFieldProps {
    value: string | Date | null;
    onChange: (date: string | null) => void;
    minDate?: Date;
    maxDate?: Date;
    showTime?: boolean;
    className?: string;
    disabled?: boolean;
}

export const DateField: React.FC<Omit<DateFieldProps, 'showTime'>> = (props) => (
    <BaseDatePicker {...props} showTime={false} />
);

export const DateTimeField: React.FC<Omit<DateFieldProps, 'showTime'>> = (props) => (
    <BaseDatePicker {...props} showTime={true} />
);

const BaseDatePicker: React.FC<DateFieldProps> = ({ value, onChange, minDate, maxDate, showTime = false, className, disabled = false }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
    const [displayDate, setDisplayDate] = useState<Date>(value ? new Date(value) : new Date());
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useClickOutside(wrapperRef, () => setIsOpen(false));

    useEffect(() => {
        setSelectedDate(value ? new Date(value) : null);
        setDisplayDate(value ? new Date(value) : new Date());
    }, [value]);

    const handleSelect = (date: Date) => {
        setSelectedDate(date);
        onChange(date.toISOString());
        if (!showTime) {
            setIsOpen(false);
        }
    };
    
    const formatOptions: Intl.DateTimeFormatOptions = showTime 
        ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
        : { year: 'numeric', month: 'long', day: 'numeric' };

    const displayValue = selectedDate ? new Intl.DateTimeFormat('en-CA', formatOptions).format(selectedDate).replace(/, /g, ' ') : '';
    
    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                 <input
                    type="text"
                    value={displayValue}
                    readOnly
                    onClick={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    placeholder={`Select a ${showTime ? 'date and time' : 'date'}`}
                    className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966] cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                 <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            {isOpen && !disabled && (
                <CalendarPopover
                    displayDate={displayDate}
                    setDisplayDate={setDisplayDate}
                    onSelect={handleSelect}
                    selectedDate={selectedDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    showTime={showTime}
                />
            )}
        </div>
    );
};