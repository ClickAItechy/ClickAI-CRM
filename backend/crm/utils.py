from django.template.loader import render_to_string
from django.conf import settings
import weasyprint
import tempfile

def generate_pdf(template_src, context_dict, request=None):
    """
    Generate a PDF from a Django template and context.
    
    Args:
        template_src (str): Path to the template file.
        context_dict (dict): Context data for the template.
        request (HttpRequest, optional): The request object, useful for building absolute URLs.
        
    Returns:
        bytes: The generated PDF content.
    """
    html_string = render_to_string(template_src, context_dict, request=request)
    
    # Create a temporary file to store the PDF (optional, but good for debugging if needed, 
    # though here we just return bytes)
    
    html = weasyprint.HTML(string=html_string, base_url=request.build_absolute_uri() if request else None)
    pdf_file = html.write_pdf()
    
    return pdf_file
