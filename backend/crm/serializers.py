from rest_framework import serializers
from .models import Invoice, Quotation, User

class QuotationSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'client_name', 'client_email', 
            'client_address', 'payment_terms', 'items', 'grand_total', 
            'issued_date', 'valid_until', 'status', 'created_by', 
            'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'quotation_number']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class InvoiceSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client_name', 'client_email', 
            'client_address', 'payment_terms', 'items', 'grand_total', 
            'issued_date', 'due_date', 'status', 'created_by', 
            'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'invoice_number']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
