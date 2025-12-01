import React, { useState, useEffect } from 'react';
import Button from './Button';

// Fix: Moved the AIStudio interface into the `declare global` block to resolve a TypeScript error
// about subsequent property declarations. This ensures a single, merged global type definition for window.aistudio.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

interface ApiKeyManagerProps {
  error: string | null;
  onErrorDismiss: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ error, onErrorDismiss }) => {
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(result => {
        setHasKey(result);
      });
    } else {
      console.warn("aistudio API not found. API key management disabled.");
    }
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      onErrorDismiss();
    }
  };

  const showPrompt = !hasKey || error;

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-50 bg-gray-800/80 backdrop-blur-md text-white p-4 rounded-lg shadow-lg max-w-sm animate-fade-in border border-indigo-500/50">
      <h3 className="font-bold text-lg text-indigo-400 mb-2">API Key Management</h3>
      {!hasKey && (
        <p className="text-sm mb-3">
          To use the app's AI features, please select an API key.
        </p>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-600 text-red-300 px-3 py-2 rounded-md mb-3 text-sm">
          <p className="font-bold">An API error occurred:</p>
          <p>{error}</p>
        </div>
      )}
      <Button onClick={handleSelectKey} className="w-full">
        {hasKey ? 'Change API Key' : 'Select API Key'}
      </Button>
    </div>
  );
};

export default ApiKeyManager;
