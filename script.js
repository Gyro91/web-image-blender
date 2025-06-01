// Global variables
let backgroundImage;
let foregroundImages = [];
let isBackgroundSet = false;
let layerCount = 0;
let layerElements = [];
let draggedItem = null;

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('imageLoader');
    const addImageButton = document.getElementById('addimage');
    const addBackgroundButton = document.getElementById('addbackground');

    fileInput.addEventListener('change', function(e) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                if (fileInput.dataset.type === 'background') {
                    // Set background image
                    backgroundImage = img;
                    isBackgroundSet = true;

                    // Reset foreground images if present
                    foregroundImages = [];

                    // Reset layer count
                    layerCount = 0;

                    // Update layers panel
                    updateLayersPanel('background', img);

                    // Draw background to main canvas
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                }
                else if (fileInput.dataset.type === 'image') {
                    if (!isBackgroundSet) {
                        alert('Please set a background image first');
                        return;
                    }

                    // Add foreground image
                    foregroundImages.push(img);

                    // Increment layer count and update layers panel
                    layerCount++;
                    updateLayersPanel('layer' + layerCount, img);

                    // Update canvas with new layer
                    updateCanvas();
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    });

    addImageButton.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.dataset.type = 'image';
        fileInput.click();
    });

    addBackgroundButton.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.dataset.type = 'background';
        fileInput.click();
    });
});

function updateLayersPanel(layerName, img) {
    const layersPanel = document.getElementById('layers');

    // Create a new layer item
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';
    layerItem.dataset.name = layerName;
    layerItem.draggable = true;

    // Create a small canvas for the thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 50;
    thumbCanvas.height = 50;
    const thumbCtx = thumbCanvas.getContext('2d');

    // Calculate thumbnail dimensions (maintaining aspect ratio)
    const aspectRatio = img.width / img.height;
    let thumbWidth, thumbHeight;

    if (aspectRatio >= 1) {
        // Wider than tall
        thumbWidth = 50;
        thumbHeight = 50 / aspectRatio;
    } else {
        // Taller than wide
        thumbHeight = 50;
        thumbWidth = 50 * aspectRatio;
    }

    // Center the image in the thumbnail
    const xOffset = (50 - thumbWidth) / 2;
    const yOffset = (50 - thumbHeight) / 2;

    // Draw the image to the thumbnail canvas
    thumbCtx.drawImage(img, xOffset, yOffset, thumbWidth, thumbHeight);

    // Create label for the layer
    const layerLabel = document.createElement('span');
    layerLabel.textContent = layerName === 'background' ? 'Background' : 'Layer ' + (layerName.replace('layer', ''));

    // Add elements to the layer item
    layerItem.appendChild(thumbCanvas);
    layerItem.appendChild(layerLabel);

    // Add drag event listeners
    layerItem.addEventListener('dragstart', handleDragStart);
    layerItem.addEventListener('dragend', handleDragEnd);

    // Add to the beginning if background, otherwise at the top
    if (layerName === 'background') {
        // Clear existing layers when setting a new background
        layersPanel.innerHTML = '<h2>Layers</h2>';
        layerElements = [layerItem];
        layersPanel.appendChild(layerItem);
    } else {
        // Insert new layer at the top (after the layers heading)
        if (layersPanel.childElementCount > 1) {
            layersPanel.insertBefore(layerItem, layersPanel.children[1]);
        } else {
            layersPanel.appendChild(layerItem);
        }
        // Insert at the beginning of layerElements (after background)
        layerElements.splice(1, 0, layerItem);
    }
}

function handleDragStart(e) {
    // Prevent dragging the background layer
    if (this.dataset.name === 'background') {
        e.preventDefault();
        return false;
    }

    // Store the dragged element
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);

    // Add dragging class for visual feedback
    this.classList.add('dragging');

    // Set up the layers panel to accept drops
    const layersPanel = document.getElementById('layers');
    layersPanel.addEventListener('dragover', handleDragOver);
    layersPanel.addEventListener('drop', handleDrop);

    // Set up each layer item to handle being dragged over
    document.querySelectorAll('.layer-item').forEach(item => {
        if (item !== this && item.dataset.name !== 'background') {
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
        }
    });
}

function handleDragEnd(e) {
    // Remove dragging class
    this.classList.remove('dragging');

    // Clean up event listeners
    const layersPanel = document.getElementById('layers');
    layersPanel.removeEventListener('dragover', handleDragOver);
    layersPanel.removeEventListener('drop', handleDrop);

    document.querySelectorAll('.layer-item').forEach(item => {
        item.removeEventListener('dragenter', handleDragEnter);
        item.removeEventListener('dragleave', handleDragLeave);
    });

    // Reset the draggedItem
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    // Remove drag-over class from all items
    document.querySelectorAll('.layer-item').forEach(item => {
        item.classList.remove('drag-over');
    });

    // Determine where to drop the item
    let dropTarget = e.target;

    // Find the layer-item container if we're on a child element
    while (dropTarget && !dropTarget.classList.contains('layer-item') && dropTarget.id !== 'layers') {
        dropTarget = dropTarget.parentNode;
    }

    // Only proceed if we're not dropping onto the dragged item itself
    // and not dropping onto the background
    if (dropTarget &&
        dropTarget !== draggedItem &&
        dropTarget.classList.contains('layer-item') &&
        dropTarget.dataset.name !== 'background') {

        // Update the DOM order - insert the dragged item before or after the drop target
        const items = Array.from(document.querySelectorAll('.layer-item'));
        const draggedIndex = items.indexOf(draggedItem);
        const dropIndex = items.indexOf(dropTarget);

        if (draggedIndex > dropIndex) {
            // Moving up - insert before
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget);
        } else {
            // Moving down - insert after
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget.nextSibling);
        }

        // Update the layerElements array to match the new DOM order
        layerElements = Array.from(document.querySelectorAll('.layer-item'));

        // Redraw the canvas with the new layer order
        updateCanvas();
    } else if (dropTarget && dropTarget.id === 'layers') {
        // Dropping directly onto the layers panel (not on a specific layer)
        // Add to the top of the layers (after the heading)
        const layersPanel = document.getElementById('layers');
        if (layersPanel.childElementCount > 1) {
            layersPanel.insertBefore(draggedItem, layersPanel.children[1]);
        } else {
            layersPanel.appendChild(draggedItem);
        }

        // Update the layerElements array
        layerElements = Array.from(document.querySelectorAll('.layer-item'));

        // Redraw canvas
        updateCanvas();
    }

    return false;
}

function updateCanvas() {
    // If no background is set, there's nothing to do
    if (!isBackgroundSet) return;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Start by drawing the background
    ctx.drawImage(backgroundImage, 0, 0);

    // Get the layer order from the DOM
    const layerOrder = [];

    // Get all layer items from the DOM
    const layerItems = document.querySelectorAll('.layer-item');

    // Process each layer (skip background)
    layerItems.forEach(item => {
        if (item.dataset.name !== 'background') {
            const layerNumber = parseInt(item.dataset.name.replace('layer', ''));
            layerOrder.push(layerNumber - 1); // Convert to 0-based index
        }
    });

    // Draw each layer in reverse order (from bottom to top)
    // This ensures proper visual stacking
    for (let i = layerOrder.length - 1; i >= 0; i--) {
        const index = layerOrder[i];
        if (index >= 0 && index < foregroundImages.length) {
            const img = foregroundImages[index];

            // Draw the image with default compositing (source-over)
            ctx.drawImage(img, 0, 0);
        }
    }
}