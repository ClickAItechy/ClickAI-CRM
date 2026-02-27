from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from .models import Invoice, Quotation
from .serializers import InvoiceSerializer, QuotationSerializer
from .views import StandardResultsSetPagination
from .utils import generate_pdf
from .num2words import num2words
import random
import base64
import os
from django.conf import settings

def generate_finance_pdf(obj, request, is_invoice=False):
    """Helper to generate PDF for either Quotation or Invoice"""
    # Calculate validity/due date
    issued_date = obj.issued_date
    due_date = None
    
    if is_invoice:
        number = obj.invoice_number
        title = "Invoice"
        label = "Invoice #"
    else:
        # Validity for quotations: 10 days
        due_date = getattr(obj, 'valid_until', None) or (issued_date + timedelta(days=10))
        number = obj.quotation_number
        title = "Quotation"
        label = "Quotation #"
        
    # Calculate VAT (assuming grand_total already includes the 5% VAT)
    grand_total_with_vat = float(obj.grand_total)
    subtotal = round(grand_total_with_vat / 1.05, 2)
    vat_amount = round(grand_total_with_vat - subtotal, 2)
    
    # Prepare context for template
    context = {
        'title': title,
        'number_label': label,
        'number': number,
        'date': issued_date.strftime("%B %d, %Y"),
        'due_date': due_date.strftime("%B %d, %Y") if due_date else None,
        'client_name': obj.client_name,
        'client_email': obj.client_email,
        'client_address': obj.client_address,
        'items': obj.items,
        'subtotal': subtotal,
        'vat_amount': vat_amount,
        'grand_total_with_vat': grand_total_with_vat,
        'grand_total_words': num2words(grand_total_with_vat),
        'is_invoice': is_invoice,
    }
    
    logo_path = os.path.join(settings.BASE_DIR, 'crm/static/crm/img/clickai_logo.jpg')
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            context['logo_data'] = encoded_string
    
    try:
        pdf_content = generate_pdf('crm/invoice.html', context, request)
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{number}.pdf"'
        return response
    except Exception as e:
        print(f"Error generating PDF: {str(e)}") 
        return None

class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all().order_by('-created_at')
    serializer_class = QuotationSerializer
    pagination_class = StandardResultsSetPagination

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        quotation = self.get_object()
        response = generate_finance_pdf(quotation, request, is_invoice=False)
        if response:
            return response
        return Response({"error": "Failed to generate PDF quotation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        if not serializer.validated_data.get('quotation_number'):
            today = timezone.now()
            random_suffix = random.randint(100000, 999999)
            quotation_number = f"QUO-{today.year}-{random_suffix}"
            serializer.save(created_by=self.request.user, quotation_number=quotation_number)
        else:
            serializer.save(created_by=self.request.user)

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer
    pagination_class = StandardResultsSetPagination
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        response = generate_finance_pdf(invoice, request, is_invoice=True)
        if response:
            return response
        return Response({"error": "Failed to generate PDF invoice"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        if not serializer.validated_data.get('invoice_number'):
            today = timezone.now()
            random_suffix = random.randint(100000, 999999)
            invoice_number = f"INV-{today.year}-{random_suffix}"
            serializer.save(created_by=self.request.user, invoice_number=invoice_number)
        else:
            serializer.save(created_by=self.request.user)
