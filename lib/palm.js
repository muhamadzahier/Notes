const PalmRejection = {
    strictPenMode: false,

    /**
     * Evaluates a PointerEvent to determine if it should be allowed to draw.
     * @param {PointerEvent} e - The incoming pointer event
     * @returns {boolean} - True if allowed, False if classified as palm/invalid
     */
    isValidInput: function(e) {
        // 1. Mouse is always valid for desktop testing
        if (e.pointerType === 'mouse') return true;

        // 2. Strict Stylus Mode: Only allow active digitizer pens
        if (this.strictPenMode) {
            return e.pointerType === 'pen';
        }

        // 3. Heuristic Palm Rejection for standard touch screens
        if (e.pointerType === 'touch') {
            // Calculate the physical area of the touch contact
            const touchArea = (e.width || 0) * (e.height || 0);
            
            // If the contact area is unusually large, it's likely a palm resting
            // Normal finger tap is usually < 1000. Palm is usually > 2000.
            if (touchArea > 1500) {
                return false; 
            }
        }

        return true;
    },

    setStrictPenMode: function(isStrict) {
        this.strictPenMode = isStrict;
    }
};