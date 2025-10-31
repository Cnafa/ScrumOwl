import React, { useState } from 'react';
import { XMarkIcon } from './icons';

interface JoinBoardModalProps {
    onClose: () => void;
    onJoinRequest: (code: string) => void;
}

const JoinBoardModal: React.FC<JoinBoardModalProps> = ({ onClose, onJoinRequest }) => {
    const [inviteCode, setInviteCode] = useState('');
    
    const handleJoin = () => {
        if (inviteCode.trim()) {
            // Here you would typically validate the code against a backend.
            // For this mock, we'll just proceed.
            onJoinRequest(inviteCode.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">Join a Board</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6 text-[#889C9B]" />
                    </button>
                </header>
                <main className="p-6">
                    <div>
                        <label htmlFor="inviteCode" className="block text-sm font-medium text-[#486966] mb-1">Invite Code</label>
                        <input
                            type="text"
                            id="inviteCode"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Paste your invite code here"
                            required
                            autoFocus
                            className="w-full px-3 py-2 h-10 bg-white border border-[#B2BEBF] rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#486966]"
                        />
                    </div>
                </main>
                 <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="py-2 px-4 border border-slate-400 rounded-md text-slate-800 hover:bg-slate-100">Cancel</button>
                    <button onClick={handleJoin} disabled={!inviteCode.trim()} className="py-2 px-4 bg-[#486966] text-white rounded-md disabled:bg-gray-400">Join</button>
                 </footer>
            </div>
        </div>
    );
};

export default JoinBoardModal;