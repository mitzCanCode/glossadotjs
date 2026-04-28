const TranslationError = require('./TranslationError');
const ConditionManager = require('./ConditionManager');
const LoopManager = require('./LoopManager');

class CodeManager {
    constructor() {
        this.conditionManager = new ConditionManager();
        this.loopManager = new LoopManager();
        this.stringStore = {};
        this.declarationsString = "";
        this.programName = ""
    }

    codeCleanUpInit(code) {
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            throw new TranslationError({
                devMessage: 'Program contains no code',
                userMessage: 'Το πρόγραμμα είναι κενό.',
            });
        }

        // normalize once
        const normalized = lines.map(l => this.sanitizeGreek(this.lowerCode(l)));

        // ===== PROGRAM START =====
        const first = normalized[0];

        if (!first.startsWith('προγραμμα ')) {
            throw new TranslationError({
                devMessage: 'Missing program start keyword',
                userMessage: 'Λείπει η λέξη ΠΡΟΓΡΑΜΜΑ στην αρχή.',
            });
        }

        const parts = first.split(' ');
        if (parts.length !== 2) {
            throw new TranslationError({
                devMessage: 'Invalid program start syntax',
                userMessage: 'Λάθος μορφή επικεφαλίδας προγράμματος.',
            });
        }

        this.programName = lines[0].split(' ')[1].trim();

        // ===== PROGRAM END =====
        const last = normalized[normalized.length - 1];

        if (last !== 'τελοσ_προγραμματοσ') {
            throw new TranslationError({
                devMessage: 'Missing program close keyword',
                userMessage: 'Λείπει το ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ.',
            });
        }

        // ===== FIND SECTIONS =====
        const startIndex = normalized.findIndex(l => l === 'αρχη');
        if (startIndex === -1) {
            throw new TranslationError({
                devMessage: 'Missing ΑΡΧΗ',
                userMessage: 'Λείπει η λέξη ΑΡΧΗ.',
            });
        }

        const constantsIndex = normalized.findIndex(l => l.startsWith('σταθερεσ'));
        const variablesIndex = normalized.findIndex(l => l.startsWith('μεταβλητεσ'));

        // ===== EXTRACT SECTIONS =====
        let constants = [];
        let variables = [];

        const TYPE_MAP = {
            'ακεραιοσ': 'number',
            'ακεραιεσ': 'number',
            'πραγματικοσ': 'number',
            'πραγματικεσ': 'number',
            'χαρακτηρεσ': 'string',
            'λογικοσ': 'boolean',
            'λογικεσ': 'boolean',
        };

        // ---- CONSTANTS ----
        if (constantsIndex !== -1) {
            let end = startIndex;
            if (variablesIndex !== -1 && variablesIndex > constantsIndex) {
                end = variablesIndex;
            }

            constants = normalized.slice(constantsIndex + 1, end);

            for (let line of constants) {
                if (!line.includes('=')) {
                    throw new TranslationError({
                        devMessage: `Invalid constant declaration: ${line}`,
                        userMessage: 'Λάθος δήλωση σταθεράς.',
                    });
                }
            }
        }

        // ---- VARIABLES ----
        if (variablesIndex !== -1) {
            let end = startIndex;
            const variableLines = normalized.slice(variablesIndex + 1, end);

            // Also check the variables line itself for variables after the keyword
            const varLine = normalized[variablesIndex];
            const varPart = varLine.replace('μεταβλητεσ', '').trim();
            if (varPart) {
                variableLines.unshift(varPart);
            }

            const parsedVariables = [];
            const groupTypePattern = /^(ακεραιεσ|ακεραιοσ|πραγματικεσ|πραγματικοσ|χαρακτηρεσ|λογικεσ|λογικοσ)\s*:\s*(.+)$/;

            for (let line of variableLines) {
                if (!line) continue;

                const groupMatch = line.match(groupTypePattern);
                if (groupMatch) {
                    const typeKey = groupMatch[1];
                    const tsType = TYPE_MAP[typeKey];
                    const names = groupMatch[2].split(',').map(v => v.trim()).filter(v => v.length > 0);

                    if (names.length === 0) {
                        throw new TranslationError({
                            devMessage: `Invalid variable group declaration: ${line}`,
                            userMessage: 'Λάθος δήλωση μεταβλητών.',
                        });
                    }

                    for (const name of names) {
                        if (!name || name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }
                        parsedVariables.push({ name, type: tsType });
                    }
                    continue;
                }

                const entries = line.split(',').map(v => v.trim()).filter(v => v.length > 0);
                for (const entry of entries) {
                    if (entry.includes(':')) {
                        const parts = entry.split(':').map(v => v.trim());
                        if (parts.length !== 2 || !parts[0] || !parts[1]) {
                            throw new TranslationError({
                                devMessage: `Invalid variable declaration: ${entry}`,
                                userMessage: 'Λάθος δήλωση μεταβλητής.',
                            });
                        }

                        const name = parts[0];
                        const typeKey = parts[1];
                        const tsType = TYPE_MAP[typeKey];

                        if (!tsType) {
                            throw new TranslationError({
                                devMessage: `Invalid variable type: ${typeKey}`,
                                userMessage: `Μη έγκυρος τύπος δεδομένων: ${parts[1]}`,
                            });
                        }

                        if (name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }

                        parsedVariables.push({ name, type: tsType });
                    } else {
                        const name = entry;
                        if (name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }
                        parsedVariables.push({ name, type: null });
                    }
                }
            }

            variables = parsedVariables;
        }

