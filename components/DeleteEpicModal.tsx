// components/DeleteEpicModal.tsx
import React, { useState, useMemo } from 'react';
import { Epic, WorkItem } from '../types';
import { XMarkIcon } from './icons';

interface DeleteEpicModalProps {
    epic: Epic;
    workItems: WorkItem[];
    onClose: () => void;
    onConfirm: (epicId: string, itemAction: 'detach') => void;
}

export const DeleteEpicModal: React.FC<DeleteEpicModalProps> = ({ epic, workItems, onClose, onConfirm }) => {
    const [confirmation, setConfirmation] = useState('');
    const [itemAction] = useState<'detach'>('detach');

    const associatedItems = useMemo(() => workItems.filter(item => item.epicId === epic.id), [workItems, epic]);
    const isConfirmed = confirmation === epic.name;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isConfirmed) {
            onConfirm(epic.id, itemAction);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-red-700">Delete Epic</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <p>
                        You are about to delete the epic: <strong className="font-bold text-gray-800">{epic.name}</strong>.
                        This action cannot be undone immediately after confirmation (only restored later).
                    </p>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="font-semibold text-yellow-800">This epic has {associatedItems.length} associated work item(s).</p>
                        <div className="mt-2">
                             <label className="flex items-center gap-2">
                                <input type="radio" name="itemAction" value="detach" checked={itemAction === 'detach'} readOnly className="h-4 w-4 text-[#486966] focus:ring-[#486966]" />
                                <span className="text-sm">Detach items and move to 'No Epic' (Default)</span>
                            </label>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700">
                            To confirm, please type the epic name: <span className="font-mono text-sm">{epic.name}</span>
                        </label>
                        <input
                            type="text"
                            id="confirmation"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="w-full mt-1 px-3 py-2 h-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </main>
                <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 border rounded-md">Cancel</button>
                    <button type="submit" disabled={!isConfirmed} className="py-2 px-4 bg-red-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Delete Epic
                    </button>
                </footer>
            </form>
        </div>
    );
};