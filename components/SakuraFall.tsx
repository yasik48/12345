import React from 'react';

const PETAL_COUNT = 40;
const DOLLAR_COUNT = 30;

interface SakuraFallProps {
    mode: 'sakura' | 'dollars';
}

const SakuraFall: React.FC<SakuraFallProps> = ({ mode }) => {
    const items = Array.from({ length: mode === 'sakura' ? PETAL_COUNT : DOLLAR_COUNT }).map((_, i) => {
        const animationName = Math.random() < 0.5 ? 'fall' : 'fall-sway';
        
        const style: React.CSSProperties = {
            left: `${Math.random() * 100}vw`,
            animationName,
            animationDuration: `${Math.random() * 10 + 15}s`, // 15s to 25s
            animationDelay: `${Math.random() * 15}s`,
        };

        if (mode === 'sakura') {
            const size = Math.random() * 8 + 6; // 6px to 14px
            style.width = `${size}px`;
            style.height = `${size * 0.75}px`;
            style.opacity = Math.random() * 0.3 + 0.6;
            const borderRadiusOptions = ['60% 0 60% 0', '0 60% 0 60%', '50%', '80% 0'];
            style.borderRadius = borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
            return <div key={i} className="petal" style={style} />;
        } else { // mode === 'dollars'
            style.fontSize = `${Math.random() * 10 + 18}px`; // 18px to 28px
            return <div key={i} className="dollar" style={style}>💲</div>;
        }
    });

    return <div className="sakura-container" aria-hidden="true">{items}</div>;
};

export default SakuraFall;