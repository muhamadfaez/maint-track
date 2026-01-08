import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/image-utils';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface PhotoUploadProps {
    value?: string;
    onChange: (url: string | undefined) => void;
}

export function PhotoUpload({ value, onChange }: PhotoUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        try {
            setIsUploading(true);

            // 1. Compress Image
            const compressedBlob = await compressImage(file, 1200, 0.7);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

            // 2. Upload
            const formData = new FormData();
            formData.append('file', compressedFile);

            const response = await api<{ key: string; url: string }>('/api/upload', {
                method: 'POST',
                body: formData,
            });

            onChange(response.url);
            toast.success('Photo uploaded and compressed');
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Failed to upload photo');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        if (!value) return;

        // Extract key from URL
        const key = value.split('/').pop();
        if (!key) return;

        try {
            await api(`/api/files/${key}`, { method: 'DELETE' });
            onChange(undefined);
            toast.success('Photo removed');
        } catch (err) {
            console.error('Remove failed:', err);
            toast.error('Failed to remove photo from storage');
            // Still clear the value in state even if R2 delete fails
            onChange(undefined);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Photo Reference
                </label>
                {value && !isUploading && (
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
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Change Photo
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`
            relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer
            flex flex-col items-center justify-center gap-3
            ${isUploading ? 'border-teal-500/20 bg-teal-50/5' : 'border-muted hover:border-teal-500/40 hover:bg-teal-50/10'}
          `}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                            <p className="text-xs font-medium text-teal-600/70">Optimizing & Uploading...</p>
                        </>
                    ) : (
                        <>
                            <div className="p-3 rounded-full bg-teal-50/50 text-teal-600">
                                <Camera className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold">Click to upload photo</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">JPG, PNG up to 10MB (will be autocompressed)</p>
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
