
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Button from './Button';
import Input from './Input';
import { AnalyzedPerson, PersonIncome } from '../types';

interface PromptCategory {
  category: string;
  titles: string[];
}

// Default, non-editable categories
const defaultPromptCategories: ReadonlyArray<PromptCategory> = [
    {
      category: 'производство',
      titles: [
        'Первый заместитель', 'Главный инженер', 'Главный технолог', 'Главный механик', 
        'Главный энергетик', 'Заместитель по производству', 'Технический директор', 
        'Коммерческий директор', 'Исполнительный директор', 'Управляющий директор', 
        'Начальник отдела кадров', 'Главный бухгалтер', 'Финансовый директор', 
        'Заместитель по общим вопросам'
      ]
    },
    {
      category: 'торговля',
      titles: [
        'Генеральный директор', 'Начальник отдела кадров', 'директор по персоналу', 
        'Главный бухгалтер', 'Заместитель по общим вопросам', 'Заместитель по комерции'
      ]
    },
    {
      category: 'перевозки',
      titles: [
        'Генеральный директор', 'Начальник отдела кадров (директор по персоналу, руководитель отдела кадров)', 
        'Заместитель по общим вопросам', 'Заместитель по логистике', 'Главный бухгалтер'
      ]
    },
    {
      category: 'Больницы',
      titles: [
        'Директор', 'Заместитель по медицинской части', 'Заместитель поликлинической работе', 
        'Заместитель по общим вопросам', 'Начальник отдела кадров (директор по персоналу, руководитель отдела кадров)', 
        'Главный бухгалтер', 'ГЛАВНАЯ МЕДСЕСТРА'
      ]
    },
    {
      category: 'Школы',
      titles: [
        'Директор', 'Заместитель по УВР', 'Заместитель по учебной работе', 
        'Заместитель по ВР', 'Заместитель по общим вопросам', 'Заместитель по начной работе', 
        'Начальник отдела кадров (директор по персоналу, руководитель отдела кадров)', 'Главный бухгалтер'
      ]
    },
    {
      category: 'Научки',
      titles: [
        'Генеральный директор', 'Заместитель по начной работе', 
        'Главный ученный (научный) сотрудник (руководитель)', 'Первый заместиетль', 
        'Главный инженер', 'Заместитель по общим вопросам', 
        'Начальник отдела кадров (директор по персоналу, руководитель отдела кадров)'
      ]
    },
    {
      category: 'Выдумы',
      titles: [
        'Генеральный директор (директор)', 'Первый заместиетль', 
        'Начальник отдела кадров (директор по персоналу, руководитель отдела кадров)', 
        'Заместитель по общим вопросам', 'Заместитель', 'Главный бухгалтер'
      ]
    },
    {
      category: 'Банки',
      titles: [
        'Председатель правления или Генеральный', 'Первый заместитель', 'Заместитель', 
        'Заместитель по общим вопросам', 'Главный бухгалтер'
      ]
    }
];

// Utility for fuzzy search
const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

