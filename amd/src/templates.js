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
        id: 'insertion_sort',
        category: 'arrays',
        title: 'Insertion Sort',
        desc: 'Sort an array of random numbers: each number moves left past the bigger ones to its place among the sorted ' +
            'ones; watch the shifts and the counters in the Arrays panel.',
        fallbackTitle: 'Insertion Sort',
        fallbackDesc: 'Sort an array of random numbers: each number moves left past the bigger ones to its place.',
        build: () => {
            const prog = createProgram('InsertionSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Insertion sort: a[0..i-1] is sorted; a[i] goes to its place in it'}),
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '8'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('declare', {name: 'i, j, key', varType: 'Integer'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(100)'}),
                ]}),
                createBlock('for', {variable: 'i', start: '1', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'key', expr: 'a[i]'}),
                    createBlock('assign', {target: 'j', expr: 'i - 1'}),
                    createBlock('while', {cond: 'j >= 0 && a[j] > key', body: [
                        createBlock('assign', {target: 'a[j + 1]', expr: 'a[j]'}),
                        createBlock('assign', {target: 'j', expr: 'j - 1'}),
                    ]}),
                    createBlock('assign', {target: 'a[j + 1]', expr: 'key'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: 'a[i] & " "', newline: false}),
                ]}),
            ];
            return prog;
        }
    },
    {
        id: 'quick_sort',
        category: 'arrays',
        title: 'Quick Sort',
        desc: 'Sort with a pivot: the smaller numbers go to its left, the bigger to its right, then each part is sorted ' +
            'the same way (recursion). Compare its counters with Bubble Sort.',
        fallbackTitle: 'Quick Sort',
        fallbackDesc: 'Sort with a pivot: smaller numbers to its left, bigger to its right, then sort each part.',
        build: () => {
            const prog = createProgram('QuickSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Quick sort (Lomuto): the last element of a part is the pivot'}),
                createBlock('declare', {name: 'n, i', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '10'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(100)'}),
                ]}),
                createBlock('call', {expr: 'Sort(a, 0, n - 1)'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: 'a[i] & " "', newline: false}),
                ]}),
            ];
            const arr = {name: 'a', type: 'Integer', array: true};
            prog.functions.push({name: 'Sort', params: [arr, {name: 'low', type: 'Integer'}, {name: 'high', type: 'Integer'}],
                returnType: null, body: [
                    createBlock('declare', {name: 'pivot, i, j, temp', varType: 'Integer'}),
                    createBlock('if', {cond: 'low < high', then: [
                        createBlock('assign', {target: 'pivot', expr: 'a[high]'}),
                        createBlock('assign', {target: 'i', expr: 'low'}),
                        createBlock('for', {variable: 'j', start: 'low', end: 'high - 1', step: '1', body: [
                            createBlock('if', {cond: 'a[j] < pivot', then: [
                                createBlock('assign', {target: 'temp', expr: 'a[i]'}),
                                createBlock('assign', {target: 'a[i]', expr: 'a[j]'}),
                                createBlock('assign', {target: 'a[j]', expr: 'temp'}),
                                createBlock('assign', {target: 'i', expr: 'i + 1'}),
                            ], 'else': []}),
                        ]}),
                        createBlock('assign', {target: 'temp', expr: 'a[i]'}),
                        createBlock('assign', {target: 'a[i]', expr: 'a[high]'}),
                        createBlock('assign', {target: 'a[high]', expr: 'temp'}),
                        createBlock('call', {expr: 'Sort(a, low, i - 1)'}),
                        createBlock('call', {expr: 'Sort(a, i + 1, high)'}),
                    ], 'else': []}),
                ]});
            return prog;
        }
    },
    {
        id: 'merge_sort',
        category: 'arrays',
        title: 'Merge Sort',
        desc: 'Split the array in halves, sort each half (recursion) and merge the two sorted halves through a helper ' +
            'array.',
        fallbackTitle: 'Merge Sort',
        fallbackDesc: 'Split in halves, sort each half and merge the sorted halves.',
        build: () => {
            const prog = createProgram('MergeSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Merge sort: halves are sorted, then merged into tmp and copied back'}),
                createBlock('declare', {name: 'n, i', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '10'}),
                createBlock('declare', {name: 'a, tmp', varType: 'Integer', size: 'n'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(100)'}),
                ]}),
                createBlock('call', {expr: 'Sort(a, tmp, 0, n - 1)'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: 'a[i] & " "', newline: false}),
                ]}),
            ];
            const arr = (name) => ({name, type: 'Integer', array: true});
            prog.functions.push({name: 'Sort', params: [arr('a'), arr('tmp'), {name: 'low', type: 'Integer'},
                {name: 'high', type: 'Integer'}], returnType: null, body: [
                createBlock('declare', {name: 'mid, i, j, k', varType: 'Integer'}),
                createBlock('if', {cond: 'low < high', then: [
                    createBlock('assign', {target: 'mid', expr: 'Int((low + high) / 2)'}),
                    createBlock('call', {expr: 'Sort(a, tmp, low, mid)'}),
                    createBlock('call', {expr: 'Sort(a, tmp, mid + 1, high)'}),
                    createBlock('assign', {target: 'i', expr: 'low'}),
                    createBlock('assign', {target: 'j', expr: 'mid + 1'}),
                    createBlock('for', {variable: 'k', start: 'low', end: 'high', step: '1', body: [
                        createBlock('if', {cond: 'j > high || (i <= mid && a[i] <= a[j])', then: [
                            createBlock('assign', {target: 'tmp[k]', expr: 'a[i]'}),
                            createBlock('assign', {target: 'i', expr: 'i + 1'}),
                        ], 'else': [
                            createBlock('assign', {target: 'tmp[k]', expr: 'a[j]'}),
                            createBlock('assign', {target: 'j', expr: 'j + 1'}),
                        ]}),
                    ]}),
                    createBlock('for', {variable: 'k', start: 'low', end: 'high', step: '1', body: [
                        createBlock('assign', {target: 'a[k]', expr: 'tmp[k]'}),
                    ]}),
                ], 'else': []}),
            ]});
            return prog;
        }
    },
    {
        id: 'counting_sort',
        category: 'arrays',
        title: 'Counting Sort',
        desc: 'Sort marks from 1 to 5 without comparing them: count how many times each mark appears, then write each ' +
            'mark that many times. The counters show how few comparisons it needs.',
        fallbackTitle: 'Counting Sort',
        fallbackDesc: 'Count how many times each mark appears, then write each mark that many times.',
        build: () => {
            const prog = createProgram('CountingSort');
            prog.functions[0].body = [
                createBlock('comment', {text: 'Counting sort: count[m] is how many times mark m appears'}),
                createBlock('declare', {name: 'n, i, m, k', varType: 'Integer'}),
                createBlock('assign', {target: 'n', expr: '12'}),
                createBlock('declare', {name: 'a', varType: 'Integer', size: 'n'}),
                createBlock('declare', {name: 'count', varType: 'Integer', size: '6'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'a[i]', expr: 'Random(5) + 1'}),
                ]}),
                createBlock('for', {variable: 'm', start: '0', end: '5', step: '1', body: [
                    createBlock('assign', {target: 'count[m]', expr: '0'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('assign', {target: 'count[a[i]]', expr: 'count[a[i]] + 1'}),
                ]}),
                createBlock('assign', {target: 'k', expr: '0'}),
                createBlock('for', {variable: 'm', start: '1', end: '5', step: '1', body: [
                    createBlock('for', {variable: 'i', start: '1', end: 'count[m]', step: '1', body: [
                        createBlock('assign', {target: 'a[k]', expr: 'm'}),
                        createBlock('assign', {target: 'k', expr: 'k + 1'}),
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
    },
    {
        id: 'factorial_rec',
        category: 'recursion',
        title: 'Factorial (recursive)',
        desc: 'n! = n * (n - 1)! with a function that calls itself; the call tree shows the calls going down and back.',
        fallbackTitle: 'Factorial (recursive)',
        fallbackDesc: 'n! = n * (n - 1)! with a function that calls itself; the call tree shows the calls going down and back.',
        build: () => {
            const prog = createProgram('FactorialRec');
            prog.functions[0].body = [
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('output', {expr: '"Enter n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('output', {expr: 'n & "! = " & Fact(n)', newline: true}),
            ];
            prog.functions.push({name: 'Fact', params: [{name: 'n', type: 'Integer'}], returnType: 'Integer', body: [
                createBlock('if', {cond: 'n <= 1', then: [
                    createBlock('return', {expr: '1'}),
                ], 'else': [
                    createBlock('return', {expr: 'n * Fact(n - 1)'}),
                ]}),
            ]});
            return prog;
        }
    },
    {
        id: 'fibonacci_rec',
        category: 'recursion',
        title: 'Fibonacci (recursive)',
        desc: 'Fib(n) = Fib(n - 1) + Fib(n - 2); the call tree marks the calls made again with the same n.',
        fallbackTitle: 'Fibonacci (recursive)',
        fallbackDesc: 'Fib(n) = Fib(n - 1) + Fib(n - 2); the call tree marks the calls made again with the same n.',
        build: () => {
            const prog = createProgram('FibonacciRec');
            prog.functions[0].body = [
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('output', {expr: '"Enter n:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('output', {expr: '"Fib(" & n & ") = " & Fib(n)', newline: true}),
            ];
            prog.functions.push({name: 'Fib', params: [{name: 'n', type: 'Integer'}], returnType: 'Integer', body: [
                createBlock('if', {cond: 'n < 2', then: [
                    createBlock('return', {expr: 'n'}),
                ], 'else': [
                    createBlock('return', {expr: 'Fib(n - 1) + Fib(n - 2)'}),
                ]}),
            ]});
            return prog;
        }
    },
    {
        id: 'hanoi',
        category: 'recursion',
        title: 'Towers of Hanoi',
        desc: 'Move n disks from A to C: first n - 1 disks to B, then the largest disk, then the n - 1 disks onto it.',
        fallbackTitle: 'Towers of Hanoi',
        fallbackDesc: 'Move n disks from A to C: first n - 1 disks to B, then the largest disk, then the n - 1 disks onto it.',
        build: () => {
            const prog = createProgram('Hanoi');
            prog.functions[0].body = [
                createBlock('declare', {name: 'n', varType: 'Integer'}),
                createBlock('output', {expr: '"Number of disks:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('call', {expr: 'Move(n, "A", "C", "B")'}),
            ];
            prog.functions.push({name: 'Move', params: [{name: 'n', type: 'Integer'}, {name: 'src', type: 'String'},
                {name: 'dst', type: 'String'}, {name: 'aux', type: 'String'}], returnType: null, body: [
                createBlock('if', {cond: 'n > 0', then: [
                    createBlock('call', {expr: 'Move(n - 1, src, aux, dst)'}),
                    createBlock('output', {expr: '"Disk " & n & ": " & src & " -> " & dst', newline: true}),
                    createBlock('call', {expr: 'Move(n - 1, aux, dst, src)'}),
                ], 'else': []}),
            ]});
            return prog;
        }
    },
    {
        id: 'students',
        category: 'records',
        title: 'Students (records)',
        desc: 'A record Student with a name and an average: read the students, sort them from the best and write them.',
        fallbackTitle: 'Students (records)',
        fallbackDesc: 'A record Student with a name and an average: read the students, sort them from the best and write them.',
        build: () => {
            const prog = createProgram('Students');
            prog.records = [{name: 'Student', fields: [{name: 'name', type: 'String'}, {name: 'avg', type: 'Real'}]}];
            prog.functions[0].body = [
                createBlock('declare', {name: 'n, i, j', varType: 'Integer'}),
                createBlock('output', {expr: '"Number of students:"', newline: true}),
                createBlock('input', {target: 'n'}),
                createBlock('declare', {name: 's', varType: 'Student', size: 'n'}),
                createBlock('declare', {name: 't', varType: 'Student'}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: '"Name and average:"', newline: true}),
                    createBlock('input', {target: 's[i].name'}),
                    createBlock('input', {target: 's[i].avg'}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 2', step: '1', body: [
                    createBlock('for', {variable: 'j', start: '0', end: 'n - 2 - i', step: '1', body: [
                        createBlock('if', {cond: 'Better(s[j + 1], s[j])', then: [
                            createBlock('assign', {target: 't', expr: 's[j]'}),
                            createBlock('assign', {target: 's[j]', expr: 's[j + 1]'}),
                            createBlock('assign', {target: 's[j + 1]', expr: 't'}),
                        ], 'else': []}),
                    ]}),
                ]}),
                createBlock('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
                    createBlock('output', {expr: '(i + 1) & ". " & s[i].name & " " & s[i].avg', newline: true}),
                ]}),
                createBlock('output', {expr: '"Best: " & s[0]', newline: true}),
            ];
            prog.functions.push({name: 'Better', params: [{name: 'a', type: 'Student'}, {name: 'b', type: 'Student'}],
                returnType: 'Boolean', body: [
                    createBlock('return', {expr: 'a.avg > b.avg'}),
                ]});
            return prog;
        }
    }
];
