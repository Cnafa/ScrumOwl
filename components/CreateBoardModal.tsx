import React from 'react';

const CreateBoardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b">
                    <h2 className="text-xl font-bold text-[#3B3936]">Create a New Board</h2>
                </header>
                <main className="p-6">
                    <p>Board creation form would be here.</p>
                </main>
                 <footer className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="py-2 px-4 border rounded-md">Cancel</button>
                    <button className="py-2 px-4 bg-[#486966] text-white rounded-md">Create</button>
                 </footer>
            </div>
        </div>
    );
};

export default CreateBoardModal;
