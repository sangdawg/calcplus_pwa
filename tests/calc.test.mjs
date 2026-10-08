import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.mjs';

describe('digit entry', () => {
  it('starts at 0 and replaces the leading zero', () => {
    const a = loadApp();
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.display(), '0');
    a.press('5');
    assert.equal(a.app.calc.entry, '5');
    assert.equal(a.display(), '5');
  });

  it('ignores redundant leading zeros but keeps trailing digits', () => {
    const a = loadApp();
    a.press('0');
    a.press('0');
    assert.equal(a.app.calc.entry, '0');
    a.press('7');
    assert.equal(a.app.calc.entry, '7');
  });

  it('adds a decimal point only once', () => {
    const a = loadApp();
    a.type('1.5');
    assert.equal(a.app.calc.entry, '1.5');
    a.press('dot');
    assert.equal(a.app.calc.entry, '1.5');
    a.press('2');
    assert.equal(a.app.calc.entry, '1.52');
  });

  it('starts a fresh entry with a bare decimal point', () => {
    const a = loadApp();
    a.press('dot');
    assert.equal(a.app.calc.entry, '0.');
    a.press('7');
    assert.equal(a.app.calc.entry, '0.7');
  });

  it('caps entry at 15 digits', () => {
    const a = loadApp();
    for (let i = 0; i < 20; i++) a.press('9');
    assert.equal(a.app.calc.entry, '9'.repeat(15));
  });

  it('toggles the sign but leaves zero alone', () => {
    const a = loadApp();
    a.press('5');
    a.press('neg');
    assert.equal(a.app.calc.entry, '-5');
    a.press('neg');
    assert.equal(a.app.calc.entry, '5');
    a.press('c');
    a.press('neg');
    assert.equal(a.app.calc.entry, '0');
  });

  it('backspaces digits and bottoms out at 0', () => {
    const a = loadApp();
    a.type('123');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '12');
    a.key('Backspace');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '0');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '0');
  });

  it('resets the entry when backspacing a finished result', () => {
    const a = loadApp();
    a.type('2+3=');
    assert.equal(a.app.calc.entry, '5');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.app.calc.done, false);
  });

  it('ignores backspace while an operator result is pending', () => {
    const a = loadApp();
    a.type('5+');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '5');
  });
});

describe('num()', () => {
  it('parses the entry, defaulting to 0 when unparseable', () => {
    const app = freshCalc();
    app.calc.entry = '-3.5';
    assert.equal(app.num(), -3.5);
    app.calc.entry = 'Error';
    assert.equal(app.num(), 0);
  });
});

describe('compute()', () => {
  const withOp = (op) => {
    const a = loadApp();
    a.app.calc.op = op;
    return a;
  };

  it('adds, subtracts, multiplies and divides', () => {
    assert.equal(withOp('+').app.compute(2, 3), 5);
    assert.equal(withOp('−').app.compute(5, 8), -3);
    assert.equal(withOp('×').app.compute(3, 4), 12);
    assert.equal(withOp('÷').app.compute(10, 4), 2.5);
  });

  it('rounds results through round12', () => {
    assert.equal(withOp('+').app.compute(0.1, 0.2), 0.3);
    assert.equal(withOp('÷').app.compute(1, 3), 0.333333333333);
  });

  it('returns null without an operator, and without raising an error', () => {
    const a = withOp(null);
    assert.equal(a.app.compute(1, 2), null);
    assert.equal(a.app.calc.error, false);
    a.app.calc.op = '%';
    assert.equal(a.app.compute(1, 2), null);
    assert.equal(a.app.calc.error, false);
  });

  it('flags an error on division by zero', () => {
    const a = withOp('÷');
    assert.equal(a.app.compute(5, 0), null);
    assert.equal(a.app.calc.error, true);
    assert.equal(a.app.calc.entry, 'Error');
    assert.equal(a.display(), 'Error');
  });

  it('flags an error on overflow', () => {
    const a = withOp('×');
    assert.equal(a.app.compute(1e300, 1e300), null);
    assert.equal(a.app.calc.error, true);
    assert.equal(a.display(), 'Error');
  });
});

