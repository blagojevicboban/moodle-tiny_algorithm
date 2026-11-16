// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tests of the call tree: the call and return events of the interpreter (execute with calls), the tree built from
 * them, the repeated calls and the layout, with the recursion templates.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram} from '../amd/src/model.js';
import {execute, runSync} from '../amd/src/interpreter.js';
import {CallTreeModel, MAX_NODES, layoutTree, usesCalls} from '../amd/src/calltree.js';
import {TEMPLATES} from '../amd/src/templates.js';

const template = (id) => TEMPLATES.find((t) => t.id === id).build();

/**
 * All events of a run (inputs answered from a list).
 *
 * @param {Object} program
 * @param {Object} opts options of execute
 * @param {string[]} inputs
 * @returns {Array}
 */
const events = (program, opts = {}, inputs = []) => {
    const out = [];
    const gen = execute(program, opts);
    let res = gen.next();
    while (!res.done) {
        out.push(res.value);
        res = gen.next(res.value.event === 'input' ? inputs.shift() : undefined);
    }
    return out;
};

const treeOf = (program, inputs) => {
    const m = new CallTreeModel();
    events(program, {calls: true}, inputs).forEach((ev) => m.apply(ev));
    return m;
};

test('without the calls option the interpreter sends no call events', () => {
    const evs = events(template('factorial_rec'), {}, ['3']);
    assert.ok(!evs.some((e) => e.event === 'call' || e.event === 'return'));
});

test('call and return events come in pairs with the arguments and the returned value', () => {
    const evs = events(template('factorial_rec'), {calls: true}, ['3']).filter((e) => ['call', 'return'].includes(e.event));
    assert.deepEqual(evs.map((e) => (e.event === 'call' ? `${e.name}(${e.args.join(',')})@${e.depth}` : `=${e.value}`)),
        ['Main()@1', 'Fact(3)@2', 'Fact(2)@3', 'Fact(1)@4', '=1', '=2', '=6', '=null']);
});

test('the tree of Fact(4) is a chain with the values going back', () => {
    const m = treeOf(template('factorial_rec'), ['4']);
    assert.equal(m.root.label, 'Main()');
    assert.equal(m.count, 4);
    assert.equal(m.repeated, 0);
    assert.equal(m.deepest, 4);
    let node = m.root.children[0];
    const values = [];
    while (node) {
        values.push(`${node.label}=${node.value}`);
        node = node.children[0];
    }
    assert.deepEqual(values, ['Fact(4)=24', 'Fact(3)=6', 'Fact(2)=2', 'Fact(1)=1']);
    assert.equal(m.path.length, 0);
});

test('Fib(5) makes 15 calls, 9 of them again with the same argument', () => {
    const m = treeOf(template('fibonacci_rec'), ['5']);
    assert.equal(m.count, 15);
    assert.equal(m.repeated, 9);
    assert.equal(m.root.children[0].value, '5');
    assert.ok(m.isRepeated(m.root.children[0].children[1])); // Fib(3) also under Fib(4).
    assert.ok(!m.isRepeated(m.root.children[0])); // Fib(5) only once.
});

test('the running call is the last on the path while stepping', () => {
    const m = new CallTreeModel();
    const gen = execute(template('fibonacci_rec'), {calls: true});
    let res = gen.next();
    let seen = null;
    while (!res.done) {
        const ev = res.value;
        m.apply(ev);
        if (ev.event === 'step' && m.current && m.current.label === 'Fib(1)' && !seen) {
            seen = m.path.filter(Boolean).map((n) => n.label);
        }
        res = gen.next(ev.event === 'input' ? '3' : undefined);
    }
    assert.deepEqual(seen, ['Main()', 'Fib(3)', 'Fib(2)', 'Fib(1)']);
});

test('Hanoi with 3 disks: 15 calls of Move, 7 moves written', () => {
    const p = template('hanoi');
    const m = treeOf(p, ['3']);
    assert.equal(m.count, 15);
    const out = runSync(p, ['3']);
    assert.equal(out.split('\n').filter((l) => l.startsWith('Disk')).length, 7);
    assert.match(out, /Disk 3: A -> C/);
});

test('a very large tree draws only the first calls and counts the rest', () => {
    const m = treeOf(template('fibonacci_rec'), ['12']);
    assert.equal(m.count, 465);
    assert.equal(m.hidden, m.count - MAX_NODES);
    let drawn = -1;
    const visit = (n) => {
        drawn++;
        n.children.forEach(visit);
    };
    visit(m.root);
    assert.equal(drawn, MAX_NODES);
});

test('layout: leaves side by side, parents above the middle of their calls', () => {
    const m = treeOf(template('fibonacci_rec'), ['3']);
    const {nodes, width, height} = layoutTree(m.root, 100);
    assert.equal(nodes.length, 6);
    const leaves = nodes.filter((i) => !i.node.children.length);
    assert.equal(width, leaves.length * 100);
    assert.equal(height, 4 * 56);
    const fib3 = nodes.find((i) => i.node.label === 'Fib(3)');
    const kids = nodes.filter((i) => i.parent === fib3);
    assert.equal(fib3.x, (kids[0].x + kids[1].x) / 2);
});

test('the call tree is offered only for an algorithm with more than one function', () => {
    assert.equal(usesCalls(createProgram()), false);
    assert.equal(usesCalls(template('hanoi')), true);
});
