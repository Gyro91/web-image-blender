let backgroundPixelData;
let backgroundImage;
let foregroundImages = [];
let foregroundPixelDataImages = [];
let backgroundImageAlpha = 1;
let isBackgroundSet = false;

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
                    // Prepare off-screen canvas
                    const offCanvas = document.createElement('canvas');
                    const offCtx = offCanvas.getContext('2d');
                    offCanvas.width = img.width;
                    offCanvas.height = img.height;
                    offCtx.drawImage(img, 0, 0);

                    // Extract background pixel data
                    backgroundPixelData = offCtx.getImageData(0, 0, img.width, img.height).data;
                    backgroundImage = img;
                    isBackgroundSet = true;
                    // Reset foreground images if present
                    foregroundImages = [];
                    foregroundPixelDataImages = [];

                    // Draw background to main canvas, scaling to canvas size
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

                    // Prepare off-screen canvas for foreground
                    const offCanvas = document.createElement('canvas');
                    const offCtx = offCanvas.getContext('2d');
                    offCanvas.width = img.width;
                    offCanvas.height = img.height;
                    offCtx.drawImage(img, 0, 0);
                    const imgPixelData = offCtx.getImageData(0, 0, img.width, img.height).data;

                    foregroundImages.push(img);
                    foregroundPixelDataImages.push(imgPixelData);

                    const bgWidth = backgroundImage.width;
                    const bgHeight = backgroundImage.height;

                    // Start with background pixel data as base
                    let blended = blend(backgroundPixelData, imgPixelData, img, bgWidth);

                    for (let i = 0; i < foregroundImages.length; i++) {
                        blended = blend(blended, foregroundPixelDataImages[i], foregroundImages[i], bgWidth);
                    }

                    // Draw the blended image onto the canvas
                    const blendedImage = new ImageData(blended, bgWidth, bgHeight);
                    canvas.width = bgWidth;
                    canvas.height = bgHeight;
                    ctx.putImageData(blendedImage, 0, 0);
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

function blend(backgroundPixelData, imgPixelData, img, bgWidth) {
    const blended = new Uint8ClampedArray(backgroundPixelData);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const foregroundIndex = (y * img.width + x) * 4;
            const backgroundIndex = (y * bgWidth + x) * 4;

            const alphaA = imgPixelData[foregroundIndex + 3] / 255;

            for (let c = 0; c < 3; c++) { // R, G, B
                blended[backgroundIndex + c] = imgPixelData[foregroundIndex + c] * alphaA + backgroundPixelData[backgroundIndex + c] * (1 - alphaA);
            }

            blended[backgroundIndex + 3] = 255; // Fully opaque result
        }
    }

    return blended;
}