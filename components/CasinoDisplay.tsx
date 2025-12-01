
import React, { useState } from 'react';
import JackpotGame from './JackpotGame';
import MinesweeperGame from './MinesweeperGame';

const CasinoDisplay: React.FC = () => {
    const [activeGame, setActiveGame] = useState<'slots' | 'mines'>('slots');
    const [balance, setBalance] = useState(1000); // Shared balance state

    const getTabClassName = (game: 'slots' | 'mines') => {
        const isActive = activeGame === game;
        return `py-2 px-4 font-bold text-lg rounded-t-lg transition-all duration-200 cursor-pointer ${
            isActive
                ? 'bg-fuchsia-600 text-white shadow-inner'
                : 'bg-black/50 text-fuchsia-400 hover:bg-fuchsia-900/50'
        }`;
    };

    return (
        <div>
            <div className="flex justify-center space-x-1 sm:space-x-2 mb-0 border-b-2 border-fuchsia-700/50">
                <div onClick={() => setActiveGame('slots')} className={getTabClassName('slots')}>
                    Jackpot Slots
                </div>
                <div onClick={() => setActiveGame('mines')} className={getTabClassName('mines')}>
                    Mines
                </div>
            </div>

            <div className="pt-6">
                {activeGame === 'slots' && <JackpotGame balance={balance} setBalance={setBalance} />}
                {activeGame === 'mines' && <MinesweeperGame balance={balance} setBalance={setBalance} />}
            </div>
        </div>
    );
};

export default CasinoDisplay;
