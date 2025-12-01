
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Button from './Button';
import { analyzeScreenAndGetPersonDetailsWithBoundingBox, ApiKeyError } from '../services/geminiService';
import { AnalyzedPerson, PersonIncome } from '../types';

interface ScreenShareDisplayProps {
  experienceList: AnalyzedPerson[];
  setExperienceList: React.Dispatch<React.SetStateAction<AnalyzedPerson[]>>;
  orgName: string;
  inn: string;
  allParsedData: PersonIncome[];
  onApiKeyError: (message: string) => void;
  onAnalysisTriggerReady: (trigger: (personToAnalyze: AnalyzedPerson) => Promise<void>) => void;
  isCapturing: boolean;
  setIsCapturing: React.Dispatch<React.SetStateAction<boolean>>;
}

const ScreenShareDisplay: React.FC<ScreenShareDisplayProps> = ({ experienceList, setExperienceList, orgName, inn, allParsedData, onApiKeyError, onAnalysisTriggerReady, isCapturing, setIsCapturing }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentStatus, setCurrentStatus] = useState("Share your screen to begin.");
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Effect to attach or detach the stream from the video element
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const handleStopSharing = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCurrentStatus("Share your screen to begin.");
    }, [stream]);

    // Cleanup effect for component unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const handleStartSharing = async () => {
        if (stream) return;
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as MediaTrackConstraints,
                audio: false,
            });
            setError(null);
            setInfoMessage(null);
            // Listen for when the user stops sharing via the browser's UI
            displayStream.getVideoTracks()[0].addEventListener('ended', handleStopSharing);
            setStream(displayStream);
            setCurrentStatus("Screen shared. Ready to start analysis.");
        } catch (err) {
            setError(null);
            setInfoMessage(null);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                console.log("Screen share permission denied by user.");
                setInfoMessage("Permission to share screen was denied. To use this feature, please allow screen sharing. You may need to reload the page or adjust your browser's site permissions.");
                setCurrentStatus("Permission denied.");
            } else {
                console.error("Error starting screen share:", err);
                setError("Could not start screen sharing. Please ensure your browser supports this feature and has the necessary permissions.");
                setCurrentStatus("Failed to start sharing.");
            }
        }
    };

    const cropImage = (imageDataUrl: string, boundingBox: { x: number; y: number; width: number; height: number; }): Promise<string> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = boundingBox.width;
                canvas.height = boundingBox.height;
                const context = canvas.getContext('2d');
                if (!context) {
                    return reject(new Error("Could not get canvas context for cropping."));
                }
                context.drawImage(image, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, 0, 0, boundingBox.width, boundingBox.height);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            image.onerror = (err) => {
                reject(err);
            };
            image.src = imageDataUrl;
        });
    };

    const runAnalysisForPerson = useCallback(async (personToAnalyze: AnalyzedPerson) => {
        if (!stream) {
            setError("Screen is not being shared. Please share your screen first.");
            setCurrentStatus("Error: Screen not shared.");
            return;
        }
    
        setIsAnalyzing(true);
        setError(null);
        setInfoMessage(null);
        setCurrentStatus(`Analyzing screen for "${personToAnalyze.name}"...`);
    
        try {
            if (!videoRef.current || !canvasRef.current) throw new Error("Video or canvas ref not available.");
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) throw new Error("Could not get canvas context");
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const fullImageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = fullImageDataUrl.split(',')[1];
    
            const { summary, dateOfBirth, fullName: nameFromScreen, boundingBox } = await analyzeScreenAndGetPersonDetailsWithBoundingBox(personToAnalyze.name, base64Data);

            // CASE 1: Bounding box is null, meaning the screen was irrelevant.
            if (!boundingBox) {
                const notFoundComment = `🔎 Результат анализа:\n${summary || 'Relevant information not found on screen.'}`;
                setExperienceList(prev => prev.map(p =>
                    p.name === personToAnalyze.name && p.inn === personToAnalyze.inn
                    ? { 
                        ...p, 
                        analysisStatus: 'error',
                        comment: (p.comment ? `${p.comment}\n\n---\n\n` : '') + notFoundComment.trim(),
                        images: [...(p.images || []), fullImageDataUrl] // Add full screenshot for debugging
                      }
                    : p
                ));
                setCurrentStatus(`Analysis failed for "${personToAnalyze.name}": screen irrelevant.`);
                return;
            }

            // CASE 2: Bounding box was found, so we can crop the image.
            const croppedImageDataUrl = await cropImage(fullImageDataUrl, boundingBox);
            const analysisComment = `🔎 Результат анализа:\n${summary || 'Analysis complete.'}`;
            
            const isMatch = nameFromScreen && nameFromScreen.toLowerCase() === personToAnalyze.name.toLowerCase();

            setExperienceList(prev => prev.map(p => {
                if (p.name === personToAnalyze.name && p.inn === personToAnalyze.inn) {
                    return {
                        ...p,
                        analysisStatus: isMatch ? 'found' : 'other',
                        comment: (p.comment ? `${p.comment}\n\n---\n\n` : '') + analysisComment.trim(),
                        images: [...(p.images || []), croppedImageDataUrl], // Always add the CROPPED image
                        dob: isMatch ? (dateOfBirth || p.dob) : p.dob, // Only update DOB on a confirmed match
                    };
                }
                return p;
            }));
    
            setCurrentStatus(`Analysis complete for "${personToAnalyze.name}".`);
    
        } catch (error: any) {
            console.error("Analysis failed:", error);
            const errorMessage = error instanceof ApiKeyError ? error.message : "An unexpected error occurred during analysis.";
            if (error instanceof ApiKeyError) {
                onApiKeyError(errorMessage);
            }
            setError(errorMessage);
            setCurrentStatus(`Error analyzing for "${personToAnalyze.name}".`);
            setExperienceList(prev => prev.map(p =>
                p.name === personToAnalyze.name && p.inn === personToAnalyze.inn
                ? { ...p, analysisStatus: 'error' }
                : p
            ));
             if (error instanceof ApiKeyError) {
                throw error;
            }
        } finally {
            setIsAnalyzing(false);
        }
    }, [stream, setExperienceList, onApiKeyError]);

    useEffect(() => {
        onAnalysisTriggerReady(runAnalysisForPerson);
    }, [runAnalysisForPerson, onAnalysisTriggerReady]);

    return (
        <div className="space-y-4">
            <div className={`relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 ${isCapturing ? 'animate-yellow-flash' : ''} ${!stream ? 'flex items-center justify-center' : ''}`}>
                <video ref={videoRef} autoPlay muted className={`w-full h-full object-contain transition-opacity duration-300 ${stream ? 'opacity-100' : 'opacity-0'}`} />
                <canvas ref={canvasRef} className="hidden" />
                {!stream && (
                    <div className="text-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <p className="mt-2">{currentStatus}</p>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-center space-x-4">
                {stream ? (
                    <Button onClick={handleStopSharing} className="!bg-red-600 hover:!bg-red-700">Stop Sharing</Button>
                ) : (
                    <Button onClick={handleStartSharing} disabled={isAnalyzing}>Share Screen</Button>
                )}
            </div>
            
            {isAnalyzing && (
                <div className="text-center text-sm text-indigo-400">
                    <p>{currentStatus}</p>
                </div>
            )}
            
            {error && (
                <div className="text-center p-2 bg-red-900/40 text-red-300 border border-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}
             {infoMessage && (
                <div className="text-center p-2 bg-blue-900/40 text-blue-300 border border-blue-700 rounded-md text-sm">
                    {infoMessage}
                </div>
            )}
        </div>
    );
};

export default ScreenShareDisplay;