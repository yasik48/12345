
import React, { useState, useEffect } from 'react';
import { AnalyzedPerson } from '../types';
import Spinner from './Spinner';
import Button from './Button';

interface ResultsDisplayProps {
  data: AnalyzedPerson[];
  isLoading: boolean;
  error: string | null;
  reverseOrder: boolean;
  experienceList: AnalyzedPerson[];
  onOpenCommentModal: (person: AnalyzedPerson, event: React.MouseEvent<HTMLDivElement>) => void;
  copiedIndices: Set<number>;
  setCopiedIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  sequentialCopyIndex: number;
  setSequentialCopyIndex: React.Dispatch<React.SetStateAction<number>>;
  onInitialPromptCopied: () => void;
  onPersonCopied: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    data, isLoading, error, reverseOrder, experienceList, onOpenCommentModal,
    copiedIndices, setCopiedIndices, sequentialCopyIndex, setSequentialCopyIndex,
    onInitialPromptCopied, onPersonCopied
}) => {
  const [customAppendText, setCustomAppendText] = useState('');
  const [includeInn, setIncludeInn] = useState(false);
  const [includeOrg, setIncludeOrg] = useState(false);
  const [enableAnalysis, setEnableAnalysis] = useState(false);

  const generateFullCopyText = (baseText: string): string => {
    return [baseText.trim(), customAppendText.trim()].filter(Boolean).join(' ');
  };
  
  const generateLineText = (person: AnalyzedPerson): string => {
    const parts: string[] = [];
    if (reverseOrder) {
        if (includeInn) parts.push(person.inn);
        if (includeOrg) parts.push(person.org);
        parts.push(person.name);
    } else {
        parts.push(person.name);
        if (includeOrg) parts.push(person.org);
        if (includeInn) parts.push(person.inn);
    }
    return parts.join(' ');
  };

  const handleCopy = (text: string, index: number) => {
    if (!text) return;
    const textToCopy = generateFullCopyText(text);
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        setCopiedIndices(prev => new Set(prev).add(index));
      },
      (err) => {
        console.error('Failed to copy text: ', err);
      }
    );
  };

  const handleCopyNameAndDob = (name: string, dob: string | undefined, index: number) => {
    const textToCopy = dob ? `${name} ${dob}` : name;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        setCopiedIndices(prev => new Set(prev).add(index));
      },
      (err) => {
        console.error('Failed to copy text: ', err);
      }
    );
  };

  const handleSequentialCopy = () => {
    if (data.length === 0) return;
    
    let currentIndex = sequentialCopyIndex;
    if (currentIndex >= data.length) {
      currentIndex = -2;
    }
    
    let textToCopy = '';
    
    if (currentIndex === -2) {
      textToCopy = "Руководящий состав";
    } else if (currentIndex === -1) {
      textToCopy = "Заместители";
    } else {
      const person = data[currentIndex];
      textToCopy = generateLineText(person);
    }
    
    const fullTextToCopy = generateFullCopyText(textToCopy);
    navigator.clipboard.writeText(fullTextToCopy).then(() => {
        if (currentIndex === -2) {
            setCopiedIndices(new Set());
        } else if (currentIndex >= 0) {
            setCopiedIndices(prev => new Set(prev).add(currentIndex));
        }
        
        setSequentialCopyIndex(currentIndex + 1);

        // Signal the copy event for the auto-analysis workflow ONLY if enabled
        if (enableAnalysis) {
            if (currentIndex === -2 || currentIndex === -1) {
                onInitialPromptCopied();
            } else if (currentIndex >= 0) {
                onPersonCopied();
            }
        }
    }, (err) => {
        console.error('Failed to copy text: ', err);
    });
  };

  const getCopyButtonLabel = () => {
    const total = data.length;
    if (total === 0) return 'Copy Next';

    const indexToDisplay = sequentialCopyIndex;
    let nextItemLabel: string;

    if (indexToDisplay >= total) {
        nextItemLabel = "Рук."; // It will wrap around to "Руководящий состав"
    } else if (indexToDisplay === -2) {
        nextItemLabel = "Рук.";
    } else if (indexToDisplay === -1) {
        nextItemLabel = "Зам.";
    } else {
        nextItemLabel = `${indexToDisplay}`;
    }
    
    return `Copy Next (${nextItemLabel}/${total})`;
  };

  const title = "Result";
  const emptyMessage = "Results will appear here once you run the analysis.";
  
  return (
    <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-md text-gray-900 dark:text-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4 border-b border-gray-300 dark:border-gray-700 pb-2 flex-shrink-0 flex-wrap gap-2">
        <h2 className="text-2xl font-bold flex-shrink-0">{title}</h2>
        <div className="flex-grow mx-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-4">
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
                <label className="flex items-center space-x-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300 select-none">
                    <input 
                        type="checkbox" 
                        checked={enableAnalysis} 
                        onChange={() => setEnableAnalysis(!enableAnalysis)} 
                        className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 text-indigo-500 focus:ring-indigo-600"
                    />
                    <span>Анализ</span>
                </label>
            </div>
            <input
                type="text"
                value={customAppendText}
                onChange={(e) => setCustomAppendText(e.target.value)}
                placeholder="Text"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 flex-grow"
                aria-label="Слово для добавления в конец при копировании"
            />
        </div>
        {!isLoading && !error && data.length > 0 && (
          <Button onClick={handleSequentialCopy} variant="secondary" className="flex-shrink-0">
            {getCopyButtonLabel()}
          </Button>
        )}
      </div>
      <div>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10">
            <Spinner />
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">Analyzing your data...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center text-center p-4">
              <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{error}</span>
              </div>
          </div>
        )}
        {!isLoading && !error && data.length === 0 && (
          <div className="flex items-center justify-center py-10 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
        {!isLoading && !error && data.length > 0 && (
          <div className="bg-gray-900/5 dark:bg-gray-800/50 rounded-md p-4 font-mono text-sm text-gray-800 dark:text-white">
              {data.map((person, index) => {
                const isCopied = copiedIndices.has(index);
                const nameAndDobText = person.dob ? `${person.name} ${person.dob}` : person.name;
                const fullLineText = generateLineText(person);
                const isInExperienceList = experienceList.some(p => p.name === person.name && p.inn === person.inn);

                return (
                  <div key={index} className="flex items-center mb-1">
                    <div 
                      className="w-10 flex-shrink-0 flex items-center justify-center cursor-pointer group"
                      onClick={(e) => onOpenCommentModal(person, e)}
                      role="button"
                      aria-pressed={isInExperienceList}
                      title={isInExperienceList ? "Edit comment or view details" : "Add comment and move to Experience list"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-all duration-200 ${isInExperienceList ? 'text-green-400 scale-100' : 'text-gray-500/40 scale-90 group-hover:scale-100 group-hover:text-green-400/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-500 w-8 text-right mr-4 select-none flex-shrink-0">{index + 1}</span>
                    <div className="flex-1 min-w-0 flex items-center">
                      <div className="truncate">
                          <span
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            onClick={() => handleCopyNameAndDob(person.name, person.dob, index)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Copy name and date of birth: ${nameAndDobText}`}
                            title={`Click to copy name and DOB: ${nameAndDobText}`}
                          >
                            {person.name}
                          </span>
                          {(includeOrg || includeInn) && (
                            <span
                                className="text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
                                onClick={() => handleCopy(fullLineText, index)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Copy line: ${generateFullCopyText(fullLineText)}`}
                                title={`Click to copy: ${generateFullCopyText(fullLineText)}`}
                            >
                                {' '}
                                {reverseOrder ? (
                                    <>
                                        {includeInn && <>{person.inn} </>}
                                        {includeOrg && <>{person.org} </>}
                                    </>
                                ) : (
                                    <>
                                        {includeOrg && <>{person.org} </>}
                                        {includeInn && <>{person.inn} </>}
                                    </>
                                )}
                            </span>
                          )}
                        </div>
                      
                      {isCopied && (
                         <span className="ml-2 flex-shrink-0 text-green-500 dark:text-green-400" aria-live="polite" title="Copied!">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
