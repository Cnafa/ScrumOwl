import React from 'react';
import { ScrumOwlLogoIcon } from './icons';

interface OnboardingScreenProps {
    onShowCreate: () => void;
    onShowJoin: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onShowCreate, onShowJoin }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0F4F4]">
            <div className="text-center p-8 bg-white/70 rounded-2xl shadow-lg backdrop-blur-sm max-w-md">
                 <div className="flex items-center justify-center gap-2">
                    <ScrumOwlLogoIcon className="h-10 w-auto" />
                    <h1 className="text-3xl font-bold text-[#3B3936]">Welcome to ScrumOwl!</h1>
                </div>
                <p className="text-gray-600 mt-2">Let's get you set up.</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={onShowCreate} className="py-2.5 px-6 bg-[#486966] text-white rounded-md hover:bg-[#3a5a58] font-semibold">
                        Create a new Board
                    </button>
                    <button onClick={onShowJoin} className="py-2.5 px-6 bg-white border border-[#486966] text-[#486966] rounded-md hover:bg-primarySoft font-semibold">
                        Join an existing Board
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingScreen;