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
 * Standard educational algorithm templates for school computer science courses.
 *
 * @module tiny_algorithm/templates
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {createBlock, createProgram} from './model';

export const TEMPLATES = [
    {
        id: 'swap',
        category: 'linear',
        titleKey: 'tmpl_swap_title',
        descKey: 'tmpl_swap_desc',
        fallbackTitle: 'Zamena vrednosti (Swap)',
        fallbackDesc: 'Razmena vrednosti dve promenljive a i b pomoću pomoćne promenljive pom.',
        build: () => {
            const prog = createProgram('Swap');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Zamena vrednosti dve promenljive'}),
                createBlock('declare', {name: 'a', varType: 'Integer'}),
                createBlock('declare', {name: 'b', varType: 'Integer'}),
                createBlock('declare', {name: 'pom', varType: 'Integer'}),
                createBlock('output', {expr: '"Unesite a i b:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('assign', {target: 'pom', expr: 'a'}),
                createBlock('assign', {target: 'a', expr: 'b'}),
                createBlock('assign', {target: 'b', expr: 'pom'}),
                createBlock('output', {expr: '"Nove vrednosti: a = " & a & ", b = " & b', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'rectangle',
        category: 'linear',
        titleKey: 'tmpl_rect_title',
        descKey: 'tmpl_rect_desc',
        fallbackTitle: 'Pravougaonik (Obim i površina)',
        fallbackDesc: 'Računanje obima O = 2*(a+b) i površine P = a*b za zadate stranice a i b.',
        build: () => {
            const prog = createProgram('Pravougaonik');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Obim i povrsina pravougaonika'}),
                createBlock('declare', {name: 'a', varType: 'Real'}),
                createBlock('declare', {name: 'b', varType: 'Real'}),
                createBlock('declare', {name: 'o', varType: 'Real'}),
                createBlock('declare', {name: 'p', varType: 'Real'}),
                createBlock('output', {expr: '"Unesite stranice a i b:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('assign', {target: 'o', expr: '2 * (a + b)'}),
                createBlock('assign', {target: 'p', expr: 'a * b'}),
                createBlock('output', {expr: '"Obim O = " & o', newline: true}),
                createBlock('output', {expr: '"Povrsina P = " & p', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'max2',
        category: 'branching',
        titleKey: 'tmpl_max2_title',
        descKey: 'tmpl_max2_desc',
        fallbackTitle: 'Maksimum dva broja (Max)',
        fallbackDesc: 'Određivanje i ispis većeg od dva uneta broja korišćenjem If-Else grananja.',
        build: () => {
            const prog = createProgram('Maksimum2');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Maksimum dva broja'}),
                createBlock('declare', {name: 'a', varType: 'Real'}),
                createBlock('declare', {name: 'b', varType: 'Real'}),
                createBlock('output', {expr: '"Unesite dva broja:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('if', {
                    cond: 'a > b',
                    then: [
                        createBlock('output', {expr: '"Veci broj je: " & a', newline: true})
                    ],
                    'else': [
                        createBlock('output', {expr: '"Veci broj je: " & b', newline: true})
                    ]
                })
            ];
            return prog;
        }
    },
    {
        id: 'evenodd',
        category: 'branching',
        titleKey: 'tmpl_evenodd_title',
        descKey: 'tmpl_evenodd_desc',
        fallbackTitle: 'Parnost broja',
        fallbackDesc: 'Provera da li je uneti ceo broj paran ili neparan pomoću operacije modula (n % 2 == 0).',
        build: () => {
            const prog = createProgram('Parnost');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Provera parnosti celog broja'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('output', {expr: '"Unesite ceo broj:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('if', {
                    cond: 'n % 2 == 0',
                    then: [
                        createBlock('output', {expr: 'n & " je PARAN broj."', newline: true})
                    ],
                    'else': [
                        createBlock('output', {expr: 'n & " je NEPARAN broj."', newline: true})
                    ]
                })
            ];
            return prog;
        }
    },
    {
        id: 'sum_n',
        category: 'loops',
        titleKey: 'tmpl_sumn_title',
        descKey: 'tmpl_sumn_desc',
        fallbackTitle: 'Suma prvih N brojeva',
        fallbackDesc: 'Računanje zbira brojeva od 1 do n (1 + 2 + ... + n) korišćenjem brojačke For petlje.',
        build: () => {
            const prog = createProgram('SumaN');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Suma prvih n prirodnih brojeva'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 's', varType: 'Integer'}),
                createBlock('assign', {target: 's', expr: '0'}),
                createBlock('output', {expr: '"Unesite n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('for', {
                    variable: 'i',
                    start: '1',
                    end: 'n',
                    step: '1',
                    body: [
                        createBlock('assign', {target: 's', expr: 's + i'})
                    ]
                }),
                createBlock('output', {expr: '"Suma od 1 do " & n & " je: " & s', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'factorial',
        category: 'loops',
        titleKey: 'tmpl_fact_title',
        descKey: 'tmpl_fact_desc',
        fallbackTitle: 'Faktorijel (n!)',
        fallbackDesc: 'Računanje faktorijela prirodnog broja n! = 1 * 2 * ... * n pomoću For petlje.',
        build: () => {
            const prog = createProgram('Faktorijel');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Faktorijel prirodnog broja n!'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 'f', varType: 'Integer'}),
                createBlock('assign', {target: 'f', expr: '1'}),
                createBlock('output', {expr: '"Unesite n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('for', {
                    variable: 'i',
                    start: '1',
                    end: 'n',
                    step: '1',
                    body: [
                        createBlock('assign', {target: 'f', expr: 'f * i'})
                    ]
                }),
                createBlock('output', {expr: 'n & "! = " & f', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'gcd',
        category: 'loops',
        titleKey: 'tmpl_gcd_title',
        descKey: 'tmpl_gcd_desc',
        fallbackTitle: 'Euklidov algoritam (NZD)',
        fallbackDesc: 'Pronalaženje najvećeg zajedničkog delioca dva cela broja a i b While petljom.',
        build: () => {
            const prog = createProgram('EuklidNZD');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Euklidov algoritam za najveci zajednicki delilac (NZD)'}),
                createBlock('declare', {name: 'a', varType: 'Integer'}),
                createBlock('declare', {name: 'b', varType: 'Integer'}),
                createBlock('declare', {name: 'r', varType: 'Integer'}),
                createBlock('output', {expr: '"Unesite a i b:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('while', {
                    cond: 'b != 0',
                    body: [
                        createBlock('assign', {target: 'r', expr: 'a % b'}),
                        createBlock('assign', {target: 'a', expr: 'b'}),
                        createBlock('assign', {target: 'b', expr: 'r'})
                    ]
                }),
                createBlock('output', {expr: '"NZD je: " & a', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'linear_search',
        category: 'arrays',
        titleKey: 'tmpl_search_title',
        descKey: 'tmpl_search_desc',
        fallbackTitle: 'Linearna pretraga niza',
        fallbackDesc: 'Pretraga zadatog broja u jednodimenzionalnom nizu i određivanje njegove pozicije.',
        build: () => {
            const prog = createProgram('PretragaNiza');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Linearna pretraga niza'}),
                createBlock('declare', {name: 'niz', varType: 'Integer', size: '5'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 'x', varType: 'Integer'}),
                createBlock('declare', {name: 'nasao', varType: 'Boolean'}),
                createBlock('assign', {target: 'nasao', expr: 'false'}),
                createBlock('assign', {target: 'niz[0]', expr: '12'}),
                createBlock('assign', {target: 'niz[1]', expr: '45'}),
                createBlock('assign', {target: 'niz[2]', expr: '7'}),
                createBlock('assign', {target: 'niz[3]', expr: '23'}),
                createBlock('assign', {target: 'niz[4]', expr: '56'}),
                createBlock('output', {expr: '"Unesite broj za pretragu:"', newline: true}),
                createBlock('input', {target: 'x'}),
                createBlock('for', {
                    variable: 'i',
                    start: '0',
                    end: '4',
                    step: '1',
                    body: [
                        createBlock('if', {
                            cond: 'niz[i] == x',
                            then: [
                                createBlock('assign', {target: 'nasao', expr: 'true'}),
                                createBlock('output', {expr: '"Broj je pronadjen na poziciji: " & i', newline: true})
                            ],
                            'else': []
                        })
                    ]
                }),
                createBlock('if', {
                    cond: '!nasao',
                    then: [
                        createBlock('output', {expr: '"Broj nije pronadjen u nizu."', newline: true})
                    ],
                    'else': []
                })
            ];
            return prog;
        }
    }
];
