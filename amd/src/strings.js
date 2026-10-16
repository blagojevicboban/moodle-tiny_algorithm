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
        import: 'Import .fprg', export: 'Export .fprg', copy: 'Copy', download: 'Download', speed: 'Speed',
        console: 'Console', code: 'Code', function: 'Function', name: 'Name', params: 'Parameters (a: Integer, b: Real)',
        returns: 'Return type', hint: 'Click a + to insert a block, click a block to edit it.',
        up: 'Up', down: 'Down', delete: 'Delete', imported: 'Flowgorithm file imported.', stopped: 'Stopped.',
        finished: 'Program finished.', error: 'Error',
        'f.name': 'Name', 'f.varType': 'Type', 'f.size': 'Array size (empty = single value)', 'f.target': 'Variable',
        'f.expr': 'Expression', 'f.newline': 'New line', 'f.cond': 'Condition', 'f.variable': 'Variable', 'f.start': 'From',
        'f.end': 'To', 'f.step': 'Step', 'f.text': 'Text',
        'b.declare': 'Declare', 'b.assign': 'Assign', 'b.input': 'Input', 'b.output': 'Output', 'b.if': 'If',
        'b.for': 'For', 'b.while': 'While', 'b.dowhile': 'Do … While', 'b.call': 'Call', 'b.return': 'Return',
        'b.comment': 'Comment',
    },
    sr: {
        reset: 'Resetuj', showcode: 'Prikaži kôd', hidecode: 'Sakrij kôd', variables: 'Promjenljive',
        showwatch: 'Prikaži promjenljive',
        hidewatch: 'Sakrij promjenljive', watchempty: 'Pokrenite algoritam da vidite promjenljive.', zoomin: 'Uvećaj',
        zoomout: 'Umanji', zoomreset: 'Vrati zoom na 100%', fit: 'Prilagodi', undo: 'Poništi', redo: 'Ponovi', run: 'Pokreni',
        step: 'Korak', stop: 'Zaustavi', addfn: '+ Funkcija', delfn: '− Funkcija',
        import: 'Uvezi .fprg', export: 'Izvezi .fprg', copy: 'Kopiraj', download: 'Preuzmi', speed: 'Brzina',
        console: 'Konzola', code: 'Kôd', function: 'Funkcija', name: 'Naziv', params: 'Parametri (a: Integer, b: Real)',
        returns: 'Tip rezultata', hint: 'Kliknite + da umetnete blok, kliknite blok da ga izmijenite.',
        up: 'Gore', down: 'Dolje', delete: 'Obriši', imported: 'Flowgorithm fajl je uvezen.', stopped: 'Zaustavljeno.',
        finished: 'Program je završen.', error: 'Greška',
        'f.name': 'Naziv', 'f.varType': 'Tip', 'f.size': 'Veličina niza (prazno = jedna vrijednost)', 'f.target': 'Promjenljiva',
        'f.expr': 'Izraz', 'f.newline': 'Novi red', 'f.cond': 'Uslov', 'f.variable': 'Promjenljiva', 'f.start': 'Od',
        'f.end': 'Do', 'f.step': 'Korak', 'f.text': 'Tekst',
        'b.declare': 'Deklaracija', 'b.assign': 'Dodjela', 'b.input': 'Unos', 'b.output': 'Ispis', 'b.if': 'Ako',
        'b.for': 'Za', 'b.while': 'Dok', 'b.dowhile': 'Radi … dok', 'b.call': 'Poziv', 'b.return': 'Povratak',
        'b.comment': 'Komentar',
    },
};

export const t = (key, lang) => {
    const code = String(lang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').slice(0, 2);
    const dict = STR[code] || STR.en;
    return dict[key] ?? STR.en[key] ?? key;
};
