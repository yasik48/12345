
import React, { useState, useEffect, useMemo } from 'react';
import { AnalyzedPerson, PersonIncome } from '../types';
import Button from './Button';

interface ExperienceDisplayProps {
    people: AnalyzedPerson[];
    setPeople: React.Dispatch<React.SetStateAction<AnalyzedPerson[]>>;
    allParsedData: PersonIncome[];
    orgName: string;
    inn: string;
    onOpenCommentModal: (person: AnalyzedPerson, event?: React.MouseEvent<HTMLElement>) => void;
}

const DEFAULT_OPTIONS: ReadonlyArray<string> = [
    'ФИО',
    'дата назначения на должность',
    'первое упоминание',
    'на какой сейчас должности?'
];

interface OptionConfig {
    before: Array<'name' | 'org'>;
    after: Array<'name' | 'org'>;
}

interface OptionModalProps {
    mode: 'add' | 'edit';
    isOpen: boolean;
    onClose: () => void;
    onSave: (optionText: string) => void;
    onUpdate: (originalText: string, newText: string) => void;
    onDelete: (optionText: string) => void;
    initialData?: string;
    existingOptions: string[];
}

const OptionModal: React.FC<OptionModalProps> = ({ isOpen, mode, onClose, onSave, onUpdate, onDelete, initialData, existingOptions }) => {
    const [optionText, setOptionText] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setOptionText(mode === 'edit' && initialData ? initialData : '');
            setError(null);
        }
    }, [isOpen, mode, initialData]);

    const handleSave = () => {
        const trimmedText = optionText.trim();
        if (!trimmedText) {
            setError('Option text cannot be empty.');
            return;
        }

        const isNameTaken = existingOptions.some(opt => 
            opt.toLowerCase() === trimmedText.toLowerCase() &&
            (mode === 'add' || (mode === 'edit' && initialData?.toLowerCase() !== trimmedText.toLowerCase()))
        );

        if (isNameTaken) {
            setError('An option with this text already exists.');
            return;
        }

        if (mode === 'add') {
            onSave(trimmedText);
        } else if (mode === 'edit' && initialData) {
            onUpdate(initialData, trimmedText);
        }
        onClose();
    };

    const handleDelete = () => {
        if (mode === 'edit' && initialData) {
            onDelete(initialData);
            onClose();
        }
    };

    if (!isOpen) return null;

    const title = mode === 'add' ? 'Add New Option' : 'Edit Option';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-white border border-indigo-500/50" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-indigo-400">{title}</h2>
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <div>
                    <label htmlFor="modal-option-text" className="block text-sm font-medium text-gray-300 mb-1">Option Text</label>
                    <input
                        id="modal-option-text"
                        type="text"
                        value={optionText}
                        onChange={(e) => { setOptionText(e.target.value); setError(null); }}
                        placeholder="Enter your custom text"
                        className="w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    />
                </div>
                <div className="mt-6 flex justify-between">
                    <div>
                        {mode === 'edit' && (
                            <Button onClick={handleDelete} className="!bg-red-600 hover:!bg-red-700 active:!bg-red-800 focus:!ring-red-500">Delete</Button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave}>{mode === 'add' ? 'Save Option' : 'Save Changes'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OptionCheckbox: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-1 cursor-pointer text-xs text-gray-400 hover:text-white" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded-sm bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-600" />
        <span className="select-none">{label}</span>
    </label>
);

interface CopyState {
    personIndex: number;
    optionIndex: number;
    copiedCounts: Record<number, number>;
}

const ClearModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    people: AnalyzedPerson[];
    onDeletePerson: (person: AnalyzedPerson) => void;
    onDeleteAll: () => void;
}> = ({ isOpen, onClose, people, onDeletePerson, onDeleteAll }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-white border border-indigo-500/50" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-indigo-400">Очистить список</h2>
                    <Button onClick={onDeleteAll} className="!bg-red-600 hover:!bg-red-700 active:!bg-red-800 focus:!ring-red-500">
                        Удалить всех
                    </Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                    {people.length > 0 ? people.map((person, index) => (
                        <div key={`${person.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-700 rounded-md animate-fade-in">
                            <span className="text-sm truncate pr-2">{person.name}</span>
                            <button 
                                onClick={() => onDeletePerson(person)}
                                className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors flex-shrink-0"
                                aria-label={`Удалить ${person.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-400 text-center py-4">Список пуст.</p>
                    )}
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={onClose} variant="secondary">
                        Закрыть
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ExperienceDisplay: React.FC<ExperienceDisplayProps> = ({ people, setPeople, allParsedData, orgName, inn, onOpenCommentModal }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedCommentIndex, setCopiedCommentIndex] = useState<number | null>(null);
    const [copiedImageState, setCopiedImageState] = useState<{ index: number; imgIndex: number } | null>(null);
    const [imageCopyCycle, setImageCopyCycle] = useState<Record<number, number>>({});
    const [showOptions, setShowOptions] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([...DEFAULT_OPTIONS]);
    const [optionConfigs, setOptionConfigs] = useState<Record<string, OptionConfig>>({});
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | null; data?: string }>({ mode: null });
    const [useShortName, setUseShortName] = useState(false);
    const [includeInn, setIncludeInn] = useState(false);
    const [includeOrg, setIncludeOrg] = useState(false);
    const [manualName, setManualName] = useState('');
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    
    const [copyState, setCopyState] = useState<CopyState>({
        personIndex: 0,
        optionIndex: 0,
        copiedCounts: {},
    });

    const customOptions = useMemo(() => 
        Object.keys(optionConfigs).filter(key => !DEFAULT_OPTIONS.includes(key)),
        [optionConfigs]
    );

    const allOptions = useMemo(() => 
        [...DEFAULT_OPTIONS, ...customOptions], 
        [customOptions]
    );

    const orderedSelectedOptions = useMemo(() => {
        return allOptions.filter(option => selectedOptions.includes(option));
    }, [allOptions, selectedOptions]);
    
    const namesInFile = useMemo(() => 
        new Set(allParsedData.map(p => p.name.toLowerCase().replace(/ё/g, 'е'))), 
        [allParsedData]
    );

    const formatName = (name: string): string => {
        return name
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    };

    const formatPersonName = (fullName: string): string => {
        if (!useShortName) {
            return fullName;
        }
        const parts = fullName.split(' ');
        return parts.slice(0, 2).join(' ');
    };
    
    useEffect(() => {
        const initialConfigs: Record<string, OptionConfig> = {};
        let loadedCustomConfigs: Record<string, OptionConfig> = {};
        try {
            const savedCustomOptions = localStorage.getItem('experienceOptionConfigs');
            if (savedCustomOptions) {
                loadedCustomConfigs = JSON.parse(savedCustomOptions);
            }
        } catch (error) {
            console.error("Failed to load custom option configs from localStorage", error);
        }

        DEFAULT_OPTIONS.forEach(opt => {
            initialConfigs[opt] = { before: ['name'], after: [] };
        });

        Object.assign(initialConfigs, loadedCustomConfigs);
        setOptionConfigs(initialConfigs);
    }, []);

    useEffect(() => {
        const customToSave: Record<string, OptionConfig> = {};
        for(const key in optionConfigs) {
            if(!DEFAULT_OPTIONS.includes(key)) {
                customToSave[key] = optionConfigs[key];
            }
        }
        if (Object.keys(customToSave).length > 0 || localStorage.getItem('experienceOptionConfigs')) {
            try {
                localStorage.setItem('experienceOptionConfigs', JSON.stringify(customToSave));
            } catch (error) {
                console.error("Failed to save custom option configs to localStorage", error);
            }
        }
    }, [optionConfigs]);

    useEffect(() => {
        setCopyState({ personIndex: 0, optionIndex: 0, copiedCounts: {} });
    }, [people]);

    const handleSaveNewOption = (optionText: string) => {
        setOptionConfigs(prev => ({
            ...prev,
            [optionText]: { before: ['name'], after: [] }
        }));
    };

    const handleUpdateOption = (originalText: string, newText: string) => {
        setOptionConfigs(prev => {
            const newConfigs = { ...prev };
            if (originalText !== newText && newConfigs[originalText]) {
                newConfigs[newText] = newConfigs[originalText];
                delete newConfigs[originalText];
            }
            return newConfigs;
        });
        setSelectedOptions(prev => prev.map(opt => (opt === originalText ? newText : opt)));
    };

    const handleDeleteOption = (optionText: string) => {
        setOptionConfigs(prev => {
            const newConfigs = { ...prev };
            delete newConfigs[optionText];
            return newConfigs;
        });
        setSelectedOptions(prev => prev.filter(opt => opt !== optionText));
    };
    
    const handleCheckboxChange = (optionText: string, position: 'before' | 'after', value: 'name' | 'org') => {
        setOptionConfigs(prev => {
            const newConfigs = { ...prev };
            const currentConfig = { ...(newConfigs[optionText] || { before: [], after: [] }) };
            const arr = [...currentConfig[position]]; // Create a mutable copy

            const index = arr.indexOf(value);
            if (index > -1) {
                arr.splice(index, 1);
            } else {
                arr.push(value);
            }
            
            currentConfig[position] = arr;
            newConfigs[optionText] = currentConfig;
            return newConfigs;
        });
    };

    const handleDeleteAll = () => {
        setPeople([]);
        setIsClearModalOpen(false);
    };

    const handleDeletePerson = (personToDelete: AnalyzedPerson) => {
        setPeople(prev => prev.filter(p => p.name !== personToDelete.name || p.inn !== personToDelete.inn));
    };


    const handleCopy = (person: AnalyzedPerson, index: number) => {
        const formattedName = formatPersonName(person.name);
        let textToCopy = person.dob ? `${formattedName} (${person.dob})` : formattedName;

        if (includeOrg) textToCopy += ` ${person.org}`;
        if (includeInn) textToCopy += ` ${person.inn}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }).catch(err => {
            console.error("Failed to copy text: ", err);
        });
    };
    
    const handleCopyComment = (comment: string | undefined, index: number) => {
        if (!comment) return;
        navigator.clipboard.writeText(comment).then(() => {
            setCopiedCommentIndex(index);
            setTimeout(() => setCopiedCommentIndex(null), 2000);
        });
    };

    const handleCopyImage = async (person: AnalyzedPerson, personIndex: number) => {
        if (!person.images || person.images.length === 0) return;
        const currentImgIndex = imageCopyCycle[personIndex] || 0;
        const dataUrl = person.images[currentImgIndex];

        try {
             // Helper to convert data URL to Blob, ensuring MIME type is preserved.
            const dataUrlToBlob = (dataUrl: string): Blob => {
                const parts = dataUrl.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (!mimeMatch || mimeMatch.length < 2) {
                    throw new Error("Could not parse MIME type from data URL");
                }
                const mime = mimeMatch[1];
                const b64 = parts[1];
                const byteString = atob(b64);
                let n = byteString.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = byteString.charCodeAt(n);
                }
                return new Blob([u8arr], { type: mime });
            };
            
            const blob = dataUrlToBlob(dataUrl);

            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);

            const nextImgIndex = (currentImgIndex + 1) % person.images.length;
            setImageCopyCycle(prev => ({ ...prev, [personIndex]: nextImgIndex }));
            setCopiedImageState({ index: personIndex, imgIndex: currentImgIndex });
            setTimeout(() => setCopiedImageState(null), 2000);
        } catch (err) {
            console.error("Failed to copy image: ", err);
        }
    };

    const handleSequentialCopy = () => {
        if (people.length === 0) return;
    
        let { personIndex, optionIndex, copiedCounts } = copyState;
    
        if (personIndex >= people.length) {
            personIndex = 0;
            optionIndex = 0;
            copiedCounts = {};
        }
    
        const personToCopy = people[personIndex];
        let textToCopy = '';
        let nextPersonIndex = personIndex;
        let nextOptionIndex = optionIndex;
        let newCopiedCounts = { ...copiedCounts };
    
        const buildPart = (part: 'name' | 'org'): string => {
            if (part === 'name') return formatPersonName(personToCopy.name);
            if (part === 'org') return personToCopy.org;
            return '';
        };

        if (orderedSelectedOptions.length === 0) {
            let base = formatPersonName(personToCopy.name);
            if (includeOrg) base += ` ${personToCopy.org}`;
            if (includeInn) base += ` ${personToCopy.inn}`;
            textToCopy = base;

            newCopiedCounts[personIndex] = (newCopiedCounts[personIndex] || 0) + 1;
            nextPersonIndex++;
        } else {
            const optionText = orderedSelectedOptions[optionIndex];

            if (optionText === 'ФИО') {
                textToCopy = formatPersonName(personToCopy.name);
            } else {
                const config = optionConfigs[optionText] || { before: [], after: [] };
                const parts = [
                    ...config.before.map(buildPart),
                    optionText,
                    ...config.after.map(buildPart)
                ];
                textToCopy = parts.filter(Boolean).join(' ');
            }

            newCopiedCounts[personIndex] = (newCopiedCounts[personIndex] || 0) + 1;
            nextOptionIndex++;

            if (nextOptionIndex >= orderedSelectedOptions.length) {
                nextOptionIndex = 0;
                nextPersonIndex++;
            }
        }
    
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyState({ 
                personIndex: nextPersonIndex, 
                optionIndex: nextOptionIndex, 
                copiedCounts: newCopiedCounts 
            });
        }, (err) => {
            console.error('Failed to copy text: ', err);
        });
    };
    
    const handleToggleOption = (option: string) => {
        setSelectedOptions(prev => 
            prev.includes(option)
                ? prev.filter(o => o !== option)
                : [...prev, option]
        );
    };

    const handleAddManualPerson = () => {
        const trimmedName = manualName.trim();
        if (!trimmedName || !orgName || !inn) {
             console.warn("Cannot add person without a name, org, or INN.");
             return;
        }

        const trimmedLowerName = trimmedName.toLowerCase();
        const existingPerson = people.find(p => p.name.toLowerCase() === trimmedLowerName && p.inn === inn);

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

        setPeople(prev => [...prev, newPerson]);
        onOpenCommentModal(newPerson);
        setManualName('');
    };

    const displayCopyIndex = copyState.personIndex > people.length ? 0 : (copyState.personIndex === people.length ? people.length : copyState.personIndex);

    return (
        <div className="space-y-4">
            <OptionModal
                isOpen={modalState.mode !== null}
                mode={modalState.mode || 'add'}
                initialData={modalState.data}
                onClose={() => setModalState({ mode: null })}
                onSave={handleSaveNewOption}
                onUpdate={handleUpdateOption}
                onDelete={handleDeleteOption}
                existingOptions={allOptions}
            />
            <ClearModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                people={people}
                onDeletePerson={handleDeletePerson}
                onDeleteAll={handleDeleteAll}
            />

            {/* Panel 1: Controls */}
            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        Список
                    </h3>
                    {people.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <Button onClick={() => setIsClearModalOpen(true)} variant="secondary">
                                Очистить
                            </Button>
                            <Button onClick={handleSequentialCopy} variant="secondary">
                                Copy Next ({displayCopyIndex}/{people.length})
                            </Button>
                        </div>
                    )}
                </div>

                <div className="text-center flex items-center justify-center space-x-4">
                    <label className="flex items-center space-x-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300 select-none">
                        <input 
                            type="checkbox" 
                            checked={includeInn} 
                            onChange={() => setIncludeInn(!includeInn)} 
                            className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                        />
                        <span>ИНН</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300 select-none">
                        <input 
                            type="checkbox" 
                            checked={includeOrg} 
                            onChange={() => setIncludeOrg(!includeOrg)} 
                            className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                        />
                        <span>Орг</span>
                    </label>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>

                    <label title="Использовать только Фамилию и Имя (без отчества)" className="cursor-pointer">
                        <input type="checkbox" checked={useShortName} onChange={() => setUseShortName(prev => !prev)} className="sr-only peer" />
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors ${useShortName ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                           <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" />
                        </svg>
                    </label>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="inline-flex items-center justify-center p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all"
                        aria-expanded={showOptions}
                        aria-label={showOptions ? "Скрыть опции" : "Дополнительные опции"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${showOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setModalState({ mode: 'add' })}
                        className="inline-flex items-center justify-center text-white hover:text-indigo-500 active:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                        aria-label="Add new option"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                </div>
                
                {showOptions && (
                    <div className="mt-2 p-2 bg-gray-200 dark:bg-gray-900/40 rounded-md animate-fade-in">
                        <div className="grid grid-cols-1 gap-2">
                             {allOptions.map(option => {
                                const isCustom = customOptions.includes(option);
                                const config = optionConfigs[option] || { before: [], after: [] };
                                const isSelected = selectedOptions.includes(option);
                                return (
                                    <div key={option} className="relative group">
                                        <div 
                                            onClick={() => handleToggleOption(option)}
                                            className={`w-full text-xs py-1.5 px-2 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-between text-white ${isCustom ? 'border-dashed border-2 border-indigo-400/50' : 'border-2 border-transparent'} ${isSelected ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                        >
                                            <div className="flex space-x-3 items-center">
                                                <OptionCheckbox label="ФИО" checked={config.before.includes('name')} onChange={() => handleCheckboxChange(option, 'before', 'name')} />
                                                <OptionCheckbox label="ОРГ" checked={config.before.includes('org')} onChange={() => handleCheckboxChange(option, 'before', 'org')} />
                                            </div>
                                            <span className="flex-grow text-center font-semibold px-2">{option}</span>
                                            <div className="flex space-x-3 items-center">
                                                <OptionCheckbox label="ФИО" checked={config.after.includes('name')} onChange={() => handleCheckboxChange(option, 'after', 'name')} />
                                                <OptionCheckbox label="ОРГ" checked={config.after.includes('org')} onChange={() => handleCheckboxChange(option, 'after', 'org')} />
                                            </div>
                                        </div>
                                        {isCustom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalState({ mode: 'edit', data: option });
                                                }}
                                                className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                                                aria-label={`Edit option: ${option}`}
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
                    </div>
                )}
            </div>

            {/* Panel 2: List */}
            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg min-h-[150px] flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-300 dark:border-gray-700 pb-4">
                    <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualPerson(); }}
                        placeholder="Добавить ФИО вручную..."
                        className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        aria-label="Manually add a person's name"
                    />
                    <Button onClick={handleAddManualPerson} disabled={!manualName.trim()} className="flex-shrink-0 !px-3 !py-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </Button>
                </div>
                {people.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            Отметьте сотрудников в списке результатов, чтобы добавить их сюда.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {people.map((person, index) => {
                            const isInFile = namesInFile.has(person.name.toLowerCase().replace(/ё/g, 'е'));
                            const fileStatusClasses = isInFile 
                                ? 'dark:bg-green-900/40 bg-green-500/20 border-green-500' 
                                : 'dark:bg-red-900/40 bg-red-500/20 border-red-500';

                            const formattedName = formatPersonName(person.name);
                            const textToCopyForTitle = person.dob ? `${formattedName} (${person.dob})` : formattedName;
                            const copiedCount = copyState.copiedCounts[index] || 0;
                            const isCopiedTemporarily = copiedIndex === index;
                            const hasComment = person.comment && person.comment.trim() !== '';
                            const hasImages = person.images && person.images.length > 0;
                            const currentImageIndexForCopy = imageCopyCycle[index] || 0;
                            
                            const status = person.analysisStatus;
                            let statusIcon = null;
                            if (status === 'found') {
                                statusIcon = '✅';
                            } else if (status === 'not_found' || status === 'error') {
                                statusIcon = '❌';
                            } else if (status === 'other') {
                                statusIcon = '❓';
                            } else if (status === 'pending') {
                                statusIcon = '⏳';
                            }


                            return (
                               <li key={`${person.inn}-${index}`} className={`text-sm p-2 rounded-md transition-all border ${fileStatusClasses}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center min-w-0">
                                            {statusIcon && <span className="mr-2 text-lg">{statusIcon}</span>}
                                            <div 
                                                className="font-mono cursor-pointer hover:underline truncate"
                                                onClick={() => handleCopy(person, index)}
                                                title={`Click to copy: ${textToCopyForTitle}`}
                                            >
                                                <span className={person.dob ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}>{person.name}</span>
                                                {person.dob && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({person.dob})</span>}
                                            </div>
                                        </div>
                                        {(copiedCount > 0 || isCopiedTemporarily) && (
                                            <span className="ml-2 flex items-center space-x-1 text-green-500 dark:text-green-400 flex-shrink-0" title="Copied!">
                                                {Array.from({ length: isCopiedTemporarily && copiedCount === 0 ? 1 : copiedCount }).map((_, i) => (
                                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-400 dark:border-gray-600/50 flex items-center justify-between space-x-2">
                                        <div className="flex-1 flex items-center space-x-2 min-w-0">
                                            {hasImages && (
                                                <img src={person.images![0]} alt="analysis screenshot" className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-gray-800" />
                                            )}
                                            {hasComment && !hasImages && (
                                                <div className="w-16 h-16 flex items-center justify-center bg-gray-700/50 rounded-md flex-shrink-0" title="Analysis text available">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                                            <button 
                                                onClick={() => handleCopyComment(person.comment, index)}
                                                disabled={!hasComment}
                                                className={`p-1.5 rounded-md text-gray-400 transition-colors ${!hasComment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                                title={hasComment ? "Copy Comment" : "No comment to copy"}
                                            >
                                                {copiedCommentIndex === index ? (
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                     </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                            {hasImages && person.images!.length > 1 && (
                                                <button
                                                    onClick={() => handleCopyImage(person, index)}
                                                    className="p-1.5 rounded-md text-gray-400 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400"
                                                    title={`Copy Image (${currentImageIndexForCopy + 1}/${person.images.length})`}
                                                >
                                                    {copiedImageState?.index === index && person.images ? (
                                                        <div className="h-4 w-4 flex items-center justify-center">
                                                            <span className="text-xs font-mono font-bold text-green-500">
                                                                {person.images.length - 1 - copiedImageState.imgIndex}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => onOpenCommentModal(person, e)}
                                                className="p-1.5 rounded-md text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                                title={hasComment || hasImages ? "Edit Details" : "Add Details"}
                                            >
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2-2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ExperienceDisplay;
