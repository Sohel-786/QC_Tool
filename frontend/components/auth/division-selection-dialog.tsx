'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface DivisionSelectionDialogProps {
    user: User;
    onSelect: (divisionId: number, divisionName: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
    closable?: boolean;
}

export function DivisionSelectionDialog({
    user,
    onSelect,
    isOpen: propsIsOpen,
    onClose,
    closable = false
}: DivisionSelectionDialogProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | ''>('');

    // Update selectedId when user changes or has a default
    // Update selectedId when user changes or has a default
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const persistentId = localStorage.getItem('selectedDivisionId');
            if (persistentId) {
                const pid = parseInt(persistentId);
                // Verify if the user still has access to this division
                if (user.allowedDivisions && user.allowedDivisions.some(d => d.id === pid)) {
                    setSelectedId(pid);
                }
            }
        }
    }, [user]);

    // Handle mandatory open state if not provided via props
    useEffect(() => {
        if (propsIsOpen === undefined && user && user.allowedDivisions && user.allowedDivisions.length > 0) {
            const persistentSelected = localStorage.getItem('selectedDivisionId');
            if (!persistentSelected && !closable) {
                setInternalIsOpen(true);
            }
        }
    }, [user, closable, propsIsOpen]);

    const isOpen = propsIsOpen ?? internalIsOpen;

    const handleSave = () => {
        if (selectedId === '') return;
        const division = user.allowedDivisions?.find(d => d.id === selectedId);
        if (division) {
            onSelect(division.id, division.name);
            if (onClose) onClose();
            setInternalIsOpen(false);
        }
    };

    if (!user.allowedDivisions || user.allowedDivisions.length === 0) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={closable && onClose ? onClose : () => { }}
            title=""
            size="md"
            closeButtonDisabled={!closable}
            closeOnBackdropClick={closable}
            hideHeader={true}
        >
            <div className="p-2 space-y-8">
                {/* Header matching image structure */}
                <div>
                    <h2 className="text-[28px] font-bold text-[#333] leading-tight mb-1">Division Selection</h2>
                    <p className="text-[#6b7280] text-lg font-medium">Select Division</p>
                </div>

                <div className="space-y-6">
                    {/* Select Division Field */}
                    <div className="space-y-3">
                        <Label className="text-[#374151] text-base font-semibold block">Select Division</Label>
                        <div className="relative group">
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(Number(e.target.value))}
                                className={cn(
                                    "w-full h-[52px] pl-4 pr-12 rounded-lg border border-[#d1d5db] bg-white text-lg font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all",
                                    selectedId === '' ? "text-[#9ca3af]" : "text-[#374151]"
                                )}
                            >
                                <option value="" disabled>-- Select Division --</option>
                                {user.allowedDivisions.map((div) => (
                                    <option key={div.id} value={div.id}>
                                        {div.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b7280]">
                                <ChevronDown className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    {/* Save Button matching image style */}
                    <div className="flex justify-center pt-4 pb-2">
                        <Button
                            onClick={handleSave}
                            disabled={selectedId === ''}
                            className="bg-[#3f51b5] hover:bg-[#303f9f] text-white h-[48px] px-12 min-w-[140px] rounded-lg text-lg font-bold shadow-md transition-all active:scale-95"
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