        // ===== BUILD DECLARATIONS STRING =====
        let decl = [];

        // constants → const
        for (let c of constants) {
            decl.push(`const ${c}`);
        }

        // variables → let
        if (variables.length > 0) {
            const typedList = variables.map(v => {
                return v.type ? `${v.name}: ${v.type}` : v.name;
            });
            decl.push(`let ${typedList.join(', ')}`);
        }

        this.declarationsString = decl.join('\n');

        // ===== EXTRACT MAIN CODE =====
        const body = lines.slice(startIndex + 1, lines.length - 1);

        return body.join('\n');
    }

    addDeclarationString(code) {
        return this.declarationsString + "\n" + code;
    }

    extractStrings(code) {
        let result = "";
        let i = 0;
        let inString = false;
        let current = "";
        
        while (i < code.length) {
            const char = code[i];

            if (!inString) {
                if (char === '"') {
                    inString = true;
                    current = "";
                } else {
                    result += char;
                }
            } else {
                if (char === '\\') {
                    // handle escaped characters like \"
                    current += char + code[i + 1];
                    i++;
                } else if (char === '"') {
                    // string ends
                    const uuid = crypto.randomUUID();
                    const placeholder = `{${uuid}}`;
                    
                    this.stringStore[uuid] = current;
                    result += placeholder;

                    inString = false;
                } else {
                    current += char;
                }
            }
            i++;
        }

        if (inString) {
            throw new TranslationError({
                devMessage: 'Unclosed string detected',
                userMessage:
                    'Υπάρχει συμβολοσειρά που άνοιξε με " αλλά δεν έκλεισε ποτέ.',
            });
        }

        return result;
    }

    manageVariableDeclarations(code) {
        if (!this.declarationsString) {
            return code;
        }
        return this.addDeclarationString(code);
    }

    translateCode(originalCode) {
        // Reset per-translation state so the manager can be reused safely.
        this.stringStore = {};
        this.declarationsString = "";
        this.programName = "";

        let code = this.codeCleanUpInit(originalCode);
        code = this.extractStrings(code);
        code = this.lowerCode(code);
        code = this.sanitizeGreek(code);
        code = this.manageVariableDeclarations(code);
        code = this.manageOperands(code);

        this.conditionManager.validateIfStatements(code);
        code = this.conditionManager.manageIfStatements(code);

        this.loopManager.validateLoops(code);
        code = this.loopManager.manageLoops(code);

        code = this.restoreStrings(code);
        code = this.functionTranslator(code);
        code = this.managePrint(code);
        code = this.manageInputStatements(code);

        return code;
    }

    restoreStrings(code) {
        return code.replace(/\{([0-9a-fA-F-]+)\}/g, (_, uuid) => {
            if (!(uuid in this.stringStore)) {
                throw new TranslationError({
                    devMessage: `Missing UUID: ${uuid}`,
                    userMessage:
                        'Εσωτερικό σφάλμα: χάθηκε αναφορά σε συμβολοσειρά κατά τη μετάφραση.',
                });
            }
            return `"${this.stringStore[uuid]}"`;
        });
    }

    lowerCode(code) {
        return code.toLowerCase();
    }

    sanitizeGreek(text) {
        return text
            // Normalize to decomposed form (separates accents from letters)
            .normalize("NFD")
            
            // Remove all diacritic marks
            .replace(/[\u0300-\u036f]/g, "")
            
            // Normalize final sigma to standard sigma (optional but common)
            .replace(/ς/g, "σ")
            
            // Normalize spacing
            .replace(/[^\S\n]+/g, " ")
            .trim();
    }


    manageOperands(code) {
        let result = code;

        // comparison "=" → "==" (do this first before assignment replacement)
        result = result.replace(/(?<![<>=!])=(?!=)/g, '==');

        // assignment
        result = result.replace(/<-/g, '=');

        // not equal
        result = result.replace(/<>/g, '!=');

        // logical operators
        result = result.replace(/\bκαι\b/g, '&&');
        result = result.replace(/\bή\b/g, '||');
        result = result.replace(/\bοχι\b/g, '!');

        // mod
        result = result.replace(/\bmod\b/g, '%');

        return result;
    }


    functionTranslator(code) {
        const replacements = [
            { regex: /α_μ\s*\(([^)]+)\)/g, repl: 'Math.floor($1)' },
            { regex: /α_τ\s*\(([^)]+)\)/g, repl: 'Math.abs($1)' },
            { regex: /ε\s*\(([^)]+)\)/g, repl: 'Math.exp($1)' },
            { regex: /λογ\s*\(([^)]+)\)/g, repl: 'Math.log($1)' },
            { regex: /τ_ρ\s*\(([^)]+)\)/g, repl: 'Math.sqrt($1)' },

            // trig in degrees → convert to radians
            { regex: /ημ\s*\(([^)]+)\)/g, repl: 'Math.sin(($1) * Math.PI / 180)' },
            { regex: /συν\s*\(([^)]+)\)/g, repl: 'Math.cos(($1) * Math.PI / 180)' },
            { regex: /εφ\s*\(([^)]+)\)/g, repl: 'Math.tan(($1) * Math.PI / 180)' },
        ];

        let result = code;
        for (const { regex, repl } of replacements) {
            result = result.replace(regex, repl);
        }
        return result;
    }

    managePrint(code) {
        const lines = code.split('\n');
        const result = lines.map(rawLine => {
            const trimmed = rawLine.trim();

            if (!trimmed) return rawLine;

            const normalized = trimmed.replace(/\s+/g, ' ');
            if (normalized.startsWith('γραψε ')) {
                const content = normalized.replace('γραψε', '').trim();
                return `print(${content})`;
            }
            return rawLine;
        });
        return result.join('\n');
    }

    manageInputStatements(code) {
        const lines = code.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];

            const match = rawLine.match(/^(\s*)(.*)$/);
            const indent = match[1];
            const trimmed = match[2].trim();

            if (!trimmed) {
                result.push(rawLine);
                continue;
            }

            const normalized = trimmed.replace(/\s+/g, ' ');

            if (normalized.startsWith('διαβασε')) {
                const varsPart = normalized.replace('διαβασε', '').trim();

                // no variables at all
                if (!varsPart) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'διαβασε' requires at least one variable`,
                        userMessage: `Η εντολή ΔΙΑΒΑΣΕ χρειάζεται τουλάχιστον μία μεταβλητή (π.χ. διαβασε α, β)`,
                    });
                }

                const variables = varsPart.split(',').map(v => v.trim());

                // invalid separation (empty entries)
                if (variables.some(v => v === '')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: invalid variable list in 'διαβασε' (empty entry detected)`,
                        userMessage: `Λάθος στη λίστα μεταβλητών. Ελέγξτε τα κόμματα (π.χ. διαβασε α, β, γ)`,
                    });
                }

                // invalid variable names (contains spaces)
                for (const v of variables) {
                    if (v.includes(' ')) {
                        throw new TranslationError({
                            devMessage: `Line ${i + 1}: invalid variable '${v}' (contains spaces)`,
                            userMessage: `Μη έγκυρο όνομα μεταβλητής: '${v}'`,
                        });
                    }
                }

                // generate input lines
                for (let v of variables) {
                    result.push(`${indent}${v} = await input()`);
                }
            } else {
                result.push(rawLine);
            }
        }

        return result.join('\n');
    }
}

module.exports = {
    LoopManager,
    ConditionManager,
    CodeManager,
    TranslationError
};


const manager = new CodeManager();
let code = `ΠΡΟΓΡΑΜΜΑ Simple
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: x, y
ΑΡΧΗ
Διάβασε x
Γράψε "Έδωσες την τιμή:", x
y <- x * 2
Γράψε "Το διπλάσιο είναι:", y
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`;

try {
    const translated = manager.translateCode(code);
    console.log(translated);
} catch (e) {
    if (e instanceof TranslationError) {
        console.error('Translation error:', e.devMessage);
        console.error('User message:', e.formatForUser());
    } else {
        console.error('Unexpected error:', e);
    }
}