interface CategoryModalProps {
    mode: 'add' | 'edit';
    isOpen: boolean;
    onClose: () => void;
    onSave: (categoryName: string, titles: string[]) => void;
    onUpdate: (originalName: string, newName: string, titles: string[]) => void;
    onDelete: (categoryName: string) => void;
    initialData?: PromptCategory;
    existingCategories: string[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, mode, onClose, onSave, onUpdate, onDelete, initialData, existingCategories }) => {
    const [categoryName, setCategoryName] = useState('');
    const [titlesText, setTitlesText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const categoryNameInputRef = useRef<HTMLInputElement>(null);
    const titlesTextareaRef = useRef<HTMLTextAreaElement>(null);


    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setCategoryName(initialData.category);
                setTitlesText(initialData.titles.join('\n'));
            } else {
                // Reset on close or for 'add' mode
                setCategoryName('');
                setTitlesText('');
                setError(null);
            }
             // Auto-focus the first input when the modal opens
            setTimeout(() => categoryNameInputRef.current?.focus(), 100);
        }
    }, [isOpen, mode, initialData]);

    const handleSave = () => {
        const trimmedName = categoryName.trim();
        if (!trimmedName) {
            setError('Category name cannot be empty.');
            return;
        }
        
        // Check for name conflicts
        const isNameTaken = existingCategories.some(c => 
            c.toLowerCase() === trimmedName.toLowerCase() && 
            (mode === 'add' || (mode === 'edit' && initialData?.category.toLowerCase() !== trimmedName.toLowerCase()))
        );

        if (isNameTaken) {
            setError('A category with this name already exists.');
            return;
        }

        const titles = titlesText.split('\n').map(t => t.trim()).filter(Boolean);

        if (mode === 'add') {
            onSave(trimmedName, titles);
        } else if (mode === 'edit' && initialData) {
            onUpdate(initialData.category, trimmedName, titles);
        }
        onClose();
    };

    const handleDelete = () => {
        if (mode === 'edit' && initialData) {
            onDelete(initialData.category);
            onClose();
        }
    };

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+Enter or Cmd+Enter to save
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
        // Let default 'Enter' behavior (new line) happen.
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titlesTextareaRef.current?.focus();
        }
    };

    if (!isOpen) return null;

    const title = mode === 'add' ? 'Add New Category' : 'Edit Category';
    const saveButtonText = mode === 'add' ? 'Save Category' : 'Save Changes';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-white border border-indigo-500/50" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-indigo-400">{title}</h2>
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="modal-category-name" className="block text-sm font-medium text-gray-300 mb-1">Category Name</label>
                        <input
                            id="modal-category-name"
                            ref={categoryNameInputRef}
                            type="text"
                            value={categoryName}
                            onChange={(e) => { setCategoryName(e.target.value); setError(null); }}
                            onKeyDown={handleInputKeyDown}
                            placeholder="e.g., Construction"
                            className="w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="modal-titles" className="block text-sm font-medium text-gray-300 mb-1">Job Titles (one per line)</label>
                        <textarea
                            id="modal-titles"
                            ref={titlesTextareaRef}
                            rows={8}
                            value={titlesText}
                            onChange={(e) => setTitlesText(e.target.value)}
                            onKeyDown={handleTextareaKeyDown}
                            placeholder={"Foreman\nProject Manager\nCivil Engineer"}
                            className="w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        ></textarea>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">
                    Press <kbd className="font-sans bg-gray-600 text-gray-200 rounded px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> to save, <kbd className="font-sans bg-gray-600 text-gray-200 rounded px-1.5 py-0.5 text-xs">Enter</kbd> for a new line.
                </p>
                <div className="mt-4 flex justify-between">
                    <div>
                        {mode === 'edit' && (
                            <Button onClick={handleDelete} className="!bg-red-600 hover:!bg-red-700 active:!bg-red-800 focus:!ring-red-500">Delete</Button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave}>{saveButtonText}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface PromptsDisplayProps {
    orgName: string;
    inn: string;
    reverseOrder: boolean;
    onReverseOrderChange: (checked: boolean) => void;
    experienceList: AnalyzedPerson[];
    setExperienceList: React.Dispatch<React.SetStateAction<AnalyzedPerson[]>>;
    allParsedData: PersonIncome[];
    onOpenCommentModal: (person: AnalyzedPerson, event?: React.MouseEvent<HTMLElement>) => void;
    onPromptCopied: () => void;
}

const PromptsDisplay: React.FC<PromptsDisplayProps> = ({ orgName, inn, reverseOrder, onReverseOrderChange, experienceList, setExperienceList, allParsedData, onOpenCommentModal, onPromptCopied }) => {
    const [customCategories, setCustomCategories] = useState<PromptCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(defaultPromptCategories[0]?.category || null);
    const [copiedTitles, setCopiedTitles] = useState<Set<string>>(new Set());
    const [sequentialCopyIndex, setSequentialCopyIndex] = useState(0);
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | null; data?: PromptCategory }>({ mode: null });
    const [includeOrgName, setIncludeOrgName] = useState(false);
    const [includeInn, setIncludeInn] = useState(false);
    const [manualName, setManualName] = useState('');
    const [justCopiedTitle, setJustCopiedTitle] = useState<string | null>(null);
    const copyAnimationTimeout = useRef<number | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnalyzedPerson[]>([]);
    const [copiedSearchIndices, setCopiedSearchIndices] = useState<Set<number>>(new Set());

    const allCategories = useMemo(() => [...defaultPromptCategories, ...customCategories], [customCategories]);
    const activeCategoryData = useMemo(() => allCategories.find(c => c.category === activeCategory), [activeCategory, allCategories]);
    const isEditingCustomCategory = useMemo(() => customCategories.some(c => c.category === activeCategory), [activeCategory, customCategories]);

    useEffect(() => {
        try {
            const savedCustomCategories = localStorage.getItem('customPromptCategories');
            if (savedCustomCategories) {
                setCustomCategories(JSON.parse(savedCustomCategories));
            }
        } catch (error) {
            console.error("Failed to load custom categories from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('customPromptCategories', JSON.stringify(customCategories));
        } catch (error) {
            console.error("Failed to save custom categories to localStorage", error);
        }
    }, [customCategories]);

    useEffect(() => {
        setSequentialCopyIndex(0);
        setCopiedTitles(new Set());
    }, [activeCategory]);
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (copyAnimationTimeout.current) {
                clearTimeout(copyAnimationTimeout.current);
            }
        };
    }, []);

    const formatName = (name: string): string => {
        return name
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    };

    // Search Logic
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }
        if (allParsedData.length === 0) return;

        const normalizedQuery = searchQuery.toLowerCase().replace(/ё/g, 'е').trim();
        const queryTokens = normalizedQuery.split(/[\s,.]+/).filter(t => t.length > 0);

        if (queryTokens.length === 0) {
            setSearchResults([]);
            return;
        }

        const results = allParsedData.filter(person => {
            const normalizedName = person.name.toLowerCase().replace(/ё/g, 'е');
            const nameParts = normalizedName.split(/[\s,.]+/).filter(Boolean);

            return queryTokens.every(qToken => {
                const startsWithMatch = nameParts.some(nPart => nPart.startsWith(qToken));
                if (startsWithMatch) return true;

                const includesMatch = nameParts.some(nPart => nPart.includes(qToken));
                if (includesMatch) return true;

                if (qToken.length > 2) {
                     return nameParts.some(nPart => {
                         if (Math.abs(nPart.length - qToken.length) > 3) return false;
                         const dist = levenshteinDistance(qToken, nPart);
                         const allowedErrors = qToken.length > 5 ? 2 : 1;
                         return dist <= allowedErrors;
                     });
                }
                
                return false;
            });
        });

        const formattedResults: AnalyzedPerson[] = results.map(person => ({
            name: formatName(person.name),
            org: orgName,
            inn: inn,
            dob: person.dob || 'Not found',
        }));

        setSearchResults(formattedResults);
        setCopiedSearchIndices(new Set());
    }, [searchQuery, allParsedData, orgName, inn]);

    const handleCopySearchResult = (text: string, index: number) => {
        if (!text) return;
        navigator.clipboard.writeText(text.trim()).then(
          () => {
            setCopiedSearchIndices(prev => new Set(prev).add(index));
          },
          (err) => {
            console.error('Failed to copy text: ', err);
          }
        );
    };
    
    const handleSaveNewCategory = (categoryName: string, titles: string[]) => {
        const newCategory = { category: categoryName, titles };
        setCustomCategories(prev => [...prev, newCategory]);
        setActiveCategory(categoryName);
    };

    const handleUpdateCategory = (originalName: string, newName: string, titles: string[]) => {
        setCustomCategories(prev => prev.map(c => 
            c.category === originalName 
            ? { category: newName, titles: titles }
            : c
        ));
        if (activeCategory === originalName) {
            setActiveCategory(newName);
        }
    };
    
    const handleDeleteCategory = (categoryToDelete: string) => {
        setCustomCategories(prev => prev.filter(c => c.category !== categoryToDelete));
        if (activeCategory === categoryToDelete) {
            setActiveCategory(allCategories[0]?.category || null);
        }
    };

    const handleDeleteTitle = (titleToDelete: string) => {
        if (!activeCategory || !isEditingCustomCategory) return;
        setCustomCategories(prev => prev.map(c => 
            c.category === activeCategory 
            ? { ...c, titles: c.titles.filter(t => t !== titleToDelete) }
            : c
        ));
    };

    const generateCopyText = (title: string) => {
        const orgPart = includeOrgName ? orgName : null;
        const innPart = includeInn ? inn : null;
    
        const parts = reverseOrder
            ? [innPart, orgPart, title]
            : [title, orgPart, innPart];
        return parts.filter(Boolean).join(' ').trim();
    };

    const handleCopy = (title: string, clearPrevious = false) => {
        const textToCopy = generateCopyText(title);
        if (!textToCopy) return;

        const isAlreadyCopied = copiedTitles.has(title);

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedTitles(prev => {
                const newSet = clearPrevious ? new Set<string>() : new Set(prev);
                newSet.add(title);
                return newSet;
            });
            
            if (isAlreadyCopied) {
                if (copyAnimationTimeout.current) {
                    clearTimeout(copyAnimationTimeout.current);
                }
                setJustCopiedTitle(title);
                copyAnimationTimeout.current = window.setTimeout(() => {
                    setJustCopiedTitle(null);
                }, 300);
            }
            onPromptCopied();
        });
    };

    const handleSequentialCopy = () => {
        if (!activeCategoryData || activeCategoryData.titles.length === 0) return;

        let currentCopyIndex = sequentialCopyIndex;
        const isNewCycle = currentCopyIndex >= activeCategoryData.titles.length;
        if (isNewCycle) currentCopyIndex = 0;

        const titleToCopy = activeCategoryData.titles[currentCopyIndex];
        handleCopy(titleToCopy, isNewCycle);
        setSequentialCopyIndex(currentCopyIndex + 1);
    };

    const handleResetCopied = () => {
        setCopiedTitles(new Set());
        setSequentialCopyIndex(0);
    };

    const handleAddManualPerson = () => {
        const trimmedName = manualName.trim();
        if (!trimmedName || !orgName || !inn) {
             console.warn("Cannot add person without a name, org, or INN.");
             return;
        }

        const trimmedLowerName = trimmedName.toLowerCase();
        const existingPerson = experienceList.find(p => p.name.toLowerCase() === trimmedLowerName && p.inn === inn);

        if (existingPerson) {
            onOpenCommentModal(existingPerson);
            setManualName('');
            return;
        }

        const normalizedQuery = trimmedLowerName.replace(/ё/g, 'е');
        const personFromFile = allParsedData.find(p => p.name.toLowerCase().replace(/ё/g, 'е') === normalizedQuery);
        const cleanDob = personFromFile?.dob === 'null' ? null : personFromFile?.dob;

        const newPerson: AnalyzedPerson = {
            name: formatName(trimmedName),
            org: orgName,
            inn: inn,
            dob: cleanDob || undefined,
        };

        setExperienceList(prev => [...prev, newPerson]);
        onOpenCommentModal(newPerson);
        setManualName('');
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const totalTitles = activeCategoryData?.titles.length || 0;

    return (
        <div>
            <CategoryModal
                isOpen={modalState.mode !== null}
                mode={modalState.mode || 'add'}
                initialData={modalState.data}
                onClose={() => setModalState({ mode: null })}
                onSave={handleSaveNewCategory}
                onUpdate={handleUpdateCategory}
                onDelete={handleDeleteCategory}
                existingCategories={allCategories.map(c => c.category)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {allCategories.map(({ category }) => {
                    const isCustom = customCategories.some(c => c.category === category);
                    return (
                        <div key={category} className="relative group">
                            <button
                                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                                className={`w-full p-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-left ${isCustom ? 'border-dashed border-2 border-indigo-400/50' : ''} ${
                                    activeCategory === category 
                                    ? 'bg-indigo-600 text-white shadow' 
                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                                aria-pressed={activeCategory === category}
                            >
                                {capitalize(category)}
                            </button>
                             {isCustom && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const categoryData = customCategories.find(c => c.category === category);
                                        if (categoryData) {
                                            setModalState({ mode: 'edit', data: categoryData });
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                                    aria-label={`Edit category ${category}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M17.408 2.954a1.5 1.5 0 00-2.121 0l-9.83 9.83a.75.75 0 00-.22.53v2.936a.75.75 0 00.75.75h2.936a.75.75 0 00.53-.22l9.83-9.83a1.5 1.5 0 000-2.121L17.408 2.954zM4.75 16.5a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H4.75z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mb-6 flex justify-center">
                 <button 
                    onClick={() => setModalState({ mode: 'add' })}
                    className="h-10 w-10 flex items-center justify-center text-white hover:text-indigo-500 active:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
                    aria-label="Add new category"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 </button>
            </div>

            {activeCategory && activeCategoryData && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-center space-x-4 mb-4 p-2 bg-gray-200 dark:bg-gray-800/60 rounded-md">
                        <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={includeOrgName} 
                                onChange={() => setIncludeOrgName(prev => !prev)} 
                                className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                            />
                            <span>Название орг</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={includeInn} 
                                onChange={() => setIncludeInn(prev => !prev)} 
                                className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                            />
                            <span>ИНН</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={reverseOrder} 
                                onChange={(e) => onReverseOrderChange(e.target.checked)} 
                                className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                            />
                            <span>Зеркалить</span>
                        </label>
                    </div>

                    <div className="flex justify-between items-center mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">{activeCategory}</h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={handleResetCopied} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Reset copied checks">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                            </button>
                            {totalTitles > 0 && <Button onClick={handleSequentialCopy} variant="secondary">Copy Next ({sequentialCopyIndex}/{totalTitles})</Button>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="text"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualPerson(); }}
                            placeholder="Добавить ФИО вручную..."
                            className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            aria-label="Manually add a person's name to the experience list"
                        />
                        <Button onClick={handleAddManualPerson} disabled={!manualName.trim()} className="flex-shrink-0 !px-3 !py-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </Button>
                    </div>
                    
                    <ul className="space-y-2">
                        {activeCategoryData.titles.map((title, index) => {
                             const isHighlighted = ['Главный бухгалтер', 'Начальник отдела кадров'].includes(title);
                             return (
                                 <li key={index} className="flex justify-between items-center p-2 rounded-md bg-gray-100 dark:bg-gray-800/70 group transition-all duration-200">
                                    <span 
                                        onClick={() => handleCopy(title)}
                                        className={`flex-grow cursor-pointer text-sm text-gray-700 dark:text-gray-300 ${isHighlighted ? 'neon-purple-text' : ''}`}
                                        title={`Click to copy: ${generateCopyText(title)}`}
                                    >
                                        {title}
                                    </span>
                                    <div className="flex items-center flex-shrink-0 space-x-1">
                                        {isEditingCustomCategory && (
                                            <button onClick={() => handleDeleteTitle(title)} className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete title ${title}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          {copiedTitles.has(title) ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-green-500 ${justCopiedTitle === title ? 'animate-recheck-pop' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                          ) : (
                                            <button onClick={() => handleCopy(title)} className="p-1 text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Copy ${title}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </button>
                                          )}
                                        </div>
                                    </div>
                                </li>
                             );
                        })}
                         {totalTitles === 0 && <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No job titles in this category.</p>}
                    </ul>
                </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-300 dark:border-gray-700 space-y-4">
                <Input
                    id="hierarchy-search"
                    label="Поиск по ФИО"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Начните вводить имя..."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>}
                />
                {searchQuery && (
                    <div className="mt-4">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                <ul className="space-y-2">
                                    {searchResults.map((person, index) => {
                                        const isCopied = copiedSearchIndices.has(index);
                                        const lineText = reverseOrder
                                          ? `${person.inn} ${person.org} ${person.name}`
                                          : `${person.name} ${person.org} ${person.inn}`;
                                        const nameAndDob = person.dob && person.dob !== 'Not found' ? `${person.name} ${person.dob}` : person.name;

                                        return (
                                            <li key={index} className="text-sm flex items-center justify-between font-mono">
                                                <span className="truncate min-w-0">
                                                    <span
                                                        className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                                        onClick={() => handleCopySearchResult(nameAndDob, index)}
                                                        title={`Click to copy name and DOB: ${nameAndDob}`}
                                                    >
                                                        {person.name}
                                                    </span>
                                                    <span
                                                        className="text-gray-600 dark:text-gray-400 hover:underline cursor-pointer ml-1"
                                                        onClick={() => handleCopySearchResult(lineText, index)}
                                                        title={`Click to copy: ${lineText}`}
                                                    >
                                                        {' '}{person.org} {person.inn}
                                                    </span>
                                                </span>
                                                {isCopied && (
                                                    <span className="ml-2 text-green-500 dark:text-green-400 flex-shrink-0" title="Copied!">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center">No results found.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromptsDisplay;
