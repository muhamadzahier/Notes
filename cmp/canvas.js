class CanvasComponent {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Block all native gestures from the browser to fix Jitter
        this.canvas.style.touchAction = 'none'; 
        
        this.isDrawing = false;
        this.isPanning = false;
        this.lastPanPoint = null;
        this.scrollArea = document.getElementById('pages-scroll-area');
        
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
            // Abort drawing if a second finger touches (prevents stray marks while zooming)
            if (e.pointerType === 'touch' && !e.isPrimary) {
                this.isDrawing = false;
                this.isPanning = false;
                return;
            }

            // Custom Pan Detection: Strict Mode + Finger OR Middle Mouse button
            if ((PalmRejection.strictPenMode && e.pointerType === 'touch') || e.button === 1) {
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.activePointerId = e.pointerId;
                this.canvas.setPointerCapture(e.pointerId);
                return;
            }

            // Normal Pen Drawing
            if (!PalmRejection.isValidInput(e)) return;
            
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

        const move = (e) => {
            if (e.pointerId !== this.activePointerId) return;

            // Handle Manual Smooth Panning
            if (this.isPanning) {
                const dx = e.clientX - this.lastPanPoint.x;
                const dy = e.clientY - this.lastPanPoint.y;
                this.scrollArea.scrollLeft -= dx;
                this.scrollArea.scrollTop -= dy;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                return;
            }

            // Handle Smooth Drawing Math
            if (!this.isDrawing || !PalmRejection.isValidInput(e)) return;
            
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
                this.isPanning = false;
                this.lastPanPoint = null;
                this.activePointerId = null;
                this.canvas.releasePointerCapture(e.pointerId);
            }
        };

        this.canvas.addEventListener('pointerdown', startPosition);
        this.canvas.addEventListener('pointermove', move);
        this.canvas.addEventListener('pointerup', endPosition);
        this.canvas.addEventListener('pointercancel', endPosition);
        this.canvas.addEventListener('pointerout', endPosition);
    }
}