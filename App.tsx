
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { parseIncomeFile } from './services/localFileParser';
import type { AnalyzedPerson, PersonIncome } from './types';
import Input from './components/Input';
import Button from './components/Button';
import FileUpload from './components/FileUpload';
import ResultsDisplay from './components/ResultsDisplay';
import PromptsDisplay from './components/PromptsDisplay';
import SakuraFall from './components/SakuraFall';
import CasinoDisplay from './components/CasinoDisplay';
import ExperienceDisplay from './components/ExperienceDisplay';
import CommentModal from './components/CommentModal';
import ScreenShareDisplay from './components/ScreenShareDisplay';
import ApiKeyManager from './components/ApiKeyManager';

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

const App: React.FC = () => {
  const [orgName, setOrgName] = useState<string>('');
  const [inn, setInn] = useState<string>('');
  const [topN, setTopN] = useState<string>('20');
  const [file, setFile] = useState<File | null>(null);
  
  const [allParsedData, setAllParsedData] = useState<PersonIncome[]>([]);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedPerson[]>([]);
  const [searchResults, setSearchResults] = useState<AnalyzedPerson[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSearchIndices, setCopiedSearchIndices] = useState<Set<number>>(new Set());
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'configuration' | 'prompts' | 'experience' | 'casino' | 'screen'>('configuration');
  const [reverseCopyOrder, setReverseCopyOrder] = useState<boolean>(false);
  const [experienceList, setExperienceList] = useState<AnalyzedPerson[]>([]);

  // State for ResultsDisplay, lifted up to persist across tab changes
  const [copiedIndices, setCopiedIndices] = useState<Set<number>>(new Set());
  const [sequentialCopyIndex, setSequentialCopyIndex] = useState(-2);

  const [commentModalState, setCommentModalState] = useState<{ isOpen: boolean; person: AnalyzedPerson | null; }>({ isOpen: false, person: null });
  const modalTriggerRef = useRef<HTMLElement | null>(null);

  // Auto-analysis trigger logic
  const [analysisPhase, setAnalysisPhase] = useState<'initial' | 'subsequent'>('initial');
  const [initialPromptsCopiedCount, setInitialPromptsCopiedCount] = useState(0);
  const [personCopyCountForAnalysis, setPersonCopyCountForAnalysis] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutoAnalysisEnabled, setIsAutoAnalysisEnabled] = useState(false);
  const analysisTriggerRef = useRef<((person: AnalyzedPerson) => Promise<void>) | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);

  const scheduleBatchAnalysis = useCallback((batch: AnalyzedPerson[]) => {
    if (!batch || batch.length === 0) return;

    if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = window.setTimeout(async () => {
        if (!analysisTriggerRef.current) return;

        setActiveTab('screen');
        
        for (const [index, person] of batch.entries()) {
            // Add a delay between calls, but not before the first one, to avoid rate limiting.
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
            }

            setIsCapturing(true);
            try {
                await analysisTriggerRef.current(person);
            } catch (e: any) {
                console.error(`Error during sequential analysis for ${person.name}:`, e);
                // Halt the batch if a critical API key or quota error occurs
                if (e.name === 'ApiKeyError') {
                    console.warn("Stopping batch analysis due to API key/quota error.");
                    break;
                }
            } finally {
                setIsCapturing(false);
            }
        }
    }, 4000); // 4-second delay before batch starts sequentially
  }, [setIsCapturing, setActiveTab]);

  const handleInitialPromptCopied = () => {
    if (!isAutoAnalysisEnabled) return;
    if (analysisPhase !== 'initial') return;

    const newCount = initialPromptsCopiedCount + 1;
    setInitialPromptsCopiedCount(newCount);
    
    if (newCount >= 2) {
      if (analyzedData.length > 0) {
        // Analyze the first person from the main list
        scheduleBatchAnalysis([analyzedData[0]]);
      }
      setAnalysisPhase('subsequent');
      setInitialPromptsCopiedCount(0); // Reset for the next file cycle
    }
  };
  
  const handlePersonCopied = () => {
    if (!isAutoAnalysisEnabled) return;
    if (analysisPhase !== 'subsequent') return;
    
    const newCount = personCopyCountForAnalysis + 1;
    setPersonCopyCountForAnalysis(newCount);

    if (newCount > 0 && newCount % 4 === 0) {
        const lastCopiedIndex = sequentialCopyIndex - 1;
        const firstIndexInBatch = Math.max(0, lastCopiedIndex - 3);

        const peopleToAnalyze = analyzedData.slice(firstIndexInBatch, lastCopiedIndex + 1);
        if (peopleToAnalyze.length > 0) {
            scheduleBatchAnalysis(peopleToAnalyze);
        }
    }
  };

  const handleOpenCommentModal = (person: AnalyzedPerson, event?: React.MouseEvent<HTMLElement>) => {
    modalTriggerRef.current = event ? event.currentTarget : null;
    setCommentModalState({ isOpen: true, person });
  };

  const handleCloseCommentModal = () => {
    setCommentModalState({ isOpen: false, person: null });
    if (modalTriggerRef.current) {
        modalTriggerRef.current.focus({ preventScroll: true });
    }
  };

  const handleSaveComment = (personToUpdate: AnalyzedPerson, comment: string, images: string[]) => {
    setExperienceList(prevList => {
      const existingPersonIndex = prevList.findIndex(p => p.name === personToUpdate.name && p.inn === personToUpdate.inn);
      const existingPerson = existingPersonIndex > -1 ? prevList[existingPersonIndex] : null;
      const updatedPerson: AnalyzedPerson = { 
        ...personToUpdate, 
        comment: comment.trim() !== '' ? comment : (existingPerson?.comment || ''),
        images: images,
      };

      if (existingPersonIndex > -1) {
        const newList = [...prevList];
        newList[existingPersonIndex] = updatedPerson;
        return newList;
      } else {
        return [...prevList, updatedPerson];
      }
    });
    handleCloseCommentModal();
  };

  const formatName = (name: string): string => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  };
  
  const startFileParsing = useCallback(async (fileToParse: File) => {
    setIsLoading(true);
    setError(null);
    setAnalyzedData([]);
    setSearchQuery('');
    setSearchResults([]);
    setExperienceList([]);

    try {
        const content = await readFileContent(fileToParse);
        const extractedData: PersonIncome[] = await parseIncomeFile(content);
        
        if (extractedData.length === 0) {
            setError("No valid data found in the file. Please ensure each line contains a name followed by an income number.");
            setAllParsedData([]);
        } else {
            setAllParsedData(extractedData);
        }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred during file parsing.");
        setAllParsedData([]);
    }
  }, []);

  useEffect(() => {
    if (file) {
        startFileParsing(file);
    } else {
        setAllParsedData([]);
    }
  }, [file, startFileParsing]);

  useEffect(() => {
    if (allParsedData.length === 0) {
        setAnalyzedData([]);
        setIsLoading(false);
        return;
    }

    if (!orgName || !inn || !topN) {
        setAnalyzedData([]);
        setIsLoading(false);
        return;
    }

    const n = parseInt(topN, 10);
    if (isNaN(n) || n <= 0) {
        setAnalyzedData([]);
        return;
    }

    setIsLoading(true);
    setError(null);

    const sortedData = [...allParsedData].sort((a, b) => b.income - a.income);
    const topEarners = sortedData.slice(0, n);

    const formattedData: AnalyzedPerson[] = topEarners.map(person => {
        const cleanDob = person.dob === 'null' ? null : person.dob;
        return {
            name: formatName(person.name),
            org: orgName,
            inn: inn,
            dob: cleanDob || undefined,
        };
    });

    setAnalyzedData(formattedData);
    setIsLoading(false);
  }, [allParsedData, orgName, inn, topN]);
  
  useEffect(() => {
    setCopiedIndices(new Set());
    setSequentialCopyIndex(-2);
    // Reset auto-analysis state when the main list changes
    setAnalysisPhase('initial');
    setInitialPromptsCopiedCount(0);
    setPersonCopyCountForAnalysis(0);
    if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
    }
  }, [analyzedData]);


  useEffect(() => {
    if (!searchQuery) {
        setSearchResults([]);
        return;
    }
    if (allParsedData.length === 0) return;

    const normalizedQuery = searchQuery.toLowerCase().replace(/ё/g, 'е').trim();
    // Split by spaces, dots, commas to handle initials like "I.I." or "Surname, I.I."
    const queryTokens = normalizedQuery.split(/[\s,.]+/).filter(t => t.length > 0);

    if (queryTokens.length === 0) {
        setSearchResults([]);
        return;
    }
    
    const results = allParsedData.filter(person => {
        const normalizedName = person.name.toLowerCase().replace(/ё/g, 'е');
        const nameParts = normalizedName.split(/[\s,.]+/).filter(Boolean);

        return queryTokens.every(qToken => {
            // 1. Strict start match (Handles initials "I." or prefix)
            const startsWithMatch = nameParts.some(nPart => nPart.startsWith(qToken));
            if (startsWithMatch) return true;

            // 2. Substring match (Handles part of surname)
            const includesMatch = nameParts.some(nPart => nPart.includes(qToken));
            if (includesMatch) return true;

            // 3. Fuzzy match (Handles typos)
            // Only apply fuzzy search for tokens with significant length (> 2 chars)
            if (qToken.length > 2) {
                 return nameParts.some(nPart => {
                     // Don't fuzzy match if length difference is too big
                     if (Math.abs(nPart.length - qToken.length) > 3) return false;

                     const dist = levenshteinDistance(qToken, nPart);
                     // Allow 1 error for length 3-5, 2 errors for length 6+
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
  
  useEffect(() => {
    const defaultBg = "url('https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2092&auto-format&fit=crop')";
    const casinoBg = "url('https://images.unsplash.com/photo-1542848427-4c782ab4810a?q=80&w=1974&auto-format&fit=crop')";

    const body = document.documentElement;
    
    if (activeTab === 'casino') {
      body.style.backgroundImage = casinoBg;
    } else {
      body.style.backgroundImage = defaultBg;
    }
  }, [activeTab]);
  
  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
        if(analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }
    }
  }, []);

  const getTabClassName = (tabName: 'configuration' | 'prompts' | 'experience' | 'casino' | 'screen') => {
    const isActive = activeTab === tabName;
    const baseClasses = 'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 focus:outline-none';
    
    let activeStateClasses = 'border-indigo-500 text-indigo-600 dark:text-indigo-400 opacity-100';

    if (isActive) {
        if (tabName === 'casino') {
          activeStateClasses = 'border-fuchsia-500 text-fuchsia-500 dark:text-fuchsia-400 opacity-100';
        }
        return `${baseClasses} ${activeStateClasses}`;
    }

    if (tabName === 'casino') {
        return `${baseClasses} border-transparent text-gray-500 dark:text-gray-400 opacity-0 hover:opacity-100 hover:text-fuchsia-500 hover:border-fuchsia-500`;
    } else {
        const inactiveStateClasses = 'border-transparent text-gray-500 dark:text-gray-400';
        const hoverClasses = 'hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600';
        return `${baseClasses} ${inactiveStateClasses} ${hoverClasses}`;
    }
  };
  
  const isTwoColumnLayout = !['screen', 'casino'].includes(activeTab);

  return (
    <>
      <SakuraFall mode={activeTab === 'casino' ? 'dollars' : 'sakura'} />
      <CommentModal 
        isOpen={commentModalState.isOpen}
        person={commentModalState.person}
        onClose={handleCloseCommentModal}
        onSave={handleSaveComment}
      />
      <div className="min-h-screen text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 relative">
        <ApiKeyManager error={apiKeyError} onErrorDismiss={() => setApiKeyError(null)} />
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8 p-4 bg-white/80 dark:bg-gray-900/70 rounded-lg backdrop-blur-md min-h-[168px] flex flex-col justify-center items-center">
            {activeTab === 'casino' ? (
              <div key="casino-header" className="animate-fade-in">
                <h1 className="neon-logo-777">777</h1>
              </div>
            ) : (
              <div key="main-header" className="animate-fade-in">
                <div className="relative inline-block">
                  <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-5xl md:text-6xl">
                    Convers PRO
                  </h1>
                </div>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Вас приветствует Основа!!
                </p>
              </div>
            )}
          </header>
          
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left/Top Panel: Controls & Main View */}
            <div className={`${isTwoColumnLayout ? 'lg:col-span-5' : 'lg:col-span-12'} bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-lg shadow-lg p-6 flex flex-col gap-6`}>
                <div className="flex-grow">
                  <div className="border-b border-gray-300 dark:border-gray-700">
                    <nav className="-mb-px flex items-center" aria-label="Tabs">
                        <button onClick={() => setActiveTab('configuration')} className={getTabClassName('configuration')}>
                            Доходные
                        </button>
                        <button onClick={() => setActiveTab('prompts')} className={`${getTabClassName('prompts')} ml-6`}>
                            Иерархия
                        </button>
                        <button onClick={() => setActiveTab('experience')} className={`${getTabClassName('experience')} ml-6`}>
                            Стаж
                        </button>
                        <button onClick={() => setActiveTab('screen')} className={`${getTabClassName('screen')} ml-6`}>
                            Экран
                        </button>
                        <div className="flex-grow" />
                        <button onClick={() => setActiveTab('casino')} className={getTabClassName('casino')}>
                            .
                        </button>
                    </nav>
                  </div>
                  <div className="pt-6">
                      <div hidden={activeTab !== 'configuration'}>
                          <div className="space-y-6">
                              <Input
                                  id="inn"
                                  label="ИНН"
                                  value={inn}
                                  onChange={(e) => setInn(e.target.value)}
                                  placeholder="777"
                                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2-2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>}
                              />
                              <Input
                                  id="orgName"
                                  label="Название орг"
                                  value={orgName}
                                  onChange={(e) => setOrgName(e.target.value)}
                                  placeholder='ОООООО "Наебалово"'
                                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>}
                              />
                              <Input
                                  id="topN"
                                  label="Кол-во"
                                  type="number"
                                  value={topN}
                                  onChange={(e) => setTopN(e.target.value)}
                                  min="1"
                                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                              />
                              <FileUpload
                                  id="incomeFile"
                                  label="Income Data File"
                                  selectedFile={file}
                                  onFileSelect={setFile}
                              />
                          </div>
                      </div>
                      <div hidden={activeTab !== 'prompts'}>
                          <PromptsDisplay 
                            orgName={orgName} 
                            inn={inn} 
                            reverseOrder={reverseCopyOrder}
                            onReverseOrderChange={setReverseCopyOrder}
                            experienceList={experienceList}
                            setExperienceList={setExperienceList}
                            allParsedData={allParsedData}
                            onOpenCommentModal={handleOpenCommentModal}
                            onPromptCopied={() => {}} // This is now handled by ResultsDisplay
                          />
                      </div>
                      <div hidden={activeTab !== 'experience'}>
                        <ExperienceDisplay 
                          people={experienceList} 
                          setPeople={setExperienceList}
                          allParsedData={allParsedData}
                          orgName={orgName}
                          inn={inn}
                          onOpenCommentModal={handleOpenCommentModal}
                        />
                      </div>
                      <div hidden={activeTab !== 'screen'}>
                        <ScreenShareDisplay 
                          experienceList={experienceList}
                          setExperienceList={setExperienceList}
                          orgName={orgName}
                          inn={inn}
                          allParsedData={allParsedData}
                          onApiKeyError={setApiKeyError}
                          onAnalysisTriggerReady={(trigger) => {
                            analysisTriggerRef.current = trigger;
                          }}
                          isCapturing={isCapturing}
                          setIsCapturing={setIsCapturing}
                        />
                      </div>
                      <div hidden={activeTab !== 'casino'}>
                          <CasinoDisplay />
                      </div>
                  </div>
                </div>
                {activeTab === 'configuration' && (
                  <div className="mt-auto pt-6 border-t border-gray-300 dark:border-gray-700 space-y-4">
                    {allParsedData.length > 0 && !isLoading && (
                        <div>
                            <Input
                              id="search"
                              label="Find by Name"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Start typing a name..."
                              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>}
                            />
                            {searchQuery && (
                              <div className="mt-4">
                                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">результат по поиск фио</h3>
                                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                                      {searchResults.length > 0 ? (
                                          <ul className="space-y-2">
                                              {searchResults.map((person, index) => {
                                                  const isCopied = copiedSearchIndices.has(index);
                                                  const lineText = reverseCopyOrder
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
                                                                  className="text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
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
                      )}
                  </div>
                )}
            </div>

            {/* Right/Bottom Panel: Results */}
            {activeTab !== 'casino' && (
                <div className={isTwoColumnLayout ? 'lg:col-span-7' : 'lg:col-span-12'}>
                <ResultsDisplay 
                  data={analyzedData} 
                  isLoading={isLoading} 
                  error={error} 
                  reverseOrder={reverseCopyOrder}
                  experienceList={experienceList}
                  onOpenCommentModal={handleOpenCommentModal}
                  copiedIndices={copiedIndices}
                  setCopiedIndices={setCopiedIndices}
                  sequentialCopyIndex={sequentialCopyIndex}
                  setSequentialCopyIndex={setSequentialCopyIndex}
                  onInitialPromptCopied={handleInitialPromptCopied}
                  onPersonCopied={handlePersonCopied}
                  isAutoAnalysisEnabled={isAutoAnalysisEnabled}
                  setIsAutoAnalysisEnabled={setIsAutoAnalysisEnabled}
                />
                </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
