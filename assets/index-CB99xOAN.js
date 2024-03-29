function __vite__mapDeps(indexes) {
    if (!__vite__mapDeps.viteFileDeps) {
        __vite__mapDeps.viteFileDeps = [];
    }
    return indexes.map((i) => __vite__mapDeps.viteFileDeps[i]);
}
(function () {
    const n = document.createElement("link").relList;
    if (n && n.supports && n.supports("modulepreload")) return;
    for (const e of document.querySelectorAll('link[rel="modulepreload"]')) a(e);
    new MutationObserver((e) => {
        for (const s of e) if (s.type === "childList") for (const r of s.addedNodes) r.tagName === "LINK" && r.rel === "modulepreload" && a(r);
    }).observe(document, { childList: !0, subtree: !0 });
    function o(e) {
        const s = {};
        return (
            e.integrity && (s.integrity = e.integrity),
            e.referrerPolicy && (s.referrerPolicy = e.referrerPolicy),
            e.crossOrigin === "use-credentials" ? (s.credentials = "include") : e.crossOrigin === "anonymous" ? (s.credentials = "omit") : (s.credentials = "same-origin"),
            s
        );
    }
    function a(e) {
        if (e.ep) return;
        e.ep = !0;
        const s = o(e);
        fetch(e.href, s);
    }
})();
function c(t, n = {}, ...o) {
    const { dataset: a, ...e } = n,
        s = document.createElement(t);
    return (
        Object.keys(e).forEach((r) => {
            switch (r) {
                case "className":
                    s.setAttribute("class", e[r]);
                    break;
                case "data":
                    Object.keys(n.data).forEach((i) => {
                        s.dataset[i] = n.data[i];
                    });
                    break;
                default:
                    s.setAttribute(r, e[r]);
            }
        }),
        o.length === 0 ||
            o.forEach((r) => {
                typeof r > "u" || (r.tagName ? s.appendChild(r) : s.appendChild(document.createTextNode(r)));
            }),
        s
    );
}
const y = {
    sunny: "🌞",
    cloud: "☁️",
    clear: "☀️",
    showers: "☔",
    thunderstorms: "⛈️",
    snow: "🌨",
    dust: "🐪",
    sand: "🐫",
    haze: "😕",
    ice: "🧊",
    smoke: "🚬",
    frost: "🧊",
    sleet: "🌨",
    rain: "☔",
    blizzard: "🏔",
    windy: "🌬",
    hot: "🌶",
    cold: "🧊",
};
function b(t) {
    let n;
    return (
        Object.keys(y).forEach((o) => {
            if (new RegExp(o, "i").test(t)) {
                n = y[o];
                return;
            }
        }),
        n
    );
}
async function D(t) {
    const n = await t.current,
        o = await t.hourly,
        a = {};
    let e = Number.MAX_SAFE_INTEGER,
        s = Number.MIN_SAFE_INTEGER;
    return (
        n.periods.map((r) => {
            const i = new Date(Date.parse(r.startTime));
            if (a[i.getDate()]) return;
            const u = new Date();
            u.setDate(i.getDate()), u.setHours(23, 59, 59, 0);
            const f = o.periods.filter((m) => new Date(Date.parse(m.startTime)).getDate() === i.getDate()),
                d = Math.max(...f.map((m) => m.temperature)),
                l = Math.min(...f.map((m) => m.temperature));
            d > s && (s = d), l < e && (e = l), (a[i.getDate()] = { start: i, day: i.getDate(), high: d, low: l, period: r, hours: f });
        }),
        Object.keys(a)
            .sort((r, i) => (a[r].start > a[i].start ? 1 : a[r].start < a[i].start ? -1 : 0))
            .map((r) => ({ ...a[r], min: e, max: s }))
    );
}
async function p(t) {
    const n = await fetch(t, { headers: { Accept: "application/ld+json" } });
    if (!n.ok) throw new Error(`request ${t} failed with ${n.status}`);
    return n.json();
}
async function v(t) {
    const { latitude: n, longitude: o } = t.coords,
        a = await p(`https://api.weather.gov/points/${n},${o}`),
        e = p(a.forecastZone).then((s) => p(`${s.observationStations[0]}/observations/latest`));
    return { relativeLocation: a.relativeLocation, gridId: a.gridId, radarStation: a.radarStation, current: p(a.forecast), hourly: p(a.forecastHourly), observations: e };
}
class L extends Error {}
async function A() {
    return new Promise((t, n) => {
        navigator.geolocation.getCurrentPosition(
            t,
            (o) => {
                const a = new L(`could not get location: ${o}`);
                console.error(a), n(a);
            },
            { enableHighAccuracy: !1 }
        );
    });
}
const h = new URLSearchParams(location.search);
function _() {
    h.forEach((t, n) => {
        const o = document.getElementById(n);
        o && (o.value = t);
    });
}
function S() {
    return { zip: h.get("zip"), search: h.get("search") };
}
async function P(t) {
    const { radarStation: n } = t,
        o = c("img", { className: "radar center", width: "100%", src: `https://radar.weather.gov/ridge/standard/${n}_loop.gif` });
    return c("details", { className: "radar" }, c("summary", {}, c("h5", {}, "Show Live Radar")), o);
}
function C(t) {
    async function n() {
        const { zip: a, search: e } = S();
        let s = {};
        if (a && e) {
            try {
                s = await (await fetch("zipcodes.json")).json();
            } catch (u) {
                throw new Error(`failed to load zipcodes: ${u}`);
            }
            const i = s[a];
            if (!i) throw new Error(`unknown zipcode: ${a}`);
            return await v({ coords: { latitude: i[0], longitude: i[1] } });
        }
        const r = await A();
        return await v(r);
    }
    async function o() {
        const a = await n(),
            e = c("section", { className: "forecast" });
        e.appendChild(I(a)), e.appendChild(await T(a, o)), e.appendChild(await P(a)), e.appendChild(await F(a)), t.childNodes.length > 0 ? t.childNodes[0].replaceWith(e) : t.appendChild(e);
    }
    return { reload: o };
}
function I(t) {
    const { city: n, state: o } = t.relativeLocation;
    let a = `${n}, ${o}`;
    const { zip: e } = S();
    return e && (a = `${a} (${e})`), c("h2", {}, a);
}
async function F(t) {
    const n = await D(t),
        o = c("div", { className: "forecast--list" });
    return (
        n.forEach(({ period: a, high: e, low: s, hours: r, max: i }, u) => {
            const f = u === 0 ? { open: !0 } : {},
                d = (i - e) * 0.8,
                l = (e - s || 1) * 0.8,
                m = c(
                    "details",
                    { className: "forecast--list_item", ...f },
                    c(
                        "summary",
                        { className: "summary" },
                        c(
                            "div",
                            { className: "summary--row" },
                            c("div", { className: "summary--icon" }, b(a.shortForecast)),
                            c("h3", { className: "summary--title" }, a.name),
                            c(
                                "div",
                                { className: "summary--temp-bar-container" },
                                c("div", { className: "summary--low temp" }, s),
                                c("div", { className: "summary--temp-bar", style: `--bar-width: ${l}rem` }),
                                c("div", { className: "summary--high temp" }, e),
                                c("div", { className: "summary--offset", style: `--bar-width: ${d}rem` })
                            )
                        )
                    ),
                    c("div", { className: "weather--row" }, c("p", { className: "weather--row_description" }, `${a.detailedForecast}`), c("div", { className: "weather--row_graphics" }, ...r.map((g) => z({ period: a, hour: g, high: e }))))
                );
            o.appendChild(m);
        }),
        o
    );
}
function z({ hour: t, high: n }) {
    const o = c("div", { className: "icon-group" }, c("div", { className: "icon", data: { short: t.shortForecast } }, b(t.shortForecast))),
        a = new Date(Date.parse(t.startTime)),
        e = new Intl.DateTimeFormat(navigator.language, { hour: "numeric", hour12: !0 }).format(a),
        s = parseInt(t.windSpeed, 0);
    if ((s && s > 15 && o.appendChild(c("div", { className: "windspeed", style: `--wind-speed: ${s * 3}deg` }, "🍃")), Number.isInteger(parseInt(e, 0) / 2)))
        return c("div", { className: "weather--row_cell", style: `--temp-height: ${(n - t.temperature) * 0.3}rem` }, c("div", { className: "current-temp temp" }, `${t.temperature}`), o, c("div", { className: "time" }, e));
}
function O(t) {
    return new Intl.DateTimeFormat(navigator.language, { month: "long", day: "numeric", hour: "numeric", minute: "numeric" }).format(t);
}
async function T(t, n) {
    const { generatedAt: o } = await t.current,
        a = new Date(Date.parse(o)),
        e = c("button", { className: "btn--reload" }, `${O(a)} ↻`);
    return (
        e.addEventListener("click", () => {
            n();
        }),
        e
    );
}
function j(t) {
    return {
        displayAlert(n, o = "warn") {
            t.classList.add(o), t.appendChild(c("p", {}, n));
        },
    };
}
const k = "modulepreload",
    R = function (t) {
        return "/" + t;
    },
    N = {},
    B = function (n, o, a) {
        let e = Promise.resolve();
        if (o && o.length > 0) {
            const s = document.getElementsByTagName("link");
            e = Promise.all(
                o.map((r) => {
                    if (((r = R(r)), r in N)) return;
                    N[r] = !0;
                    const i = r.endsWith(".css"),
                        u = i ? '[rel="stylesheet"]' : "";
                    if (!!a)
                        for (let l = s.length - 1; l >= 0; l--) {
                            const m = s[l];
                            if (m.href === r && (!i || m.rel === "stylesheet")) return;
                        }
                    else if (document.querySelector(`link[href="${r}"]${u}`)) return;
                    const d = document.createElement("link");
                    if (((d.rel = i ? "stylesheet" : k), i || ((d.as = "script"), (d.crossOrigin = "")), (d.href = r), document.head.appendChild(d), i))
                        return new Promise((l, m) => {
                            d.addEventListener("load", l), d.addEventListener("error", () => m(new Error(`Unable to preload CSS for ${r}`)));
                        });
                })
            );
        }
        return e
            .then(() => n())
            .catch((s) => {
                const r = new Event("vite:preloadError", { cancelable: !0 });
                if (((r.payload = s), window.dispatchEvent(r), !r.defaultPrevented)) throw s;
            });
    };
