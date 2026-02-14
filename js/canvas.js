// JLPT Vocabulary Master - Canvas Functions

/**
 * Initialize canvas for drawing
 */
export function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Get position from mouse or touch event
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  // Start drawing
  const startDrawing = (e) => {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  };
  
  // Draw line
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getPos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
  };
  
  // Stop drawing
  const stopDrawing = () => {
    isDrawing = false;
  };
  
  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

/**
 * Clear canvas
 */
export function clearCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Save canvas image data
 */
export function saveCanvasData(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Restore canvas image data
 */
export function restoreCanvasData(imageData, canvasId) {
  if (!imageData) return;
  
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Get canvas as data URL (for saving/sharing)
 */
export function getCanvasDataURL(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  return canvas.toDataURL('image/png');
}
