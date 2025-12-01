
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Button from './Button';

// --- Props ---
interface JackpotGameProps {
    balance: number;
    setBalance: React.Dispatch<React.SetStateAction<number>>;
}

// --- Constants ---
const SYMBOLS = ['🍒', '🍋', '🍊', '🍉', '🔔', '⭐', '💎', '7'];
const REEL_LENGTH = 40; // How many symbols in the virtual reel strip
const SYMBOL_HEIGHT = 100; // in px, must match CSS

// Payouts are multipliers for the bet amount
const PAYOUTS: { [key: string]: number } = {
    '777': 50,
    '💎💎💎': 25,
    '⭐⭐⭐': 20,
    '🔔🔔🔔': 15,
    '🍉🍉🍉': 10,
    '🍊🍊🍊': 8,
    '🍋🍋🍋': 5,
    '🍒🍒🍒': 3,
};

// --- Helper Functions ---
const generateReel = (): string[] => {
    const reel: string[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
        reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    return reel;
};

// --- UI Sub-components ---
interface ReelProps {
  symbols: string[];
  finalIndex: number | null;
  isSpinning: boolean;
  delay: number;
}

const Reel: React.FC<ReelProps> = ({ symbols, finalIndex, isSpinning, delay }) => {
    const reelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!reelRef.current || finalIndex === null) return;

        if (isSpinning) {
            // 1. Reset to a random starting position instantly
            reelRef.current.style.transition = 'none';
            const startPosition = -(Math.floor(Math.random() * REEL_LENGTH) * SYMBOL_HEIGHT);
            reelRef.current.style.transform = `translateY(${startPosition}px)`;
            reelRef.current.style.filter = 'blur(4px)';

            // 2. Force browser to apply the reset styles before animating
            reelRef.current.offsetHeight; 
            
            // 3. Set up and trigger the animation
            const spinDuration = 2.5 + delay * 0.5; // Total spin duration
            const blurFadeOutDuration = 1.0; // How long the blur fade takes
            // Start fading out the blur before the transform animation ends
            const blurTransitionDelay = Math.max(0, spinDuration - blurFadeOutDuration);

            // Animate both transform (position) and filter (blur)
            reelRef.current.style.transition = `transform ${spinDuration}s cubic-bezier(0.25, 1, 0.5, 1), filter ${blurFadeOutDuration}s ease-out ${blurTransitionDelay}s`;
            
            // The target position is in the "middle" copy of the symbols to avoid edge issues
            const targetPosition = -((REEL_LENGTH + finalIndex) * SYMBOL_HEIGHT);
            
            reelRef.current.style.transform = `translateY(${targetPosition}px)`;
            reelRef.current.style.filter = 'blur(0px)'; // Target state is sharp
        }
    }, [isSpinning, finalIndex, delay, symbols]);

    // Create a very long reel strip by tripling it, to prevent visual gaps during fast spins
    const displaySymbols = useMemo(() => [...symbols, ...symbols, ...symbols], [symbols]);

    return (
        <div className="w-28 h-[100px] md:w-36 overflow-hidden bg-black/50 rounded-lg shadow-inner border-2 border-fuchsia-700/50">
            <div ref={reelRef} className="flex flex-col items-center justify-start">
                {displaySymbols.map((symbol, i) => {
                    let symbolContent;
                    if (symbol === '7') {
                        symbolContent = <span className="neon-seven">{symbol}</span>;
                    } else if (['💎', '⭐', '🔔'].includes(symbol)) {
                        symbolContent = <span className="glowing-symbol">{symbol}</span>;
                    } else {
                        symbolContent = symbol;
                    }
                    return (
                        <div key={i} className="flex items-center justify-center text-6xl md:text-7xl" style={{ height: `${SYMBOL_HEIGHT}px` }}>
                            {symbolContent}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- Main Game Component ---
const JackpotGame: React.FC<JackpotGameProps> = ({ balance, setBalance }) => {
    const [reels, setReels] = useState<string[][]>([generateReel(), generateReel(), generateReel()]);
    const [finalIndices, setFinalIndices] = useState<number[]>([10, 20, 30]); // Initial non-zero positions
    const [isSpinning, setIsSpinning] = useState(false);
    
    const [bet, setBet] = useState<number | string>(10);
    const [message, setMessage] = useState('Сделайте вашу ставку!');

    useEffect(() => {
        if (Number(bet) > balance && balance > 0) {
            setBet(balance);
        } else if (balance === 0) {
            setBet(0);
        }
    }, [balance, bet]);

    const handleSpin = useCallback(() => {
        const numericBet = Number(bet);
        if (isSpinning || balance < numericBet || numericBet < 1) {
            if (balance < numericBet) {
                setMessage("Недостаточно средств!");
            }
            return;
        }

        setBalance(prev => prev - numericBet);
        setMessage("Удачи!");

        // 1. Generate new reels and final indices for THIS spin.
        const newReelsForThisSpin = [generateReel(), generateReel(), generateReel()];
        const newFinalIndices = newReelsForThisSpin.map(() => Math.floor(Math.random() * REEL_LENGTH));

        // 2. Set the state to trigger the re-render and animation.
        setReels(newReelsForThisSpin);
        setFinalIndices(newFinalIndices);
        setIsSpinning(true);

        // 3. Check results after the longest reel stops (2.5s base + 2*0.5s delay = 3.5s)
        setTimeout(() => {
            // The result is determined by the reels and indices we just generated.
            const finalSymbols = newFinalIndices.map((finalIndex, reelIndex) => newReelsForThisSpin[reelIndex][finalIndex]);
            const finalKey = finalSymbols.join('');
            
            let winAmount = 0;
            if (PAYOUTS[finalKey]) {
                winAmount = PAYOUTS[finalKey] * numericBet;
            } else if (finalSymbols.filter(s => s === '🍒').length === 2) {
                winAmount = 2 * numericBet;
            } else if (finalSymbols.filter(s => s === '🍒').length === 1) {
                winAmount = 1 * numericBet; // Win bet back
            }

            if (winAmount > 0) {
                setMessage(`Вы выиграли $${winAmount}!`);
                setBalance(prev => prev + winAmount);
            } else {
                setMessage("Попробуйте еще раз!");
            }

            // 4. Stop the spinning state. The result of the spin remains on screen.
            setIsSpinning(false);
        }, 3500); // Must be slightly longer than the longest animation
    }, [balance, bet, isSpinning, setBalance]);

    // Add keydown listener for 'Enter' key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Do not trigger spin if a modal is open or if the user is in an input/textarea.
            const target = event.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.fixed.inset-0'))) {
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default browser actions
                handleSpin();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup the event listener on component unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleSpin]);

    const changeBet = (newBetValue: number) => {
        if (isSpinning) return;
        const newBet = Math.round(newBetValue);
        // Clamp the bet between 1 and the current balance
        const clampedBet = Math.max(1, Math.min(newBet, balance));
        if (balance === 0) {
            setBet(0);
        } else {
            setBet(clampedBet);
        }
    };

    const handleBetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow users to type, validation happens on blur
        setBet(e.target.value);
    };

    const handleBetInputBlur = () => {
        const numericValue = parseInt(String(bet), 10);
        if (isNaN(numericValue) || numericValue < 1) {
            setBet(1);
        } else {
            changeBet(numericValue);
        }
    };

    const handleBetIncrement = () => {
        const numericBet = Number(bet) || 0;
        let increment = 1;
        if (numericBet >= 100) increment = 25;
        else if (numericBet >= 25) increment = 5;
        changeBet(numericBet + increment);
    };

    const handleBetDecrement = () => {
        const numericBet = Number(bet) || 0;
        let decrement = 1;
        if (numericBet > 100) decrement = 25;
        else if (numericBet > 25) decrement = 5;
        changeBet(numericBet - decrement);
    };
    
    // Set initial position of reels without animation on first load
    useEffect(() => {
        const reelElements = document.querySelectorAll('.reel-anim');
        reelElements.forEach((reel, index) => {
            if (reel instanceof HTMLElement && finalIndices[index] !== null) {
                reel.style.transition = 'none';
                const targetPosition = -((REEL_LENGTH + finalIndices[index]) * SYMBOL_HEIGHT);
                reel.style.transform = `translateY(${targetPosition}px)`;
            }
        });
    }, []); // Empty dependency array means this runs only once on mount


    return (
        <div className="flex flex-col items-center p-4 bg-black/60 backdrop-blur-sm rounded-lg border-2 border-fuchsia-500/50 text-white w-full min-h-[500px] font-sans">
            <h2 className="text-3xl font-bold text-cyan-400 font-serif mb-4" style={{textShadow: '0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 15px #06b6d4'}}>SLOT MACHINE</h2>
            
            {/* Reels */}
            <div className="flex justify-center items-center space-x-4 p-4 bg-black/70 rounded-lg shadow-2xl border-2 border-fuchsia-500">
                {reels.map((reelSymbols, i) => (
                    <Reel
                        key={i}
                        symbols={reelSymbols}
                        finalIndex={finalIndices[i]}
                        isSpinning={isSpinning}
                        delay={i}
                    />
                ))}
            </div>
            
             {/* Message Display */}
             <div className="h-12 flex items-center justify-center mt-4">
                <p className="text-2xl font-bold text-white transition-opacity duration-300" style={{textShadow: '0 0 8px rgba(255, 255, 255, 0.7)'}}>
                    {message}
                </p>
            </div>

            {/* Controls */}
            <div className="w-full max-w-lg mt-4 p-4 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-lg flex flex-col space-y-4 border border-fuchsia-500/20">
                <div className="flex justify-between items-center text-lg font-bold text-cyan-300">
                    <span>Баланс: ${balance}</span>
                    <span>Ставка: ${Number(bet) || 0}</span>
                </div>
                <div className="flex justify-center items-center space-x-2">
                    <Button onClick={handleBetDecrement} disabled={isSpinning || Number(bet) <= 1} variant="secondary" className="!bg-cyan-800/80 !text-cyan-200 hover:!bg-cyan-700">-</Button>
                    <div className="relative w-24">
                        <span className="text-cyan-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg">$</span>
                        <input
                            type="number"
                            value={bet}
                            onChange={handleBetInputChange}
                            onBlur={handleBetInputBlur}
                            disabled={isSpinning}
                            className="w-full bg-black/50 border-2 border-cyan-700/50 rounded-md text-xl font-bold text-center text-white py-1 pl-7 pr-2 focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                        />
                    </div>
                    <Button onClick={handleBetIncrement} disabled={isSpinning || Number(bet) >= balance} variant="secondary" className="!bg-cyan-800/80 !text-cyan-200 hover:!bg-cyan-700">+</Button>
                    <Button onClick={() => changeBet(balance)} disabled={isSpinning || balance <= 0 || Number(bet) === balance} variant="secondary" className="!bg-cyan-600/80 !text-cyan-100 hover:!bg-cyan-500">Max</Button>
                </div>
                 <Button onClick={handleSpin} isLoading={isSpinning} disabled={isSpinning || balance < Number(bet) || Number(bet) < 1} className="w-full !py-3 !text-xl !font-bold !bg-fuchsia-600 hover:!bg-fuchsia-700 active:!bg-fuchsia-800 focus:!ring-fuchsia-500">
                  {isSpinning ? 'Вращение...' : 'Крутить'}
                </Button>
            </div>
        </div>
    );
};

export default JackpotGame;
