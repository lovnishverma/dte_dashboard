import os
from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor

def process_image(img_path, resize_factor=None, quantize=False):
    """
    Processes a single PNG image to reduce its size and overwrites the original.
    """
    try:
        with Image.open(img_path) as img:
            # Convert to RGBA to preserve transparency if it exists
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGBA')
            
            # 1. Dimensional Resizing
            if resize_factor and resize_factor < 1.0:
                new_width = int(img.width * resize_factor)
                new_height = int(img.height * resize_factor)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # 2. Palette Quantization (Lossy)
            if quantize:
                # UPDATED: FASTOCTREE is required for RGBA compatibility
                img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
            
            # 3. Save in place with optimization (Lossless structural compression)
            img.save(img_path, format='PNG', optimize=True)
            
        return f"Success: {img_path.name}"
    
    except Exception as e:
        return f"Error processing {img_path.name}: {e}"


def batch_reduce_pngs(folder_path, resize_factor=None, quantize=False, workers=None):
    """
    Iterates through a directory and processes all PNGs concurrently.
    """
    target_dir = Path(folder_path)
    png_files = list(target_dir.glob("*.png"))
    
    if not png_files:
        print("No PNG files found in the specified directory.")
        return

    # Default to CPU count for process pool
    workers = workers or os.cpu_count()
    print(f"Found {len(png_files)} PNG files. Starting processing with {workers} workers...")
    
    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = [
            executor.submit(process_image, img_path, resize_factor, quantize) 
            for img_path in png_files
        ]
        
        for future in futures:
            print(future.result())


if __name__ == "__main__":
    # Specify your target directory
    FOLDER_PATH = "C:/Users/princ/Desktop/dte_dashboard/static/img"
    
    # Run the quantization pass
    batch_reduce_pngs(FOLDER_PATH, quantize=True)