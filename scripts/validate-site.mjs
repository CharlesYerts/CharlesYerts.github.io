#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://charlesyerts.github.io";
const APP_STORE_URL = "https://apps.apple.com/cn/app/selfo/id6801035245";
const SUPPORT_EMAIL = "yeertesi636@gmail.com";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDirectory, "..");

const routePairs = [
  ["index.html", "en/index.html"],
  ["guide/index.html", "en/guide/index.html"],
  ["support/index.html", "en/support/index.html"],
  ["subscription/index.html", "en/subscription/index.html"],
  ["privacy/index.html", "en/privacy/index.html"],
  ["terms/index.html", "en/terms/index.html"],
  ["permissions/index.html", "en/permissions/index.html"],
  ["third-parties/index.html", "en/third-parties/index.html"],
  ["open-source/index.html", "en/open-source/index.html"],
];

const expectedRoutes = routePairs.flat();
const latestIpAssets = [
  "selfo-ip-welcome.webp",
  "selfo-ip-photo-present.webp",
  "selfo-ip-pending-confirm.webp",
  "selfo-ip-complete.webp",
  "selfo-ip-search-clear.webp",
  "selfo-ip-permission.webp",
  "selfo-ip-pro.webp",
];

const failures = [];
const htmlByRoute = new Map();
const idCache = new Map();
const cssFilesToCheck = new Set();
const checkedCssFiles = new Set();
const manifestFiles = new Set();

function fail(scope, message) {
  failures.push(`${scope}: ${message}`);
}

function relativeToRoot(filePath) {
  return path.relative(siteRoot, filePath).split(path.sep).join("/") || ".";
}

function readText(filePath, scope = relativeToRoot(filePath)) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    fail(scope, `cannot read file (${error.message})`);
    return null;
  }
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ");
}

function parseAttributes(tag) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;

  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
}

function tagsNamed(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return [...html.matchAll(pattern)].map((match) => ({
    raw: match[0],
    attributes: parseAttributes(match[0]),
  }));
}

function allOpeningTags(html) {
  return [...html.matchAll(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi)].map((match) => ({
    name: match[1].toLowerCase(),
    raw: match[0],
    attributes: parseAttributes(match[0]),
  }));
}

