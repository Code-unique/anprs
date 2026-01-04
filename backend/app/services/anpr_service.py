import cv2
import numpy as np
from PIL import Image
import easyocr
from ultralytics import YOLO
import torch
import os
from pathlib import Path
import json
from datetime import datetime
import logging
import re
import imutils
from imutils.perspective import four_point_transform
import time
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ANPRService:
    def __init__(self, model_path=None):
        self.model = None
        self.reader = None
        self.tesseract_available = False
        self.load_models(model_path)
        
    def load_models(self, model_path=None):
        """Load ML models for plate detection and recognition"""
        print("🔧 Loading ANPR models...")
        try:
            # Try to load a license plate detection model
            print("   Loading detection model...")
            
            # First, check if we have a custom license plate model
            custom_models = [
                "license_plate_yolov8.pt",
                "best.pt",
                "yolov8_license_plate.pt",
                "plate_detection.pt"
            ]
            
            model_loaded = False
            for model_file in custom_models:
                if os.path.exists(model_file):
                    self.model = YOLO(model_file)
                    print(f"✅ Loaded custom license plate model: {model_file}")
                    model_loaded = True
                    break
            
            # If no custom model, use YOLOv8 and try to detect cars first
            if not model_loaded:
                self.model = YOLO('yolov8n.pt')
                print("✅ Loaded YOLOv8n (will detect cars, then look for plates)")
            
            # Initialize EasyOCR for text recognition
            print("   Loading EasyOCR...")
            self.reader = easyocr.Reader(['en'], 
                                        gpu=torch.cuda.is_available(),
                                        model_storage_directory='ml_model/ocr_models',
                                        download_enabled=True)
            print("✅ EasyOCR loaded")
            
            # Check Tesseract
            print("   Checking Tesseract...")
            try:
                import pytesseract
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                pytesseract.get_tesseract_version()
                print("✅ Tesseract OCR available")
                self.tesseract_available = True
            except:
                print("⚠️ Tesseract not available")
                self.tesseract_available = False
            
            print("🎉 ANPR models loaded successfully")
            
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            print(traceback.format_exc())
            self.model = None
    
    def detect_plates_enhanced(self, image: np.ndarray):
        """
        Enhanced plate detection using multiple methods:
        1. Try to detect cars with YOLO, then look for plates on cars
        2. Use contour-based detection
        3. Use color-based detection (white/yellow plates)
        """
        plates = []
        height, width = image.shape[:2]
        
        print(f"   Image size: {width}x{height}")
        
        # METHOD 1: Detect cars with YOLO, then look for plates
        print("   Method 1: Detecting vehicles...")
        try:
            # Detect vehicles (car, truck, bus, motorcycle)
            results = self.model(image, conf=0.3, classes=[2, 5, 6, 7], verbose=False)  # COCO classes: car=2, bus=5, truck=7, motorcycle=3
            
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes.cpu().numpy()
                    
                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        
                        # Class names from COCO dataset
                        class_names = {
                            2: 'car',
                            5: 'bus', 
                            7: 'truck',
                            3: 'motorcycle'
                        }
                        vehicle_type = class_names.get(class_id, 'vehicle')
                        
                        print(f"      Found {vehicle_type} with confidence: {confidence:.2f}")
                        
                        # Extract vehicle region
                        vehicle_img = image[y1:y2, x1:x2]
                        
                        if vehicle_img.shape[0] == 0 or vehicle_img.shape[1] == 0:
                            continue
                        
                        # Look for license plate on the vehicle (typically bottom part)
                        plate_height_ratio = 0.3  # Assume plate is in bottom 30% of vehicle
                        plate_y_start = int(vehicle_img.shape[0] * (1 - plate_height_ratio))
                        plate_region = vehicle_img[plate_y_start:, :]
                        
                        if plate_region.shape[0] > 20 and plate_region.shape[1] > 50:
                            # Try to find plate in this region using contours
                            plate_candidates = self.find_plates_in_region(plate_region)
                            
                            for candidate in plate_candidates:
                                # Convert local coordinates to global
                                global_x1 = x1 + candidate['bbox'][0]
                                global_y1 = y1 + plate_y_start + candidate['bbox'][1]
                                global_x2 = x1 + candidate['bbox'][2]
                                global_y2 = y1 + plate_y_start + candidate['bbox'][3]
                                
                                plates.append({
                                    'bbox': [global_x1, global_y1, global_x2, global_y2],
                                    'confidence': confidence * 0.7,  # Lower confidence since we're guessing
                                    'image': candidate['image'],
                                    'method': 'vehicle_based',
                                    'vehicle_type': vehicle_type
                                })
        except Exception as e:
            print(f"      Vehicle detection error: {e}")
        
        # METHOD 2: Direct contour-based detection
        print("   Method 2: Contour-based detection...")
        contour_plates = self.detect_plates_contours(image)
        plates.extend(contour_plates)
        
        # METHOD 3: MSER-based detection (good for text regions)
        print("   Method 3: MSER text region detection...")
        mser_plates = self.detect_plates_mser(image)
        plates.extend(mser_plates)
        
        # Remove duplicates (plates that overlap too much)
        if plates:
            plates = self.remove_duplicate_plates(plates)
        
        print(f"   Total potential plates found: {len(plates)}")
        return plates
    
    def find_plates_in_region(self, region: np.ndarray):
        """Find plates in a specific region using contours"""
        plates = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            
            # Enhance contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Apply bilateral filter
            filtered = cv2.bilateralFilter(enhanced, 9, 75, 75)
            
            # Edge detection
            edges = cv2.Canny(filtered, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 500 or area > 10000:  # Filter by size
                    continue
                
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                
                # Check aspect ratio (license plates are rectangular)
                aspect_ratio = w / float(h)
                if 2.0 < aspect_ratio < 5.0:  # Typical plate aspect ratio
                    plate_img = region[y:y+h, x:x+w]
                    
                    # Additional checks
                    if plate_img.shape[0] > 20 and plate_img.shape[1] > 50:
                        plates.append({
                            'bbox': [x, y, x+w, y+h],
                            'confidence': 0.5,
                            'image': plate_img,
                            'method': 'contour'
                        })
        
        except Exception as e:
            print(f"      Region analysis error: {e}")
        
        return plates
    
    def detect_plates_contours(self, image: np.ndarray):
        """Detect license plates using contour-based method"""
        plates = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply CLAHE for better contrast
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Bilateral filter to reduce noise
            filtered = cv2.bilateralFilter(enhanced, 11, 17, 17)
            
            # Edge detection with Canny
            edges = cv2.Canny(filtered, 30, 200)
            
            # Dilate edges to connect broken lines
            kernel = np.ones((3, 3), np.uint8)
            dilated = cv2.dilate(edges, kernel, iterations=2)
            
            # Find contours
            contours, _ = cv2.findContours(dilated.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            # Sort by area and take top candidates
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:20]
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 1000:  # Too small
                    continue
                
                # Approximate contour
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Look for quadrilateral shapes
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    
                    # Check aspect ratio (typical plates are rectangular)
                    aspect_ratio = w / float(h)
                    if 2.0 < aspect_ratio < 6.0:
                        # Check area ratio
                        contour_area = cv2.contourArea(contour)
                        bounding_area = w * h
                        area_ratio = contour_area / bounding_area
                        
                        if area_ratio > 0.6:  # Contour fills most of bounding box
                            plate_img = image[y:y+h, x:x+w]
                            
                            # Additional size check
                            if plate_img.shape[0] > 30 and plate_img.shape[1] > 80:
                                plates.append({
                                    'bbox': [x, y, x+w, y+h],
                                    'confidence': 0.6,
                                    'image': plate_img,
                                    'method': 'contour'
                                })
                                break  # Take the best one
        
        except Exception as e:
            print(f"      Contour detection error: {e}")
        
        return plates
    
    def detect_plates_mser(self, image: np.ndarray):
        """Detect text regions using MSER (Maximally Stable Extremal Regions)"""
        plates = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Create MSER detector
            mser = cv2.MSER_create(
                delta=5,
                min_area=100,
                max_area=10000,
                max_variation=0.25,
                min_diversity=0.2
            )
            
            # Detect regions
            regions, _ = mser.detectRegions(gray)
            
            if len(regions) > 0:
                # Create mask of MSER regions
                mask = np.zeros(gray.shape, dtype=np.uint8)
                
                for region in regions:
                    # Get bounding box for region
                    x, y, w, h = cv2.boundingRect(region.reshape(-1, 1, 2))
                    
                    # Filter by aspect ratio and size
                    aspect_ratio = w / float(h)
                    if 1.5 < aspect_ratio < 8.0 and w > 40 and h > 10:
                        # Draw region on mask
                        cv2.rectangle(mask, (x, y), (x+w, y+h), 255, -1)
                        
                        # Extract region
                        plate_img = image[y:y+h, x:x+w]
                        
                        plates.append({
                            'bbox': [x, y, x+w, y+h],
                            'confidence': 0.4,
                            'image': plate_img,
                            'method': 'mser'
                        })
        
        except Exception as e:
            print(f"      MSER detection error: {e}")
        
        return plates
    
    def remove_duplicate_plates(self, plates):
        """Remove duplicate/overlapping plate detections"""
        if len(plates) <= 1:
            return plates
        
        filtered_plates = []
        
        for i, plate1 in enumerate(plates):
            is_duplicate = False
            
            # Check if this plate overlaps significantly with any already filtered plate
            for plate2 in filtered_plates:
                # Calculate overlap
                x1_1, y1_1, x2_1, y2_1 = plate1['bbox']
                x1_2, y1_2, x2_2, y2_2 = plate2['bbox']
                
                # Calculate intersection
                x_left = max(x1_1, x1_2)
                y_top = max(y1_1, y1_2)
                x_right = min(x2_1, x2_2)
                y_bottom = min(y2_1, y2_2)
                
                if x_right > x_left and y_bottom > y_top:
                    intersection_area = (x_right - x_left) * (y_bottom - y_top)
                    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
                    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
                    
                    # If overlap is more than 50% of either plate, it's a duplicate
                    if intersection_area > 0.5 * min(area1, area2):
                        is_duplicate = True
                        # Keep the one with higher confidence
                        if plate1['confidence'] > plate2['confidence']:
                            filtered_plates.remove(plate2)
                            filtered_plates.append(plate1)
                        break
            
            if not is_duplicate:
                filtered_plates.append(plate1)
        
        return filtered_plates
    
    def preprocess_for_ocr(self, plate_image: np.ndarray):
        """Enhanced preprocessing for better OCR"""
        try:
            # Convert to grayscale
            if len(plate_image.shape) == 3:
                gray = cv2.cvtColor(plate_image, cv2.COLOR_BGR2GRAY)
            else:
                gray = plate_image.copy()
            
            # Resize if too small
            min_height, min_width = 30, 100
            if gray.shape[0] < min_height or gray.shape[1] < min_width:
                scale = max(min_height/gray.shape[0], min_width/gray.shape[1])
                new_width = int(gray.shape[1] * scale)
                new_height = int(gray.shape[0] * scale)
                gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
            
            # CLAHE for contrast
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Denoising
            denoised = cv2.fastNlMeansDenoising(enhanced, h=30)
            
            # Adaptive thresholding
            binary = cv2.adaptiveThreshold(denoised, 255,
                                          cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                          cv2.THRESH_BINARY_INV, 11, 2)
            
            # Morphological operations to clean text
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Invert back for OCR
            processed = cv2.bitwise_not(cleaned)
            
            return processed
            
        except Exception as e:
            print(f"⚠️ Preprocessing error: {e}")
            return plate_image
    
    def recognize_plate_text(self, processed_image: np.ndarray):
        """Recognize text from plate image using multiple OCR methods"""
        text_results = []
        
        # Method 1: EasyOCR
        try:
            # Convert to RGB for EasyOCR
            if len(processed_image.shape) == 2:
                rgb_image = cv2.cvtColor(processed_image, cv2.COLOR_GRAY2RGB)
            else:
                rgb_image = processed_image
            
            results = self.reader.readtext(rgb_image, 
                                         detail=0, 
                                         paragraph=False,
                                         width_ths=0.5,
                                         height_ths=0.5)
            
            if results:
                combined = ' '.join(results).upper()
                cleaned = self.clean_plate_text(combined)
                if cleaned and len(cleaned) >= 3:
                    text_results.append({
                        'text': cleaned,
                        'confidence': 0.8,
                        'method': 'easyocr'
                    })
        except Exception as e:
            print(f"      EasyOCR error: {e}")
        
        # Method 2: Tesseract (if available)
        if self.tesseract_available:
            try:
                import pytesseract
                
                # Convert to PIL Image
                pil_image = Image.fromarray(processed_image)
                
                # Try different configurations
                configs = [
                    '--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    '--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    '--oem 3 --psm 7'
                ]
                
                for config in configs:
                    try:
                        text = pytesseract.image_to_string(pil_image, config=config)
                        text = text.strip().upper()
                        if text and len(text) >= 3:
                            cleaned = self.clean_plate_text(text)
                            if cleaned:
                                text_results.append({
                                    'text': cleaned,
                                    'confidence': 0.7,
                                    'method': f'tesseract_{config[:5]}'
                                })
                                break
                    except:
                        continue
            except Exception as e:
                print(f"      Tesseract error: {e}")
        
        # Return the best result
        if text_results:
            # Sort by confidence and text quality
            text_results.sort(key=lambda x: (
                x['confidence'],
                len(x['text']),
                self.looks_like_plate(x['text'])
            ), reverse=True)
            
            best = text_results[0]
            return best['text'], best['confidence']
        
        return None, 0.0
    
    def looks_like_plate(self, text: str):
        """Check if text looks like a license plate"""
        if not text:
            return False
        
        clean = text.replace(' ', '').replace('-', '')
        
        # Length check
        if len(clean) < 3 or len(clean) > 10:
            return False
        
        # Must have both letters and numbers
        has_letter = any(c.isalpha() for c in clean)
        has_digit = any(c.isdigit() for c in clean)
        
        if not (has_letter and has_digit):
            return False
        
        # Common patterns
        patterns = [
            r'^[A-Z]{2,3}\d{3,4}$',  # ABC1234
            r'^\d{3,4}[A-Z]{2,3}$',  # 1234ABC
            r'^[A-Z]\d{2,3}[A-Z]{2}$',  # A123BC
            r'^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$',  # Indian format
        ]
        
        for pattern in patterns:
            if re.match(pattern, clean):
                return True
        
        return True
    
    def clean_plate_text(self, text: str):
        """Clean and format plate text"""
        if not text:
            return ""
        
        # Uppercase and remove unwanted chars
        text = text.upper()
        text = re.sub(r'[^A-Z0-9\s\-]', '', text)
        text = ' '.join(text.split())
        
        # Common formatting
        clean = text.replace(' ', '').replace('-', '')
        
        if 3 <= len(clean) <= 4:
            return text  # Keep as is
        
        # Format common patterns
        if len(clean) == 6:
            # ABC123 -> ABC 123
            return f"{clean[:3]} {clean[3:]}"
        elif len(clean) == 7:
            # ABC1234 -> ABC 1234
            return f"{clean[:3]} {clean[3:]}"
        elif len(clean) == 5:
            # AB123 -> AB 123
            return f"{clean[:2]} {clean[2:]}"
        elif len(clean) == 8:
            # AB12CD34 -> AB 12 CD 34 (Indian format)
            return f"{clean[:2]} {clean[2:4]} {clean[4:6]} {clean[6:]}"
        
        return text
    
    def process_image(self, image_path: str):
        """Complete ANPR processing pipeline"""
        print(f"\n🔍 Processing image: {image_path}")
        start_time = time.time()
        
        result = {
            'success': False,
            'error': None,
            'plates': [],
            'processing_time': 0,
            'detection_method': 'none',
            'warning': None
        }
        
        try:
            # Load image
            print("   Loading image...")
            image = cv2.imread(image_path)
            if image is None:
                result['error'] = f"Cannot read image: {image_path}"
                return result
            
            height, width = image.shape[:2]
            print(f"   Image size: {width}x{height}")
            
            # Enhanced plate detection
            print("   Enhanced plate detection...")
            plates = self.detect_plates_enhanced(image)
            
            if not plates:
                print("   ⚠️ No plates detected with any method")
                result['warning'] = 'No license plates detected in image'
                
                # Try one more method: whole image OCR as fallback
                print("   Trying whole image OCR as fallback...")
                whole_image_processed = self.preprocess_for_ocr(image)
                text, confidence = self.recognize_plate_text(whole_image_processed)
                
                if text and confidence > 0.3:
                    print(f"   Found text in whole image: {text}")
                    result['plates'].append({
                        'plate_number': text,
                        'confidence': confidence,
                        'status': 'Review',
                        'bbox': [0, 0, width, height],
                        'detection_confidence': 0.1,
                        'is_valid': self.looks_like_plate(text),
                        'country_format': 'generic',
                        'is_blacklisted': False,
                        'method': 'whole_image_ocr'
                    })
                    result['success'] = True
                else:
                    result['success'] = False
            
            else:
                print(f"   ✅ Found {len(plates)} potential plate(s)")
                result['detection_method'] = plates[0].get('method', 'unknown')
                
                # Process each detected plate
                for i, plate_info in enumerate(plates):
                    print(f"   Processing plate {i+1}...")
                    plate_img = plate_info['image']
                    
                    # Preprocess for OCR
                    processed = self.preprocess_for_ocr(plate_img)
                    
                    # Recognize text
                    plate_text, confidence = self.recognize_plate_text(processed)
                    
                    if not plate_text:
                        print(f"      ❌ Could not read text from plate {i+1}")
                        continue
                    
                    print(f"      ✅ Read: {plate_text} (confidence: {confidence:.2f})")
                    
                    # Determine status
                    is_valid = self.looks_like_plate(plate_text)
                    status = 'Success' if confidence > 0.6 and is_valid else 'Review'
                    
                    plate_result = {
                        'plate_number': plate_text,
                        'confidence': confidence,
                        'status': status,
                        'bbox': plate_info['bbox'],
                        'detection_confidence': plate_info['confidence'],
                        'is_valid': is_valid,
                        'country_format': 'generic',
                        'is_blacklisted': False,
                        'method': plate_info.get('method', 'unknown')
                    }
                    
                    result['plates'].append(plate_result)
                
                if result['plates']:
                    result['success'] = True
                    # Sort by confidence
                    result['plates'].sort(key=lambda x: x['confidence'], reverse=True)
                else:
                    result['warning'] = 'Plates detected but could not read text'
                    result['success'] = False
        
        except Exception as e:
            print(f"   ❌ Processing error: {e}")
            print(traceback.format_exc())
            result['error'] = str(e)
        
        result['processing_time'] = time.time() - start_time
        print(f"   ⏱️ Processing time: {result['processing_time']:.2f}s")
        
        # DEBUG: Save intermediate images if debug mode
        if os.getenv('DEBUG_ANPR', 'false').lower() == 'true':
            self.save_debug_images(image_path, image, plates, result)
        
        return result
    
    def save_debug_images(self, original_path, image, plates, result):
        """Save debug images for analysis"""
        debug_dir = "debug_images"
        os.makedirs(debug_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.basename(original_path).split('.')[0]
        
        # Save original with detections
        debug_image = image.copy()
        for plate_info in plates:
            x1, y1, x2, y2 = plate_info['bbox']
            cv2.rectangle(debug_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(debug_image, plate_info.get('method', 'unknown'), 
                       (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        debug_path = os.path.join(debug_dir, f"{base_name}_{timestamp}_debug.jpg")
        cv2.imwrite(debug_path, debug_image)
        print(f"   📁 Debug image saved: {debug_path}")

# Global instance
anpr_service = ANPRService()