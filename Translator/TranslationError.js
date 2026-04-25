/**
 * TranslationError represents a failure that happened while translating
 * pseudocode (Glossa) into JavaScript.
 *
 * It carries two messages:
 *   - devMessage: technical, English, useful for the developer / logs.
 *   - userMessage: clean, in Greek, safe to surface to a student that is
 *                  writing pseudocode inside the app.
 *
 * It also remembers the (1-indexed) source line when available, so callers
 * can highlight it in the editor.
 */
class TranslationError extends Error {
    static DEFAULT_USER_MESSAGE =
        'Υπήρξε σφάλμα κατά τη μετάφραση του ψευδοκώδικα. Έλεγξε τη σύνταξη και προσπάθησε ξανά.';

    constructor({ devMessage, userMessage, line = null, step = null } = {}) {
        super(devMessage || 'Translation error');
        this.name = 'TranslationError';
        this.devMessage = devMessage || this.message;
        this.userMessage = userMessage || TranslationError.DEFAULT_USER_MESSAGE;
        this.line = line;
        this.step = step;
    }

    /**
     * Convenience helper: prefixes the user message with "Γραμμή N:" when
     * a line number is known. Useful when rendering for students.
     */
    formatForUser() {
        if (this.line != null) {
            return `Γραμμή ${this.line}: ${this.userMessage}`;
        }
        return this.userMessage;
    }
}

module.exports = TranslationError;
