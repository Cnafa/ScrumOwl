import React from 'react';
import { GoogleIcon, XMarkIcon } from './icons';

interface ReAuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({ onClose, onSuccess }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">Authentication Required</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
                    </button>
                </header>
                <main className="p-6 space-y-4 text-center">
                    <p className="text-slate-700">For your security, please re-authenticate to complete this sensitive action.</p>
                    <button
                        type="button"
                        onClick={onSuccess}
                        className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#486966]"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Continue with Google
                    </button>
                </main>
            </div>
        </div>
    );
};