function M(t = {}) {
    const { immediate: n = !1, onNeedRefresh: o, onOfflineReady: a, onRegistered: e, onRegisteredSW: s, onRegisterError: r } = t;
    let i, u;
    const f = async (l = !0) => {
        await u;
    };
    async function d() {
        if ("serviceWorker" in navigator) {
            if (
                ((i = await B(() => import("./workbox-window.prod.es5-DFjpnwFp.js"), __vite__mapDeps([]))
                    .then(({ Workbox: l }) => new l("/sw.js", { scope: "/", type: "classic" }))
                    .catch((l) => {
                        r == null || r(l);
                    })),
                !i)
            )
                return;
            i.addEventListener("activated", (l) => {
                (l.isUpdate || l.isExternal) && window.location.reload();
            }),
                i.addEventListener("installed", (l) => {
                    l.isUpdate || a == null || a();
                }),
                i
                    .register({ immediate: n })
                    .then((l) => {
                        s ? s("/sw.js", l) : e == null || e(l);
                    })
                    .catch((l) => {
                        r == null || r(l);
                    });
        }
    }
    return (u = d()), f;
}
const W = 10 * 60 * 1e3,
    w = document.querySelector("#forecast"),
    E = j(document.querySelector("#messages")),
    $ = C(w);
M({
    onRegistered(t) {
        t &&
            setInterval(() => {
                t.update(), console.log("re-fetching in background"), $.reload();
            }, W);
    },
});
window.addEventListener("load", async () => {
    _(), document.body.classList.add("loading");
    try {
        await $.reload();
    } catch (t) {
        t instanceof L ? (w.classList.add("warning"), E.displayAlert("Could not determine location, please enter a valid zipcode")) : (w.classList.add("error"), E.displayAlert(t));
    } finally {
        document.body.classList.remove("loading"), document.body.classList.remove("installing");
    }
});
//# sourceMappingURL=index-CB99xOAN.js.map
