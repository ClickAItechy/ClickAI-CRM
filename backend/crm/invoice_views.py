from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import HttpResponse
from django.utils import timezone
from .models import Invoice
from .serializers import InvoiceSerializer
from .utils import generate_pdf
import random

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        # Return all for now, can filter by team later
        return Invoice.objects.all().order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        
        # Prepare context for template
        context = {
            'invoice_number': invoice.invoice_number,
            'date': invoice.issued_date.strftime("%B %d, %Y"),
            'client_name': invoice.client_name,
            'client_email': invoice.client_email,
            'client_address': invoice.client_address,
            'items': invoice.items,
            'grand_total': invoice.grand_total,
        }
        
        try:
            pdf_content = generate_pdf('crm/invoice.html', context, request)
            
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{invoice.invoice_number}.pdf"'
            
            return response
            
        except Exception as e:
            print(f"Error generating PDF: {str(e)}")
            return Response({"error": "Failed to generate PDF invoice"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # Auto-generate invoice number if not provided
        if not serializer.validated_data.get('invoice_number'):
            today = timezone.now()
            # Simple unique ID generation
            random_suffix = random.randint(1000, 9999)
            invoice_number = f"INV-{today.year}-{random_suffix}"
            serializer.save(created_by=self.request.user, invoice_number=invoice_number)
        else:
            serializer.save(created_by=self.request.user)
