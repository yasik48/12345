
import React, { useState, useEffect } from 'react';
import Button from './Button';

// Game Configurations
const GAME_CONFIGS = {
  '4x5': { cols: 4, rows: 5, maxMines: 2 }, // Randomly 1 to 2 mines per row
  '5x6': { cols: 5, rows: 6, maxMines: 3 }, // Randomly 1 to 3 mines per row
  '6x7': { cols: 6, rows: 7, maxMines: 4 }, // Randomly 1 to 4 mines per row
};
type GameConfigKey = keyof typeof GAME_CONFIGS;

// Props
interface MinesGameProps {
    balance: number;
    setBalance: React.Dispatch<React.SetStateAction<number>>;
}

const MinesweeperGame: React.FC<MinesGameProps> = ({ balance, setBalance }) => {
    const [bet, setBet] = useState<number | string>(10);
    const [configKey, setConfigKey] = useState<GameConfigKey>('4x5');
    const [gameState, setGameState] = useState<'betting' | 'playing' | 'gameOver'>('betting');
    const [revealMode, setRevealMode] = useState<'win' | 'loss' | null>(null);
    const [mines, setMines] = useState<number[][]>([]); // Mine column indices for each row
    const [playerPath, setPlayerPath] = useState<number[]>([]); // Player's chosen safe column for each row
    const [payouts, setPayouts] = useState<number[]>([]); // Stores the calculated prize for completing each row

    const config = GAME_CONFIGS[configKey];
    const currentRow = playerPath.length;

    useEffect(() => {
        if (gameState === 'betting') {
            const numericBet = Number(bet);
            if (numericBet > balance && balance > 0) {
                setBet(balance);
            } else if (balance === 0) {
                setBet(0);
            }
        }
    }, [balance, bet, gameState]);

    const currentPrize = currentRow > 0 ? (payouts[currentRow - 1] || 0) : 0;
    const nextPrize = currentRow < config.rows ? (payouts[currentRow] || 0) : 0;

    const handleStart = () => {
        const numericBet = Number(bet);
        if (balance < numericBet || numericBet < 1) return;

        setBalance(prev => prev - numericBet);
        setGameState('playing');
        setRevealMode(null);
        setPlayerPath([]);
        
        const newMines = Array.from({ length: config.rows }, () => {
            // Randomize mine count for this row: 1 to maxMines
            const mineCount = Math.floor(Math.random() * config.maxMines) + 1;
            
            const rowMines: number[] = [];
            const positions = Array.from({ length: config.cols }, (_, i) => i);
            for (let m = 0; m < mineCount; m++) {
                if (positions.length === 0) break;
                const randIndex = Math.floor(Math.random() * positions.length);
                rowMines.push(positions.splice(randIndex, 1)[0]);
            }
            return rowMines;
        });
        setMines(newMines);

        // Calculate dynamic payouts for this new grid
        const calculatedPayouts: number[] = [];
        let prizeAccumulator = numericBet;

        for(let i = 0; i < config.rows; i++) {
            const minesInRow = newMines[i].length;
            const safeTiles = config.cols - minesInRow;
            const multiplier = config.cols / safeTiles;
            prizeAccumulator *= multiplier;
            calculatedPayouts.push(prizeAccumulator);
        }
        setPayouts(calculatedPayouts);
    };

    const handleTileClick = (col: number) => {
        if (gameState !== 'playing') return;

        if (mines[currentRow].includes(col)) {
            setPlayerPath(prev => [...prev, col]);
            setGameState('gameOver');
            setRevealMode('loss');
        } else {
            const newPath = [...playerPath, col];
            setPlayerPath(newPath);
            if (newPath.length === config.rows) {
                const finalPrize = payouts[config.rows - 1] || 0;
                setBalance(prev => prev + finalPrize);
                setGameState('gameOver');
                setRevealMode('win');
            }
        }
    };
    
    const handleCashout = () => {
        if (gameState !== 'playing' || currentRow === 0) return;
        setBalance(prev => prev + currentPrize);
        setGameState('gameOver');
        setRevealMode('win');
    };

    const handleBetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setBet(e.target.value); };
    const handleBetInputBlur = () => {
        const numericValue = parseInt(String(bet), 10);
        if (isNaN(numericValue) || numericValue < 1) {
            setBet(1);
        } else {
            setBet(Math.max(1, Math.min(numericValue, Math.floor(balance))));
        }
    };
    
    const isButtonDisabled = gameState === 'playing';

    return (
        <div className="flex flex-col items-center p-4 bg-black/60 backdrop-blur-sm rounded-lg border-2 border-fuchsia-500/50 text-white w-full min-h-[500px] font-sans">
            <h2 className="text-3xl font-bold text-cyan-400 font-serif mb-4" style={{textShadow: '0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 15px #06b6d4'}}>MINES</h2>
            
            <div className="w-full max-w-lg mb-6 p-4 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-lg flex flex-col space-y-4 border border-fuchsia-500/20">
                <div className="flex justify-between items-center text-lg font-bold text-cyan-300">
                    <span>Баланс: ${balance.toFixed(2)}</span>
                </div>
                {/* Bet Input */}
                <div className="flex items-center space-x-2">
                    <label className="text-lg font-semibold text-cyan-300">Ставка:</label>
                    <div className="relative w-24">
                        <span className="text-cyan-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg">$</span>
                        <input type="number" value={bet} onChange={handleBetInputChange} onBlur={handleBetInputBlur} disabled={isButtonDisabled} className="w-full bg-black/50 border-2 border-cyan-700/50 rounded-md text-xl font-bold text-center text-white py-1 pl-7 pr-2 focus:ring-2 focus:ring-fuchsia-500 focus:outline-none disabled:opacity-50" />
                    </div>
                </div>
                 {/* Grid Size Selector */}
                 <div className="flex items-center space-x-2">
                    <label className="text-lg font-semibold text-cyan-300">Размер:</label>
                    {Object.keys(GAME_CONFIGS).map(key => (
                        <Button key={key} onClick={() => { if(gameState !== 'playing') setConfigKey(key as GameConfigKey)}} disabled={isButtonDisabled} className={`!px-3 !py-1 ${configKey === key ? '!bg-fuchsia-600 !text-white' : '!bg-cyan-800/80 !text-cyan-200 hover:!bg-cyan-700'}`}>
                            {key}
                        </Button>
                    ))}
                 </div>
                 
                 {gameState === 'playing' ? (
                     <Button onClick={handleCashout} disabled={currentRow === 0} className="w-full !py-3 !text-xl !font-bold !bg-green-600 hover:!bg-green-700">
                        Забрать ${currentPrize.toFixed(2)}
                     </Button>
                 ) : (
                     <Button onClick={handleStart} disabled={balance < Number(bet) || Number(bet) < 1} className="w-full !py-3 !text-xl !font-bold !bg-fuchsia-600 hover:!bg-fuchsia-700">
                        {gameState === 'gameOver' ? 'Играть снова' : 'Начать игру'}
                    </Button>
                 )}
            </div>

            <div className="flex flex-col-reverse items-center justify-center gap-2" style={{width: `${config.cols * 5}rem`}}>
                {Array.from({ length: config.rows }).map((_, row) => (
                    <div key={row} className="w-full">
                        <div className="text-center text-cyan-300 mb-1 text-sm h-5">
                             {gameState === 'playing' && currentRow > row && `Выигрыш $${(payouts[row] || 0).toFixed(2)}`}
                             {gameState === 'playing' && currentRow === row && `След. $${nextPrize.toFixed(2)}`}
                        </div>
                        <div className={`grid gap-2 w-full`} style={{gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`}}>
                        {Array.from({ length: config.cols }).map((_, col) => {
                            const isCurrentPlayableRow = gameState === 'playing' && currentRow === row;

                            let tileContent = '';
                            let tileClasses = `relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-4xl rounded-lg transition-all duration-200`;

                            if (gameState === 'gameOver') {
                                const isMine = mines[row]?.includes(col);
                                const isOnPath = playerPath.length > row && playerPath[row] === col;
                                const isLosingClick = revealMode === 'loss' && isOnPath && isMine;

                                if (isMine) tileContent = '💣';
                                else if (isOnPath) tileContent = '💎';
                                
                                if (isLosingClick) {
                                    tileClasses += ' !bg-red-500/50 !border-red-400';
                                } else if (isOnPath && revealMode === 'loss') {
                                    tileClasses += ' !bg-gray-800/60 !border-gray-600';
                                } else if (isOnPath && revealMode === 'win') {
                                    tileClasses += ' !bg-green-500/50 !border-green-400';
                                } else if (isMine) {
                                    tileClasses += ' !bg-black/50 opacity-80';
                                } else {
                                    tileClasses += ' !bg-black/50 opacity-30';
                                }
                            } else if (gameState === 'playing') {
                                if (playerPath.length > row && playerPath[row] === col) {
                                    tileContent = '💎';
                                    tileClasses += ' !bg-green-500/50 !border-green-400';
                                } else if (currentRow === row) {
                                    tileClasses += ' bg-cyan-900/50 border-2 border-cyan-400 cursor-pointer hover:bg-cyan-800/70';
                                } else {
                                    tileClasses += ' bg-black/50 border-2 border-fuchsia-700/50';
                                }
                            } else { // Betting state
                                tileClasses += ' bg-black/50 border-2 border-fuchsia-700/50 opacity-50';
                            }
                            
                            return (
                                <button
                                    key={col}
                                    onClick={() => handleTileClick(col)}
                                    disabled={!isCurrentPlayableRow}
                                    className={tileClasses}
                                >
                                    <span className={`${tileContent ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{tileContent}</span>
                                </button>
                            );
                        })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MinesweeperGame;
