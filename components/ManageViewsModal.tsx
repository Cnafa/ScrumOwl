
import React, { useState, useMemo } from 'react';
import { SavedView, ViewVisibility } from '../types';
import { useAuth } from '../context/AuthContext';
import { XMarkIcon } from './icons';

interface ManageViewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedViews: SavedView[];
    onDelete: (viewId: string) => void;
    onPin: (viewId: string) => void;
    onSetDefault: (viewId: string) => void;
    onRename: (viewId: string, newName: string) => void;
    onDuplicate: (view: SavedView) => void;
    onSelectView: (view: SavedView) => void;
}

type Tab = 'MY_VIEWS' | 'GROUP_VIEWS';

export const ManageViewsModal: React.FC<ManageViewsModalProps> = ({ isOpen, onClose, savedViews, onDelete, onPin, onSetDefault, onRename, onDuplicate, onSelectView }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('MY_VIEWS');

    const handleRename = (view: SavedView) => {
        const newName = prompt('Enter new name:', view.name);
        if (newName && newName !== view.name) {
            onRename(view.id, newName);
        }
    };
    
    const handleDelete = (view: SavedView) => {
        if (window.confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
            onDelete(view.id);
        }
    };

    const handleSelectView = (view: SavedView) => {
        onSelectView(view);
        onClose();
    };

    const filteredViews = useMemo(() => {
        if (!user) return [];
        if (activeTab === 'MY_VIEWS') {
            return savedViews.filter(v => v.ownerId === user.id);
        }
        // GROUP_VIEWS
        return savedViews.filter(v => v.visibility === ViewVisibility.GROUP && v.ownerId !== user.id);
    }, [savedViews, user, activeTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">Manage Views</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
                    </button>
                </header>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-6 px-4">
                        <button onClick={() => setActiveTab('MY_VIEWS')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'MY_VIEWS' ? 'border-[#486966] text-[#486966]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            My Views
                        </button>
                        <button onClick={() => setActiveTab('GROUP_VIEWS')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'GROUP_VIEWS' ? 'border-[#486966] text-[#486966]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Group Views
                        </button>
                    </nav>
                </div>

                <main className="flex-1 overflow-y-auto p-4">
                    <div className="align-middle inline-block min-w-full">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredViews.map(view => {
                                    const isOwner = view.ownerId === user?.id;
                                    return (
                                        <tr key={view.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                <button onClick={() => handleSelectView(view)} className="text-gray-900 hover:text-[#486966] text-left hover:underline">
                                                    {view.name}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-3">
                                                    {view.isPinned && isOwner && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800">Pinned</span>}
                                                    {view.isDefault && isOwner && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Default</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                                               {isOwner ? (
                                                   <>
                                                        <button onClick={() => handleRename(view)} className="text-indigo-600 hover:indigo-900">Rename</button>
                                                        <button onClick={() => onPin(view.id)} className="text-indigo-600 hover:indigo-900">{view.isPinned ? 'Unpin' : 'Pin'}</button>
                                                        <button onClick={() => onSetDefault(view.id)} className="text-indigo-600 hover:indigo-900">Set as Default</button>
                                                        <button onClick={() => onDuplicate(view)} className="text-indigo-600 hover:indigo-900">Duplicate</button>
                                                        <button onClick={() => handleDelete(view)} className="text-red-600 hover:red-900">Delete</button>
                                                   </>
                                               ) : (
                                                    <button onClick={() => onDuplicate(view)} className="text-indigo-600 hover:indigo-900">Duplicate</button>
                                               )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                 {filteredViews.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-10 text-sm text-gray-500">No views found in this category.</td>
                                    </tr>
                                 )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};
