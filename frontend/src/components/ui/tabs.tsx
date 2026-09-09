'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeKey?: string;
  onChange?: (key: string) => void;
  defaultActiveKey?: string;
  variant?: 'underline' | 'pill' | 'boxed';
  className?: string;
}

export function Tabs({
  tabs,
  activeKey,
  onChange,
  defaultActiveKey,
  variant = 'underline',
  className,
}: TabsProps) {
  const generatedId = useId();
  const [internalActive, setInternalActive] = useState(
    activeKey ?? defaultActiveKey ?? tabs[0]?.key
  );
  const currentKey = activeKey ?? internalActive;

  const handleChange = (key: string) => {
    setInternalActive(key);
    onChange?.(key);
  };

  const baseTabClasses = cn(
    'inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
  );

  const variantClasses: Record<typeof variant, { list: string; tab: string; active: string; inactive: string }> = {
    underline: {
      list: 'flex gap-1 border-b border-charcoal-100 overflow-x-auto',
      tab: cn(baseTabClasses, 'px-3 py-2.5 border-b-2 border-transparent'),
      active: 'border-primary-600 text-primary-700',
      inactive: 'border-transparent text-charcoal-500 hover:text-charcoal-800 hover:border-charcoal-300',
    },
    pill: {
      list: 'flex gap-1.5 p-1 bg-charcoal-100 rounded-xl w-fit overflow-x-auto',
      tab: cn(baseTabClasses, 'px-4 py-2 rounded-lg'),
      active: 'bg-white text-primary-700 shadow-sm',
      inactive: 'text-charcoal-600 hover:text-charcoal-900',
    },
    boxed: {
      list: 'flex gap-2',
      tab: cn(baseTabClasses, 'px-4 py-2 border rounded-xl'),
      active: 'border-primary-600 bg-primary-50 text-primary-700',
      inactive: 'border-charcoal-200 bg-white text-charcoal-600 hover:border-charcoal-300',
    },
  };

  const styles = variantClasses[variant];
  const activeTab = tabs.find((tab) => tab.key === currentKey);

  return (
    <div className={cn('w-full', className)}>
      <div role="tablist" className={styles.list} aria-orientation="horizontal">
        {tabs.map((tab) => {
          const isActive = tab.key === currentKey;
          const panelId = `tab-panel-${tab.key}-${generatedId}`;
          const tabButtonId = `tab-button-${tab.key}-${generatedId}`;
          return (
            <button
              key={tab.key}
              id={tabButtonId}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleChange(tab.key)}
              className={cn(
                styles.tab,
                isActive ? styles.active : styles.inactive,
                tab.disabled && 'opacity-40 pointer-events-none'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-[10px] font-semibold text-primary-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {activeTab?.content && (
        <div
          id={`tab-panel-${activeTab.key}-${generatedId}`}
          role="tabpanel"
          aria-labelledby={`tab-button-${activeTab.key}-${generatedId}`}
          className="mt-4 animate-fade-in"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}