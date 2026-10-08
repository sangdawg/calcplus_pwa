// Test harness: loads the real app script from src/app.template.html into a
// Node `vm` context backed by a minimal DOM, then exposes the calculator
// functions for assertions. No dependencies beyond Node.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = path.join(ROOT, 'src', 'app.template.html');

const KEY_CODES = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'dot', 'eq', 'c', 'ce', 'neg', 'pct', 'plus', 'minus', 'mul', 'div',
];
const OP_KEYS = new Set(['plus', 'minus', 'mul', 'div']);

// Exported internals: appended just before the app's IIFE closes.
const EXPORTS = `
globalThis.__app = {
  calc, settings, OPKEY, $, $$,
  round12, num, numToStr, fmtDispStr, compute,
  calcDigit, calcDot, calcOp, calcEq, calcPct, calcNeg, calcCE, calcC, calcBack, renderCalc,
  fmtAmt, fmtPlain, cleanNumStr, parseAmt,
  setAmount: function(v){ amount = v }
};
`;

function extractScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no <script> block found in ' + TEMPLATE);
  const tail = /\n\}\)\(\);\s*$/;
  if (!tail.test(m[1])) throw new Error('unexpected script tail; exports not injected');
  return m[1].replace(tail, '\n' + EXPORTS + '})();');
}

class ClassList {
  constructor() { this._s = new Set(); }
  add(...cs) { cs.forEach((c) => this._s.add(c)); }
  remove(...cs) { cs.forEach((c) => this._s.delete(c)); }
  toggle(c, force) {
    const on = force === undefined ? !this._s.has(c) : !!force;
    if (on) this._s.add(c); else this._s.delete(c);
    return on;
  }
  contains(c) { return this._s.has(c); }
}

class Element {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.attributes = {};
    this.style = {};
    this.classList = new ClassList();
    this.className = '';
    this.children = [];
    this.parentNode = null;
    this.parentElement = null;
    this.disabled = false;
    this.value = '';
    this._listeners = {};
    this._text = '';
    this._html = '';
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  getAttribute(n) {
    return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null;
  }
  setAttribute(n, v) { this.attributes[n] = String(v); }
  removeAttribute(n) { delete this.attributes[n]; }
  hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n); }
  addEventListener(type, fn) { (this._listeners[type] || (this._listeners[type] = [])).push(fn); }
  removeEventListener(type, fn) {
    const l = this._listeners[type];
    if (!l) return;
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  dispatch(type, ev) { (this._listeners[type] || []).slice().forEach((fn) => fn.call(this, ev)); }
  appendChild(c) {
    if (c.parentNode) c.parentNode.removeChild(c);
    this.children.push(c);
    c.parentNode = this;
    c.parentElement = this;
    return c;
  }
  insertBefore(c) { return this.appendChild(c); }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
    c.parentNode = null;
    c.parentElement = null;
    return c;
  }
  remove() { if (this.parentElement) this.parentElement.removeChild(this); }
  contains() { return false; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest(sel) {
    let n = this;
    while (n) {
      if (n.matches && n.matches(sel)) return n;
      n = n.parentElement;
    }
    return null;
  }
  matches(sel) {
    sel = String(sel).trim();
    if (sel.charAt(0) === '#') return this.getAttribute('id') === sel.slice(1);
    if (sel.charAt(0) === '.') return this.classList.contains(sel.slice(1));
    return this.tagName === sel.toUpperCase();
  }
  focus() {}
  blur() {}
  select() {}
  click() { this.dispatch('click', { target: this, type: 'click' }); }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
}

function makeKeypadKeys() {
  return KEY_CODES.map((code) => {
    const k = new Element('button');
    k.classList.add('key');
    if (OP_KEYS.has(code)) k.classList.add('op');
    k.setAttribute('data-k', code);
    return k;
  });
}