describe('operators and equals', () => {
  it('evaluates 12 + 34', () => {
    const a = loadApp();
    a.type('12+34=');
    assert.equal(a.app.calc.entry, '46');
    assert.equal(a.display(), '46');
    assert.equal(a.hist(), '12 + 34 =');
    assert.equal(a.app.calc.done, true);
    assert.equal(a.app.calc.acc, 46);
    assert.equal(a.app.calc.lastB, 34);
  });

  it('repeats the last operand on repeated equals', () => {
    const a = loadApp();
    a.type('2+3=');
    assert.equal(a.app.calc.entry, '5');
    a.press('eq');
    assert.equal(a.app.calc.entry, '8');
    assert.equal(a.hist(), '5 + 3 =');
    a.press('eq');
    assert.equal(a.app.calc.entry, '11');
  });

  it('chains pending operators left to right', () => {
    const a = loadApp();
    a.type('2+3+1=');
    assert.equal(a.app.calc.entry, '6');
    assert.equal(a.hist(), '5 + 1 =');
  });

  it('replaces a just-typed operator instead of computing', () => {
    const a = loadApp();
    a.type('5+');
    a.press('mul');
    assert.equal(a.app.calc.op, '×');
    assert.equal(a.app.calc.acc, 5);
    assert.equal(a.app.calc.entry, '5');
    assert.equal(a.hist(), '5 ×');
  });

  it('overwrites the accumulator after an operator', () => {
    const a = loadApp();
    a.type('5+3');
    assert.equal(a.app.calc.entry, '3');
    a.press('eq');
    assert.equal(a.app.calc.entry, '8');
  });

  it('equals without an operator just records history', () => {
    const a = loadApp();
    a.type('42=');
    assert.equal(a.app.calc.entry, '42');
    assert.equal(a.hist(), '42 =');
    assert.equal(a.app.calc.done, true);
    assert.equal(a.app.calc.op, null);
  });

  it('starts a fresh calculation after equals', () => {
    const a = loadApp();
    a.type('2+3=');
    a.press('9');
    assert.equal(a.app.calc.entry, '9');
    assert.equal(a.app.calc.op, null);
    assert.equal(a.app.calc.acc, null);
    assert.equal(a.hist(), '');
  });

  it('divides and groups the result', () => {
    const a = loadApp();
    a.type('10/4=');
    assert.equal(a.app.calc.entry, '2.5');
    assert.equal(a.display(), '2.5');
    a.press('c');
    a.type('1234*2=');
    assert.equal(a.display(), '2,468');
  });
});

describe('percent', () => {
  it('computes 100 + 10 % = 110 (calculator style)', () => {
    const a = loadApp();
    a.type('100+10%');
    assert.equal(a.app.calc.entry, '10');
    a.press('eq');
    assert.equal(a.app.calc.entry, '110');
    assert.equal(a.hist(), '100 + 10 =');
  });

  it('subtracts a percentage of the accumulator', () => {
    const a = loadApp();
    a.type('200-50%=');
    assert.equal(a.app.calc.entry, '100');
  });

  it('treats percent as a plain /100 for multiplication', () => {
    const a = loadApp();
    a.type('200*50%=');
    assert.equal(a.app.calc.entry, '100');
  });

  it('divides by 100 when no operator is pending', () => {
    const a = loadApp();
    a.type('50%');
    assert.equal(a.app.calc.entry, '0.5');
    assert.equal(a.app.calc.op, null);
  });
});

describe('clear keys', () => {
  it('CE clears only the entry (and error state)', () => {
    const a = loadApp();
    a.type('12+');
    a.press('ce');
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.app.calc.op, '+');
    assert.equal(a.app.calc.acc, 12);
  });

  it('C resets the whole calculator', () => {
    const a = loadApp();
    a.type('12+34=');
    a.press('c');
    assert.deepEqual(
      { ...a.app.calc },
      { entry: '0', acc: null, op: null, overwrite: false, done: false, error: false, lastB: null, hist: '' },
    );
    assert.equal(a.display(), '0');
    assert.equal(a.hist(), '');
  });

  it('CE recovers from an error, keeping entry at 0', () => {
    const a = loadApp();
    a.type('5/0=');
    assert.equal(a.display(), 'Error');
    a.press('ce');
    assert.equal(a.app.calc.error, false);
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.hist(), '');
  });
});

