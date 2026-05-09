class CanvasComponent {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.isDrawing = false;
        
        this.mode = 'pen'; 
        this.penSize = 2;
        this.eraserSize = 35;
        this.penColor = '#000000';
        
        this.activePointerId = null;
        this.lastPoint = null;
        
        this.clearCanvas();
        this.bindEvents();
    }

    setMode(mode) { this.mode = mode; }
    setPenColor(color) { this.penColor = color; }
    setPenSize(size) { this.penSize = size; }
    setEraserSize(size) { this.eraserSize = size; }

    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loadFromDataURL(dataURL) {
        if (!dataURL) return;
        const img = new Image();
        img.onload = () => {
            this.clearCanvas(); 
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataURL;
    }

    getDataURL() {
        return this.canvas.toDataURL('image/png');
    }

    getScaledCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    bindEvents() {
        const startPosition = (e) => {
            if (!PalmRejection.isValidInput(e)) return;
            
            // Abort drawing if a second finger touches (user is trying to pinch-zoom)
            if (e.pointerType === 'touch' && !e.isPrimary) {
                this.isDrawing = false;
                return;
            }
            
            this.activePointerId = e.pointerId;
            this.isDrawing = true;
            this.canvas.setPointerCapture(e.pointerId);

            const currentCoords = this.getScaledCoordinates(e);
            this.lastPoint = currentCoords;
            
            this.ctx.beginPath();
            this.ctx.moveTo(currentCoords.x, currentCoords.y);
            
            this.ctx.lineWidth = this.mode === 'eraser' ? this.eraserSize : this.penSize;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.mode === 'eraser' ? '#ffffff' : this.penColor;
        };

        const draw = (e) => {
            if (!this.isDrawing || e.pointerId !== this.activePointerId) return;
            if (!PalmRejection.isValidInput(e)) return;
            
            const currentPoint = this.getScaledCoordinates(e);
            
            const midPoint = {
                x: (this.lastPoint.x + currentPoint.x) / 2,
                y: (this.lastPoint.y + currentPoint.y) / 2
            };

            this.ctx.quadraticCurveTo(this.lastPoint.x, this.lastPoint.y, midPoint.x, midPoint.y);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(midPoint.x, midPoint.y);

            this.lastPoint = currentPoint;
        };
        
        const endPosition = (e) => {
            if (e.pointerId === this.activePointerId) {
                this.isDrawing = false;
                this.lastPoint = null;
                this.activePointerId = null;
                this.canvas.releasePointerCapture(e.pointerId);
            }
        };

        this.canvas.addEventListener('pointerdown', startPosition);
        this.canvas.addEventListener('pointermove', draw);
        this.canvas.addEventListener('pointerup', endPosition);
        this.canvas.addEventListener('pointercancel', endPosition);
        this.canvas.addEventListener('pointerout', endPosition);
    }

    setTouchActionBehavior(strictPenMode) {
        this.canvas.style.touchAction = strictPenMode ? 'pan-x pan-y' : 'none';
    }
}