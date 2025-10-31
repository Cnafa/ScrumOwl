
// components/DateTimePicker.tsx
import React from 'react';

interface DateTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
}

const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const d = new Date(date);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const formatTime = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[1].slice(0, 5);
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(value);
        const [year, month, day] = e.target.value.split('-').map(Number);
        newDate.setFullYear(year, month - 1, day);
        onChange(newDate);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(value);
        const [hours, minutes] = e.target.value.split(':').map(Number);
        newDate.setHours(hours, minutes);
        onChange(newDate);
    };

    return (
        <div className="flex gap-2">
            <input
                type="date"
                value={formatDate(value)}
                onChange={handleDateChange}
                className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
            />
            <input
                type="time"
                value={formatTime(value)}
                onChange={handleTimeChange}
                className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966]"
            />
        </div>
    );
};
      