describe('divide-by-zero error state', () => {
  it('shows Error and freezes every input', () => {
    const a = loadApp();
    a.type('5/0=');
    assert.equal(a.app.calc.error, true);
    assert.equal(a.app.calc.entry, 'Error');
    assert.equal(a.display(), 'Error');
    assert.equal(a.hist(), '5 ÷');

    const before = { ...a.app.calc };
    a.press('7');
    a.press('plus');
    a.press('dot');
    a.press('neg');
    a.press('pct');
    a.key('Backspace');
    a.press('eq');
    assert.deepEqual({ ...a.app.calc }, before);
    assert.equal(a.display(), 'Error');
  });

  it('C recovers from an error', () => {
    const a = loadApp();
    a.type('5/0=');
    a.press('c');
    assert.equal(a.app.calc.error, false);
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.display(), '0');
  });
});

describe('display rendering', () => {
  it('groups thousands in the value line', () => {
    const a = loadApp();
    a.type('1234');
    assert.equal(a.display(), '1,234');
    a.press('neg');
    assert.equal(a.display(), '-1,234');
  });

  it('shows the running history line', () => {
    const a = loadApp();
    a.type('7+8');
    assert.equal(a.hist(), '7 +');
    a.press('eq');
    assert.equal(a.hist(), '7 + 8 =');
  });

  it('scales the display font via data-len', () => {
    const a = loadApp();
    a.type('1234');
    assert.equal(a.dataLen(), '0');
    a.press('c');
    a.type('12345678901');        // 11 digits
    assert.equal(a.dataLen(), '1');
    a.press('c');
    a.type('12345678901234');     // 14 digits
    assert.equal(a.dataLen(), '2');
    a.app.calc.entry = '12345678901234567890';
    a.app.renderCalc();
    assert.equal(a.dataLen(), '3');
  });

  it('highlights the pending operator key', () => {
    const a = loadApp();
    assert.deepEqual(a.pendingOp(), []);
    a.press('plus');
    assert.deepEqual(a.pendingOp(), ['plus']);
    a.press('div');
    assert.deepEqual(a.pendingOp(), ['div']);
    a.type('8');
    assert.deepEqual(a.pendingOp(), ['div']); // operator still pending while typing operand
    a.press('eq');
    assert.deepEqual(a.pendingOp(), ['div']); // result keeps the operator highlighted
    a.press('c');
    assert.deepEqual(a.pendingOp(), []);
  });

  it('clears the highlight when a new chain starts', () => {
    const a = loadApp();
    a.type('2+3=');
    a.press('9');
    assert.deepEqual(a.pendingOp(), []);
  });
});

describe('keypad integration', () => {
  it('computes 7 + 3 = 10 through key presses', () => {
    const a = loadApp();
    a.type('7+3=');
    assert.equal(a.display(), '10');
  });

  it('handles CE, C, neg and pct keys', () => {
    const a = loadApp();
    a.type('12');
    a.press('neg');
    assert.equal(a.app.calc.entry, '-12');
    a.press('ce');
    assert.equal(a.app.calc.entry, '0');
    a.type('4+6');
    a.press('pct');
    assert.equal(a.app.calc.entry, '0.24'); // 4 * 6 / 100
    a.press('c');
    assert.equal(a.app.calc.entry, '0');
    assert.equal(a.app.calc.op, null);
  });
});

describe('keyboard integration', () => {
  it('computes 7 + 3 = 10 from the keyboard', () => {
    const a = loadApp();
    a.key('7');
    a.key('+');
    a.key('3');
    a.key('Enter');
    assert.equal(a.display(), '10');
  });

  it('maps x/X to multiply and , to the decimal point', () => {
    const a = loadApp();
    a.key('5');
    a.key('x');
    a.key('4');
    a.key('=');
    assert.equal(a.display(), '20');
    a.key('c');
    a.key('2');
    a.key(',');
    a.key('5');
    assert.equal(a.app.calc.entry, '2.5');
  });

  it('supports c/e/n/%/Backspace shortcuts', () => {
    const a = loadApp();
    a.key('6');
    a.key('n');
    assert.equal(a.app.calc.entry, '-6');
    a.key('e');
    assert.equal(a.app.calc.entry, '0');
    a.key('9');
    a.key('%');
    assert.equal(a.app.calc.entry, '0.09');
    a.key('c');
    a.key('5');
    a.key('5');
    a.key('Backspace');
    assert.equal(a.app.calc.entry, '5');
  });

  it('maps / to divide', () => {
    const a = loadApp();
    a.key('9');
    a.key('/');
    a.key('3');
    a.key('Enter');
    assert.equal(a.display(), '3');
  });
});

function freshCalc() {
  return loadApp().app;
}
