from ultralytics import YOLO
import cv2

# Load the trained YOLOv8 segmentation model
model = YOLO('room-seg.pt')

# Function to perform inference on an image
def segment_image(image_path, output_path=None):
    """
    Perform segmentation on an image and optionally save the result.

    Args:
        image_path (str): Path to the input image
        output_path (str, optional): Path to save the output image with masks
    """
    # Perform inference
    results = model(image_path)

    # Get the first result (for single image)
    result = results[0]

    # Display the result (will show only the mask, not boxes or confidences)
    result.show(conf=False, boxes=False, labels=False)

    # Optionally save the result (only mask, no boxes or confidences)
    if output_path:
        # Save the image with only masks overlaid
        result.save(output_path, conf=False, boxes=False, labels=False)
        print(f"Segmented image saved to {output_path}")

    # Print detection details (optional, can be removed if not needed)
    print("Detection Results:")
    for box in result.boxes:
        class_id = int(box.cls)
        confidence = box.conf.item()
        class_name = model.names[class_id]
        print(f"Class: {class_name}, Confidence: {confidence:.2f}")

    return result

# Example usage
if __name__ == "__main__":
    # Replace with your image path
    image_path = "example1.jpg"
    output_path = "segmented_output.jpg"

    segment_image(image_path, output_path)
