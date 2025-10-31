
// components/Datepicker.tsx
import React from 'react';

interface DatepickerProps {
    value: string; // Expects "YYYY-MM-DD"
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    className?: string;
    'data-highlight-key'?: string;
    required?: boolean;
}

export const Datepicker: React.FC<DatepickerProps> = ({ value, onChange, name, className, 'data-highlight-key': dataHighlightKey, required }) => {
    return (
        <input
            type="date"
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#486966] ${className}`}
            data-highlight-key={dataHighlightKey}
            required={required}
        />
    );
};
      