import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, PlayCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
    onUploadComplete: (url: string) => void;
    onUploadStart?: () => void;
    className?: string;
    accept?: string;
    label?: string;
}

export function FileUpload({
    onUploadComplete,
    onUploadStart,
    className,
    accept = "image/*,video/*",
    label = "Upload Evidence"
}: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(10);
        onUploadStart?.();

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Manual progress simulation since fetch doesn't support upload progress easily 
            // without more complex ReadableStream or XMLHttpRequest
            const interval = setInterval(() => {
                setProgress(prev => (prev >= 90 ? 90 : prev + 10));
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            const result = await response.json();

            if (result.success) {
                setProgress(100);
                onUploadComplete(result.data.url);
                setTimeout(() => {
                    setFile(null);
                    setUploading(false);
                    setProgress(0);
                }, 1000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (err: any) {
            setError(err.message);
            setUploading(false);
        }
    };

    const isVideo = file?.type.startsWith('video/');
    const isImage = file?.type.startsWith('image/');

    return (
        <div className={cn("space-y-4 w-full", className)}>
            {!file ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-muted/5"
                >
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">Images or videos up to 10MB</div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={accept}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded flex-shrink-0">
                            {isImage && <ImageIcon className="h-4 w-4" />}
                            {isVideo && <PlayCircle className="h-4 w-4" />}
                            {!isImage && !isVideo && <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                        {!uploading && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setFile(null)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {uploading && (
                        <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                        </div>
                    )}

                    {!uploading && progress === 100 && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Upload complete
                        </div>
                    )}

                    {!uploading && progress === 0 && (
                        <Button
                            size="sm"
                            className="w-full mt-3"
                            onClick={handleUpload}
                        >
                            Start Upload
                        </Button>
                    )}

                    {error && (
                        <div className="mt-2 text-xs text-destructive font-medium">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
