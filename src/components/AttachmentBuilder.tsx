import React from 'react';
import { Paperclip, Trash2, File, ExternalLink, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface AttachmentBuilderProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  isLocked?: boolean;
}

export const AttachmentBuilder: React.FC<AttachmentBuilderProps> = ({ attachments, onChange, isLocked }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, we would upload to Firebase Storage here
      // For now, we'll simulate with a data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: event.target?.result as string,
          type: file.type
        };
        onChange([...attachments, newAttachment]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Attachments</h3>
        {!isLocked && (
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2 text-xs border-dashed"
            >
              <Paperclip className="h-3 w-3" /> Attach File
            </Button>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs text-slate-400">No attachments yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm group">
              <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                <File className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{attachment.name}</p>
                <p className="text-[10px] text-slate-500 uppercase">{attachment.type.split('/')[1] || 'FILE'}</p>
              </div>
              <div className="flex gap-1">
                <a 
                  href={attachment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {!isLocked && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
