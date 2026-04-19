"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// PeoplePicker.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var sp_http_1 = require("@microsoft/sp-http");
require("@pnp/sp/webs");
require("@pnp/sp/site-users");
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var theme_1 = require("./theme");
var DEBOUNCE_MS = 300;
var MIN_SEARCH_CHARS = 2;
var AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getInitials = function (name) {
    if (!name || name === 'Unassigned')
        return '?';
    return name
        .split(' ')
        .filter(function (part) { return part.length > 0; })
        .slice(0, 2)
        .map(function (part) { return part[0].toUpperCase(); })
        .join('');
};
var getAvatarColor = function (name) {
    if (!name)
        return '#64748b';
    var hash = name.split('').reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};
var getSpfxContext = function () {
    if (typeof window === 'undefined')
        return undefined;
    var withContext = window;
    return withContext.spfxContext;
};
var getWebUrlForPicker = function (siteUrl) {
    var _a, _b;
    if (siteUrl === null || siteUrl === void 0 ? void 0 : siteUrl.trim()) {
        return siteUrl.trim();
    }
    return (_b = (_a = getSpfxContext()) === null || _a === void 0 ? void 0 : _a.pageContext.web.absoluteUrl) !== null && _b !== void 0 ? _b : '';
};
var mergeUniqueUsers = function (users) {
    var merged = new Map();
    users.forEach(function (user) {
        var key = (user.loginName || user.email || user.name).trim().toLowerCase();
        if (!key)
            return;
        var existing = merged.get(key);
        if (!existing || (existing.id == null && user.id != null)) {
            merged.set(key, user);
        }
    });
    return Array.from(merged.values());
};
var searchDirectoryUsers = function (query, siteUrl) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var context, webUrl, requestBody, endpoint, response, payload, rawResults, parsed;
    var _a, _b, _c;
    return tslib_1.__generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                context = getSpfxContext();
                webUrl = getWebUrlForPicker(siteUrl);
                if (!context || !webUrl) {
                    return [2 /*return*/, []];
                }
                requestBody = {
                    queryParams: JSON.stringify({
                        QueryString: query,
                        AllowEmailAddresses: true,
                        AllowMultipleEntities: false,
                        AllUrlZones: false,
                        MaximumEntitySuggestions: 10,
                        PrincipalSource: 15,
                        PrincipalType: 1
                    })
                };
                endpoint = "".concat(webUrl, "/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser");
                return [4 /*yield*/, context.spHttpClient.post(endpoint, sp_http_1.SPHttpClient.configurations.v1, {
                        headers: {
                            accept: 'application/json;odata=nometadata',
                            'content-type': 'application/json;odata=nometadata'
                        },
                        body: JSON.stringify(requestBody)
                    })];
            case 1:
                response = _d.sent();
                if (!response.ok) {
                    return [2 /*return*/, []];
                }
                return [4 /*yield*/, response.json()];
            case 2:
                payload = (_d.sent());
                rawResults = (_c = (_a = payload.value) !== null && _a !== void 0 ? _a : (_b = payload.d) === null || _b === void 0 ? void 0 : _b.ClientPeoplePickerSearchUser) !== null && _c !== void 0 ? _c : '[]';
                parsed = JSON.parse(rawResults) || [];
                return [2 /*return*/, parsed
                        .map(function (entry) {
                        var _a, _b;
                        var email = (((_a = entry.EntityData) === null || _a === void 0 ? void 0 : _a.Email) || entry.Description || '').trim();
                        var loginName = (entry.Key || ((_b = entry.EntityData) === null || _b === void 0 ? void 0 : _b.PrincipalName) || '').trim();
                        var name = (entry.DisplayText || email || loginName).trim();
                        return {
                            id: null,
                            name: name,
                            email: email,
                            loginName: loginName
                        };
                    })
                        .filter(function (user) { return user.name.length > 0 || user.email.length > 0 || user.loginName.length > 0; })];
        }
    });
}); };
var searchSiteUsers = function (query) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, trimmed, escaped, results, exact, _a, users, _b, users;
    return tslib_1.__generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                trimmed = query.trim();
                escaped = trimmed.replace(/'/g, "''");
                results = [];
                if (!trimmed.includes('@')) return [3 /*break*/, 4];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.siteUsers.getByEmail(trimmed)()];
            case 2:
                exact = _c.sent();
                if (exact === null || exact === void 0 ? void 0 : exact.Id) {
                    results.push({
                        id: exact.Id,
                        name: exact.Title || exact.Email || exact.LoginName || trimmed,
                        email: exact.Email || trimmed,
                        loginName: exact.LoginName || ''
                    });
                }
                return [3 /*break*/, 4];
            case 3:
                _a = _c.sent();
                return [3 /*break*/, 4];
            case 4:
                _c.trys.push([4, 6, , 8]);
                return [4 /*yield*/, sp.web.siteUsers
                        .select('Id', 'Title', 'Email', 'LoginName')
                        .filter("startswith(Title,'".concat(escaped, "') or startswith(Email,'").concat(escaped, "')"))
                        .top(10)()];
            case 5:
                users = _c.sent();
                users.forEach(function (user) {
                    var _a;
                    results.push({
                        id: (_a = user.Id) !== null && _a !== void 0 ? _a : null,
                        name: user.Title || user.Email || user.LoginName || '',
                        email: user.Email || '',
                        loginName: user.LoginName || ''
                    });
                });
                return [3 /*break*/, 8];
            case 6:
                _b = _c.sent();
                return [4 /*yield*/, sp.web.siteUsers.select('Id', 'Title', 'Email', 'LoginName').top(200)()];
            case 7:
                users = _c.sent();
                users
                    .filter(function (user) {
                    var title = String(user.Title || '').toLowerCase();
                    var email = String(user.Email || '').toLowerCase();
                    return title.indexOf(trimmed.toLowerCase()) > -1 || email.indexOf(trimmed.toLowerCase()) > -1;
                })
                    .slice(0, 10)
                    .forEach(function (user) {
                    var _a;
                    results.push({
                        id: (_a = user.Id) !== null && _a !== void 0 ? _a : null,
                        name: user.Title || user.Email || user.LoginName || '',
                        email: user.Email || '',
                        loginName: user.LoginName || ''
                    });
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/, mergeUniqueUsers(results)];
        }
    });
}); };
var searchUsers = function (query, siteUrl) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var trimmed, _a, directoryUsers, siteUsers, merged, error_1;
    return tslib_1.__generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                trimmed = query.trim();
                if (!trimmed || trimmed.length < MIN_SEARCH_CHARS) {
                    return [2 /*return*/, []];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.all([
                        searchDirectoryUsers(trimmed, siteUrl).catch(function () { return []; }),
                        searchSiteUsers(trimmed).catch(function () { return []; })
                    ])];
            case 2:
                _a = _b.sent(), directoryUsers = _a[0], siteUsers = _a[1];
                merged = mergeUniqueUsers(tslib_1.__spreadArray(tslib_1.__spreadArray([], siteUsers, true), directoryUsers, true));
                return [2 /*return*/, merged.slice(0, 10)];
            case 3:
                error_1 = _b.sent();
                console.error('PeoplePicker search error:', error_1);
                return [2 /*return*/, []];
            case 4: return [2 /*return*/];
        }
    });
}); };
var ensureResolvedUser = function (candidate) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, ensured, ensuredAny, id, email, name_1, loginName, _a, user, _b;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    return tslib_1.__generator(this, function (_q) {
        switch (_q.label) {
            case 0:
                if (candidate.id && candidate.id > 0) {
                    return [2 /*return*/, candidate];
                }
                sp = (0, pnpjsConfig_1.getSP)();
                if (!candidate.loginName) return [3 /*break*/, 4];
                _q.label = 1;
            case 1:
                _q.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.ensureUser(candidate.loginName)];
            case 2:
                ensured = _q.sent();
                ensuredAny = ensured;
                id = (_e = (_c = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.Id) !== null && _c !== void 0 ? _c : (_d = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.data) === null || _d === void 0 ? void 0 : _d.Id) !== null && _e !== void 0 ? _e : null;
                email = (_h = (_f = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.Email) !== null && _f !== void 0 ? _f : (_g = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.data) === null || _g === void 0 ? void 0 : _g.Email) !== null && _h !== void 0 ? _h : candidate.email;
                name_1 = (_l = (_j = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.Title) !== null && _j !== void 0 ? _j : (_k = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.data) === null || _k === void 0 ? void 0 : _k.Title) !== null && _l !== void 0 ? _l : candidate.name;
                loginName = (_p = (_m = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.LoginName) !== null && _m !== void 0 ? _m : (_o = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.data) === null || _o === void 0 ? void 0 : _o.LoginName) !== null && _p !== void 0 ? _p : candidate.loginName;
                if (id) {
                    return [2 /*return*/, {
                            id: id,
                            name: name_1,
                            email: email || candidate.email,
                            loginName: loginName || candidate.loginName
                        }];
                }
                return [3 /*break*/, 4];
            case 3:
                _a = _q.sent();
                return [3 /*break*/, 4];
            case 4:
                if (!candidate.email) return [3 /*break*/, 8];
                _q.label = 5;
            case 5:
                _q.trys.push([5, 7, , 8]);
                return [4 /*yield*/, sp.web.siteUsers.getByEmail(candidate.email)()];
            case 6:
                user = _q.sent();
                if (user === null || user === void 0 ? void 0 : user.Id) {
                    return [2 /*return*/, {
                            id: user.Id,
                            name: user.Title || candidate.name,
                            email: user.Email || candidate.email,
                            loginName: user.LoginName || candidate.loginName
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                _b = _q.sent();
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/, candidate];
        }
    });
}); };
if (typeof document !== 'undefined') {
    var STYLE_ID = 'pp-spin-keyframes';
    if (!document.getElementById(STYLE_ID)) {
        var styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = '@keyframes pp-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(styleEl);
    }
}
var inputRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
    padding: '6px 10px'
};
var transparentInputStyle = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme_1.THEME.colors.textStrong,
    fontSize: '14px',
    minWidth: 0
};
var dropdownContainerStyle = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 9999,
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px'
};
var dropdownItemBaseStyle = {
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
    color: theme_1.THEME.colors.textPrimary
};
var spinnerStyle = {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
    borderTopColor: '#2563eb',
    animation: 'pp-spin 600ms linear infinite',
    flexShrink: 0
};
var selectedBannerStyle = {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #bfdbfe'
};
var makeAvatarStyle = function (name) { return ({
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
    flexShrink: 0
}); };
var PeoplePicker = function (_a) {
    var _b;
    var value = _a.value, onChange = _a.onChange, _c = _a.placeholder, placeholder = _c === void 0 ? 'Search by name or email...' : _c, _d = _a.canEdit, canEdit = _d === void 0 ? true : _d, siteUrl = _a.siteUrl;
    var _e = (0, react_1.useState)(''), inputValue = _e[0], setInputValue = _e[1];
    var _f = (0, react_1.useState)([]), suggestions = _f[0], setSuggestions = _f[1];
    var _g = (0, react_1.useState)(false), isSearching = _g[0], setIsSearching = _g[1];
    var _h = (0, react_1.useState)(false), isOpen = _h[0], setIsOpen = _h[1];
    var _j = (0, react_1.useState)(''), errorMessage = _j[0], setErrorMessage = _j[1];
    var _k = (0, react_1.useState)(-1), focusedIndex = _k[0], setFocusedIndex = _k[1];
    var containerRef = (0, react_1.useRef)(null);
    var inputRef = (0, react_1.useRef)(null);
    var debounceRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        setInputValue(value ? value.name : '');
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage('');
    }, [value === null || value === void 0 ? void 0 : value.loginName, value === null || value === void 0 ? void 0 : value.email, value === null || value === void 0 ? void 0 : value.name]);
    (0, react_1.useEffect)(function () {
        var handleOutsideClick = function (event) {
            var _a;
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSuggestions([]);
                setInputValue((_a = value === null || value === void 0 ? void 0 : value.name) !== null && _a !== void 0 ? _a : '');
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return function () { return document.removeEventListener('mousedown', handleOutsideClick); };
    }, [value === null || value === void 0 ? void 0 : value.name]);
    (0, react_1.useEffect)(function () {
        return function () {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);
    var runSearch = (0, react_1.useCallback)(function (query) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var results, error_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsSearching(true);
                    setErrorMessage('');
                    setSuggestions([]);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, searchUsers(query, siteUrl)];
                case 2:
                    results = _a.sent();
                    setSuggestions(results);
                    setIsOpen(results.length > 0);
                    if (results.length === 0) {
                        setErrorMessage('No users found');
                    }
                    setFocusedIndex(-1);
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    console.error('PeoplePicker search error:', error_2);
                    setErrorMessage('Search failed. Try again.');
                    return [3 /*break*/, 5];
                case 4:
                    setIsSearching(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [siteUrl]);
    var handleInputChange = function (event) {
        var raw = event.target.value;
        setInputValue(raw);
        setErrorMessage('');
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
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
        debounceRef.current = setTimeout(function () { return void runSearch(raw.trim()); }, DEBOUNCE_MS);
    };
    var handleSelectUser = function (user) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var resolvedUser, error_3;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsSearching(true);
                    setErrorMessage('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, ensureResolvedUser(user)];
                case 2:
                    resolvedUser = _a.sent();
                    onChange(resolvedUser);
                    setInputValue(resolvedUser.name);
                    setSuggestions([]);
                    setIsOpen(false);
                    return [3 /*break*/, 5];
                case 3:
                    error_3 = _a.sent();
                    console.error('PeoplePicker select error:', error_3);
                    setErrorMessage('Could not resolve selected user.');
                    return [3 /*break*/, 5];
                case 4:
                    setIsSearching(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleClear = function () {
        var _a;
        onChange(null);
        setInputValue('');
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage('');
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    };
    var handleKeyDown = function (event) {
        var _a;
        if (!isOpen || suggestions.length === 0)
            return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocusedIndex(function (prev) { return Math.min(prev + 1, suggestions.length - 1); });
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setFocusedIndex(function (prev) { return Math.max(prev - 1, 0); });
        }
        else if (event.key === 'Enter' && focusedIndex >= 0) {
            event.preventDefault();
            void handleSelectUser(suggestions[focusedIndex]);
        }
        else if (event.key === 'Escape') {
            setIsOpen(false);
            setSuggestions([]);
            setInputValue((_a = value === null || value === void 0 ? void 0 : value.name) !== null && _a !== void 0 ? _a : '');
        }
    };
    if (!canEdit) {
        var displayName = (value === null || value === void 0 ? void 0 : value.name) || 'Unassigned';
        return (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            React.createElement("div", { style: makeAvatarStyle(displayName) }, getInitials(displayName)),
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: '14px', color: theme_1.THEME.colors.textStrong } }, displayName),
                (value === null || value === void 0 ? void 0 : value.email) && React.createElement("div", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary } }, value.email))));
    }
    var hasSelection = Boolean(value);
    return (React.createElement("div", { ref: containerRef, style: { position: 'relative' } },
        React.createElement("div", { style: inputRowStyle },
            React.createElement("div", { style: makeAvatarStyle((_b = value === null || value === void 0 ? void 0 : value.name) !== null && _b !== void 0 ? _b : '') }, hasSelection ? getInitials(value.name) : searchIcon),
            React.createElement("input", { ref: inputRef, type: "text", autoComplete: "off", autoCorrect: "off", autoCapitalize: "off", spellCheck: false, value: inputValue, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: placeholder, style: transparentInputStyle }),
            isSearching && React.createElement("div", { style: spinnerStyle }),
            hasSelection && !isSearching && (React.createElement("button", { type: "button", onClick: handleClear, title: "Remove selection", style: {
                    background: 'none',
                    border: 'none',
                    color: theme_1.THEME.colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: '0 2px',
                    flexShrink: 0
                } }, "\u00D7"))),
        hasSelection && (React.createElement("div", { style: selectedBannerStyle },
            React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: '13px', fontWeight: 600, color: theme_1.THEME.colors.textStrong } }, value.name),
                React.createElement("div", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary } }, value.email)),
            React.createElement("span", { style: {
                    fontSize: '10px',
                    color: '#2563eb',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                } }, "Selected"))),
        errorMessage && !isSearching && !isOpen && React.createElement("div", { style: { marginTop: '5px', fontSize: '12px', color: '#f59e0b' } }, errorMessage),
        isOpen && suggestions.length > 0 && (React.createElement("div", { style: dropdownContainerStyle }, suggestions.map(function (user, index) { return (React.createElement("button", { key: "".concat(user.loginName || user.email || user.name, "-").concat(index), type: "button", onMouseDown: function (event) { return event.preventDefault(); }, onClick: function () { return void handleSelectUser(user); }, style: tslib_1.__assign(tslib_1.__assign({}, dropdownItemBaseStyle), { backgroundColor: focusedIndex === index ? 'rgba(37,99,235,0.1)' : 'transparent' }) },
            React.createElement("div", { style: makeAvatarStyle(user.name) }, getInitials(user.name)),
            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: '13px', fontWeight: 600, color: theme_1.THEME.colors.textStrong } }, user.name),
                React.createElement("div", { style: {
                        fontSize: '11px',
                        color: theme_1.THEME.colors.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    } }, user.email || user.loginName)))); })))));
};
var searchIcon = (React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "#64748b", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
    React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })));
exports.default = PeoplePicker;
//# sourceMappingURL=PeoplePicker.js.map