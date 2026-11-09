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
 * Short help for the expressions: the operators and the functions, each with an example whose result is computed by the
 * interpreter when the help opens (so the help always matches what the algorithm does).
 *
 * @module     tiny_algorithm/help
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el, openDialog} from './dialog';
import {t} from './strings';
import {createBlock, createProgram} from './model';
import {runSync} from './interpreter';

/** Operators: how they are written, an example and the key of their meaning (h.*). */
export const OPERATORS = [
    ['+  -  *  /', '7 / 2', 'arith'],
    ['^', '2 ^ 10', 'power'],
    ['mod  %', '17 mod 5', 'mod'],
    ['&', '"x = " & 5', 'join'],
    ['=  <>  <  <=  >  >=', '3 <> 4', 'compare'],
    ['not  and  or', 'not (3 > 4) and true', 'logic'],
];

/** Functions: how they are called, an example and the key of their meaning (h.*). */
export const FUNCTIONS = [
    ['Abs(x)', 'Abs(-7)', 'abs'],
    ['Sqrt(x)', 'Sqrt(16)', 'sqrt'],
    ['Round(x)', 'Round(2.5)', 'round'],
    ['Int(x)', 'Int(7.9)', 'int'],
    ['Floor(x)  Ceiling(x)', 'Floor(2.7) & " " & Ceiling(2.1)', 'floorceil'],
    ['Random(n)', 'Random(6)', 'random'],
    ['Sin(x)  Cos(x)  Tan(x)', 'Sin(Pi / 2)', 'trig'],
    ['Arcsin(x)  Arccos(x)  Arctan(x)', 'Arctan(1) * 4', 'arc'],
    ['Log(x)  Log10(x)  Exp(x)', 'Log10(1000)', 'log'],
    ['Pi', 'Pi', 'pi'],
    ['Sgn(x)', 'Sgn(-3)', 'sgn'],
    ['Len(s)  Size(a)', 'Len("Pirot")', 'len'],
    ['Char(s, i)', 'Char("Pirot", 0)', 'char'],
    ['ToCode(s)  ToChar(n)', 'ToCode("A") & " " & ToChar(66)', 'code'],
    ['ToInteger(s)  ToReal(s)  ToString(x)', 'ToInteger("12") + 1', 'convert'],
    ['ToFixed(x, d)', 'ToFixed(3.14159, 2)', 'tofixed'],
    ['IsNumeric(s)', 'IsNumeric("12a")', 'isnumeric'],
];

/**
 * The value of an expression as the Output block writes it.
 *
 * @param {string} expr expression
 * @returns {string}
 */
export const evaluate = (expr) => {
    const program = createProgram();
    program.functions[0].body = [createBlock('output', {expr, newline: false})];
    try {
        return runSync(program, [], {maxSteps: 1000});
    } catch (e) {
        return e.message;
    }
};

/**
 * One table of the help.
 *
 * @param {string} head title of the first column
 * @param {Array} rows [written form, example, meaning key]
 * @returns {HTMLElement}
 */
const table = (head, rows) => el('div', {'class': 'tiny_algorithm-help-wrap'},
    el('table', {'class': 'table table-sm tiny_algorithm-help'},
        el('thead', {}, el('tr', {}, [head, t('helpmeaning'), t('helpexample'), t('helpresult')]
            .map((text) => el('th', {scope: 'col'}, text)))),
        el('tbody', {}, rows.map(([form, example, key]) => el('tr', {},
            el('th', {scope: 'row'}, el('code', {}, form)), el('td', {}, t(`h.${key}`)),
            el('td', {}, el('code', {}, example)), el('td', {}, el('code', {}, evaluate(example))))))));

/**
 * Open the help for the expressions.
 *
 * @param {HTMLElement} host widget root
 */
export const openHelp = (host) => {
    openDialog(host, t('exprhelp'), el('div', {}, table(t('helpoperator'), OPERATORS), table(t('helpfunction'), FUNCTIONS),
        el('p', {'class': 'text-muted small'}, t('helpnotes'))));
};
