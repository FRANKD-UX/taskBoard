import * as React from 'react';

import { THEME } from './theme';

export type PrimaryViewKey = 'dashboard' | 'tasks' | 'incidents';

interface INavigationItem {
    key: PrimaryViewKey | 'reports' | 'settings';
    label: string;
    isPlaceholder?: boolean;
}

export interface IAppLayoutProps {
    selectedView: PrimaryViewKey;
    onSelectView: (view: PrimaryViewKey) => void;
    children: React.ReactNode;
}

const NAV_ITEMS: INavigationItem[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'reports', label: 'Reports', isPlaceholder: true },
    { key: 'settings', label: 'Settings', isPlaceholder: true },
];

const AppLayout: React.FC<IAppLayoutProps> = ({
    selectedView,
    onSelectView,
    children,
}): React.ReactElement => {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                width: '100%',
                backgroundColor: THEME.colors.background,
            }}
        >
            <aside
                style={{
                    width: '240px',
                    flexShrink: 0,
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    padding: '28px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    boxSizing: 'border-box',
                }}
            >
                <div>
                    <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8' }}>
                        Operations
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>
                        Task Board
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                        Shared workspace for delivery, incidents, and reporting.
                    </div>
                </div>

                <nav style={{ display: 'grid', gap: '8px' }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.key === selectedView;
                        const isDisabled = item.isPlaceholder === true;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                    if (!isDisabled && (item.key === 'dashboard' || item.key === 'tasks' || item.key === 'incidents')) {
                                        onSelectView(item.key);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: isActive ? '1px solid rgba(14,165,233,0.55)' : '1px solid transparent',
                                    backgroundColor: isActive ? 'rgba(14,165,233,0.18)' : 'transparent',
                                    color: isDisabled ? '#64748b' : '#e2e8f0',
                                    cursor: isDisabled ? 'default' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: isActive ? 700 : 500,
                                    textAlign: 'left',
                                }}
                            >
                                <span>{item.label}</span>
                                {item.isPlaceholder && (
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Soon</span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main
                style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '24px',
                    backgroundColor: THEME.colors.background,
                    boxSizing: 'border-box',
                }}
            >
                {children}
            </main>
        </div>
    );
};

export default AppLayout;