function relTokens(attributes) {
  return (attributes.rel ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function publicPathForFile(filePath) {
  return `/${relativeToRoot(filePath)}`;
}

function canonicalPathForRoute(route) {
  if (route === "index.html") return "/";
  return `/${route.replace(/index\.html$/, "")}`;
}

function canonicalUrlForRoute(route) {
  return `${SITE_ORIGIN}${canonicalPathForRoute(route)}`;
}

function localPathFromUrl(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }

  const candidate = path.resolve(siteRoot, `.${pathname}`);
  const relative = path.relative(siteRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  if (pathname.endsWith("/")) return path.join(candidate, "index.html");
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return path.join(candidate, "index.html");
  }
  return candidate;
}

function resolveReference(fromFile, rawReference) {
  const reference = decodeEntities(rawReference.trim());
  if (!reference) return { error: "empty URL" };
  if (/^(?:mailto|tel|data|blob):/i.test(reference)) return { external: true };
  if (/^javascript:/i.test(reference)) return { error: "javascript: URLs are not allowed" };

  let url;
  try {
    url = new URL(reference, `${SITE_ORIGIN}${publicPathForFile(fromFile)}`);
  } catch (error) {
    return { error: `invalid URL ${JSON.stringify(reference)} (${error.message})` };
  }

  if (url.origin !== SITE_ORIGIN) return { external: true, url };
  const filePath = localPathFromUrl(url);
  if (!filePath) return { error: `URL escapes the site root: ${reference}` };
  return { external: false, filePath, fragment: url.hash.slice(1), url };
}

function idsForFile(filePath) {
  if (idCache.has(filePath)) return idCache.get(filePath);
  const html = readText(filePath);
  if (html === null) return new Set();
  const ids = new Set(
    [...html.matchAll(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)].map((match) => match[1] ?? match[2]),
  );
  idCache.set(filePath, ids);
  return ids;
}

function validateReference(fromFile, rawReference, context, { checkFragment = true } = {}) {
  const scope = relativeToRoot(fromFile);
  const resolved = resolveReference(fromFile, rawReference);
  if (resolved.error) {
    fail(scope, `${context}: ${resolved.error}`);
    return null;
  }
  if (resolved.external) return null;

  if (!fs.existsSync(resolved.filePath)) {
    fail(scope, `${context}: ${JSON.stringify(rawReference)} resolves to missing ${relativeToRoot(resolved.filePath)}`);
    return null;
  }

  if (path.extname(resolved.filePath).toLowerCase() === ".css") {
    cssFilesToCheck.add(resolved.filePath);
  }

  if (checkFragment && resolved.fragment && path.extname(resolved.filePath).toLowerCase() === ".html") {
    let fragment = resolved.fragment;
    try {
      fragment = decodeURIComponent(fragment);
    } catch {
      // Keep the literal fragment so the missing-fragment error remains useful.
    }
    if (!idsForFile(resolved.filePath).has(fragment)) {
      fail(scope, `${context}: fragment #${fragment} is missing from ${relativeToRoot(resolved.filePath)}`);
    }
  }

  return resolved.filePath;
}

function metaValues(html, keyAttribute, key) {
  return tagsNamed(html, "meta")
    .filter(({ attributes }) => (attributes[keyAttribute] ?? "").toLowerCase() === key.toLowerCase())
    .map(({ attributes }) => attributes.content ?? "");
}

function requireSingleMeta(route, html, keyAttribute, key, expected = null) {
  const values = metaValues(html, keyAttribute, key);
  if (values.length !== 1) {
    fail(route, `expected exactly one meta ${keyAttribute}=${JSON.stringify(key)}, found ${values.length}`);
    return null;
  }
  if (!values[0].trim()) fail(route, `meta ${key} has empty content`);
  if (expected !== null && values[0] !== expected) {
    fail(route, `meta ${key} must be ${JSON.stringify(expected)}, found ${JSON.stringify(values[0])}`);
  }
  return values[0];
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(?:style|script)\b[\s\S]*?<\/(?:style|script)>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function classTokens(attributes) {
  return new Set((attributes.class ?? "").split(/\s+/).filter(Boolean));
}

function validateMetadata(route, html, filePath, pair) {
  const isEnglish = route.startsWith("en/");
  const expectedCanonical = canonicalUrlForRoute(route);
  const expectedChinese = canonicalUrlForRoute(pair[0]);
  const expectedEnglish = canonicalUrlForRoute(pair[1]);
  const expectedOgLocale = isEnglish ? "en_US" : "zh_CN";
  const expectedAlternateLocale = isEnglish ? "zh_CN" : "en_US";
  const expectedOgImage = `${SITE_ORIGIN}/assets/og.png`;

  const htmlTag = tagsNamed(html, "html")[0];
  const documentLanguage = htmlTag?.attributes.lang?.toLowerCase() ?? "";
  if (isEnglish ? !/^en(?:-|$)/.test(documentLanguage) : !/^zh(?:-|$)/.test(documentLanguage)) {
    fail(route, `html lang=${JSON.stringify(documentLanguage)} does not match the route language`);
  }

  const links = tagsNamed(html, "link");
  const canonicalLinks = links.filter(({ attributes }) => relTokens(attributes).includes("canonical"));
  if (canonicalLinks.length !== 1) {
    fail(route, `expected exactly one canonical link, found ${canonicalLinks.length}`);
  } else if (canonicalLinks[0].attributes.href !== expectedCanonical) {
    fail(route, `canonical must be ${expectedCanonical}, found ${canonicalLinks[0].attributes.href ?? "(missing href)"}`);
  }

  const alternateLinks = links.filter(({ attributes }) => relTokens(attributes).includes("alternate") && attributes.hreflang);
  const chineseAlternate = alternateLinks.find(({ attributes }) => /^(?:zh-cn|zh-hans|zh-hans-cn)$/i.test(attributes.hreflang));
  const englishAlternate = alternateLinks.find(({ attributes }) => /^(?:en|en-us)$/i.test(attributes.hreflang));
  if (!chineseAlternate) {
    fail(route, "missing Chinese hreflang alternate (zh-CN or zh-Hans)");
  } else if (chineseAlternate.attributes.href !== expectedChinese) {
    fail(route, `Chinese hreflang must point to ${expectedChinese}`);
  }
  if (!englishAlternate) {
    fail(route, "missing English hreflang alternate (en or en-US)");
  } else if (englishAlternate.attributes.href !== expectedEnglish) {
    fail(route, `English hreflang must point to ${expectedEnglish}`);
  }
  for (const alternate of alternateLinks.filter(({ attributes }) => attributes.hreflang.toLowerCase() === "x-default")) {
    if (alternate.attributes.href !== expectedChinese) {
      fail(route, `x-default hreflang must point to ${expectedChinese}`);
    }
  }

  requireSingleMeta(route, html, "property", "og:type", "website");
  requireSingleMeta(route, html, "property", "og:site_name", "selfo");
  requireSingleMeta(route, html, "property", "og:url", expectedCanonical);
  requireSingleMeta(route, html, "property", "og:locale", expectedOgLocale);
  requireSingleMeta(route, html, "property", "og:title");
  requireSingleMeta(route, html, "property", "og:description");
  requireSingleMeta(route, html, "property", "og:image", expectedOgImage);
  requireSingleMeta(route, html, "property", "og:image:width", "1200");
  requireSingleMeta(route, html, "property", "og:image:height", "630");
  requireSingleMeta(route, html, "property", "og:image:alt");
  const ogAlternateLocales = metaValues(html, "property", "og:locale:alternate");
  if (!ogAlternateLocales.includes(expectedAlternateLocale)) {
    fail(route, `og:locale:alternate must include ${expectedAlternateLocale}`);
  }

  requireSingleMeta(route, html, "name", "twitter:card", "summary_large_image");
  requireSingleMeta(route, html, "name", "twitter:title");
  requireSingleMeta(route, html, "name", "twitter:description");
  requireSingleMeta(route, html, "name", "twitter:image", expectedOgImage);

  const cspValues = metaValues(html, "http-equiv", "Content-Security-Policy");
  if (cspValues.length !== 1) {
    fail(route, `expected exactly one Content-Security-Policy meta, found ${cspValues.length}`);
  } else {
    const csp = cspValues[0].toLowerCase();
    for (const directive of [
      "default-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
    ]) {
      if (!csp.includes(directive)) fail(route, `CSP is missing ${directive}`);
    }
  }

  const iconLinks = links.filter(({ attributes }) => relTokens(attributes).includes("icon"));
  for (const size of ["32x32", "48x48"]) {
    const icon = iconLinks.find(({ attributes }) => attributes.sizes?.toLowerCase() === size);
    if (!icon) {
      fail(route, `missing rel=icon with sizes=${size}`);
    } else {
      validateReference(filePath, icon.attributes.href ?? "", `icon ${size}`, { checkFragment: false });
    }
  }
  const appleTouchIcon = links.find(({ attributes }) =>
    relTokens(attributes).includes("apple-touch-icon") && attributes.sizes?.toLowerCase() === "180x180",
  );
  if (!appleTouchIcon) {
    fail(route, "missing 180x180 apple-touch-icon");
  } else {
    validateReference(filePath, appleTouchIcon.attributes.href ?? "", "apple-touch-icon", { checkFragment: false });
  }

  const manifestLinks = links.filter(({ attributes }) => relTokens(attributes).includes("manifest"));
  if (manifestLinks.length !== 1) {
    fail(route, `expected exactly one manifest link, found ${manifestLinks.length}`);
  } else {
    const manifestPath = validateReference(
      filePath,
      manifestLinks[0].attributes.href ?? "",
      "manifest",
      { checkFragment: false },
    );
    if (manifestPath) manifestFiles.add(manifestPath);
  }
}

function validateDownloadLinks(route, html) {
  const tags = allOpeningTags(html);
  const anchors = tags.filter(({ name }) => name === "a");
  const exactDownloadAnchors = anchors.filter(({ attributes }) => attributes.href === APP_STORE_URL);

  if (exactDownloadAnchors.length === 0) {
    fail(route, `missing clickable App Store download link with exact URL ${APP_STORE_URL}`);
  }
  if ((route === "index.html" || route === "en/index.html") && exactDownloadAnchors.length < 2) {
    fail(route, "homepage must include a shared header download link and at least one clickable body CTA");
  }

  const siteHeader = html.match(/<header\b[^>]*class\s*=\s*(?:"[^"]*\bsite-header\b[^"]*"|'[^']*\bsite-header\b[^']*')[^>]*>[\s\S]*?<\/header>/i)?.[0];
  if (!siteHeader || !tagsNamed(siteHeader, "a").some(({ attributes }) => attributes.href === APP_STORE_URL)) {
    fail(route, "shared site header must contain a clickable exact App Store download link");
  }

  const downloadClasses = new Set(["app-store-label", "header-download", "store-button", "footer-download"]);
  for (const tag of tags) {
    const classes = classTokens(tag.attributes);
    if (![...downloadClasses].some((className) => classes.has(className))) continue;
    if (tag.name !== "a" || tag.attributes.href !== APP_STORE_URL) {
      fail(route, `${tag.name}.${[...classes].join(".")} is a non-clickable or incorrect download control`);
    }
  }

  for (const anchor of anchors) {
    const href = anchor.attributes.href ?? "";
    let url;
    try {
      url = new URL(href, SITE_ORIGIN);
    } catch {
      continue;
    }
    if (url.hostname === "apps.apple.com" && url.pathname.includes("/app/") && href !== APP_STORE_URL) {
      fail(route, `App Store product URL must be exactly ${APP_STORE_URL}, found ${href}`);
    }
  }
}

function validateForbiddenContent(route, html) {
  const text = stripHtml(html);

  if (/\bvelin\b/i.test(html)) fail(route, "contains the retired Velin brand name");
  if (/\bselfo\s*1\.0\b/i.test(html)) fail(route, "contains forbidden stale version text “selfo 1.0”");

  const placeholderPatterns = [
    [/\b(?:john|jane)\s+(?:doe|smith)\b/i, "common English placeholder name"],
    [/(?:张三|李四|王五|赵六|某某|某开发者)/, "common Chinese placeholder name"],
    [/\[(?:your\s+)?(?:full\s+|legal\s+)?name\]/i, "bracketed name placeholder"],
    [/(?:\{\{|<)\s*(?:name|full_name|legal_name|email|email_address)\s*(?:\}\}|>)/i, "template placeholder"],
    [/(?:姓名|真实姓名|开发者姓名|联系邮箱|邮箱地址)\s*(?:待填|占位|placeholder)/i, "Chinese name/email placeholder"],
  ];
  for (const [pattern, label] of placeholderPatterns) {
    if (pattern.test(text) || pattern.test(html)) fail(route, `contains ${label}`);
  }

  let decodedHtml = html;
  try {
    decodedHtml = decodeURIComponent(html);
  } catch {
    // The regular raw-HTML email scan remains useful when unrelated percent escapes are malformed.
  }
  const emails = new Set(
    [...decodedHtml.matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map((match) =>
      match[0].toLowerCase(),
    ),
  );
  for (const email of emails) {
    if (email !== SUPPORT_EMAIL) fail(route, `contains unapproved or placeholder email ${email}`);
  }

  const explicitCumulativePatterns = [
    /(?:累计|总共|一共|终身)[^。；.!?]{0,80}(?:20\s*张?\s*照片|20\s*photos?)/i,
    /(?:20\s*张?\s*照片|20\s*photos?)[^。；.!?]{0,80}(?:累计|总共|一共|in total|lifetime)/i,
    /(?:free|免费)[^。；.!?]{0,120}(?:allowance|额度)[^。；.!?]{0,80}(?:in total|累计|总共|一共)/i,
  ];
  for (const pattern of explicitCumulativePatterns) {
    if (pattern.test(text)) fail(route, "describes the free allowance as cumulative or lifetime total");
  }

  const quotaPattern = /(?:20\s*张?\s*照片[\s\S]{0,180}?10\s*个?\s*视频|20\s*photos?[\s\S]{0,180}?10\s*videos?)/gi;
  for (const match of text.matchAll(quotaPattern)) {
    const start = Math.max(0, (match.index ?? 0) - 180);
    const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 180);
    const context = text.slice(start, end);
    const hasDailyCycle = /(?:每天|每日|每个[^。；,.]{0,16}自然日|daily|each day|per (?:local )?(?:calendar )?day)/i.test(context);
    if (!hasDailyCycle) {
      fail(route, `20-photo/10-video allowance mention lacks an explicit daily cycle near “${match[0].trim()}”`);
    }
  }
}

function validateIpAssets(route, html) {
  const referencedIpAssets = new Set(
    tagsNamed(html, "img")
      .map(({ attributes }) => attributes.src)
      .filter(Boolean)
      .map((source) => {
        try {
          return path.posix.basename(new URL(source, `${SITE_ORIGIN}${canonicalPathForRoute(route)}`).pathname);
        } catch {
          return "";
        }
      })
      .filter((name) => latestIpAssets.includes(name)),
  );

  if (route === "index.html" || route === "en/index.html") {
    for (const asset of latestIpAssets) {
      if (!referencedIpAssets.has(asset)) fail(route, `homepage does not reference latest IP asset ${asset}`);
    }
  } else if (referencedIpAssets.size === 0) {
    fail(route, "subpage must include at least one latest selfo IP WebP in an img element");
  }
}

function validateHtmlReferences(route, html, filePath) {
  for (const tag of allOpeningTags(html)) {
    for (const attributeName of ["href", "src"]) {
      if (!(attributeName in tag.attributes)) continue;
      validateReference(filePath, tag.attributes[attributeName], `<${tag.name}> ${attributeName}`);
    }

    for (const sourceSetName of ["srcset", "imagesrcset"]) {
      if (!tag.attributes[sourceSetName]) continue;
      for (const candidate of tag.attributes[sourceSetName].split(",")) {
        const source = candidate.trim().split(/\s+/)[0];
        if (source) {
          validateReference(filePath, source, `<${tag.name}> ${sourceSetName}`, { checkFragment: false });
        }
      }
    }
  }
}

function sectionIds(html) {
  return new Set(
    [...html.matchAll(/<section\b[^>]*\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)].map(
      (match) => match[1] ?? match[2],
    ),
  );
}

function setDifference(left, right) {
  return [...left].filter((value) => !right.has(value));
}

function validateRoutePair(pair) {
  const [chineseRoute, englishRoute] = pair;
  const chineseHtml = htmlByRoute.get(chineseRoute);
  const englishHtml = htmlByRoute.get(englishRoute);
  if (!chineseHtml || !englishHtml) return;

  const chineseSections = sectionIds(chineseHtml);
  const englishSections = sectionIds(englishHtml);
  const missingInEnglish = setDifference(chineseSections, englishSections);
  const missingInChinese = setDifference(englishSections, chineseSections);
  if (missingInEnglish.length || missingInChinese.length) {
    fail(
      `${chineseRoute} ↔ ${englishRoute}`,
      `section IDs differ; missing in English [${missingInEnglish.join(", ")}], missing in Chinese [${missingInChinese.join(", ")}]`,
    );
  }

  for (const [route, html, counterpart] of [
    [chineseRoute, chineseHtml, englishRoute],
    [englishRoute, englishHtml, chineseRoute],
  ]) {
    const filePath = path.join(siteRoot, route);
    const counterpartPath = path.join(siteRoot, counterpart);
    const hasVisibleCounterpartLink = tagsNamed(html, "a").some(({ attributes }) => {
      if (!attributes.href) return false;
      const resolved = resolveReference(filePath, attributes.href);
      return !resolved.error && !resolved.external && path.resolve(resolved.filePath) === path.resolve(counterpartPath);
    });
    if (!hasVisibleCounterpartLink) fail(route, `has no visible link to paired route ${counterpart}`);
  }
}

function validateManifest(manifestPath) {
  const scope = relativeToRoot(manifestPath);
  const raw = readText(manifestPath, scope);
  if (raw === null) return;

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    fail(scope, `invalid JSON (${error.message})`);
    return;
  }

  if (manifest.name !== "selfo") fail(scope, `manifest name must be “selfo”, found ${JSON.stringify(manifest.name)}`);
  if (manifest.short_name !== "selfo") {
    fail(scope, `manifest short_name must be “selfo”, found ${JSON.stringify(manifest.short_name)}`);
  }
  if (typeof manifest.start_url !== "string") {
    fail(scope, "manifest start_url is missing");
  } else {
    const resolved = resolveReference(manifestPath, manifest.start_url);
    if (resolved.error || resolved.external || resolved.url?.pathname !== "/") {
      fail(scope, `manifest start_url must resolve to site root, found ${JSON.stringify(manifest.start_url)}`);
    }
  }
  if (typeof manifest.scope === "string") {
    const resolvedScope = resolveReference(manifestPath, manifest.scope);
    if (resolvedScope.error || resolvedScope.external || resolvedScope.url?.pathname !== "/") {
      fail(scope, `manifest scope must resolve to site root, found ${JSON.stringify(manifest.scope)}`);
    }
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  for (const size of ["192x192", "512x512"]) {
    const icon = icons.find((candidate) => candidate?.sizes?.toLowerCase() === size && candidate?.src);
    if (!icon) {
      fail(scope, `manifest is missing ${size} icon`);
    } else {
      validateReference(manifestPath, icon.src, `manifest icon ${size}`, { checkFragment: false });
    }
  }
}

function validateCssFile(filePath) {
  if (checkedCssFiles.has(filePath)) return;
  checkedCssFiles.add(filePath);
  const css = readText(filePath);
  if (css === null) return;

  for (const match of css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi)) {
    const reference = match[1] ?? match[2] ?? match[3];
    if (!reference || reference.startsWith("#")) continue;
    validateReference(filePath, reference, "CSS url()", { checkFragment: false });
  }
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s;)'"`]+))/gi)) {
    const reference = match[1] ?? match[2] ?? match[3];
    if (!reference) continue;
    const importedPath = validateReference(filePath, reference, "CSS @import", { checkFragment: false });
    if (importedPath && path.extname(importedPath).toLowerCase() === ".css") validateCssFile(importedPath);
  }
}