function makeDocument() {
  const keys = makeKeypadKeys();
  const cache = new Map();
  const get = (sel) => {
    if (!cache.has(sel)) cache.set(sel, new Element('div'));
    return cache.get(sel);
  };
  const doc = new Element('document');
  doc.readyState = 'complete';
  doc.hidden = false;
  doc.head = new Element('head');
  doc.body = new Element('body');
  doc.documentElement = new Element('html');
  doc.createElement = (tag) => new Element(tag);
  doc.createDocumentFragment = () => new Element('#fragment');
  doc.getElementById = (id) => get('#' + id);
  doc.querySelector = (sel) => get(sel);
  doc.querySelectorAll = (sel) => {
    if (sel === '#keypad .key') return keys.slice();
    if (sel === '#keypad .key.op') return keys.filter((k) => OP_KEYS.has(k.getAttribute('data-k')));
    return [];
  };
  return { doc, get, keys };
}

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    _map: map,
  };
}

const unrefTimeout = (fn, ms, ...a) => {
  const t = setTimeout(fn, ms, ...a);
  if (typeof t.unref === 'function') t.unref();
  return t;
};
const unrefInterval = (fn, ms) => {
  const t = setInterval(fn, ms);
  if (typeof t.unref === 'function') t.unref();
  return t;
};

let cachedCode = null;
function appCode() {
  if (cachedCode === null) cachedCode = extractScript(fs.readFileSync(TEMPLATE, 'utf8'));
  return cachedCode;
}

export function loadApp() {
  const { doc, get, keys } = makeDocument();
  const localStorage = makeStorage();
  const winListeners = {};

  const sandbox = {
    document: doc,
    location: new URL('https://localhost/CalcPlus.html'),
    navigator: { userAgent: 'CalcPlusTests/1.0', standalone: false, vibrate: () => true },
    localStorage,
    console,
    setTimeout: unrefTimeout,
    clearTimeout,
    setInterval: unrefInterval,
    clearInterval,
    queueMicrotask,
    requestAnimationFrame: (cb) => unrefTimeout(cb, 0),
    matchMedia: () => ({
      matches: false, media: '',
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    }),
    fetch: () => Promise.reject(new Error('network disabled in tests')),
    AbortController,
    performance: globalThis.performance,
    URL,
    URLSearchParams,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    addEventListener(type, fn) { (winListeners[type] || (winListeners[type] = [])).push(fn); },
    removeEventListener(type, fn) {
      const l = winListeners[type];
      if (!l) return;
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    },
    dispatchEvent: () => true,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;

  vm.runInContext(appCode(), vm.createContext(sandbox), { filename: 'app.template.html' });

  const app = sandbox.__app;
  if (!app) throw new Error('app exports missing; harness injection failed');

  const keyEl = (code) => {
    const k = keys.find((el) => el.getAttribute('data-k') === code);
    if (!k) throw new Error('no keypad key: ' + code);
    return k;
  };

  return {
    app,
    doc,
    localStorage,
    el: (sel) => get(sel),
    keys,
    keyEl,
    display: () => get('#calcValue').textContent,
    hist: () => get('#calcHist').textContent,
    dataLen: () => get('#calcValue').getAttribute('data-len'),
    pendingOp: () => keys
      .filter((k) => k.classList.contains('pending'))
      .map((k) => k.getAttribute('data-k')),
    press: (code) => {
      get('#keypad').dispatch('click', { target: keyEl(code), type: 'click', preventDefault() {} });
    },
    type(seq) {
      const SYM = { '+': 'plus', '-': 'minus', '*': 'mul', '/': 'div', '=': 'eq', '%': 'pct', '.': 'dot' };
      for (const c of seq.split('')) this.press(SYM[c] || c);
    },
    key: (k) => {
      const ev = { key: k, target: { tagName: 'BODY' }, preventDefault() {} };
      (winListeners.keydown || []).slice().forEach((fn) => fn(ev));
    },
  };
}
