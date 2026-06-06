module.exports = [
"[externals]/next/dist/build/adapter/setup-node-env.external.js [external] (next/dist/build/adapter/setup-node-env.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/build/adapter/setup-node-env.external.js", () => require("next/dist/build/adapter/setup-node-env.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/memory-cache.external.js [external] (next/dist/server/lib/incremental-cache/memory-cache.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/memory-cache.external.js", () => require("next/dist/server/lib/incremental-cache/memory-cache.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/shared-cache-controls.external.js [external] (next/dist/server/lib/incremental-cache/shared-cache-controls.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js", () => require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/auth/token.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createToken",
    ()=>createToken,
    "refreshToken",
    ()=>refreshToken,
    "verifyToken",
    ()=>verifyToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/sign.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/verify.js [middleware] (ecmascript)");
;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "pos-app-secret-key-change-in-production");
const ALGORITHM = "HS256";
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60;
async function createToken(payload) {
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000);
    const token = await new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SignJWT"]({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role
    }).setProtectedHeader({
        alg: ALGORITHM
    }).setIssuedAt().setExpirationTime(expiresAt).sign(JWT_SECRET);
    return {
        token,
        expiresAt
    };
}
async function verifyToken(token) {
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["jwtVerify"])(token, JWT_SECRET);
        if (typeof payload.userId !== "string" || typeof payload.email !== "string" || typeof payload.name !== "string" || typeof payload.role !== "string") {
            return null;
        }
        const restaurantId = typeof payload.restaurantId === "string" ? payload.restaurantId : "default";
        return {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            restaurantId,
            iat: payload.iat,
            exp: payload.exp
        };
    } catch  {
        return null;
    }
}
async function refreshToken(payload) {
    return createToken({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        restaurantId: payload.restaurantId
    });
}
}),
"[project]/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createMiddleware",
    ()=>createMiddleware,
    "getAuthenticatedUser",
    ()=>getAuthenticatedUser,
    "requireAdmin",
    ()=>requireAdmin,
    "requireAuth",
    ()=>requireAuth,
    "requireRole",
    ()=>requireRole,
    "requireWaiterOrAdmin",
    ()=>requireWaiterOrAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$token$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/token.ts [middleware] (ecmascript)");
;
;
async function getAuthenticatedUser(req) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return null;
    }
    const payload = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$token$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["verifyToken"])(token);
    if (!payload) {
        return null;
    }
    return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        restaurantId: payload.restaurantId
    };
}
function requireAuth(getAuthenticatedUser) {
    return async function(req) {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        return user;
    };
}
function requireRole(...allowedRoles) {
    return async function(req) {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        if (!allowedRoles.includes(user.role)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Forbidden"
            }, {
                status: 403
            });
        }
        return user;
    };
}
function createMiddleware() {
    return async function middleware(req) {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        const request = req;
        request.auth = user;
        return null;
    };
}
function getTokenFromRequest(req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
        const match = cookieHeader.match(/pos-session=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    }
    return null;
}
function requireAdmin(req) {
    return requireRole("ADMIN")(req);
}
function requireWaiterOrAdmin(req) {
    const userPromise = getAuthenticatedUser(req);
    return (async ()=>{
        const user = await userPromise;
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        return user;
    })();
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0b-t7_.._.js.map