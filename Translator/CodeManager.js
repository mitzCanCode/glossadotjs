const TranslationError = require('./TranslationError');
const ConditionManager = require('./ConditionManager');
const LoopManager = require('./LoopManager');

class CodeManager {
    constructor() {
        this.conditionManager = new ConditionManager();
        this.loopManager = new LoopManager();
        this.stringStore = {};
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
        // TODO: implement operand translation (e.g. <- → =, =/==, και/ή, κλπ).
        // For now this is a passthrough so the pipeline stays runnable.
        return code;
    }
}

module.exports = {
    LoopManager,
    ConditionManager,
    CodeManager,
    TranslationError,
};
