/**
 * UI strings of the editor widget (kept inside the widget so it works without Moodle).
 *
 * @module tiny_algorithm/strings
 */
export const STR = {
    en: {
        reset: 'Reset', showcode: 'Show code', hidecode: 'Hide code', variables: 'Variables', showwatch: 'Show variables',
        hidewatch: 'Hide variables', watchempty: 'Run or step the algorithm to see the variables.', zoomin: 'Zoom in',
        zoomout: 'Zoom out', zoomreset: 'Reset zoom (100%)', fit: 'Fit', undo: 'Undo', redo: 'Redo', run: 'Run', step: 'Step',
        stop: 'Stop', addfn: '+ Function', delfn: '− Function',
        'import': 'Import .fprg', 'export': 'Export .fprg', copy: 'Copy', download: 'Download', speed: 'Speed',
        console: 'Console', code: 'Code', 'function': 'Function', name: 'Name', params: 'Parameters (a: Integer, b: Real)',
        returns: 'Return type', hint: 'Click a + to insert a block, click a block to edit it.',
        up: 'Up', down: 'Down', 'delete': 'Delete', imported: 'Flowgorithm file imported.', stopped: 'Stopped.',
        finished: 'Program finished.', error: 'Error',
        'f.name': 'Name', 'f.varType': 'Type', 'f.size': 'Array size (empty = single value)', 'f.target': 'Variable',
        'f.expr': 'Expression', 'f.newline': 'New line', 'f.cond': 'Condition', 'f.variable': 'Variable', 'f.start': 'From',
        'f.end': 'To', 'f.step': 'Step', 'f.text': 'Text',
        'b.declare': 'Declare', 'b.assign': 'Assign', 'b.input': 'Input', 'b.output': 'Output', 'b.if': 'If',
        'b.for': 'For', 'b.while': 'While', 'b.dowhile': 'Do … While', 'b.call': 'Call', 'b.return': 'Return',
        'b.comment': 'Comment',
        edit: 'Edit', done: 'Done editing', resetwork: 'Restore original',
        resetconfirm: 'Discard your changes and restore the original algorithm?', modified: 'Your version',
        fullscreen: 'Full screen', exitfullscreen: 'Exit full screen', showsolution: 'Show solution',
        hidesolution: 'Hide solution', solutionconfirm: "Show the teacher's solution?", solution: 'Solution', tests: 'Tests',
        runtests: 'Test', testcase: 'Test {n}', passed: '{passed} of {total} tests passed', inputs: 'Input',
        inputshint: 'One value per line', expected: 'Expected output', actual: 'Your output', noinputs: '(no input)',
        addtest: '+ Test', refreshexpected: 'Compute expected outputs',
        notests: 'No tests yet. Enter the inputs; the expected outputs are computed from the solution.',
        noinput: 'The algorithm asks for more input than the test provides.', difffirst: 'First difference in line {n}.',
        passmark: 'Passed', failmark: 'Failed', solutionfails: 'The solution fails on test {n}: {error}',
    },
    sr: {
        reset: 'Resetuj', showcode: 'Prikaži kôd', hidecode: 'Sakrij kôd', variables: 'Promjenljive',
        showwatch: 'Prikaži promjenljive',
        hidewatch: 'Sakrij promjenljive', watchempty: 'Pokrenite algoritam da vidite promjenljive.', zoomin: 'Uvećaj',
        zoomout: 'Umanji', zoomreset: 'Vrati zoom na 100%', fit: 'Prilagodi', undo: 'Poništi', redo: 'Ponovi', run: 'Pokreni',
        step: 'Korak', stop: 'Zaustavi', addfn: '+ Funkcija', delfn: '− Funkcija',
        'import': 'Uvezi .fprg', 'export': 'Izvezi .fprg', copy: 'Kopiraj', download: 'Preuzmi', speed: 'Brzina',
        console: 'Konzola', code: 'Kôd', 'function': 'Funkcija', name: 'Naziv', params: 'Parametri (a: Integer, b: Real)',
        returns: 'Tip rezultata', hint: 'Kliknite + da umetnete blok, kliknite blok da ga izmijenite.',
        up: 'Gore', down: 'Dolje', 'delete': 'Obriši', imported: 'Flowgorithm fajl je uvezen.', stopped: 'Zaustavljeno.',
        finished: 'Program je završen.', error: 'Greška',
        'f.name': 'Naziv', 'f.varType': 'Tip', 'f.size': 'Veličina niza (prazno = jedna vrijednost)', 'f.target': 'Promjenljiva',
        'f.expr': 'Izraz', 'f.newline': 'Novi red', 'f.cond': 'Uslov', 'f.variable': 'Promjenljiva', 'f.start': 'Od',
        'f.end': 'Do', 'f.step': 'Korak', 'f.text': 'Tekst',
        'b.declare': 'Deklaracija', 'b.assign': 'Dodjela', 'b.input': 'Unos', 'b.output': 'Ispis', 'b.if': 'Ako',
        'b.for': 'Za', 'b.while': 'Dok', 'b.dowhile': 'Radi … dok', 'b.call': 'Poziv', 'b.return': 'Povratak',
        'b.comment': 'Komentar',
        edit: 'Izmijeni', done: 'Završi izmjene', resetwork: 'Vrati original',
        resetconfirm: 'Odbaciti vaše izmjene i vratiti originalni algoritam?', modified: 'Vaša verzija',
        fullscreen: 'Cijeli ekran', exitfullscreen: 'Zatvori cijeli ekran', showsolution: 'Prikaži rješenje',
        hidesolution: 'Sakrij rješenje', solutionconfirm: 'Prikazati rješenje nastavnika?', solution: 'Rješenje', tests: 'Testovi',
        runtests: 'Testiraj', testcase: 'Test {n}', passed: 'Prošlo testova: {passed} od {total}', inputs: 'Ulaz',
        inputshint: 'Jedna vrijednost po redu', expected: 'Očekivani izlaz', actual: 'Vaš izlaz', noinputs: '(bez ulaza)',
        addtest: '+ Test', refreshexpected: 'Izračunaj očekivane izlaze',
        notests: 'Još nema testova. Unesite ulaze; očekivani izlazi se računaju iz rješenja.',
        noinput: 'Algoritam traži više ulaza nego što test sadrži.', difffirst: 'Prva razlika u redu {n}.',
        passmark: 'Prošao', failmark: 'Nije prošao', solutionfails: 'Rješenje ne radi na testu {n}: {error}',
    },
    // eslint-disable-next-line camelcase
    sr_cr: {
        reset: 'Ресетуј', showcode: 'Прикажи код', hidecode: 'Сакриј код', variables: 'Промјенљиве',
        showwatch: 'Прикажи промјенљиве', hidewatch: 'Сакриј промјенљиве',
        watchempty: 'Покрените алгоритам да видите промјенљиве.', zoomin: 'Увећај', zoomout: 'Умањи',
        zoomreset: 'Врати зум на 100%', fit: 'Прилагоди', undo: 'Поништи', redo: 'Понови', run: 'Покрени', step: 'Корак',
        stop: 'Заустави', addfn: '+ Функција', delfn: '− Функција', 'import': 'Увези .fprg', 'export': 'Извези .fprg',
        copy: 'Копирај', download: 'Преузми', speed: 'Брзина', console: 'Конзола', code: 'Код', 'function': 'Функција',
        name: 'Назив', params: 'Параметри (a: Integer, b: Real)', returns: 'Тип резултата',
        hint: 'Кликните + да уметнете блок, кликните блок да га измијените.', up: 'Горе', down: 'Доље', 'delete': 'Обриши',
        imported: 'Flowgorithm фајл је увезен.', stopped: 'Заустављено.', finished: 'Програм је завршен.', error: 'Грешка',
        'f.name': 'Назив', 'f.varType': 'Тип', 'f.size': 'Величина низа (празно = једна вриједност)', 'f.target': 'Промјенљива',
        'f.expr': 'Израз', 'f.newline': 'Нови ред', 'f.cond': 'Услов', 'f.variable': 'Промјенљива', 'f.start': 'Од',
        'f.end': 'До', 'f.step': 'Корак', 'f.text': 'Текст', 'b.declare': 'Декларација', 'b.assign': 'Додјела',
        'b.input': 'Унос', 'b.output': 'Испис', 'b.if': 'Ако', 'b.for': 'За', 'b.while': 'Док', 'b.dowhile': 'Ради … док',
        'b.call': 'Позив', 'b.return': 'Повратак', 'b.comment': 'Коментар',
        edit: 'Измијени', done: 'Заврши измјене', resetwork: 'Врати оригинал',
        resetconfirm: 'Одбацити ваше измјене и вратити оригинални алгоритам?', modified: 'Ваша верзија',
        fullscreen: 'Цијели екран', exitfullscreen: 'Затвори цијели екран', showsolution: 'Прикажи рјешење',
        hidesolution: 'Сакриј рјешење', solutionconfirm: 'Приказати рјешење наставника?', solution: 'Рјешење', tests: 'Тестови',
        runtests: 'Тестирај', testcase: 'Тест {n}', passed: 'Прошло тестова: {passed} од {total}', inputs: 'Улаз',
        inputshint: 'Једна вриједност по реду', expected: 'Очекивани излаз', actual: 'Ваш излаз', noinputs: '(без улаза)',
        addtest: '+ Тест', refreshexpected: 'Израчунај очекиване излазе',
        notests: 'Још нема тестова. Унесите улазе; очекивани излази се рачунају из рјешења.',
        noinput: 'Алгоритам тражи више улаза него што тест садржи.', difffirst: 'Прва разлика у реду {n}.',
        passmark: 'Прошао', failmark: 'Није прошао', solutionfails: 'Рјешење не ради на тесту {n}: {error}',
    },
};

/**
 * UI language code: an explicit Moodle language such as sr_cr wins (html lang is just "sr" for both Serbian scripts),
 * then the language Moodle reports to JavaScript, then the document language.
 *
 * @param {string} [lang] language requested by the caller
 * @returns {string} key of STR
 */
const resolve = (lang) => {
    const moodleLang = (typeof window !== 'undefined' && window.M && window.M.cfg && window.M.cfg.language) || '';
    const docLang = (typeof document !== 'undefined' && document.documentElement.lang) || '';
    const raw = String(lang && lang.includes('_') ? lang : (moodleLang || lang || docLang || 'en')).toLowerCase();
    if (raw === 'sr_cr') {
        return 'sr_cr';
    }
    return raw.slice(0, 2);
};

export const t = (key, lang) => {
    const dict = STR[resolve(lang)] || STR.en;
    return dict[key] ?? STR.en[key] ?? key;
};
