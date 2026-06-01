import React from 'react';
import { X } from 'lucide-react';

interface PreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-8" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90"
      >
        <X className="w-8 h-8" />
      </button>
      
      <div 
        className="max-w-full max-h-full flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-2xl border border-white/10" 
        />
      </div>
    </div>
  );
};

export default PreviewModal;
