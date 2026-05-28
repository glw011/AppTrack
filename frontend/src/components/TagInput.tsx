import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function TagInput({ value, onChange, placeholder = 'Add tag…', className }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if(trimmed && !value.includes(trimmed)){
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if(e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      addTag(input);
    }
    else if(e.key === 'Backspace' && !input && value.length > 0){
      removeTag(value[value.length - 1]);
    }
  };

  return(
    <div
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="h-auto flex-1 border-0 p-0 shadow-none focus-visible:ring-0 min-w-[120px]"
      />
    </div>
  );
}
