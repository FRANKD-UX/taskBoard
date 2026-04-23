// PeoplePicker.tsx
import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SPHttpClient, AadHttpClient } from '@microsoft/sp-http';
import type { WebPartContext } from '@microsoft/sp-webpart-base';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-users';
import '@pnp/sp/site-users/web';

import { getSP } from '../../../pnpjsConfig';
import { THEME } from './theme';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IResolvedUser {
    id: number | null;
    name: string;
    email: string;
    loginName: string;
}

export interface IPeoplePickerProps {
    value: IResolvedUser | null;
    onChange: (user: IResolvedUser | null) => void;
    placeholder?: string;
    canEdit?: boolean;
    siteUrl?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface IClientPeoplePickerResult {
    Key?: string;
    DisplayText?: string;
    Description?: string;
    EntityType?: string;
    EntityData?: {
        SPUserID?: string;
        AccountName?: string;
        Email?: string;
        PrincipalName?: string;
    };
}

interface ISiteUserRestItem {
    Id?: number;
    Title?: string;
    LoginName?: string;
    Email?: string;
    EMail?: string;
}

// Graph /users search returns objects shaped like this.
interface IGraphUser {
    id?: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 2;
const AVATAR_PALETTE: string[] = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

// ---------------------------------------------------------------------------
// Module-level fallback flags
// These flip to true the first time a source fails so we stop hammering it.
// ---------------------------------------------------------------------------

let directoryEndpointDisabled = false;
let restSiteUsersDisabled = false;
let graphSearchDisabled = false;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const extractEmailFromLoginName = (loginName: string): string => {
    if (!loginName) return '';
    const lowered = loginName.toLowerCase();
    if (lowered.indexOf('|') > -1) {
        const parts = loginName.split('|');
        return parts[parts.length - 1].trim();
    }
    return loginName.indexOf('@') > -1 ? loginName.trim() : '';
};

const getInitials = (name: string): string => {
    if (!name || name === 'Unassigned') return '?';
    return name
        .split(' ')
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
};

const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getSpfxContext = (): WebPartContext | undefined => {
    if (typeof window === 'undefined') return undefined;
    const withContext = window as Window & { spfxContext?: WebPartContext };
    return withContext.spfxContext;
};

const getWebUrlForPicker = (siteUrl?: string): string => {
    if (siteUrl?.trim()) return siteUrl.trim();
    return getSpfxContext()?.pageContext.web.absoluteUrl ?? '';
};

const mergeUniqueUsers = (users: IResolvedUser[]): IResolvedUser[] => {
    const merged = new Map<string, IResolvedUser>();

    users.forEach((user) => {
        // Use email as the canonical dedup key — it is stable across all sources.
        // Fall back to loginName then name when email is absent.
        const key = (user.email || user.loginName || user.name).trim().toLowerCase();
        if (!key) return;

        const existing = merged.get(key);

        // Prefer the entry that already has a resolved SP ID.
        if (!existing || (existing.id == null && user.id != null)) {
            merged.set(key, user);
        }
    });

    return Array.from(merged.values());
};

// ---------------------------------------------------------------------------
// Source 1 — Microsoft Graph /users  (searches the ENTIRE Azure AD tenant)
//
// This is the most reliable way to search the full organisation.
// Graph is available in SPFx via AadHttpClient configured for
// "https://graph.microsoft.com".  The $search query parameter with
// displayName or mail lets us find anyone in the tenant regardless of
// whether they have ever visited the SharePoint site.
// ---------------------------------------------------------------------------

const searchGraphUsers = async (query: string): Promise<IResolvedUser[]> => {
    if (graphSearchDisabled) return [];

    const context = getSpfxContext();
    if (!context) return [];

    try {
        // AadHttpClient requires the resource URI, not a full URL.
        const client = await context.aadHttpClientFactory.getClient('https://graph.microsoft.com');

        // ConsistencyLevel + $search is required by Graph for displayName / mail searches.
        // We search displayName, mail AND userPrincipalName in one call.
        const encodedQuery = encodeURIComponent(query);
        const url =
            `https://graph.microsoft.com/v1.0/users` +
            `?$search="displayName:${encodedQuery}" OR "mail:${encodedQuery}" OR "userPrincipalName:${encodedQuery}"` +
            `&$select=id,displayName,mail,userPrincipalName` +
            `&$top=10`;

        const response = await client.get(url, AadHttpClient.configurations.v1, {
            headers: {
                ConsistencyLevel: 'eventual',
            },
        });

        if (!response.ok) {
            // 403 means the app registration does not have User.Read.All — fall back gracefully.
            if (response.status === 403 || response.status === 401) {
                graphSearchDisabled = true;
            }
            return [];
        }

        const payload = (await response.json()) as { value?: IGraphUser[] };
        const users = payload.value ?? [];

        return users
            .filter((u) => u.displayName || u.mail || u.userPrincipalName)
            .map((u) => {
                const email = (u.mail || u.userPrincipalName || '').trim();
                const name = (u.displayName || email).trim();
                const loginName = email ? `i:0#.f|membership|${email}` : '';

                return {
                    id: null, // Graph object ID is not the SP user ID; we resolve on select.
                    name,
                    email,
                    loginName,
                };
            });
    } catch {
        // Network or auth error — disable for the rest of the session.
        graphSearchDisabled = true;
        return [];
    }
};

// ---------------------------------------------------------------------------
// Source 2 — SharePoint ClientPeoplePicker  (searches AD via SP middleware)
//
// Key parameters explained for the junior:
//   PrincipalSource: 4  = Active Directory only (NOT site membership list).
//                         This is what makes it search the whole tenant
//                         instead of just site members.
//                         Old value was 15 (all sources) which in practice
//                         prioritises site membership and truncates AD results.
//   PrincipalType: 1    = Users only (no groups, no DLs).
//   SharePointGroupID: 0 = Do not restrict to any SP group — search the whole tenant.
//   MaximumEntitySuggestions: 15 — slightly more headroom before Graph kicks in.
// ---------------------------------------------------------------------------

const searchDirectoryUsers = async (query: string, siteUrl?: string): Promise<IResolvedUser[]> => {
    if (directoryEndpointDisabled) return [];

    const context = getSpfxContext();
    const webUrl = getWebUrlForPicker(siteUrl);
    if (!context || !webUrl) return [];

    const endpoint =
        `${webUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`;

    // PrincipalSource 4 = Active Directory (full tenant in M365).
    // SharePointGroupID 0 = no restriction to a specific SP group.
    const queryParams = {
        __metadata: { type: 'SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters' },
        QueryString: query,
        AllowEmailAddresses: true,
        AllowMultipleEntities: false,
        AllUrlZones: false,
        MaximumEntitySuggestions: 15,
        PrincipalSource: 4,
        PrincipalType: 1,
        SharePointGroupID: 0,
    };

    // Some SP Online versions want the queryParams as a nested object,
    // others want it JSON-stringified. We try both shapes.
    const payloadCandidates = [
        { queryParams },
        { queryParams: JSON.stringify(queryParams) },
    ];

    let parsed: IClientPeoplePickerResult[] = [];
    let sawBadRequest = false;

    for (const requestBody of payloadCandidates) {
        try {
            const response = await context.spHttpClient.post(
                endpoint,
                SPHttpClient.configurations.v1,
                {
                    headers: {
                        accept: 'application/json;odata=nometadata',
                        'content-type': 'application/json;odata=verbose',
                        'odata-version': '',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (!response.ok) {
                if (response.status === 400 || response.status === 406) sawBadRequest = true;
                continue;
            }

            const payload = (await response.json()) as {
                value?: string | IClientPeoplePickerResult[];
                d?: { ClientPeoplePickerSearchUser?: string | IClientPeoplePickerResult[] };
            };

            const rawResults = payload.value ?? payload.d?.ClientPeoplePickerSearchUser ?? '[]';
            parsed =
                typeof rawResults === 'string'
                    ? (JSON.parse(rawResults) as IClientPeoplePickerResult[]) || []
                    : rawResults || [];

            if (parsed.length > 0) break;
        } catch {
            // Try the next payload shape.
        }
    }

    if (parsed.length === 0 && sawBadRequest) {
        directoryEndpointDisabled = true;
    }

    return parsed
        .filter((entry) => !entry.EntityType || entry.EntityType.toLowerCase() === 'user')
        .map((entry) => {
            const loginName = (
                entry.Key ||
                entry.EntityData?.PrincipalName ||
                entry.EntityData?.AccountName ||
                ''
            ).trim();
            const email = (entry.EntityData?.Email || extractEmailFromLoginName(loginName) || '').trim();
            const name = (entry.DisplayText || email || loginName).trim();
            const spUserIdRaw = entry.EntityData?.SPUserID;
            const spUserId = spUserIdRaw ? Number(spUserIdRaw) : NaN;

            return {
                id: Number.isFinite(spUserId) && spUserId > 0 ? spUserId : null,
                name,
                email,
                loginName,
            };
        })
        .filter((u) => u.name.length > 0 || u.email.length > 0 || u.loginName.length > 0);
};

// ---------------------------------------------------------------------------
// Source 3 — SP site users list  (fast, but only people who visited the site)
//
// We keep this as a supplementary source because it returns real SP IDs
// immediately without a second resolve step.  Results from here that are
// already in Graph/Directory results get deduped away.
// ---------------------------------------------------------------------------

const searchSiteUsers = async (query: string): Promise<IResolvedUser[]> => {
    const sp = getSP();
    const trimmed = query.trim();
    const normalizedQuery = trimmed.toLowerCase();
    const results: IResolvedUser[] = [];

    // Exact email match gets tried first — it is the fastest path.
    if (trimmed.includes('@')) {
        try {
            const exact = await sp.web.siteUsers.getByEmail(trimmed)();
            if (exact?.Id) {
                results.push({
                    id: exact.Id,
                    name: exact.Title || exact.Email || exact.LoginName || trimmed,
                    email: exact.Email || trimmed,
                    loginName: exact.LoginName || '',
                });
            }
        } catch {
            // Not found in site users — that is fine, Graph will find them.
        }
    }

    try {
        const users = await sp.web.siteUsers.select('Id', 'Title', 'Email', 'LoginName').top(500)();

        users
            .filter((user: any) => {
                const title = String(user.Title || '').toLowerCase();
                const email = String(user.Email || '').toLowerCase();
                const loginName = String(user.LoginName || '').toLowerCase();
                return (
                    title.indexOf(normalizedQuery) > -1 ||
                    email.indexOf(normalizedQuery) > -1 ||
                    loginName.indexOf(normalizedQuery) > -1
                );
            })
            .slice(0, 10)
            .forEach((user: any) => {
                results.push({
                    id: user.Id ?? null,
                    name: user.Title || user.Email || user.LoginName || '',
                    email: user.Email || extractEmailFromLoginName(user.LoginName || ''),
                    loginName: user.LoginName || '',
                });
            });
    } catch {
        // If site users fetch fails it is not fatal — other sources cover us.
    }

    return mergeUniqueUsers(results);
};

// ---------------------------------------------------------------------------
// Source 4 — SP REST siteusers  (REST-flavoured version of source 3)
// ---------------------------------------------------------------------------

const searchSiteUsersViaRest = async (query: string, siteUrl?: string): Promise<IResolvedUser[]> => {
    if (restSiteUsersDisabled) return [];

    const context = getSpfxContext();
    const webUrl = getWebUrlForPicker(siteUrl);
    if (!context || !webUrl) return [];

    try {
        const response = await context.spHttpClient.get(
            `${webUrl}/_api/web/siteusers?$select=Id,Title,LoginName,Email&$top=500`,
            SPHttpClient.configurations.v1,
            { headers: { accept: 'application/json;odata.metadata=none' } }  // <-- FIXED: use metadata=none to avoid 406
        );

        if (!response.ok) {
            if (response.status === 406 || response.status === 400) restSiteUsersDisabled = true;
            return [];
        }

        const payload = (await response.json()) as {
            value?: ISiteUserRestItem[];
            d?: { results?: ISiteUserRestItem[] };
        };

        const users = payload.value ?? payload.d?.results ?? [];
        const normalizedQuery = query.trim().toLowerCase();

        return users
            .filter((user) => {
                const title = String(user.Title || '').toLowerCase();
                const email = String(user.Email || user.EMail || '').toLowerCase();
                const loginName = String(user.LoginName || '').toLowerCase();
                return (
                    title.indexOf(normalizedQuery) > -1 ||
                    email.indexOf(normalizedQuery) > -1 ||
                    loginName.indexOf(normalizedQuery) > -1
                );
            })
            .slice(0, 10)
            .map((user) => ({
                id: user.Id ?? null,
                name: user.Title || user.Email || user.EMail || user.LoginName || '',
                email: user.Email || user.EMail || extractEmailFromLoginName(user.LoginName || ''),
                loginName: user.LoginName || '',
            }));
    } catch {
        restSiteUsersDisabled = true;
        return [];
    }
};

// ---------------------------------------------------------------------------
// Source 5 — UserRoles list  (your application's own user registry)
// ---------------------------------------------------------------------------

const searchUsersFromUserRoles = async (query: string): Promise<IResolvedUser[]> => {
    const sp = getSP();
    const normalizedQuery = query.trim().toLowerCase();

    try {
        // FIXED: Removed User/LoginName from select – it's not a valid field on the User lookup.
        const items = await sp.web.lists
            .getByTitle('UserRoles')
            .items.select('User/Id', 'User/Title', 'User/EMail', 'IsActive')
            .expand('User')
            .top(200)();

        return items
            .filter((item: any) => item?.IsActive !== false && item?.User)
            .map((item: any) => {
                const user = Array.isArray(item.User) ? item.User[0] : item.User;
                return {
                    id: user?.Id ?? null,
                    name: user?.Title || '',
                    email: user?.EMail || '',
                    loginName: user?.Title || '', // fallback
                } as IResolvedUser;
            })
            .filter((user: IResolvedUser) => {
                const title = String(user.name || '').toLowerCase();
                const email = String(user.email || '').toLowerCase();
                return (
                    title.indexOf(normalizedQuery) > -1 ||
                    email.indexOf(normalizedQuery) > -1
                );
            })
            .slice(0, 10);
    } catch {
        return [];
    }
};

// ---------------------------------------------------------------------------
// Master search — runs all sources in parallel and deduplicates results.
//
// Priority order after dedup:
//   Graph results come first (full org, most complete).
//   ClientPeoplePicker results second (full AD via SP middleware).
//   Site users third (already-resolved SP IDs are valuable for the save step).
//   UserRoles last (your app's own subset).
//
// mergeUniqueUsers keeps the first occurrence of each email, so Graph
// results win when there is a collision.
// ---------------------------------------------------------------------------

const searchUsers = async (query: string, siteUrl?: string): Promise<IResolvedUser[]> => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < MIN_SEARCH_CHARS) return [];

    try {
        const [graphUsers, directoryUsers, siteUsers, restSiteUsers, roleUsers] = await Promise.all([
            searchGraphUsers(trimmed).catch(() => []),
            searchDirectoryUsers(trimmed, siteUrl).catch(() => []),
            searchSiteUsers(trimmed).catch(() => []),
            searchSiteUsersViaRest(trimmed, siteUrl).catch(() => []),
            searchUsersFromUserRoles(trimmed).catch(() => []),
        ]);

        // Graph and Directory results take priority in the merge.
        const merged = mergeUniqueUsers([
            ...graphUsers,
            ...directoryUsers,
            ...siteUsers,
            ...restSiteUsers,
            ...roleUsers,
        ]);

        return merged.slice(0, 10);
    } catch (error) {
        console.error('PeoplePicker search error:', error);
        return [];
    }
};

// ---------------------------------------------------------------------------
// User resolution — called when a user clicks a suggestion.
//
// Graph results do not have a SharePoint user ID yet — we call ensureUser
// here so the save step gets a real SP ID to write into the list column.
// ---------------------------------------------------------------------------

const ensureResolvedUser = async (candidate: IResolvedUser): Promise<IResolvedUser> => {
    // Already has a valid SP user ID — nothing to do.
    if (candidate.id && candidate.id > 0) return candidate;

    const sp = getSP();

    // Try loginName first — it is the claims-format identity SP understands natively.
    if (candidate.loginName) {
        try {
            const ensured = await sp.web.ensureUser(candidate.loginName);
            const raw = ensured as any;
            const id = raw?.Id ?? raw?.data?.Id ?? null;
            if (id) {
                return {
                    id,
                    name: raw?.Title ?? raw?.data?.Title ?? candidate.name,
                    email: raw?.Email ?? raw?.data?.Email ?? candidate.email,
                    loginName: raw?.LoginName ?? raw?.data?.LoginName ?? candidate.loginName,
                };
            }
        } catch {
            // Fall through to email-based ensure.
        }
    }

    // Try the Microsoft 365 membership claim format built from the email.
    if (candidate.email) {
        try {
            const ensured = await sp.web.ensureUser(`i:0#.f|membership|${candidate.email}`);
            const raw = ensured as any;
            const id = raw?.Id ?? raw?.data?.Id ?? null;
            if (id) {
                return {
                    id,
                    name: raw?.Title ?? raw?.data?.Title ?? candidate.name,
                    email: raw?.Email ?? raw?.data?.Email ?? candidate.email,
                    loginName: raw?.LoginName ?? raw?.data?.LoginName ?? candidate.loginName,
                };
            }
        } catch {
            // Fall through to getByEmail.
        }
    }

    // Last resort — direct site user lookup by email.
    if (candidate.email) {
        try {
            const user = await sp.web.siteUsers.getByEmail(candidate.email)();
            if (user?.Id) {
                return {
                    id: user.Id,
                    name: user.Title || candidate.name,
                    email: user.Email || candidate.email,
                    loginName: user.LoginName || candidate.loginName,
                };
            }
        } catch {
            // Return the unresolved candidate — TaskBoard's save step will retry.
        }
    }

    return candidate;
};

// ---------------------------------------------------------------------------
// Inject spinner keyframes once into the document head.
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
    const STYLE_ID = 'pp-spin-keyframes';
    if (!document.getElementById(STYLE_ID)) {
        const styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = '@keyframes pp-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(styleEl);
    }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '8px',
    padding: '6px 10px',
};

const transparentInputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: THEME.colors.textStrong,
    fontSize: '14px',
    minWidth: 0,
};

const dropdownContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 9999,
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px',
};

const dropdownItemBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 10px',
    borderRadius: '7px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    backgroundColor: 'transparent',
    color: THEME.colors.textPrimary,
};

const spinnerStyle: React.CSSProperties = {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
    borderTopColor: '#2563eb',
    animation: 'pp-spin 600ms linear infinite',
    flexShrink: 0,
};

const selectedBannerStyle: React.CSSProperties = {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
};

const makeAvatarStyle = (name: string): React.CSSProperties => ({
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: getAvatarColor(name),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '11px',
    flexShrink: 0,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const searchIcon = (
    <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const PeoplePicker: React.FC<IPeoplePickerProps> = ({
    value,
    onChange,
    placeholder = 'Search by name or email...',
    canEdit = true,
    siteUrl,
}): React.ReactElement => {
    const [inputValue, setInputValue] = useState<string>('');
    const [suggestions, setSuggestions] = useState<IResolvedUser[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync display value when the external value prop changes.
    useEffect(() => {
        setInputValue(value ? value.name : '');
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage('');
    }, [value?.loginName, value?.email, value?.name]);

    // Close dropdown when user clicks outside the component.
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSuggestions([]);
                setInputValue(value?.name ?? '');
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [value?.name]);

    // Clean up any pending debounce timer on unmount.
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const runSearch = useCallback(
        async (query: string): Promise<void> => {
            setIsSearching(true);
            setErrorMessage('');
            setSuggestions([]);

            try {
                const results = await searchUsers(query, siteUrl);
                setSuggestions(results);
                setIsOpen(results.length > 0);
                if (results.length === 0) setErrorMessage('No users found');
                setFocusedIndex(-1);
            } catch (error) {
                console.error('PeoplePicker search error:', error);
                setErrorMessage('Search failed. Try again.');
            } finally {
                setIsSearching(false);
            }
        },
        [siteUrl]
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const raw = event.target.value;
        setInputValue(raw);
        setErrorMessage('');

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!raw.trim()) {
            onChange(null);
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        if (raw.trim().length < MIN_SEARCH_CHARS) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        debounceRef.current = setTimeout(() => void runSearch(raw.trim()), DEBOUNCE_MS);
    };

    const handleSelectUser = async (user: IResolvedUser): Promise<void> => {
        setIsSearching(true);
        setErrorMessage('');

        try {
            // ensureResolvedUser calls sp.web.ensureUser so we get a real SP user ID
            // even for people who have never visited this site before.
            const resolvedUser = await ensureResolvedUser(user);
            onChange(resolvedUser);
            setInputValue(resolvedUser.name);
            setSuggestions([]);
            setIsOpen(false);
        } catch (error) {
            console.error('PeoplePicker select error:', error);
            setErrorMessage('Could not resolve selected user.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = (): void => {
        onChange(null);
        setInputValue('');
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (!isOpen || suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocusedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setFocusedIndex((prev) => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter' && focusedIndex >= 0) {
            event.preventDefault();
            void handleSelectUser(suggestions[focusedIndex]);
        } else if (event.key === 'Escape') {
            setIsOpen(false);
            setSuggestions([]);
            setInputValue(value?.name ?? '');
        }
    };

    // Read-only display mode — just show the avatar and name.
    if (!canEdit) {
        const displayName = value?.name || 'Unassigned';
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={makeAvatarStyle(displayName)}>{getInitials(displayName)}</div>
                <div>
                    <div style={{ fontSize: '14px', color: THEME.colors.textStrong }}>{displayName}</div>
                    {value?.email && (
                        <div style={{ fontSize: '12px', color: THEME.colors.textSecondary }}>{value.email}</div>
                    )}
                </div>
            </div>
        );
    }

    const hasSelection = Boolean(value);

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div style={inputRowStyle}>
                <div style={makeAvatarStyle(value?.name ?? '')}>
                    {hasSelection ? getInitials(value!.name) : searchIcon}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    style={transparentInputStyle}
                />

                {isSearching && <div style={spinnerStyle} />}

                {hasSelection && !isSearching && (
                    <button
                        type="button"
                        onClick={handleClear}
                        title="Remove selection"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: THEME.colors.textSecondary,
                            cursor: 'pointer',
                            fontSize: '18px',
                            lineHeight: 1,
                            padding: '0 2px',
                            flexShrink: 0,
                        }}
                    >
                        &times;
                    </button>
                )}
            </div>

            {hasSelection && (
                <div style={selectedBannerStyle}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: THEME.colors.textStrong }}>
                            {value!.name}
                        </div>
                        <div style={{ fontSize: '11px', color: THEME.colors.textSecondary }}>{value!.email}</div>
                    </div>
                    <span
                        style={{
                            fontSize: '10px',
                            color: '#2563eb',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                        }}
                    >
                        Selected
                    </span>
                </div>
            )}

            {errorMessage && !isSearching && !isOpen && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#f59e0b' }}>{errorMessage}</div>
            )}

            {isOpen && suggestions.length > 0 && (
                <div style={dropdownContainerStyle}>
                    {suggestions.map((user, index) => (
                        <button
                            key={`${user.loginName || user.email || user.name}-${index}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void handleSelectUser(user)}
                            style={{
                                ...dropdownItemBaseStyle,
                                backgroundColor:
                                    focusedIndex === index ? 'rgba(37,99,235,0.1)' : 'transparent',
                            }}
                        >
                            <div style={makeAvatarStyle(user.name)}>{getInitials(user.name)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: THEME.colors.textStrong }}>
                                    {user.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: THEME.colors.textSecondary,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {user.email || user.loginName}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PeoplePicker;