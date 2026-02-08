import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  label?: string;
  className?: string;
}

const defaultPresets = [
  '#a855f7', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#ffffff', // white
  '#000000', // black
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, presets = defaultPresets, label, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [copied, setCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync input with external value
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Close on click outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      // Only update if valid hex
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
      }
    };

    const handleInputBlur = () => {
      // Reset to current value if invalid
      if (!/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
        setInputValue(value);
      }
    };

    const handlePresetClick = (color: string) => {
      setInputValue(color);
      onChange(color);
    };

    const copyToClipboard = async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return (
      <div ref={containerRef} className={`relative${className ? ` ${className}` : ''}`}>
        {label && (
          <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
        )}

        <div className="flex items-center gap-2">
          {/* Color swatch button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-lg border-2 border-border shrink-0 transition-all duration-200 hover:scale-105 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
            style={{ backgroundColor: value }}
            aria-label="Open color picker"
          />

          {/* Hex input */}
          <InputText
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => setIsOpen(true)}
            className="font-mono text-sm uppercase w-28"
            placeholder="#000000"
            maxLength={7}
          />

          {/* Copy button */}
          <Button
            type="button"
            text
            size="small"
            onClick={copyToClipboard}
            className="shrink-0"
            tooltip={copied ? 'Copied!' : 'Copy hex'}
            tooltipOptions={{ position: 'top' }}
          >
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
          </Button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={ref}
            className="absolute z-50 mt-2 p-3 rounded-lg bg-card border border-border shadow-xl animate-scale-in"
          >
            {/* Native color input */}
            <div className="mb-3">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onChange(e.target.value);
                }}
                className="w-full h-10 rounded cursor-pointer border border-border bg-transparent"
              />
            </div>

            {/* Preset swatches */}
            <div className="grid grid-cols-5 gap-2">
              {presets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={`w-8 h-8 rounded-md border-2 transition-all duration-150 hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50${value === color ? ' border-primary' : ' border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
