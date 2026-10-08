import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.mjs';

const fresh = () => loadApp().app;

describe('round12', () => {
  it('kills negative zero', () => {
    const { round12 } = fresh();
    assert.ok(Object.is(round12(-0), 0));
    assert.ok(Object.is(round12(-0 * 5), 0));
  });

  it('rounds to 12 significant digits', () => {
    const { round12 } = fresh();
    assert.equal(round12(0.1 + 0.2), 0.3);
    assert.equal(round12(1 / 3), 0.333333333333);
  });

  it('preserves tiny values that still fit 12 significant digits', () => {
    const { round12 } = fresh();
    assert.equal(round12(1e-15), 1e-15);
    assert.equal(round12(-1e-15), -1e-15);
  });

  it('leaves 12-significant-digit values untouched', () => {
    const { round12 } = fresh();
    assert.equal(round12(123456789012), 123456789012);
    assert.equal(round12(2.5), 2.5);
  });
});

describe('numToStr', () => {
  it('normalises zero', () => {
    const { numToStr } = fresh();
    assert.equal(numToStr(0), '0');
    assert.equal(numToStr(-0), '0');
  });

  it('prints ordinary values as-is', () => {
    const { numToStr } = fresh();
    assert.equal(numToStr(1234.5), '1234.5');
    assert.equal(numToStr(-7), '-7');
    assert.equal(numToStr(0.1 + 0.2), String(0.1 + 0.2));
  });

  it('switches to exponential notation for huge/tiny magnitudes', () => {
    const { numToStr } = fresh();
    assert.equal(numToStr(1e15), (1e15).toExponential(6));
    assert.equal(numToStr(1e-10), (1e-10).toExponential(6));
  });
});

describe('fmtDispStr', () => {
  const fmt = (s) => loadApp().app.fmtDispStr(s);

  it('groups thousands', () => {
    assert.equal(fmt('1234'), '1,234');
    assert.equal(fmt('1000000'), '1,000,000');
    assert.equal(fmt('1234567.25'), '1,234,567.25');
  });

  it('keeps the sign outside the grouping', () => {
    assert.equal(fmt('-1234'), '-1,234');
    assert.equal(fmt('-1234567.25'), '-1,234,567.25');
  });

  it('leaves small numbers and exponentials alone', () => {
    assert.equal(fmt('0'), '0');
    assert.equal(fmt('42'), '42');
    assert.equal(fmt('1.5e+21'), '1.5e+21');
  });
});

describe('cleanNumStr', () => {
  it('strips float noise', () => {
    const { cleanNumStr } = fresh();
    assert.equal(cleanNumStr(0.1 + 0.2), '0.3');
    assert.equal(cleanNumStr(1.23456789123), '1.234567891');
  });

  it('normalises zero', () => {
    const { cleanNumStr } = fresh();
    assert.equal(cleanNumStr(-0), '0');
    assert.equal(cleanNumStr(0), '0');
  });
});

describe('fmtPlain', () => {
  it('formats at the configured precision', () => {
    const app = fresh();
    assert.equal(app.fmtPlain(1.5), '1.5000');
    app.settings.precision = 2;
    assert.equal(app.fmtPlain(1.5), '1.50');
    app.settings.precision = 6;
    assert.equal(app.fmtPlain(1.5), '1.500000');
  });

  it('uses exponential outside the displayable range', () => {
    const { fmtPlain } = fresh();
    assert.equal(fmtPlain(1e15), (1e15).toExponential(3));
    assert.equal(fmtPlain(1e-10), (1e-10).toExponential(3));
    assert.equal(fmtPlain(0), '0.0000');
  });

  it('renders non-finite values as an em dash', () => {
    const { fmtPlain } = fresh();
    assert.equal(fmtPlain(Infinity), '—');
    assert.equal(fmtPlain(-Infinity), '—');
    assert.equal(fmtPlain(NaN), '—');
  });
});

describe('fmtAmt', () => {
  it('groups and pads to the configured precision', () => {
    const app = fresh();
    const expected = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 4, maximumFractionDigits: 4,
    }).format(1234.5);
    assert.equal(app.fmtAmt(1234.5), expected);
    app.settings.precision = 2;
    const expected2 = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(1234.5);
    assert.equal(app.fmtAmt(1234.5), expected2);
  });

  it('uses exponential for extreme magnitudes and em dash for non-finite', () => {
    const { fmtAmt } = fresh();
    assert.equal(fmtAmt(1e15), (1e15).toExponential(3));
    assert.equal(fmtAmt(1e-10), (1e-10).toExponential(3));
    assert.equal(fmtAmt(Infinity), '—');
    assert.equal(fmtAmt(NaN), '—');
  });
});

describe('parseAmt', () => {
  it('reads the base amount, accepting comma decimals', () => {
    const { parseAmt, setAmount } = fresh();
    assert.equal(parseAmt(), 1);            // default amount
    setAmount('1,5');
    assert.equal(parseAmt(), 1.5);
    setAmount('-2,25');
    assert.equal(parseAmt(), -2.25);
    setAmount('3.75');
    assert.equal(parseAmt(), 3.75);
  });

  it('falls back to 0 for junk input', () => {
    const { parseAmt, setAmount } = fresh();
    setAmount('abc');
    assert.equal(parseAmt(), 0);
    setAmount('');
    assert.equal(parseAmt(), 0);
  });
});