function collectIndexRoutes(directory) {
  const routes = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectIndexRoutes(entryPath));
    } else if (entry.name === "index.html") {
      routes.push(relativeToRoot(entryPath));
    }
  }
  return routes.sort();
}

function main() {
  const discoveredRoutes = collectIndexRoutes(siteRoot);
  if (discoveredRoutes.length !== expectedRoutes.length) {
    fail("routes", `expected exactly ${expectedRoutes.length} index.html routes, found ${discoveredRoutes.length}`);
  }
  const unexpectedRoutes = discoveredRoutes.filter((route) => !expectedRoutes.includes(route));
  if (unexpectedRoutes.length) fail("routes", `unexpected routes: ${unexpectedRoutes.join(", ")}`);

  for (const asset of latestIpAssets) {
    const assetPath = path.join(siteRoot, "assets", asset);
    if (!fs.existsSync(assetPath)) fail("assets", `missing latest IP asset assets/${asset}`);
  }
  if (!fs.existsSync(path.join(siteRoot, "assets", "og.png"))) {
    fail("assets", "missing social preview asset assets/og.png");
  }

  for (const pair of routePairs) {
    for (const route of pair) {
      const filePath = path.join(siteRoot, route);
      if (!fs.existsSync(filePath)) {
        fail(route, "required HTML route is missing");
        continue;
      }
      const html = readText(filePath, route);
      if (html === null) continue;
      const renderedHtml = stripHtmlComments(html);
      htmlByRoute.set(route, renderedHtml);
      validateHtmlReferences(route, renderedHtml, filePath);
      validateMetadata(route, renderedHtml, filePath, pair);
      validateDownloadLinks(route, renderedHtml);
      validateForbiddenContent(route, html);
      validateIpAssets(route, renderedHtml);
    }
  }

  for (const pair of routePairs) validateRoutePair(pair);
  for (const cssFile of [...cssFilesToCheck]) validateCssFile(cssFile);

  if (manifestFiles.size !== 1) {
    fail("manifest", `all routes must share exactly one manifest file, found ${manifestFiles.size}`);
  }
  for (const manifestPath of manifestFiles) validateManifest(manifestPath);

  if (failures.length) {
    failures.sort((left, right) => left.localeCompare(right));
    console.error(`\nSite validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n`);
    failures.forEach((message, index) => console.error(`${String(index + 1).padStart(3, " ")}. ${message}`));
    console.error("\nNo files were changed by this validator.");
    process.exitCode = 1;
    return;
  }

  console.log(`Site validation passed: ${expectedRoutes.length} bilingual HTML routes, ${latestIpAssets.length} IP assets, links, metadata, manifest, CSP, and App Store entry points are valid.`);
}

try {
  main();
} catch (error) {
  console.error(`Site validation crashed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
}
