<?php
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
 * Strings for component 'tiny_algorithm', language 'sr_cr'.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['algorithm:viewplugin'] = 'Коришћење едитора алгоритама';
$string['allowsolution'] = 'Ученици могу да прикажу решење';
$string['button'] = 'Алгоритам';
$string['cancel'] = 'Откажи';
$string['copyfromsolution'] = 'Копирај из решења';
$string['dialogtitle'] = 'Едитор алгоритама';
$string['discard'] = 'Одбаци измене';
$string['discardquestion'] = 'Алгоритам има измене које још нису уметнуте. Затворити едитор и изгубити их?';
$string['discardtitle'] = 'Измене нису уметнуте';
$string['editable'] = 'Ученици могу да мењају и тестирају алгоритам';
$string['emptytemplate'] = 'Празан';
$string['imagealt'] = 'Алгоритам {$a->name}: функција {$a->functions}, блокова {$a->blocks}';
$string['insert'] = 'Уметни';
$string['interactive'] = 'Интерактивно (читаоци могу покренути и извршавати корак по корак)';
$string['menuitem'] = 'Алгоритам...';
$string['onlyeditable'] = 'Користи се само када је укључено "Ученици могу да мењају и тестирају алгоритам".';
$string['pluginname'] = 'Алгоритам (дијаграм тока)';
$string['privacy:metadata'] = 'Додатак Алгоритам не чува личне податке на серверу. Прегледач у свом локалном складишту чува неколико подешавања приказа (да ли су код и променљиве приказани) и, код дијаграма које ученици могу да мењају, ученикову копију алгоритма; ништа од тога се не шаље Moodle-у.';
$string['separatetemplate'] = 'Ученици почињу од посебног шаблона, а не од решења';
$string['showcode'] = 'Прикажи генерисани код поред дијаграма';
$string['showwatch'] = 'Прикажи праћење променљивих поред дијаграма';
$string['tabsolution'] = 'Решење';
$string['tabtemplate'] = 'Почетни шаблон';
$string['tabtests'] = 'Тестови';
$string['ui_actual'] = 'Ваш излаз';
$string['ui_addfn'] = '+ Функција';
$string['ui_addtest'] = '+ Тест';
$string['ui_b_assign'] = 'Додела';
$string['ui_b_call'] = 'Позив';
$string['ui_b_comment'] = 'Коментар';
$string['ui_b_declare'] = 'Декларација';
$string['ui_b_dowhile'] = 'Ради … док';
$string['ui_b_for'] = 'За';
$string['ui_b_if'] = 'Ако';
$string['ui_b_input'] = 'Унос';
$string['ui_b_output'] = 'Испис';
$string['ui_b_return'] = 'Повратак';
$string['ui_b_while'] = 'Док';
$string['ui_code'] = 'Код';
$string['ui_console'] = 'Конзола';
$string['ui_copy'] = 'Копирај';
$string['ui_delete'] = 'Обриши';
$string['ui_delfn'] = '− Функција';
$string['ui_difffirst'] = 'Прва разлика у реду {$a->n}.';
$string['ui_done'] = 'Заврши измене';
$string['ui_down'] = 'Доле';
$string['ui_download'] = 'Преузми';
$string['ui_duplicate'] = 'Дуплирај';
$string['ui_e_argcount'] = 'Функција „{$a->name}“ очекује број аргумената: {$a->count}';
$string['ui_e_arraysize'] = 'Величина низа {$a->size} је већа од {$a->max}';
$string['ui_e_assignboolean'] = 'Вредност „{$a->value}“ не може да се додели Boolean променљивој {$a->name}';
$string['ui_e_assigninteger'] = 'Вредност „{$a->value}“ не може да се додели Integer променљивој {$a->name}';
$string['ui_e_assignreal'] = 'Вредност „{$a->value}“ не може да се додели Real променљивој {$a->name}';
$string['ui_e_badchar'] = 'Неочекиван знак „{$a->c}“';
$string['ui_e_badexpression'] = 'Неисправан израз';
$string['ui_e_badoperator'] = 'Непознат оператор {$a->op}';
$string['ui_e_badtarget'] = 'Вредност може да се додели само променљивој или елементу низа';
$string['ui_e_charindex'] = 'Char: индекс {$a->index} је ван текста „{$a->text}“';
$string['ui_e_divzero'] = 'Дељење нулом';
$string['ui_e_expected'] = 'Очекује се „{$a->op}“';
$string['ui_e_forstepzero'] = 'Корак For петље не може бити 0';
$string['ui_e_indexrange'] = 'Индекс {$a->index} је ван граница низа „{$a->name}“';
$string['ui_e_invalidinput'] = '„{$a->text}“ није исправна вредност типа {$a->type}';
$string['ui_e_notarray'] = '„{$a->name}“ није низ';
$string['ui_e_notdeclared'] = 'Променљива „{$a->name}“ није декларисана';
$string['ui_e_steplimit'] = 'Прекорачен је највећи број корака (можда је петља бесконачна)';
$string['ui_e_tocodeempty'] = 'ToCode: празан текст';
$string['ui_e_unexpected'] = 'Неочекивано „{$a->token}“';
$string['ui_e_unexpectedend'] = 'Израз се неочекивано завршава';
$string['ui_e_unknownfunction'] = 'Непозната функција „{$a->name}“';
$string['ui_e_unterminated'] = 'Текст није затворен наводником';
$string['ui_edit'] = 'Измени';
$string['ui_error'] = 'Грешка';
$string['ui_exitfullscreen'] = 'Изађи из целог екрана';
$string['ui_expected'] = 'Очекивани излаз';
$string['ui_export'] = 'Извези .fprg';
$string['ui_f_cond'] = 'Услов';
$string['ui_f_end'] = 'До';
$string['ui_f_expr'] = 'Израз';
$string['ui_f_name'] = 'Назив';
$string['ui_f_newline'] = 'Нови ред';
$string['ui_f_size'] = 'Величина низа (празно = једна вредност)';
$string['ui_f_start'] = 'Од';
$string['ui_f_step'] = 'Корак';
$string['ui_f_target'] = 'Променљива';
$string['ui_f_text'] = 'Текст';
$string['ui_f_varType'] = 'Тип';
$string['ui_f_variable'] = 'Променљива';
$string['ui_failmark'] = 'Није прошао';
$string['ui_finished'] = 'Програм је завршен.';
$string['ui_fit'] = 'Прилагоди';
$string['ui_fullscreen'] = 'Цео екран';
$string['ui_function'] = 'Функција';
$string['ui_hiddentest'] = 'Скривен од ученика';
$string['ui_hidecode'] = 'Сакриј код';
$string['ui_hidesolution'] = 'Сакриј решење';
$string['ui_hidewatch'] = 'Сакриј променљиве';
$string['ui_hint'] = 'Кликните + да уметнете блок, кликните блок да га измените.';
$string['ui_import'] = 'Увези .fprg';
$string['ui_imported'] = 'Flowgorithm фајл је увезен.';
$string['ui_inputs'] = 'Улаз';
$string['ui_inputshint'] = 'Једна вредност по реду, "" за празну вредност';
$string['ui_insertblock'] = 'Уметни блок';
$string['ui_keyhint'] = 'Тастатура: стрелице прелазе између блокова и знакова +, Enter мења или умеће блок, Delete брише изабрани блок, Alt + стрелица га помера, Ctrl + C копира, Ctrl + X исеца, Ctrl + V лепи, Ctrl + D дуплира, Escape отказује. Мишем или прстом превуците блок на знак + да га преместите.';
$string['ui_modified'] = 'Ваша верзија';
$string['ui_name'] = 'Назив';
$string['ui_noinput'] = 'Алгоритам тражи више улаза него што тест садржи.';
$string['ui_noinputs'] = '(без улаза)';
$string['ui_notests'] = 'Још нема тестова. Унесите улазе; очекивани излази се рачунају из решења.';
$string['ui_params'] = 'Параметри (a: Integer, b: Real[])';
$string['ui_passed'] = 'Прошло тестова: {$a->passed} од {$a->total}';
$string['ui_passmark'] = 'Прошао';
$string['ui_paste'] = 'Налепи';
$string['ui_redo'] = 'Понови';
$string['ui_refreshexpected'] = 'Израчунај очекиване излазе';
$string['ui_reset'] = 'Ресетуј';
$string['ui_resetconfirm'] = 'Одбацити ваше измене и вратити оригинални алгоритам?';
$string['ui_resetwork'] = 'Врати оригинал';
$string['ui_returns'] = 'Тип резултата';
$string['ui_run'] = 'Покрени';
$string['ui_runtests'] = 'Тестирај';
$string['ui_showcode'] = 'Прикажи код';
$string['ui_showsolution'] = 'Прикажи решење';
$string['ui_showwatch'] = 'Прикажи променљиве';
$string['ui_solution'] = 'Решење';
$string['ui_solutionconfirm'] = 'Приказати решење наставника?';
$string['ui_solutionfails'] = 'Решење не ради на тесту {$a->n}: {$a->error}';
$string['ui_speed'] = 'Брзина';
$string['ui_stale'] = 'Алгоритам је измењен после овог покретања. Тестирајте поново.';
$string['ui_step'] = 'Корак';
$string['ui_stop'] = 'Заустави';
$string['ui_stopped'] = 'Заустављено.';
$string['ui_testcase'] = 'Тест {$a->n}';
$string['ui_tests'] = 'Тестови';
$string['ui_undo'] = 'Поништи';
$string['ui_up'] = 'Горе';
$string['ui_variables'] = 'Променљиве';
$string['ui_watchempty'] = 'Покрените алгоритам да видите променљиве.';
$string['ui_zoomin'] = 'Увећај';
$string['ui_zoomout'] = 'Умањи';
$string['ui_zoomreset'] = 'Врати зум на 100%';
