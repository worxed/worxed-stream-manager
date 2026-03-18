import { useRef, useState } from 'react';
import { Trash2, MousePointerClick, Upload, FolderOpen, X } from 'lucide-react';
import { WInput, WInputNumber, WSwitch, WSlider, WDropdown, WTextarea, WButton } from '../w';
import { ColorPicker } from '../ColorPicker';
import { useEditorStore, useFirstSelectedElement, useCurrentScene } from '../../stores/editorStore';
import { ENTER_OPTIONS, EXIT_OPTIONS, CHAT_ANIMATION_OPTIONS, TEXT_ANIMATION_OPTIONS, DEFAULT_EXIT_PAIR, getPreset } from '../../animations';
import { uploadAsset, getAssets, deleteAsset } from '../../services/api';
import AnimationTimeline from './AnimationTimeline';
import type { SceneElement, AlertBoxConfig, ChatConfig, TextConfig, ImageConfig, CustomEventConfig, GoalConfig, GoalType, StatConfig, StatType, RecentEventsConfig, DataBindingConfig, AlertType } from '../../types';
import type { AnimationKeyframe } from '../../animations';

const ALERT_TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'follow', label: 'Follow' },
  { value: 'subscribe', label: 'Subscribe' },
  { value: 'donation', label: 'Donation' },
  { value: 'raid', label: 'Raid' },
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
  const scene = useCurrentScene();

  // Track slider drag sessions to only push history once per drag
  const sliderDraggingRef = useRef(false);

  if (!element) return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
        <MousePointerClick size={32} className="mb-3 opacity-40" />
        <p className="text-xs text-center">Select an element to edit its properties</p>
      </div>
    </div>
  );

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
        const animInId  = config.animationIn  || config.animation || 'fadeInUp';
        const animOutId = config.animationOut || DEFAULT_EXIT_PAIR[animInId] || 'fadeOutDown';
        return (
          <>
            <SectionHeader>Alert Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Alert Types</Label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs cursor-pointer">
                      <WSwitch
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
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <Label>Total Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.duration || 5000) / 1000}s</span>
                </div>
                <WSlider
                  value={config.duration || 5000}
                  min={1000}
                  max={15000}
                  step={500}
                  onChange={handleSliderChange((v) => updateConfig({ duration: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
            </div>

            <SectionHeader>Animation In</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Preset</Label>
                <WDropdown
                  value={animInId}
                  options={ENTER_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({
                    animationIn: e.value,
                    animationInDuration: getPreset(e.value)?.defaultDuration ?? 450,
                    animationOut: DEFAULT_EXIT_PAIR[e.value] || animOutId,
                    animationOutDuration: getPreset(DEFAULT_EXIT_PAIR[e.value] || animOutId)?.defaultDuration ?? 400,
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.animationInDuration ?? getPreset(animInId)?.defaultDuration ?? 450)}ms</span>
                </div>
                <WSlider
                  value={config.animationInDuration ?? getPreset(animInId)?.defaultDuration ?? 450}
                  min={100}
                  max={2000}
                  step={50}
                  onChange={handleSliderChange((v) => updateConfig({ animationInDuration: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
              <AnimationTimeline
                label="Custom Keyframes In"
                trackId={`${element.id}_in`}
                keyframes={(config.customKeyframesIn as AnimationKeyframe[]) || []}
                duration={config.animationInDuration ?? 450}
                onChange={(kfs) => withHistory(() => updateConfig({ customKeyframesIn: kfs }))}
              />

              {/* Secondary text animation */}
              <div>
                <Label>Text Animation</Label>
                <p className="text-muted-foreground mb-1" style={{ fontSize: '10px' }}>
                  Plays on inner text after container animates in
                </p>
                <WDropdown
                  value={config.textAnimationIn || 'none'}
                  options={TEXT_ANIMATION_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ textAnimationIn: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full"
                />
              </div>
              {config.textAnimationIn && config.textAnimationIn !== 'none' && (
                <div>
                  <div className="flex justify-between">
                    <Label>Text Delay</Label>
                    <span className="text-xs font-mono text-muted-foreground">{config.textAnimationInDelay ?? 150}ms</span>
                  </div>
                  <WSlider
                    value={config.textAnimationInDelay ?? 150}
                    min={0}
                    max={1000}
                    step={50}
                    onChange={handleSliderChange((v) => updateConfig({ textAnimationInDelay: v }))}
                    onSlideEnd={handleSliderEnd}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <SectionHeader>Animation Out</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Preset</Label>
                <WDropdown
                  value={animOutId}
                  options={EXIT_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({
                    animationOut: e.value,
                    animationOutDuration: getPreset(e.value)?.defaultDuration ?? 400,
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.animationOutDuration ?? getPreset(animOutId)?.defaultDuration ?? 400)}ms</span>
                </div>
                <WSlider
                  value={config.animationOutDuration ?? getPreset(animOutId)?.defaultDuration ?? 400}
                  min={100}
                  max={2000}
                  step={50}
                  onChange={handleSliderChange((v) => updateConfig({ animationOutDuration: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
              <AnimationTimeline
                label="Custom Keyframes Out"
                trackId={`${element.id}_out`}
                keyframes={(config.customKeyframesOut as AnimationKeyframe[]) || []}
                duration={config.animationOutDuration ?? 400}
                onChange={(kfs) => withHistory(() => updateConfig({ customKeyframesOut: kfs }))}
              />
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
                <WInputNumber
                  value={config.maxMessages || 20}
                  min={5}
                  max={50}
                  onFocus={pushHistory}
                  onValueChange={(e) => updateConfig({ maxMessages: e.value })}
                  className="w-full mt-1"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <WSwitch
                  checked={config.showBadges !== false}
                  onChange={(e) => withHistory(() => updateConfig({ showBadges: e.value }))}
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
                <WSlider
                  value={config.fadeAfter || 0}
                  min={0}
                  max={120}
                  step={5}
                  onChange={handleSliderChange((v) => updateConfig({ fadeAfter: v }))}
                  onSlideEnd={handleSliderEnd}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message Animation</Label>
                <WDropdown
                  value={config.messageAnimation || 'msgSlideIn'}
                  options={CHAT_ANIMATION_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ messageAnimation: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
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
                <WTextarea
                  value={config.content || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ content: e.target.value })}
                  rows={3}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <Label>Font Weight</Label>
                <WDropdown
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
                  className="w-full mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Line Height</Label>
                  <span className="text-xs font-mono text-muted-foreground">{config.lineHeight || 1.5}</span>
                </div>
                <WSlider
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
                <WInput
                  value={config.src || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ src: e.target.value })}
                  placeholder="https://... or /assets/file.png"
                  className="w-full mt-1"
                />
              </div>
              <ImageUploader
                currentSrc={config.src || ''}
                onSelect={(url) => { pushHistory(); updateConfig({ src: url }); }}
              />
              <WButton
                size="small"
                text
                onClick={() => withHistory(() => onUpdate({
                  x: 0,
                  y: 0,
                  width: scene?.width ?? 1920,
                  height: scene?.height ?? 1080,
                }))}
                className="w-full"
              >
                Fill Scene
              </WButton>
              <div>
                <Label>Object Fit</Label>
                <WDropdown
                  value={config.objectFit || 'contain'}
                  options={OBJECT_FIT_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ objectFit: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
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
                <WInput
                  value={config.eventName || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ eventName: e.target.value })}
                  placeholder="hype-alert"
                  className="w-full mt-1"
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>Socket.IO event name from custom endpoints</p>
              </div>
              <div>
                <Label>Display Template</Label>
                <WTextarea
                  value={config.template || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateConfig({ template: e.target.value })}
                  placeholder="{{username}} says: {{message}}"
                  rows={2}
                  className="w-full mt-1"
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>Use {'{{field}}'} to insert event data</p>
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(config.duration || 5000) / 1000}s</span>
                </div>
                <WSlider
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
                <Label>Animation In</Label>
                <WDropdown
                  value={config.animationIn || config.animation || 'fadeInUp'}
                  options={ENTER_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({
                    animationIn: e.value,
                    animationInDuration: getPreset(e.value)?.defaultDuration ?? 450,
                    animationOut: DEFAULT_EXIT_PAIR[e.value] || 'fadeOutDown',
                    animationOutDuration: getPreset(DEFAULT_EXIT_PAIR[e.value] || 'fadeOutDown')?.defaultDuration ?? 400,
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
                />
              </div>
              <div>
                <Label>Animation Out</Label>
                <WDropdown
                  value={config.animationOut || DEFAULT_EXIT_PAIR[config.animationIn || 'fadeInUp'] || 'fadeOutDown'}
                  options={EXIT_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({
                    animationOut: e.value,
                    animationOutDuration: getPreset(e.value)?.defaultDuration ?? 400,
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full mt-1"
                />
              </div>
              <div>
                <Label>Max Queue Size</Label>
                <WInputNumber
                  value={config.maxQueueSize || 10}
                  min={1}
                  max={50}
                  onFocus={pushHistory}
                  onValueChange={(e) => updateConfig({ maxQueueSize: e.value })}
                  className="w-full mt-1"
                />
              </div>
            </div>
          </>
        );
      }

      case 'goal': {
        const config = element.config as GoalConfig;
        const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
          { value: 'follower',   label: 'Follower Goal' },
          { value: 'subscriber', label: 'Subscriber Goal' },
          { value: 'donation',   label: 'Donation Goal ($)' },
          { value: 'custom',     label: 'Custom (manual)' },
        ];
        const BAR_STYLE_OPTIONS = [
          { value: 'linear', label: 'Linear (bar)' },
          { value: 'radial', label: 'Radial (circle)' },
        ];
        return (
          <>
            <SectionHeader>Goal Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Goal Type</Label>
                <WDropdown value={config.goalType || 'follower'} options={GOAL_TYPE_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ goalType: e.value }))}
                  optionLabel="label" optionValue="value" className="w-full mt-1" />
              </div>
              <div>
                <Label>Target{config.goalType === 'donation' ? ' ($)' : ''}</Label>
                <WInputNumber value={config.goal || 500} min={1} onFocus={pushHistory}
                  onValueChange={(e) => updateConfig({ goal: e.value ?? 500 })} className="w-full mt-1" />
              </div>
              <div>
                <Label>Label (empty = auto)</Label>
                <WInput value={config.label || ''} onFocus={pushHistory}
                  onChange={(e) => updateConfig({ label: e.target.value })}
                  placeholder="Follower Goal" className="w-full mt-1" />
              </div>
              <div>
                <Label>Bar Style</Label>
                <WDropdown value={config.barStyle || 'linear'} options={BAR_STYLE_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ barStyle: e.value }))}
                  optionLabel="label" optionValue="value" className="w-full mt-1" />
              </div>
              <ColorPicker label="Bar Color" value={config.barColor || '#3b82f6'}
                onChange={(c) => { pushHistory(); updateConfig({ barColor: c }); }} />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <WSwitch checked={config.showNumbers !== false}
                  onChange={(e) => withHistory(() => updateConfig({ showNumbers: e.value }))} />
                <span>Show Numbers</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <WSwitch checked={config.showPercentage !== false}
                  onChange={(e) => withHistory(() => updateConfig({ showPercentage: e.value }))} />
                <span>Show Percentage</span>
              </label>
              {config.goalType === 'custom' && (
                <div>
                  <Label>Current Value (manual)</Label>
                  <WInputNumber value={config.currentOverride ?? 0} min={0} onFocus={pushHistory}
                    onValueChange={(e) => updateConfig({ currentOverride: e.value ?? 0 })} className="w-full mt-1" />
                </div>
              )}
            </div>
          </>
        );
      }

      case 'stat': {
        const config = element.config as StatConfig;
        const STAT_TYPE_OPTIONS: { value: StatType; label: string }[] = [
          { value: 'viewers',           label: 'Live Viewers' },
          { value: 'followers',         label: 'Total Followers' },
          { value: 'uptime',            label: 'Stream Uptime' },
          { value: 'session-follows',   label: 'New Follows (session)' },
          { value: 'session-subs',      label: 'New Subs (session)' },
          { value: 'session-donations', label: 'Donations (session)' },
        ];
        return (
          <>
            <SectionHeader>Stat Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Stat Type</Label>
                <WDropdown value={config.statType || 'viewers'} options={STAT_TYPE_OPTIONS}
                  onChange={(e) => withHistory(() => updateConfig({ statType: e.value }))}
                  optionLabel="label" optionValue="value" className="w-full mt-1" />
              </div>
              <div>
                <Label>Label (empty = auto)</Label>
                <WInput value={config.label || ''} onFocus={pushHistory}
                  onChange={(e) => updateConfig({ label: e.target.value })}
                  placeholder="VIEWERS" className="w-full mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Prefix</Label>
                  <WInput value={config.prefix || ''} onFocus={pushHistory}
                    onChange={(e) => updateConfig({ prefix: e.target.value })}
                    placeholder="$" className="w-full mt-1" />
                </div>
                <div>
                  <Label>Suffix</Label>
                  <WInput value={config.suffix || ''} onFocus={pushHistory}
                    onChange={(e) => updateConfig({ suffix: e.target.value })}
                    placeholder="pts" className="w-full mt-1" />
                </div>
              </div>
            </div>
          </>
        );
      }

      case 'recent-events': {
        const config = element.config as RecentEventsConfig;
        const EVENT_TYPE_OPTIONS = [
          { value: 'follow',    label: 'Follows' },
          { value: 'subscribe', label: 'Subscribers' },
          { value: 'donation',  label: 'Donations' },
          { value: 'raid',      label: 'Raids' },
        ];
        return (
          <>
            <SectionHeader>Recent Events Settings</SectionHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Event Types</Label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {EVENT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs cursor-pointer">
                      <WSwitch
                        checked={(config.eventTypes || []).includes(opt.value as 'follow' | 'subscribe' | 'donation' | 'raid')}
                        onChange={(e) => {
                          withHistory(() => {
                            const types = config.eventTypes || [];
                            const newTypes = e.value
                              ? [...types, opt.value as 'follow' | 'subscribe' | 'donation' | 'raid']
                              : types.filter(t => t !== opt.value);
                            updateConfig({ eventTypes: newTypes });
                          });
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Max Events</Label>
                  <span className="text-xs font-mono text-muted-foreground">{config.maxCount || 8}</span>
                </div>
                <WSlider value={config.maxCount || 8} min={1} max={20}
                  onChange={handleSliderChange((v) => updateConfig({ maxCount: v }))}
                  onSlideEnd={handleSliderEnd} className="mt-1" />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <WSwitch checked={config.showIcons !== false}
                  onChange={(e) => withHistory(() => updateConfig({ showIcons: e.value }))} />
                <span>Show Icons</span>
              </label>
              <div>
                <div className="flex justify-between">
                  <Label>Fade After</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {config.fadeAfter ? `${config.fadeAfter}s` : 'Never'}
                  </span>
                </div>
                <WSlider value={config.fadeAfter || 0} min={0} max={300} step={5}
                  onChange={handleSliderChange((v) => updateConfig({ fadeAfter: v }))}
                  onSlideEnd={handleSliderEnd} className="mt-1" />
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
            <WInput
              value={element.name}
              onFocus={pushHistory}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full mt-1"
            />
          </div>

          {/* Position */}
          <SectionHeader>Position</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>X</Label>
              <WInputNumber
                value={element.x}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ x: e.value ?? 0 })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label>Y</Label>
              <WInputNumber
                value={element.y}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ y: e.value ?? 0 })}
                className="w-full mt-1"
              />
            </div>
          </div>

          {/* Size */}
          <SectionHeader>Size</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <WInputNumber
                value={element.width}
                min={40}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ width: e.value ?? 40 })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label>Height</Label>
              <WInputNumber
                value={element.height}
                min={40}
                onFocus={pushHistory}
                onValueChange={(e) => onUpdate({ height: e.value ?? 40 })}
                className="w-full mt-1"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex justify-between">
              <Label>Rotation</Label>
              <span className="text-xs font-mono text-muted-foreground">{element.rotation}°</span>
            </div>
            <WSlider
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
            <WSlider
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
            <WSlider
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
            <WDropdown
              value={element.style.fontFamily || 'Inter, system-ui, sans-serif'}
              options={FONT_FAMILY_OPTIONS}
              onChange={(e) => withHistory(() => updateStyle({ fontFamily: e.value }))}
              optionLabel="label"
              optionValue="value"
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label>Font Size</Label>
            <WInputNumber
              value={element.style.fontSize || 16}
              min={8}
              max={96}
              onFocus={pushHistory}
              onValueChange={(e) => updateStyle({ fontSize: e.value ?? 16 })}
              className="w-full mt-1"
              suffix=" px"
            />
          </div>

          <div>
            <Label>Text Align</Label>
            <WDropdown
              value={element.style.textAlign || 'left'}
              options={TEXT_ALIGN_OPTIONS}
              onChange={(e) => withHistory(() => updateStyle({ textAlign: e.value }))}
              optionLabel="label"
              optionValue="value"
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label>Padding</Label>
            <WInputNumber
              value={element.style.padding || 0}
              min={0}
              max={100}
              onFocus={pushHistory}
              onValueChange={(e) => updateStyle({ padding: e.value ?? 0 })}
              className="w-full mt-1"
              suffix=" px"
            />
          </div>

          {/* Toggles */}
          <SectionHeader>Visibility</SectionHeader>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <WSwitch
              checked={element.visible}
              onChange={(e) => withHistory(() => onUpdate({ visible: e.value }))}
            />
            <span>Visible</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <WSwitch
              checked={element.locked}
              onChange={(e) => withHistory(() => onUpdate({ locked: e.value }))}
            />
            <span>Locked</span>
          </label>

          {/* Type-specific */}
          {renderTypeSpecific()}

          {/* Delete */}
          <div className="pt-3 mt-2 border-t border-border">
            <WButton
              onClick={deleteSelectedElements}
              severity="danger"
              text
              size="small"
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              <Trash2 size={14} />
              <span>Delete Element</span>
            </WButton>
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

// ---------------------------------------------------------------------------
// ImageUploader — upload from disk or pick from stored assets
// ---------------------------------------------------------------------------

function ImageUploader({ currentSrc, onSelect }: { currentSrc: string; onSelect: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Array<{ filename: string; url: string }> | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadAsset(file);
    setUploading(false);
    if (result.data) {
      onSelect(result.data.url);
    } else {
      setError(result.error);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openBrowser = async () => {
    setShowBrowser(true);
    const result = await getAssets();
    setAssets(result.data || []);
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAsset(filename);
    setAssets(prev => prev ? prev.filter(a => a.filename !== filename) : prev);
    if (currentSrc === `/assets/${filename}`) onSelect('');
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <div className="flex gap-1.5">
        <WButton
          size="small"
          text
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 flex-1"
        >
          <Upload size={11} />
          <span>{uploading ? 'Uploading…' : 'Upload Image'}</span>
        </WButton>
        <WButton
          size="small"
          text
          onClick={openBrowser}
          className="flex items-center gap-1 flex-1"
        >
          <FolderOpen size={11} />
          <span>Browse</span>
        </WButton>
      </div>

      {error && (
        <p style={{ fontSize: '10px', color: 'var(--destructive)' }}>{error}</p>
      )}

      {showBrowser && (
        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 8,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Stored Assets</span>
            <button
              onClick={() => setShowBrowser(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}
            >
              <X size={12} />
            </button>
          </div>

          {assets === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No assets uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {assets.map(asset => (
                <div
                  key={asset.filename}
                  onClick={() => { onSelect(asset.url); setShowBrowser(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: currentSrc === asset.url ? 'rgba(59,130,246,0.2)' : 'transparent',
                    border: currentSrc === asset.url ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                  }}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                  />
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {asset.filename}
                  </span>
                  <button
                    onClick={(e) => handleDelete(asset.filename, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 2, flexShrink: 0 }}
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
          <WSwitch
            checked={enabled}
            onChange={(e) => withHistory(() => updateBinding({ enabled: e.value }))}
          />
          <span>Enable Data Binding</span>
        </label>

        {enabled && (
          <>
            <div>
              <Label>Event Name</Label>
              <WInput
                value={binding?.eventName || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ eventName: e.target.value })}
                placeholder="goal-update"
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label>Data Field Path</Label>
              <WInput
                value={binding?.fieldPath || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ fieldPath: e.target.value })}
                placeholder="progress"
                className="w-full mt-1"
              />
              <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>Dot-notation path, e.g. user.name</p>
            </div>
            {mode === 'text' && (
              <div>
                <Label>Template</Label>
                <WInput
                  value={binding?.template || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateBinding({ template: e.target.value })}
                  placeholder="Goal: {{progress}}%"
                  className="w-full mt-1"
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>Leave empty to use raw field value</p>
              </div>
            )}
            {mode === 'image' && (
              <div>
                <Label>Image URL Field</Label>
                <WInput
                  value={binding?.fieldForSrc || ''}
                  onFocus={pushHistory}
                  onChange={(e) => updateBinding({ fieldForSrc: e.target.value })}
                  placeholder="imageUrl"
                  className="w-full mt-1"
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>Field containing image URL (overrides Data Field Path)</p>
              </div>
            )}
            <div>
              <Label>Default Value</Label>
              <WInput
                value={binding?.defaultValue || ''}
                onFocus={pushHistory}
                onChange={(e) => updateBinding({ defaultValue: e.target.value })}
                placeholder={mode === 'image' ? 'https://fallback.png' : 'Waiting...'}
                className="w-full mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <Label>Revert Timeout</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {binding?.timeout ? `${binding.timeout}s` : 'Never'}
                </span>
              </div>
              <WSlider
                value={binding?.timeout || 0}
                min={0}
                max={300}
                step={5}
                onChange={handleSliderChange((v) => updateBinding({ timeout: v }))}
                onSlideEnd={handleSliderEnd}
                className="mt-1"
              />
              <p className="text-muted-foreground mt-1" style={{ fontSize: '10px' }}>0 = persist forever</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
