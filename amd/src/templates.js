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
        title: 'Swap Values',
        desc: 'Swap the values of two variables a and b using a temporary variable temp.',
        fallbackTitle: 'Swap Values',
        fallbackDesc: 'Swap the values of two variables a and b using a temporary variable temp.',
        build: () => {
            const prog = createProgram('Swap');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Swap the values of two variables'}),
                createBlock('declare', {name: 'a', varType: 'Integer'}),
                createBlock('declare', {name: 'b', varType: 'Integer'}),
                createBlock('declare', {name: 'temp', varType: 'Integer'}),
                createBlock('output', {expr: '"Enter a and b:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('assign', {target: 'temp', expr: 'a'}),
                createBlock('assign', {target: 'a', expr: 'b'}),
                createBlock('assign', {target: 'b', expr: 'temp'}),
                createBlock('output', {expr: '"After swap: a = " & a & ", b = " & b', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'rectangle',
        category: 'linear',
        title: 'Rectangle (Perimeter and Area)',
        desc: 'Calculate perimeter P = 2*(a+b) and area A = a*b for given sides a and b.',
        fallbackTitle: 'Rectangle (Perimeter and Area)',
        fallbackDesc: 'Calculate perimeter P = 2*(a+b) and area A = a*b for given sides a and b.',
        build: () => {
            const prog = createProgram('Rectangle');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Perimeter and area of a rectangle'}),
                createBlock('declare', {name: 'a', varType: 'Real'}),
                createBlock('declare', {name: 'b', varType: 'Real'}),
                createBlock('declare', {name: 'perimeter', varType: 'Real'}),
                createBlock('declare', {name: 'area', varType: 'Real'}),
                createBlock('output', {expr: '"Enter sides a and b:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('assign', {target: 'perimeter', expr: '2 * (a + b)'}),
                createBlock('assign', {target: 'area', expr: 'a * b'}),
                createBlock('output', {expr: '"Perimeter P = " & perimeter', newline: true}),
                createBlock('output', {expr: '"Area A = " & area', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'max2',
        category: 'branching',
        title: 'Maximum of Two Numbers',
        desc: 'Find and output the larger of two numbers using If-Else branching.',
        fallbackTitle: 'Maximum of Two Numbers',
        fallbackDesc: 'Find and output the larger of two numbers using If-Else branching.',
        build: () => {
            const prog = createProgram('MaxOfTwo');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Maximum of two numbers'}),
                createBlock('declare', {name: 'a', varType: 'Real'}),
                createBlock('declare', {name: 'b', varType: 'Real'}),
                createBlock('output', {expr: '"Enter two numbers:"', newline: true}),
                createBlock('input', {target: 'a'}),
                createBlock('input', {target: 'b'}),
                createBlock('if', {
                    cond: 'a > b',
                    then: [
                        createBlock('output', {expr: '"Larger number is: " & a', newline: true})
                    ],
                    'else': [
                        createBlock('output', {expr: '"Larger number is: " & b', newline: true})
                    ]
                })
            ];
            return prog;
        }
    },
    {
        id: 'evenodd',
        category: 'branching',
        title: 'Even or Odd Number',
        desc: 'Check whether an integer is even or odd using the modulo operator (n % 2 == 0).',
        fallbackTitle: 'Even or Odd Number',
        fallbackDesc: 'Check whether an integer is even or odd using the modulo operator (n % 2 == 0).',
        build: () => {
            const prog = createProgram('EvenOrOdd');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Check if an integer is even or odd'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('output', {expr: '"Enter an integer:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('if', {
                    cond: 'n % 2 == 0',
                    then: [
                        createBlock('output', {expr: 'n & " is EVEN."', newline: true})
                    ],
                    'else': [
                        createBlock('output', {expr: 'n & " is ODD."', newline: true})
                    ]
                })
            ];
            return prog;
        }
    },
    {
        id: 'sum_n',
        category: 'loops',
        title: 'Sum of Numbers 1 to N',
        desc: 'Calculate the sum of numbers from 1 to n (1 + 2 + ... + n) using a For loop.',
        fallbackTitle: 'Sum of Numbers 1 to N',
        fallbackDesc: 'Calculate the sum of numbers from 1 to n (1 + 2 + ... + n) using a For loop.',
        build: () => {
            const prog = createProgram('Sum1toN');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Sum of numbers from 1 to n'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 'sum', varType: 'Integer'}),
                createBlock('assign', {target: 'sum', expr: '0'}),
                createBlock('output', {expr: '"Enter n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('for', {
                    variable: 'i',
                    start: '1',
                    end: 'n',
                    step: '1',
                    body: [
                        createBlock('assign', {target: 'sum', expr: 'sum + i'})
                    ]
                }),
                createBlock('output', {expr: '"Sum from 1 to " & n & " is: " & sum', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'factorial',
        category: 'loops',
        title: 'Factorial (n!)',
        desc: 'Calculate factorial n! = 1 * 2 * ... * n for a positive integer using a For loop.',
        fallbackTitle: 'Factorial (n!)',
        fallbackDesc: 'Calculate factorial n! = 1 * 2 * ... * n for a positive integer using a For loop.',
        build: () => {
            const prog = createProgram('Factorial');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Factorial of a positive integer n!'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 'fact', varType: 'Integer'}),
                createBlock('assign', {target: 'fact', expr: '1'}),
                createBlock('output', {expr: '"Enter n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('for', {
                    variable: 'i',
                    start: '1',
                    end: 'n',
                    step: '1',
                    body: [
                        createBlock('assign', {target: 'fact', expr: 'fact * i'})
                    ]
                }),
                createBlock('output', {expr: 'n & "! = " & fact', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'gcd',
        category: 'loops',
        title: 'Euclidean Algorithm (GCD)',
        desc: 'Find the greatest common divisor of two integers a and b using a While loop.',
        fallbackTitle: 'Euclidean Algorithm (GCD)',
        fallbackDesc: 'Find the greatest common divisor of two integers a and b using a While loop.',
        build: () => {
            const prog = createProgram('EuclideanGCD');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Euclidean algorithm for greatest common divisor (GCD)'}),
                createBlock('declare', {name: 'a', varType: 'Integer'}),
                createBlock('declare', {name: 'b', varType: 'Integer'}),
                createBlock('declare', {name: 'r', varType: 'Integer'}),
                createBlock('output', {expr: '"Enter a and b:"', newline: true}),
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
                createBlock('output', {expr: '"GCD is: " & a', newline: true})
            ];
            return prog;
        }
    },
    {
        id: 'linear_search',
        category: 'arrays',
        title: 'Linear Search in Array',
        desc: 'Search for a number in a 1D array and find its index position.',
        fallbackTitle: 'Linear Search in Array',
        fallbackDesc: 'Search for a number in a 1D array and find its index position.',
        build: () => {
            const prog = createProgram('LinearSearch');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Linear search in an array'}),
                createBlock('declare', {name: 'arr', varType: 'Integer', size: '5'}),
                createBlock('declare', {name: 'i', varType: 'Integer'}),
                createBlock('declare', {name: 'x', varType: 'Integer'}),
                createBlock('declare', {name: 'found', varType: 'Boolean'}),
                createBlock('assign', {target: 'found', expr: 'false'}),
                createBlock('assign', {target: 'arr[0]', expr: '12'}),
                createBlock('assign', {target: 'arr[1]', expr: '45'}),
                createBlock('assign', {target: 'arr[2]', expr: '7'}),
                createBlock('assign', {target: 'arr[3]', expr: '23'}),
                createBlock('assign', {target: 'arr[4]', expr: '56'}),
                createBlock('output', {expr: '"Enter number to search for:"', newline: true}),
                createBlock('input', {target: 'x'}),
                createBlock('for', {
                    variable: 'i',
                    start: '0',
                    end: '4',
                    step: '1',
                    body: [
                        createBlock('if', {
                            cond: 'arr[i] == x',
                            then: [
                                createBlock('assign', {target: 'found', expr: 'true'}),
                                createBlock('output', {expr: '"Number found at index: " & i', newline: true})
                            ],
                            'else': []
                        })
                    ]
                }),
                createBlock('if', {
                    cond: '!found',
                    then: [
                        createBlock('output', {expr: '"Number not found in array."', newline: true})
                    ],
                    'else': []
                })
            ];
            return prog;
        }
    },
    {
        id: 'bubble_sort',
        category: 'arrays',
        title: 'Bubble Sort',
        desc: 'Sort an array of random numbers by swapping neighbours that are in the wrong order; step through it ' +
            'and watch the Arrays panel.',
        fallbackTitle: 'Bubble Sort',
        fallbackDesc: 'Sort an array of random numbers by swapping neighbours that are in the wrong order.',
        build: () => {
            const prog = createProgram('BubbleSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Bubble sort: the biggest number bubbles to the end in every pass'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '8'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('declare', {name: 'i, j, temp', varType: 'Integer'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(100)'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 2', step: '1', body: [
                    createBlock('for', {variable: 'j', start: '0', end: 'n - 2 - i', step: '1', body: [
                        createBlock('if', {cond: 'a[j] > a[j + 1]', then: [
                            createBlock('assign', {target: 'temp', expr: 'a[j]'}),
                            createBlock('assign', {target: 'a[j]', expr: 'a[j + 1]'}),
                            createBlock('assign', {target: 'a[j + 1]', expr: 'temp'}),
                        ], 'else': []}),
                    ]}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: 'a[i] & " "', newline: false}),
                ]}),
            ];
            return prog;
        }
    },
    {
        id: 'selection_sort',
        category: 'arrays',
        title: 'Selection Sort',
        desc: 'Sort an array of random numbers: find the smallest of the rest and swap it to the front.',
        fallbackTitle: 'Selection Sort',
        fallbackDesc: 'Sort an array of random numbers: find the smallest of the rest and swap it to the front.',
        build: () => {
            const prog = createProgram('SelectionSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Selection sort: the smallest of the rest goes to place i'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '8'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('declare', {name: 'i, j, min, temp', varType: 'Integer'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(100)'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 2', step: '1', body: [
                    createBlock('assign', {target: 'min', expr: 'i'}),
                    createBlock('for', {variable: 'j', start: 'i + 1', end: 'n - 1', step: '1', body: [
                        createBlock('if', {cond: 'a[j] < a[min]', then: [
                            createBlock('assign', {target: 'min', expr: 'j'}),
                        ], 'else': []}),
                    ]}),
                    createBlock('assign', {target: 'temp', expr: 'a[i]'}),
                    createBlock('assign', {target: 'a[i]', expr: 'a[min]'}),
                    createBlock('assign', {target: 'a[min]', expr: 'temp'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: 'a[i] & " "', newline: false}),
                ]}),
            ];
            return prog;
        }
    },
    {
        id: 'binary_search',
        category: 'arrays',
        title: 'Binary Search',
        desc: 'Find a number in a sorted array by halving the part where it can be (low, mid, high).',
        fallbackTitle: 'Binary Search',
        fallbackDesc: 'Find a number in a sorted array by halving the part where it can be (low, mid, high).',
        build: () => {
            const prog = createProgram('BinarySearch');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Binary search in a sorted array: a[i] = 3 * i'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '16'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('declare', {name: 'i, x, low, high, mid', varType: 'Integer'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: '3 * i'}),
                ]}),
                createBlock('output', {expr: '"Enter a number to find:"', newline: true}),
                createBlock('input', {target: 'x'}),
                createBlock('assign', {target: 'low', expr: '0'}),
                createBlock('assign', {target: 'high', expr: 'n - 1'}),
                createBlock('assign', {target: 'mid', expr: '(low + high) / 2'}),
                createBlock('while', {cond: 'low <= high && a[mid] != x', body: [
                    createBlock('if', {cond: 'a[mid] < x', then: [
                        createBlock('assign', {target: 'low', expr: 'mid + 1'}),
                    ], 'else': [
                        createBlock('assign', {target: 'high', expr: 'mid - 1'}),
                    ]}),
                    createBlock('assign', {target: 'mid', expr: '(low + high) / 2'}),
                ]}),
                createBlock('if', {cond: 'low <= high', then: [
                    createBlock('output', {expr: '"Found at index " & mid', newline: true}),
                ], 'else': [
                    createBlock('output', {expr: '"Not found"', newline: true}),
                ]}),
            ];
            return prog;
        }
    }
];
