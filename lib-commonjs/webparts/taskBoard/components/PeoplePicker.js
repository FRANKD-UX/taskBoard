"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// PeoplePicker.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var sp_http_1 = require("@microsoft/sp-http");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
require("@pnp/sp/site-users");
require("@pnp/sp/site-users/web");
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var theme_1 = require("./theme");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var DEBOUNCE_MS = 300;
var MIN_SEARCH_CHARS = 2;
var AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
// ---------------------------------------------------------------------------
// Module-level fallback flags
// These flip to true the first time a source fails so we stop hammering it.
// ---------------------------------------------------------------------------
var directoryEndpointDisabled = false;
var restSiteUsersDisabled = false;
var graphSearchDisabled = false;
// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
var extractEmailFromLoginName = function (loginName) {
    if (!loginName)
        return '';
    var lowered = loginName.toLowerCase();
    if (lowered.indexOf('|') > -1) {
        var parts = loginName.split('|');
        return parts[parts.length - 1].trim();
    }
    return loginName.indexOf('@') > -1 ? loginName.trim() : '';
};
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
    if (siteUrl === null || siteUrl === void 0 ? void 0 : siteUrl.trim())
        return siteUrl.trim();
    return (_b = (_a = getSpfxContext()) === null || _a === void 0 ? void 0 : _a.pageContext.web.absoluteUrl) !== null && _b !== void 0 ? _b : '';
};
var mergeUniqueUsers = function (users) {
    var merged = new Map();
    users.forEach(function (user) {
        // Use email as the canonical dedup key — it is stable across all sources.
        // Fall back to loginName then name when email is absent.
        var key = (user.email || user.loginName || user.name).trim().toLowerCase();
        if (!key)
            return;
        var existing = merged.get(key);
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
var searchGraphUsers = function (query) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var context, client, encodedQuery, url, response, payload, users, _a;
    var _b;
    return tslib_1.__generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (graphSearchDisabled)
                    return [2 /*return*/, []];
                context = getSpfxContext();
                if (!context)
                    return [2 /*return*/, []];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, context.aadHttpClientFactory.getClient('https://graph.microsoft.com')];
            case 2:
                client = _c.sent();
                encodedQuery = encodeURIComponent(query);
                url = "https://graph.microsoft.com/v1.0/users" +
                    "?$search=\"displayName:".concat(encodedQuery, "\" OR \"mail:").concat(encodedQuery, "\" OR \"userPrincipalName:").concat(encodedQuery, "\"") +
                    "&$select=id,displayName,mail,userPrincipalName" +
                    "&$top=10";
                return [4 /*yield*/, client.get(url, sp_http_1.AadHttpClient.configurations.v1, {
                        headers: {
                            ConsistencyLevel: 'eventual',
                        },
                    })];
            case 3:
                response = _c.sent();
                if (!response.ok) {
                    // 403 means the app registration does not have User.Read.All — fall back gracefully.
                    if (response.status === 403 || response.status === 401) {
                        graphSearchDisabled = true;
                    }
                    return [2 /*return*/, []];
                }
                return [4 /*yield*/, response.json()];
            case 4:
                payload = (_c.sent());
                users = (_b = payload.value) !== null && _b !== void 0 ? _b : [];
                return [2 /*return*/, users
                        .filter(function (u) { return u.displayName || u.mail || u.userPrincipalName; })
                        .map(function (u) {
                        var email = (u.mail || u.userPrincipalName || '').trim();
                        var name = (u.displayName || email).trim();
                        var loginName = email ? "i:0#.f|membership|".concat(email) : '';
                        return {
                            id: null, // Graph object ID is not the SP user ID; we resolve on select.
                            name: name,
                            email: email,
                            loginName: loginName,
                        };
                    })];
            case 5:
                _a = _c.sent();
                // Network or auth error — disable for the rest of the session.
                graphSearchDisabled = true;
                return [2 /*return*/, []];
            case 6: return [2 /*return*/];
        }
    });
}); };
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
var searchDirectoryUsers = function (query, siteUrl) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var context, webUrl, endpoint, queryParams, payloadCandidates, parsed, sawBadRequest, _i, payloadCandidates_1, requestBody, response, payload, rawResults, _a;
    var _b, _c, _d;
    return tslib_1.__generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                if (directoryEndpointDisabled)
                    return [2 /*return*/, []];
                context = getSpfxContext();
                webUrl = getWebUrlForPicker(siteUrl);
                if (!context || !webUrl)
                    return [2 /*return*/, []];
                endpoint = "".concat(webUrl, "/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser");
                queryParams = {
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
                payloadCandidates = [
                    { queryParams: queryParams },
                    { queryParams: JSON.stringify(queryParams) },
                ];
                parsed = [];
                sawBadRequest = false;
                _i = 0, payloadCandidates_1 = payloadCandidates;
                _e.label = 1;
            case 1:
                if (!(_i < payloadCandidates_1.length)) return [3 /*break*/, 7];
                requestBody = payloadCandidates_1[_i];
                _e.label = 2;
            case 2:
                _e.trys.push([2, 5, , 6]);
                return [4 /*yield*/, context.spHttpClient.post(endpoint, sp_http_1.SPHttpClient.configurations.v1, {
                        headers: {
                            accept: 'application/json;odata=nometadata',
                            'content-type': 'application/json;odata=verbose',
                            'odata-version': '',
                        },
                        body: JSON.stringify(requestBody),
                    })];
            case 3:
                response = _e.sent();
                if (!response.ok) {
                    if (response.status === 400 || response.status === 406)
                        sawBadRequest = true;
                    return [3 /*break*/, 6];
                }
                return [4 /*yield*/, response.json()];
            case 4:
                payload = (_e.sent());
                rawResults = (_d = (_b = payload.value) !== null && _b !== void 0 ? _b : (_c = payload.d) === null || _c === void 0 ? void 0 : _c.ClientPeoplePickerSearchUser) !== null && _d !== void 0 ? _d : '[]';
                parsed =
                    typeof rawResults === 'string'
                        ? JSON.parse(rawResults) || []
                        : rawResults || [];
                if (parsed.length > 0)
                    return [3 /*break*/, 7];
                return [3 /*break*/, 6];
            case 5:
                _a = _e.sent();
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 1];
            case 7:
                if (parsed.length === 0 && sawBadRequest) {
                    directoryEndpointDisabled = true;
                }
                return [2 /*return*/, parsed
                        .filter(function (entry) { return !entry.EntityType || entry.EntityType.toLowerCase() === 'user'; })
                        .map(function (entry) {
                        var _a, _b, _c, _d;
                        var loginName = (entry.Key ||
                            ((_a = entry.EntityData) === null || _a === void 0 ? void 0 : _a.PrincipalName) ||
                            ((_b = entry.EntityData) === null || _b === void 0 ? void 0 : _b.AccountName) ||
                            '').trim();
                        var email = (((_c = entry.EntityData) === null || _c === void 0 ? void 0 : _c.Email) || extractEmailFromLoginName(loginName) || '').trim();
                        var name = (entry.DisplayText || email || loginName).trim();
                        var spUserIdRaw = (_d = entry.EntityData) === null || _d === void 0 ? void 0 : _d.SPUserID;
                        var spUserId = spUserIdRaw ? Number(spUserIdRaw) : NaN;
                        return {
                            id: Number.isFinite(spUserId) && spUserId > 0 ? spUserId : null,
                            name: name,
                            email: email,
                            loginName: loginName,
                        };
                    })
                        .filter(function (u) { return u.name.length > 0 || u.email.length > 0 || u.loginName.length > 0; })];
        }
    });
}); };
// ---------------------------------------------------------------------------
// Source 3 — SP site users list  (fast, but only people who visited the site)
//
// We keep this as a supplementary source because it returns real SP IDs
// immediately without a second resolve step.  Results from here that are
// already in Graph/Directory results get deduped away.
// ---------------------------------------------------------------------------
var searchSiteUsers = function (query) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, trimmed, normalizedQuery, results, exact, _a, users, _b;
    return tslib_1.__generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                trimmed = query.trim();
                normalizedQuery = trimmed.toLowerCase();
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
                        loginName: exact.LoginName || '',
                    });
                }
                return [3 /*break*/, 4];
            case 3:
                _a = _c.sent();
                return [3 /*break*/, 4];
            case 4:
                _c.trys.push([4, 6, , 7]);
                return [4 /*yield*/, sp.web.siteUsers.select('Id', 'Title', 'Email', 'LoginName').top(500)()];
            case 5:
                users = _c.sent();
                users
                    .filter(function (user) {
                    var title = String(user.Title || '').toLowerCase();
                    var email = String(user.Email || '').toLowerCase();
                    var loginName = String(user.LoginName || '').toLowerCase();
                    return (title.indexOf(normalizedQuery) > -1 ||
                        email.indexOf(normalizedQuery) > -1 ||
                        loginName.indexOf(normalizedQuery) > -1);
                })
                    .slice(0, 10)
                    .forEach(function (user) {
                    var _a;
                    results.push({
                        id: (_a = user.Id) !== null && _a !== void 0 ? _a : null,
                        name: user.Title || user.Email || user.LoginName || '',
                        email: user.Email || extractEmailFromLoginName(user.LoginName || ''),
                        loginName: user.LoginName || '',
                    });
                });
                return [3 /*break*/, 7];
            case 6:
                _b = _c.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/, mergeUniqueUsers(results)];
        }
    });
}); };
// ---------------------------------------------------------------------------
// Source 4 — SP REST siteusers  (REST-flavoured version of source 3)
// ---------------------------------------------------------------------------
var searchSiteUsersViaRest = function (query, siteUrl) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var context, webUrl, response, payload, users, normalizedQuery_1, _a;
    var _b, _c, _d;
    return tslib_1.__generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                if (restSiteUsersDisabled)
                    return [2 /*return*/, []];
                context = getSpfxContext();
                webUrl = getWebUrlForPicker(siteUrl);
                if (!context || !webUrl)
                    return [2 /*return*/, []];
                _e.label = 1;
            case 1:
                _e.trys.push([1, 4, , 5]);
                return [4 /*yield*/, context.spHttpClient.get("".concat(webUrl, "/_api/web/siteusers?$select=Id,Title,LoginName,Email&$top=500"), sp_http_1.SPHttpClient.configurations.v1, { headers: { accept: 'application/json;odata=verbose' } })];
            case 2:
                response = _e.sent();
                if (!response.ok) {
                    if (response.status === 406 || response.status === 400)
                        restSiteUsersDisabled = true;
                    return [2 /*return*/, []];
                }
                return [4 /*yield*/, response.json()];
            case 3:
                payload = (_e.sent());
                users = (_d = (_b = payload.value) !== null && _b !== void 0 ? _b : (_c = payload.d) === null || _c === void 0 ? void 0 : _c.results) !== null && _d !== void 0 ? _d : [];
                normalizedQuery_1 = query.trim().toLowerCase();
                return [2 /*return*/, users
                        .filter(function (user) {
                        var title = String(user.Title || '').toLowerCase();
                        var email = String(user.Email || user.EMail || '').toLowerCase();
                        var loginName = String(user.LoginName || '').toLowerCase();
                        return (title.indexOf(normalizedQuery_1) > -1 ||
                            email.indexOf(normalizedQuery_1) > -1 ||
                            loginName.indexOf(normalizedQuery_1) > -1);
                    })
                        .slice(0, 10)
                        .map(function (user) {
                        var _a;
                        return ({
                            id: (_a = user.Id) !== null && _a !== void 0 ? _a : null,
                            name: user.Title || user.Email || user.EMail || user.LoginName || '',
                            email: user.Email || user.EMail || extractEmailFromLoginName(user.LoginName || ''),
                            loginName: user.LoginName || '',
                        });
                    })];
            case 4:
                _a = _e.sent();
                restSiteUsersDisabled = true;
                return [2 /*return*/, []];
            case 5: return [2 /*return*/];
        }
    });
}); };
// ---------------------------------------------------------------------------
// Source 5 — UserRoles list  (your application's own user registry)
// ---------------------------------------------------------------------------
var searchUsersFromUserRoles = function (query) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, normalizedQuery, items, _a;
    return tslib_1.__generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                normalizedQuery = query.trim().toLowerCase();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.lists
                        .getByTitle('UserRoles')
                        .items.select('User/Id', 'User/Title', 'User/EMail', 'User/LoginName', 'IsActive')
                        .expand('User')
                        .top(200)()];
            case 2:
                items = _b.sent();
                return [2 /*return*/, items
                        .filter(function (item) { return (item === null || item === void 0 ? void 0 : item.IsActive) !== false && (item === null || item === void 0 ? void 0 : item.User); })
                        .map(function (item) {
                        var _a;
                        var user = Array.isArray(item.User) ? item.User[0] : item.User;
                        return {
                            id: (_a = user === null || user === void 0 ? void 0 : user.Id) !== null && _a !== void 0 ? _a : null,
                            name: (user === null || user === void 0 ? void 0 : user.Title) || '',
                            email: (user === null || user === void 0 ? void 0 : user.EMail) || '',
                            loginName: (user === null || user === void 0 ? void 0 : user.LoginName) || '',
                        };
                    })
                        .filter(function (user) {
                        var title = String(user.name || '').toLowerCase();
                        var email = String(user.email || '').toLowerCase();
                        var loginName = String(user.loginName || '').toLowerCase();
                        return (title.indexOf(normalizedQuery) > -1 ||
                            email.indexOf(normalizedQuery) > -1 ||
                            loginName.indexOf(normalizedQuery) > -1);
                    })
                        .slice(0, 10)];
            case 3:
                _a = _b.sent();
                return [2 /*return*/, []];
            case 4: return [2 /*return*/];
        }
    });
}); };
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
var searchUsers = function (query, siteUrl) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var trimmed, _a, graphUsers, directoryUsers, siteUsers, restSiteUsers, roleUsers, merged, error_1;
    return tslib_1.__generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                trimmed = query.trim();
                if (!trimmed || trimmed.length < MIN_SEARCH_CHARS)
                    return [2 /*return*/, []];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.all([
                        searchGraphUsers(trimmed).catch(function () { return []; }),
                        searchDirectoryUsers(trimmed, siteUrl).catch(function () { return []; }),
                        searchSiteUsers(trimmed).catch(function () { return []; }),
                        searchSiteUsersViaRest(trimmed, siteUrl).catch(function () { return []; }),
                        searchUsersFromUserRoles(trimmed).catch(function () { return []; }),
                    ])];
            case 2:
                _a = _b.sent(), graphUsers = _a[0], directoryUsers = _a[1], siteUsers = _a[2], restSiteUsers = _a[3], roleUsers = _a[4];
                merged = mergeUniqueUsers(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], graphUsers, true), directoryUsers, true), siteUsers, true), restSiteUsers, true), roleUsers, true));
                return [2 /*return*/, merged.slice(0, 10)];
            case 3:
                error_1 = _b.sent();
                console.error('PeoplePicker search error:', error_1);
                return [2 /*return*/, []];
            case 4: return [2 /*return*/];
        }
    });
}); };
// ---------------------------------------------------------------------------
// User resolution — called when a user clicks a suggestion.
//
// Graph results do not have a SharePoint user ID yet — we call ensureUser
// here so the save step gets a real SP ID to write into the list column.
// ---------------------------------------------------------------------------
var ensureResolvedUser = function (candidate) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, ensured, raw, id, _a, ensured, raw, id, _b, user, _c;
    var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
    return tslib_1.__generator(this, function (_3) {
        switch (_3.label) {
            case 0:
                // Already has a valid SP user ID — nothing to do.
                if (candidate.id && candidate.id > 0)
                    return [2 /*return*/, candidate];
                sp = (0, pnpjsConfig_1.getSP)();
                if (!candidate.loginName) return [3 /*break*/, 4];
                _3.label = 1;
            case 1:
                _3.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.ensureUser(candidate.loginName)];
            case 2:
                ensured = _3.sent();
                raw = ensured;
                id = (_f = (_d = raw === null || raw === void 0 ? void 0 : raw.Id) !== null && _d !== void 0 ? _d : (_e = raw === null || raw === void 0 ? void 0 : raw.data) === null || _e === void 0 ? void 0 : _e.Id) !== null && _f !== void 0 ? _f : null;
                if (id) {
                    return [2 /*return*/, {
                            id: id,
                            name: (_j = (_g = raw === null || raw === void 0 ? void 0 : raw.Title) !== null && _g !== void 0 ? _g : (_h = raw === null || raw === void 0 ? void 0 : raw.data) === null || _h === void 0 ? void 0 : _h.Title) !== null && _j !== void 0 ? _j : candidate.name,
                            email: (_m = (_k = raw === null || raw === void 0 ? void 0 : raw.Email) !== null && _k !== void 0 ? _k : (_l = raw === null || raw === void 0 ? void 0 : raw.data) === null || _l === void 0 ? void 0 : _l.Email) !== null && _m !== void 0 ? _m : candidate.email,
                            loginName: (_q = (_o = raw === null || raw === void 0 ? void 0 : raw.LoginName) !== null && _o !== void 0 ? _o : (_p = raw === null || raw === void 0 ? void 0 : raw.data) === null || _p === void 0 ? void 0 : _p.LoginName) !== null && _q !== void 0 ? _q : candidate.loginName,
                        }];
                }
                return [3 /*break*/, 4];
            case 3:
                _a = _3.sent();
                return [3 /*break*/, 4];
            case 4:
                if (!candidate.email) return [3 /*break*/, 8];
                _3.label = 5;
            case 5:
                _3.trys.push([5, 7, , 8]);
                return [4 /*yield*/, sp.web.ensureUser("i:0#.f|membership|".concat(candidate.email))];
            case 6:
                ensured = _3.sent();
                raw = ensured;
                id = (_t = (_r = raw === null || raw === void 0 ? void 0 : raw.Id) !== null && _r !== void 0 ? _r : (_s = raw === null || raw === void 0 ? void 0 : raw.data) === null || _s === void 0 ? void 0 : _s.Id) !== null && _t !== void 0 ? _t : null;
                if (id) {
                    return [2 /*return*/, {
                            id: id,
                            name: (_w = (_u = raw === null || raw === void 0 ? void 0 : raw.Title) !== null && _u !== void 0 ? _u : (_v = raw === null || raw === void 0 ? void 0 : raw.data) === null || _v === void 0 ? void 0 : _v.Title) !== null && _w !== void 0 ? _w : candidate.name,
                            email: (_z = (_x = raw === null || raw === void 0 ? void 0 : raw.Email) !== null && _x !== void 0 ? _x : (_y = raw === null || raw === void 0 ? void 0 : raw.data) === null || _y === void 0 ? void 0 : _y.Email) !== null && _z !== void 0 ? _z : candidate.email,
                            loginName: (_2 = (_0 = raw === null || raw === void 0 ? void 0 : raw.LoginName) !== null && _0 !== void 0 ? _0 : (_1 = raw === null || raw === void 0 ? void 0 : raw.data) === null || _1 === void 0 ? void 0 : _1.LoginName) !== null && _2 !== void 0 ? _2 : candidate.loginName,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                _b = _3.sent();
                return [3 /*break*/, 8];
            case 8:
                if (!candidate.email) return [3 /*break*/, 12];
                _3.label = 9;
            case 9:
                _3.trys.push([9, 11, , 12]);
                return [4 /*yield*/, sp.web.siteUsers.getByEmail(candidate.email)()];
            case 10:
                user = _3.sent();
                if (user === null || user === void 0 ? void 0 : user.Id) {
                    return [2 /*return*/, {
                            id: user.Id,
                            name: user.Title || candidate.name,
                            email: user.Email || candidate.email,
                            loginName: user.LoginName || candidate.loginName,
                        }];
                }
                return [3 /*break*/, 12];
            case 11:
                _c = _3.sent();
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/, candidate];
        }
    });
}); };
// ---------------------------------------------------------------------------
// Inject spinner keyframes once into the document head.
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {
    var STYLE_ID = 'pp-spin-keyframes';
    if (!document.getElementById(STYLE_ID)) {
        var styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = '@keyframes pp-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(styleEl);
    }
}
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var inputRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
    padding: '6px 10px',
};
var transparentInputStyle = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme_1.THEME.colors.textStrong,
    fontSize: '14px',
    minWidth: 0,
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
    padding: '4px',
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
    color: theme_1.THEME.colors.textPrimary,
};
var spinnerStyle = {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
    borderTopColor: '#2563eb',
    animation: 'pp-spin 600ms linear infinite',
    flexShrink: 0,
};
var selectedBannerStyle = {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
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
    flexShrink: 0,
}); };
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var searchIcon = (React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "#64748b", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
    React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })));
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
    // Sync display value when the external value prop changes.
    (0, react_1.useEffect)(function () {
        setInputValue(value ? value.name : '');
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage('');
    }, [value === null || value === void 0 ? void 0 : value.loginName, value === null || value === void 0 ? void 0 : value.email, value === null || value === void 0 ? void 0 : value.name]);
    // Close dropdown when user clicks outside the component.
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
    // Clean up any pending debounce timer on unmount.
    (0, react_1.useEffect)(function () {
        return function () {
            if (debounceRef.current)
                clearTimeout(debounceRef.current);
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
                    if (results.length === 0)
                        setErrorMessage('No users found');
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
    // Read-only display mode — just show the avatar and name.
    if (!canEdit) {
        var displayName = (value === null || value === void 0 ? void 0 : value.name) || 'Unassigned';
        return (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            React.createElement("div", { style: makeAvatarStyle(displayName) }, getInitials(displayName)),
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: '14px', color: theme_1.THEME.colors.textStrong } }, displayName),
                (value === null || value === void 0 ? void 0 : value.email) && (React.createElement("div", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary } }, value.email)))));
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
                    flexShrink: 0,
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
                    letterSpacing: '0.4px',
                } }, "Selected"))),
        errorMessage && !isSearching && !isOpen && (React.createElement("div", { style: { marginTop: '5px', fontSize: '12px', color: '#f59e0b' } }, errorMessage)),
        isOpen && suggestions.length > 0 && (React.createElement("div", { style: dropdownContainerStyle }, suggestions.map(function (user, index) { return (React.createElement("button", { key: "".concat(user.loginName || user.email || user.name, "-").concat(index), type: "button", onMouseDown: function (event) { return event.preventDefault(); }, onClick: function () { return void handleSelectUser(user); }, style: tslib_1.__assign(tslib_1.__assign({}, dropdownItemBaseStyle), { backgroundColor: focusedIndex === index ? 'rgba(37,99,235,0.1)' : 'transparent' }) },
            React.createElement("div", { style: makeAvatarStyle(user.name) }, getInitials(user.name)),
            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: '13px', fontWeight: 600, color: theme_1.THEME.colors.textStrong } }, user.name),
                React.createElement("div", { style: {
                        fontSize: '11px',
                        color: theme_1.THEME.colors.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    } }, user.email || user.loginName)))); })))));
};
exports.default = PeoplePicker;
//# sourceMappingURL=PeoplePicker.js.map