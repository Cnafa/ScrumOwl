import React from 'react';

const PendingApprovalScreen: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0F4F4]">
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-[#3B3936]">Request Sent</h1>
                <p className="text-gray-600 mt-2">Your request to join the board has been sent to the administrator.</p>
                <p className="text-gray-600">You will be notified once your request is approved.</p>
            </div>
        </div>
    );
};

export default PendingApprovalScreen;
