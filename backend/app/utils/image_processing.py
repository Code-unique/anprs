import os
import uuid
import cv2
import numpy as np
from pathlib import Path
from fastapi import UploadFile
from PIL import Image
import io

UPLOAD_DIR = Path("uploads")
PROCESSED_DIR = Path("processed_images")
STATIC_DIR = Path("static")

# Create directories
for directory in [UPLOAD_DIR, PROCESSED_DIR, STATIC_DIR]:
    directory.mkdir(exist_ok=True)

def validate_image(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/bmp']
    max_size = 20 * 1024 * 1024  # 20MB
    
    if file.content_type not in allowed_types:
        return False
    
    # Check file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > max_size:
        return False
    
    # Try to open with PIL to verify it's a valid image
    try:
        image = Image.open(io.BytesIO(file.file.read()))
        image.verify()
        file.file.seek(0)
        return True
    except Exception:
        file.file.seek(0)
        return False

def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file and return path"""
    file_extension = file.filename.split(".")[-1].lower()
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    
    return str(file_path)

def preprocess_image(image_path: str) -> np.ndarray:
    """Preprocess image for better detection"""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    # Resize if too large
    max_dimension = 1920
    height, width = image.shape[:2]
    if max(height, width) > max_dimension:
        scale = max_dimension / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = cv2.resize(image, (new_width, new_height))
    
    return image

def enhance_image_for_ocr(image: np.ndarray) -> np.ndarray:
    """Enhance image for better OCR results"""
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Apply denoising
    denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
    
    # Apply sharpening
    kernel = np.array([[-1, -1, -1],
                      [-1,  9, -1],
                      [-1, -1, -1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    
    return sharpened

def save_processed_image(image: np.ndarray, original_path: str, suffix: str = "processed") -> str:
    """Save processed image"""
    original_stem = Path(original_path).stem
    processed_path = PROCESSED_DIR / f"{original_stem}_{suffix}.jpg"
    cv2.imwrite(str(processed_path), image)
    return str(processed_path)

def draw_detections(image: np.ndarray, detections: list) -> np.ndarray:
    """Draw detection boxes and labels on image"""
    result = image.copy()
    
    for detection in detections:
        bbox = detection.get('bbox', [])
        if len(bbox) == 4:
            x1, y1, x2, y2 = map(int, bbox)
            confidence = detection.get('confidence', 0)
            plate_text = detection.get('plate', '')
            
            # Draw bounding box
            color = (0, 255, 0) if confidence > 0.7 else (0, 255, 255)  # Green or Yellow
            cv2.rectangle(result, (x1, y1), (x2, y2), color, 2)
            
            # Draw label background
            label = f"{plate_text} ({confidence:.2f})"
            (text_width, text_height), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
            )
            
            cv2.rectangle(result, 
                         (x1, y1 - text_height - 10),
                         (x1 + text_width, y1),
                         color, -1)
            
            # Draw label text
            cv2.putText(result, label,
                       (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX,
                       0.5, (0, 0, 0), 2)
    
    return result

def extract_plate_region(image: np.ndarray, bbox: list) -> np.ndarray:
    """Extract plate region from image"""
    x1, y1, x2, y2 = map(int, bbox)
    
    # Add padding
    padding = 10
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(image.shape[1], x2 + padding)
    y2 = min(image.shape[0], y2 + padding)
    
    return image[y1:y2, x1:x2]

def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image by given angle"""
    if angle == 0:
        return image
    
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h))
    
    return rotated

def normalize_brightness(image: np.ndarray) -> np.ndarray:
    """Normalize image brightness"""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L-channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    
    # Merge channels
    limg = cv2.merge((cl, a, b))
    normalized = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    return normalized