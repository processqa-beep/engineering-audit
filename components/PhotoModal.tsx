'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string;
  title?: string;
  description?: string;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title = 'Photo Viewer',
  description,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll completely when modal is active
  useEffect(() => {
    if (isOpen && photoUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, photoUrl]);

  if (!mounted || !isOpen || !photoUrl) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-hidden select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div>
            <h3 className="text-sm font-extrabold text-white">{title}</h3>
            {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center space-x-2">
            {photoUrl.startsWith('http') && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Image scaled inside with zero scrolling */}
        <div className="p-4 flex-1 flex items-center justify-center bg-slate-950 overflow-hidden">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[55vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-md"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
