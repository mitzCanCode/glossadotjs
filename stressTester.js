const fs = require('fs');
const path = require('path');
const { CodeManager, TranslationError } = require('./Translator/CodeManager');

/**
 * Ordered list of translation steps. Each entry knows its display name and
 * how to apply it to a CodeManager + current code string.
 *
 * The validation steps (validate*) don't transform the code, they just throw
 * if the input is malformed — so they return the input unchanged.
 */
const STEPS = [
    { name: 'extractStrings',   run: (m, code) => m.extractStrings(code) },
    { name: 'lowerCode',        run: (m, code) => m.lowerCode(code) },
    { name: 'sanitizeGreek',    run: (m, code) => m.sanitizeGreek(code) },
    { name: 'validateIfs',      run: (m, code) => { m.conditionManager.validateIfStatements(code); return code; } },
    { name: 'translateIfs',     run: (m, code) => m.conditionManager.manageIfStatements(code) },
    { name: 'validateLoops',    run: (m, code) => { m.loopManager.validateLoops(code); return code; } },
    { name: 'translateLoops',   run: (m, code) => m.loopManager.manageLoops(code) },
    { name: 'restoreStrings',   run: (m, code) => m.restoreStrings(code) },
];

function loadTests(dir) {
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.js'))
        .sort()
        .map((f) => {
            const mod = require(path.join(dir, f));
            return { file: f, ...mod };
        });
}

function runPipeline(test) {
    const manager = new CodeManager();
    let code = test.code;

    for (const step of STEPS) {
        try {
            code = step.run(manager, code);
        } catch (error) {
            return { ok: false, failedAt: step.name, error, output: null };
        }
    }

    return { ok: true, failedAt: null, error: null, output: code };
}

function describeOutcome(passed, expectsFailure) {
    if (passed && !expectsFailure) return 'OK';
    if (!passed && expectsFailure) return 'OK (expected fail)';
    if (!passed && !expectsFailure) return 'UNEXPECTED FAIL';
    return 'UNEXPECTED PASS';
}

function main() {
    const testsDir = path.join(__dirname, 'tests');
    const tests = loadTests(testsDir);

    const summary = [];
    const failures = [];

    for (const test of tests) {
        const result = runPipeline(test);
        const outcome = describeOutcome(result.ok, !!test.expectsFailure);

        summary.push({
            Test: test.name,
            Result: result.ok ? 'PASS' : 'FAIL',
            'Failed Step': result.failedAt || '—',
            Expected: test.expectsFailure ? 'FAIL' : 'PASS',
            Outcome: outcome,
        });

        if (result.error) {
            failures.push({
                name: test.name,
                file: test.file,
                step: result.failedAt,
                error: result.error,
                expected: !!test.expectsFailure,
            });
        }
    }

    console.log('\n========== Translation Pipeline Results ==========\n');
    console.table(summary);

    if (failures.length === 0) {
        console.log('\nNo errors recorded.');
        return;
    }

    console.log('\n========== Errors ==========\n');
    for (const f of failures) {
        const tag = f.expected ? '(expected failure)' : '(UNEXPECTED FAILURE)';
        console.log(`▸ ${f.name} ${tag} — failed at "${f.step}"`);

        if (f.error instanceof TranslationError) {
            console.log(`    [dev]    ${f.error.devMessage}`);
            console.log(`    [user]   ${f.error.formatForUser()}`);
            if (f.error.line != null) {
                console.log(`    [line]   ${f.error.line}`);
            }
        } else {
            console.log(`    [error]  ${f.error.message}`);
        }
        console.log('');
    }
}

main();
