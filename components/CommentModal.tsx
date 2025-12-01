
import React, { useState, useEffect, useRef } from 'react';
import { AnalyzedPerson } from '../types';
import Button from './Button';

interface CommentModalProps {
    isOpen: boolean;
    person: AnalyzedPerson | null;
    onClose: () => void;
    onSave: (person: AnalyzedPerson, comment: string, images: string[]) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, person, onClose, onSave }) => {
    const [comment, setComment] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && person) {
            setComment(person.comment || '');
            setImages(person.images || []);
        } else {
            // Reset when closed or no person is provided
            setComment('');
            setImages([]);
        }
    }, [isOpen, person]);

    const handleSave = () => {
        if (person) {
            onSave(person, comment, images);
        }
    };
    
    // Prevent clicks inside the modal from closing it
    const handleModalContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+Enter or Cmd+Enter to save
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
        // Let default 'Enter' behavior (new line) happen.
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64String = event.target?.result as string;
                        setImages(prev => [...prev, base64String]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    if (!isOpen || !person) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-xl text-white border border-indigo-500/50"
                onClick={handleModalContentClick}
            >
                <h2 className="text-2xl font-bold mb-2 text-indigo-400">Comment</h2>
                <p className="text-sm text-gray-300 mb-4">
                    Add or edit details for <span className="font-semibold">{person.name}</span>.
                </p>
                
                <textarea
                    ref={textareaRef}
                    rows={6}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="Type your comment here or paste an image (Ctrl+V)..."
                    className="w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    autoFocus
                ></textarea>

                {images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 p-2 bg-gray-900/50 rounded-md">
                        {images.map((imgSrc, index) => (
                            <div key={index} className="relative group">
                                <img src={imgSrc} className="h-20 w-20 object-cover rounded shadow-md" alt={`Pasted attachment ${index + 1}`} />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-0 right-0 -mt-1.5 -mr-1.5 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}


                <p className="text-xs text-gray-400 mt-2 text-right">
                    Press <kbd className="font-sans bg-gray-600 text-gray-200 rounded px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> to save, <kbd className="font-sans bg-gray-600 text-gray-200 rounded px-1.5 py-0.5 text-xs">Enter</kbd> for a new line.
                </p>

                <div className="mt-4 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CommentModal;
