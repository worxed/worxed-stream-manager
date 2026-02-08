import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Slider } from 'primereact/slider';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { ColorPicker } from '../ColorPicker';
import { useEditorStore, useFirstSelectedElement } from '../../stores/editorStore';
import type { SceneElement, AlertBoxConfig, ChatConfig, TextConfig, ImageConfig, CustomEventConfig, DataBindingConfig, AlertType } from '../../types';

const ALERT_TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'follow', label: 'Follow' },
  { value: 'subscribe', label: 'Subscribe' },
  { value: 'donation', label: 'Donation' },
  { value: 'raid', label: 'Raid' },
];

const ANIMATION_OPTIONS = [
  { value: 'fadeInUp', label: 'Fade In Up' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideInLeft', label: 'Slide In Left' },
  { value: 'scaleIn', label: 'Scale In' },
];

const OBJECT_FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'fill', label: 'Fill' },
];

const FONT_FAMILY_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'VT323, monospace', label: 'VT323 (Terminal)' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export default function PropertiesPanel() {
  const element = useFirstSelectedElement();
  const updateElement = useEditorStore(s => s.updateElement);
  const deleteSelectedElements = useEditorStore(s => s.deleteSelectedElements);
  const pushHistory = useEditorStore(s => s.pushHistory);

  // Track slider drag sessions to only push history once per drag
  const sliderDraggingRef = useRef(false);

  if (!element) return null;

  const onUpdate = (updates: Partial<SceneElement>) => {
    updateElement(element.id, updates);
  };

  const updateStyle = (updates: Partial<SceneElement['style']>) => {
    onUpdate({ style: { ...element.style, ...updates } });
  };

  const updateConfig = (updates: Record<string, unknown>) => {
    onUpdate({ config: { ...element.config, ...updates } });
  };

  // Push history before discrete changes
  const withHistory = (fn: () => void) => {
    pushHistory();
    fn();
  };

  // Slider: push history on first change of drag session
  const handleSliderChange = (setter: (v: number) => void) => (e: { value: number | [number, number] }) => {
    if (!sliderDraggingRef.current) {
      pushHistory();
      sliderDraggingRef.current = true;
    }
    setter(e.value as number);
  };

  const handleSliderEnd = () => {
    sliderDraggingRef.current = false;
  };

  const renderTypeSpecific = () => {
    switch (element.type) {
      case 'alert-box': {
        const config = element.config as AlertBoxConfig;
        return (
          <>
            <SectionHeader>Alert Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Alert Types</Label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs cursor-pointer">
                      <InputSwitch
                        checked={(config.alertTypes || []).includes(opt.value)}
                        onChange={(e) => {
                          withHistory(() => {
                            const types = config.alertTypes || [];
                            const newTypes = e.value
                              ? [...types, opt.value]
                              : types.filter(t => t !== opt.value);
                            updateConfig({ alertTypes: newTypes });
                          });
                        }}
                        className="!w-8 !h-4"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.duration || 5000) / 1000}s</span>
                </div>
                <Slider
                  value={config.duration || 5000}
                  min={1000}
                  max={15000}
                  step={500}
                  onChange={handleSliderChange((v) => updateConfig({ duration: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Animation</Label>
                <Dropdown
                  value={config.animation || 'fadeInUp'}
                  options={ANIMATION_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ animation: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full text-xs mt-1"
                />
              </div>
            </div>
          </>
        );
      }

      case 'chat': {
        const config = element.config as ChatConfig;
        return (
          <>
            <SectionHeader>Chat Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Max Messages</Label>
                <InputNumber
                  value={config.maxMessages || 20}
                  min={5}
                  max={50}
                  onFocus={pushHistory}
                  onValueChange={(e) => updateConfig({ maxMessages: e.value })}
                  className="w-full text-xs mt-1"
                  inputClassName="text-xs px-2 py-1"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <InputSwitch
                  checked={config.showBadges !== false}
                  onChange={(e) => withHistory(() => updateConfig({ showBadges: e.value }))}
                  className="!w-8 !h-4"
                />
                <span>Show Badges</span>
              </label>
              <div>
                <div className="flex justify-between">
                  <Label>Fade After</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {config.fadeAfter ? `${config.fadeAfter}s` : 'Never'}
                  </span>
                </div>
                <Slider
                  value={config.fadeAfter || 0}
                  min={0}
                  max={120}
                  step={5}
                  onChange={handleSliderChange((v) => updateConfig({ fadeAfter: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
            </div>
          </>
        );
      }

      case 'text': {
        const config = element.config as TextConfig;
        return (
          <>
            <SectionHeader>Text Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Content</Label>
                <InputTextarea
                  value={config.content || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ content: e.target.value })}
                  rows={3}
                  className="w-full text-xs mt-1"
                  autoResize
                />
              </div>
              <div>
                <Label>Font Weight</Label>
                <Dropdown
                  value={config.fontWeight || 'normal'}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'bold', label: 'Bold' },
                    { value: '100', label: 'Thin' },
                    { value: '300', label: 'Light' },
                    { value: '500', label: 'Medium' },
                    { value: '700', label: 'Bold' },
                    { value: '900', label: 'Black' },
                  ]}
                  onChange={(e) => withHistory(() => updateConfig({ fontWeight: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full text-xs mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Line Height</Label>
                  <span className="text-xs font-mono text-muted-foreground">{config.lineHeight || 1.5}</span>
                </div>
                <Slider
                  value={(config.lineHeight || 1.5) * 10}
                  min={10}
                  max={30}
                  onChange={handleSliderChange((v) => updateConfig({ lineHeight: v / 10 }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
            </div>
            <DataBindingSection
              binding={config.dataBinding}
              mode="text"
              updateConfig={updateConfig}
              pushHistory={pushHistory}
              withHistory={withHistory}
              handleSliderChange={handleSliderChange}
              handleSliderEnd={handleSliderEnd}
            />
          </>
        );
      }

      case 'image': {
        const config = element.config as ImageConfig;
        return (
          <>
            <SectionHeader>Image Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Image URL</Label>
                <InputText
                  value={config.src || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ src: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-xs mt-1"
                />
              </div>
              <div>
                <Label>Object Fit</Label>
                <Dropdown
                  value={config.objectFit || 'contain'}
                  options={OBJECT_FIT_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ objectFit: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full text-xs mt-1"
                />
              </div>
            </div>
            <DataBindingSection
              binding={config.dataBinding}
              mode="image"
              updateConfig={updateConfig}
              pushHistory={pushHistory}
              withHistory={withHistory}
              handleSliderChange={handleSliderChange}
              handleSliderEnd={handleSliderEnd}
            />
          </>
        );
      }

      case 'custom-event': {
        const config = element.config as CustomEventConfig;
        return (
          <>
            <SectionHeader>Custom Event Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Event Name</Label>
                <InputText
                  value={config.eventName || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ eventName: e.target.value })}
                  placeholder="hype-alert"
                  className="w-full text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Socket.IO event name from custom endpoints</p>
              </div>
              <div>
                <Label>Display Template</Label>
                <InputTextarea
                  value={config.template || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ template: e.target.value })}
                  placeholder="{{username}} says: {{message}}"
                  rows={2}
                  className="w-full text-xs mt-1"
                  autoResize
                />
                <p className="text-[10px] text-muted-foreground mt-1">Use {'{{field}}'} to insert event data</p>
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.duration || 5000) / 1000}s</span>
                </div>
                <Slider
                  value={config.duration || 5000}
                  min={1000}
                  max={30000}
                  step={500}
                  onChange={handleSliderChange((v) => updateConfig({ duration: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Animation</Label>
                <Dropdown
                  value={config.animation || 'fadeInUp'}
                  options={ANIMATION_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ animation: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full text-xs mt-1"
                />
              </div>
              <div>
                <Label>Max Queue Size</Label>
                <InputNumber
                  value={config.maxQueueSize || 10}
                  min={1}
                  max={50}
                  onFocus={pushHistory}
                  onValueChange={(e) => updateConfig({ maxQueueSize: e.value })}
                  className="w-full text-xs mt-1"
                  inputClassName="text-xs px-2 py-1"
                />
              </div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <InputText
              value={element.name}
              onFocus={pushHistory}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full text-xs mt-1"
            />
          </div>

          {/* Position */}
          <SectionHeader>Position</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>X</Label>
              <InputNumber
                value={element.x}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ x: e.value ?? 0 })}
                className="w-full text-xs mt-1"
                inputClassName="text-xs px-2 py-1"
              />
            </div>
            <div>
              <Label>Y</Label>
              <InputNumber
                value={element.y}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ y: e.value ?? 0 })}
                className="w-full text-xs mt-1"
                inputClassName="text-xs px-2 py-1"
              />
            </div>
          </div>

          {/* Size */}
          <SectionHeader>Size</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <InputNumber
                value={element.width}
                min={40}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ width: e.value ?? 40 })}
                className="w-full text-xs mt-1"
                inputClassName="text-xs px-2 py-1"
              />
            </div>
            <div>
              <Label>Height</Label>
              <InputNumber
                value={element.height}
                min={40}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ height: e.value ?? 40 })}
                className="w-full text-xs mt-1"
                inputClassName="text-xs px-2 py-1"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex justify-between">
              <Label>Rotation</Label>
              <span className="text-xs font-mono text-muted-foreground">{element.rotation}°</span>
            </div>
            <Slider
              value={element.rotation}
              min={0}
              max={360}
              onChange={handleSliderChange((v) => onUpdate({ rotation: v }))}
              onSlideEnd={handleSliderEnd}
              className="mt-1"
            />
          </div>

          {/* Style */}
          <SectionHeader>Style</SectionHeader>

          <div>
            <div className="flex justify-between">
              <Label>Opacity</Label>
              <span className="text-xs font-mono text-muted-foreground">{Math.round((element.style.opacity ?? 1) * 100)}%</span>
            </div>
            <Slider
              value={(element.style.opacity ?? 1) * 100}
              min={0}
              max={100}
              onChange={handleSliderChange((v) => updateStyle({ opacity: v / 100 }))}
              onSlideEnd={handleSliderEnd}
              className="mt-1"
            />
          </div>

          <ColorPicker
            label="Background"
            value={element.style.backgroundColor || 'transparent'}
            onChange={(color) => { pushHistory(); updateStyle({ backgroundColor: color }); }}
          />

          <ColorPicker
            label="Text Color"
            value={element.style.color || '#ffffff'}
            onChange={(color) => { pushHistory(); updateStyle({ color }); }}
          />

          <div>
            <div className="flex justify-between">
              <Label>Border Radius</Label>
              <span className="text-xs font-mono text-muted-foreground">{element.style.borderRadius || 0}px</span>
            </div>
            <Slider
              value={element.style.borderRadius || 0}
              min={0}
              max={50}
              onChange={handleSliderChange((v) => updateStyle({ borderRadius: v }))}
              onSlideEnd={handleSliderEnd}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Font Family</Label>
            <Dropdown
              value={element.style.fontFamily || 'Inter, system-ui, sans-serif'}
              options={FONT_FAMILY_OPTIONS}
              onChange={(e) => withHistory(() => updateStyle({ fontFamily: e.value }))}
              optionLabel="label"
              optionValue="value"
              className="w-full text-xs mt-1"
            />
          </div>

          <div>
            <Label>Font Size</Label>
            <InputNumber
              value={element.style.fontSize || 16}
              min={8}
              max={96}
              onFocus={pushHistory}
              onValueChange={(e) => updateStyle({ fontSize: e.value ?? 16 })}
              className="w-full text-xs mt-1"
              inputClassName="text-xs px-2 py-1"
              suffix=" px"
            />
          </div>

          <div>
            <Label>Text Align</Label>
            <Dropdown
              value={element.style.textAlign || 'left'}
              options={TEXT_ALIGN_OPTIONS}
              onChange={(e) => withHistory(() => updateStyle({ textAlign: e.value }))}
              optionLabel="label"
              optionValue="value"
              className="w-full text-xs mt-1"
            />
          </div>

          <div>
            <Label>Padding</Label>
            <InputNumber
              value={element.style.padding || 0}
              min={0}
              max={100}
              onFocus={pushHistory}
              onValueChange={(e) => updateStyle({ padding: e.value ?? 0 })}
              className="w-full text-xs mt-1"
              inputClassName="text-xs px-2 py-1"
              suffix=" px"
            />
          </div>

          {/* Toggles */}
          <SectionHeader>Visibility</SectionHeader>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <InputSwitch
              checked={element.visible}
              onChange={(e) => withHistory(() => onUpdate({ visible: e.value }))}
              className="!w-8 !h-4"
            />
            <span>Visible</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <InputSwitch
              checked={element.locked}
              onChange={(e) => withHistory(() => onUpdate({ locked: e.value }))}
              className="!w-8 !h-4"
            />
            <span>Locked</span>
          </label>

          {/* Type-specific */}
          {renderTypeSpecific()}

          {/* Delete */}
          <div className="pt-3 mt-2 border-t border-border">
            <Button
              onClick={deleteSelectedElements}
              severity="danger"
              text
              size="small"
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              <Trash2 size={14} />
              <span>Delete Element</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border">
      {children}
    </h4>
  );
}

function DataBindingSection({
  binding,
  mode,
  updateConfig,
  pushHistory,
  withHistory,
  handleSliderChange,
  handleSliderEnd,
}: {
  binding: DataBindingConfig | undefined;
  mode: 'text' | 'image';
  updateConfig: (updates: Record<string, unknown>) => void;
  pushHistory: () => void;
  withHistory: (fn: () => void) => void;
  handleSliderChange: (setter: (v: number) => void) => (e: { value: number | [number, number] }) => void;
  handleSliderEnd: () => void;
}) {
  const enabled = binding?.enabled ?? false;

  const updateBinding = (updates: Partial<DataBindingConfig>) => {
    updateConfig({ dataBinding: { ...(binding || { enabled: false, eventName: '', fieldPath: '' }), ...updates } });
  };

  return (
    <>
      <SectionHeader>Data Binding</SectionHeader>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <InputSwitch
            checked={enabled}
            onChange={(e) => withHistory(() => updateBinding({ enabled: e.value }))}
            className="!w-8 !h-4"
          />
          <span>Enable Data Binding</span>
        </label>

        {enabled && (
          <>
            <div>
              <Label>Event Name</Label>
              <InputText
                value={binding?.eventName || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ eventName: e.target.value })}
                placeholder="goal-update"
                className="w-full text-xs mt-1"
              />
            </div>
            <div>
              <Label>Data Field Path</Label>
              <InputText
                value={binding?.fieldPath || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ fieldPath: e.target.value })}
                placeholder="progress"
                className="w-full text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Dot-notation path, e.g. user.name</p>
            </div>
            {mode === 'text' && (
              <div>
                <Label>Template</Label>
                <InputText
                  value={binding?.template || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateBinding({ template: e.target.value })}
                  placeholder="Goal: {{progress}}%"
                  className="w-full text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use raw field value</p>
              </div>
            )}
            {mode === 'image' && (
              <div>
                <Label>Image URL Field</Label>
                <InputText
                  value={binding?.fieldForSrc || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateBinding({ fieldForSrc: e.target.value })}
                  placeholder="imageUrl"
                  className="w-full text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Field containing image URL (overrides Data Field Path)</p>
              </div>
            )}
            <div>
              <Label>Default Value</Label>
              <InputText
                value={binding?.defaultValue || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ defaultValue: e.target.value })}
                placeholder={mode === 'image' ? 'https://fallback.png' : 'Waiting...'}
                className="w-full text-xs mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <Label>Revert Timeout</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {binding?.timeout ? `${binding.timeout}s` : 'Never'}
                </span>
              </div>
              <Slider
                value={binding?.timeout || 0}
                min={0}
                max={300}
                step={5}
                onChange={handleSliderChange((v) => updateBinding({ timeout: v }))}
                onSlideEnd={handleSliderEnd}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">0 = persist forever</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
