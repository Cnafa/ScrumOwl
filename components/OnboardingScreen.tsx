import React from 'react';

const OnboardingScreen: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0F4F4]">
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-[#3B3936]">Welcome to ScrumOwl!</h1>
                <p className="text-gray-600 mt-2">Let's get you set up.</p>
                <div className="mt-6 flex gap-4 justify-center">
                    <button className="py-2 px-4 bg-[#486966] text-white rounded-md hover:bg-[#3a5a58]">
                        Create a new Board
                    </button>
                    <button className="py-2 px-4 border border-[#486966] text-[#486966] rounded-md hover:bg-gray-100">
                        Join an existing Board
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingScreen;
