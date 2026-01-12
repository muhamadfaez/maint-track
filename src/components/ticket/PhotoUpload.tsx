import React, { useState, useRef } from 'react';
import { Camera, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImageToBase64 } from '@/lib/image-utils';
import { toast } from 'sonner';

interface PhotoUploadProps {
    value?: string;
    onChange: (url: string | undefined) => void;
    variant?: 'default' | 'horizontal';
}

export function PhotoUpload({ value, onChange, variant = 'default' }: PhotoUploadProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        try {
            setIsProcessing(true);
            const base64 = await compressImageToBase64(file, 1000, 0.6);
            const sizeInKb = (base64.length * (3 / 4)) / 1024;
            if (sizeInKb > 800) {
                toast.error('Compressed image is still too large');
                return;
            }
            onChange(base64);
            toast.success('Photo optimized');
        } catch (err) {
            console.error('Processing failed:', err);
            toast.error('Failed to process photo');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        onChange(undefined);
        toast.success('Photo removed');
    };

    if (variant === 'horizontal') {
        return (
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Reference Photo
                </label>
                <div className="flex items-center gap-3 p-2 rounded-xl border border-dashed border-muted bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className="h-16 w-16 shrink-0 rounded-lg overflow-hidden border bg-background flex items-center justify-center cursor-pointer hover:border-teal-500/50 transition-all relative group"
                    >
                        {value ? (
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                        ) : isProcessing ? (
                            <Loader2 className="h-5 w-5 text-teal-500 animate-spin" />
                        ) : (
                            <Camera className="h-5 w-5 text-muted-foreground" />
                        )}

                        {value && !isProcessing && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Edit2 className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {value ? (
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-medium text-teal-600 truncate">Photo Attached</p>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600 flex items-center gap-1 w-fit"
                                >
                                    <Trash2 className="h-3 w-3" /> Remove
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <p className="text-[11px] font-semibold">No photo added</p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[10px] font-bold uppercase text-teal-600 hover:text-teal-700 w-fit mt-1"
                                >
                                    Upload Documentation
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Site Documentation
                </label>
                {value && !isProcessing && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    >
                        <Trash2 className="h-3 w-3" /> Remove Photo
                    </button>
                )}
            </div>

            {value ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-teal-500/20 bg-teal-50/5 group">
                    <img
                        src={value}
                        alt="Upload preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="glass"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Change Photo
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`
            relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer
            flex flex-col items-center justify-center gap-3
            ${isProcessing ? 'border-teal-500/20 bg-teal-50/5' : 'border-muted hover:border-teal-500/40 hover:bg-teal-50/10'}
          `}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                            <p className="text-xs font-medium text-teal-600/70">Optimizing Image...</p>
                        </>
                    ) : (
                        <>
                            <div className="p-3 rounded-full bg-teal-50/50 text-teal-600">
                                <Camera className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold">Click to add photo</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">Auto-compressed for database storage</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
}
