import cv2
import numpy as np
import os

def add_visual_snow_noise(image_path, output_path, noise_intensity=0.15):
    """
    Add visual snow noise to an image to simulate visual snow syndrome
    
    Args:
        image_path: Path to the original image
        output_path: Path where the noisy image will be saved
        noise_intensity: Intensity of the noise (0.0 to 1.0)
    """
    # Read the image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load image from {image_path}")
        return False
    
    # Get image dimensions
    height, width, channels = img.shape
    
    # Generate random noise
    # Create random noise with same dimensions as image
    noise = np.random.randint(0, 256, (height, width, channels), dtype=np.uint8)
    
    # Create a mask for sparse noise (visual snow is not dense)
    # Only about 15-20% of pixels should have noise
    noise_mask = np.random.random((height, width)) < 0.18
    
    # Create the final noise overlay
    final_noise = np.zeros_like(img)
    
    # Apply noise only where mask is True
    for i in range(channels):
        final_noise[:, :, i] = noise[:, :, i] * noise_mask
    
    # Blend the noise with the original image
    # Convert to float for blending
    img_float = img.astype(np.float32)
    noise_float = final_noise.astype(np.float32)
    
    # Add noise with specified intensity
    noisy_img = img_float + (noise_float * noise_intensity)
    
    # Clip values to valid range and convert back to uint8
    noisy_img = np.clip(noisy_img, 0, 255).astype(np.uint8)
    
    # Save the noisy image
    success = cv2.imwrite(output_path, noisy_img)
    if success:
        print(f"Noisy image saved to: {output_path}")
        return True
    else:
        print(f"Error: Could not save image to {output_path}")
        return False

if __name__ == "__main__":
    # Generate the noisy version of the image
    input_path = "static/images/Computer_Room_Desk_2008.jpg"
    output_path = "static/images/Computer_Room_Desk_2008_noisy.jpg"
    
    if os.path.exists(input_path):
        add_visual_snow_noise(input_path, output_path, noise_intensity=0.35)
    else:
        print(f"Error: Input image not found at {input_path}")