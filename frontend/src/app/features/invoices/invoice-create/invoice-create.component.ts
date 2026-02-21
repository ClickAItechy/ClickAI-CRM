import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvoiceService, Invoice, InvoiceItem } from '../invoice.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-invoice-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './invoice-create.component.html',
    styleUrls: ['./invoice-create.component.css']
})
export class InvoiceCreateComponent implements OnInit {
    invoiceForm: FormGroup;
    isGenerating = false;
    isEditMode = false;
    invoiceId: number | null = null;

    // Custom dropdown state
    activeDropdownIndex: number | null = null;
    activeDropdownType: 'service' | 'qty' | null = null;

    qtyOptions = ['1', 'Per Month', 'Per Year'];

    serviceOptions: string[] = [
        'AI-ChatBots',
        'CRMs',
        'Domain',
        'E-commerce',
        'Portfolio Websites',
        'Professional E-mails',
        'Professional E-commerce',
        'SEO',
        'Service Charge',
        'Social Media Package',
        'Static Website'
    ];

    constructor(
        private fb: FormBuilder,
        private invoiceService: InvoiceService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.invoiceForm = this.fb.group({
            client_name: ['', Validators.required],
            client_email: ['', [Validators.email]],
            client_address: [''],
            items: this.fb.array([])
        });
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.isEditMode = true;
            this.invoiceId = +idParam;
            this.loadInvoice(this.invoiceId);
        } else {
            this.addItem();
        }
    }

    loadInvoice(id: number) {
        this.invoiceService.getInvoice(id).subscribe({
            next: (invoice) => {
                this.invoiceForm.patchValue({
                    client_name: invoice.client_name,
                    client_email: invoice.client_email,
                    client_address: invoice.client_address
                });

                const itemsArray = this.invoiceForm.get('items') as FormArray;
                itemsArray.clear();

                invoice.items.forEach(item => {
                    const itemGroup = this.fb.group({
                        name: [item.name, Validators.required],
                        price: [Number(item.price) || 0, [Validators.required, Validators.min(0)]],
                        quantity: [item.quantity, Validators.required],
                        subtotal: [{ value: Number(item.subtotal) || 0, disabled: true }]
                    });
                    // Subscribe to changes for this item
                    itemGroup.valueChanges.subscribe(() => {
                        this.updateSubtotal(itemGroup);
                    });
                    itemsArray.push(itemGroup);
                });
            },
            error: (err) => {
                console.error('Error loading quotation', err);
                this.showToast('error', 'Could not load quotation details.');
                this.router.navigate(['/dashboard/invoices']);
            }
        });
    }

    get items(): FormArray {
        return this.invoiceForm.get('items') as FormArray;
    }

    newItem(): FormGroup {
        return this.fb.group({
            name: ['', Validators.required],
            price: [0, [Validators.required, Validators.min(0)]],
            quantity: ['1', Validators.required],
            subtotal: [{ value: 0, disabled: true }]
        });
    }

    addItem() {
        const itemGroup = this.newItem();
        itemGroup.valueChanges.subscribe(() => {
            this.updateSubtotal(itemGroup);
        });
        this.items.push(itemGroup);
    }

    removeItem(index: number) {
        this.items.removeAt(index);
    }

    updateSubtotal(itemGroup: FormGroup) {
        const price = Number(itemGroup.get('price')?.value) || 0;
        const qtyValue = itemGroup.get('quantity')?.value;

        // Multiplier is 1 for periodic billing, otherwise numeric quantity
        let multiplier = 1;
        if (qtyValue === 'Per Month' || qtyValue === 'Per Year') {
            multiplier = 1;
        } else {
            multiplier = parseFloat(qtyValue) || 0;
        }

        const subtotal = price * multiplier;
        const subtotalControl = itemGroup.get('subtotal');

        if (subtotalControl?.value !== subtotal) {
            subtotalControl?.setValue(subtotal, { emitEvent: false });
        }
    }

    getAsFormGroup(control: any): FormGroup {
        return control as FormGroup;
    }

    // Custom Dropdown Logic
    toggleDropdown(index: number, type: 'service' | 'qty', event: Event) {
        event.stopPropagation();
        if (this.activeDropdownIndex === index && this.activeDropdownType === type) {
            this.closeAllDropdowns();
        } else {
            this.activeDropdownIndex = index;
            this.activeDropdownType = type;
        }
    }

    selectOption(index: number, type: 'service' | 'qty', value: string) {
        const itemGroup = this.items.at(index) as FormGroup;
        if (type === 'service') {
            itemGroup.get('name')?.setValue(value);
        } else {
            itemGroup.get('quantity')?.setValue(value);
            this.updateSubtotal(itemGroup);
        }
        this.closeAllDropdowns();
    }

    closeAllDropdowns() {
        this.activeDropdownIndex = null;
        this.activeDropdownType = null;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        this.closeAllDropdowns();
    }

    get subtotal(): number {
        return this.items.controls.reduce((acc, curr) => {
            const group = curr as FormGroup;
            const itemSubtotal = Number(group.get('subtotal')?.value) || 0;
            return acc + itemSubtotal;
        }, 0);
    }

    get vatAmount(): number {
        return this.subtotal * 0.05;
    }

    get grandTotal(): number {
        return this.subtotal + this.vatAmount;
    }

    saveInvoice() {
        if (this.invoiceForm.invalid) {
            this.invoiceForm.markAllAsTouched();
            this.showToast('warning', 'Please fill in all required fields.');
            return;
        }

        this.isGenerating = true;
        const formValue = this.invoiceForm.getRawValue();

        // Map items to include subtotal manually since it's disabled
        const items: any[] = formValue.items.map((item: any) => {
            const qtyValue = item.quantity;
            let multiplier = 1;
            if (qtyValue === 'Per Month' || qtyValue === 'Per Year') {
                multiplier = 1;
            } else {
                multiplier = parseFloat(qtyValue) || 0;
            }
            return {
                name: item.name,
                price: Number(item.price) || 0,
                quantity: item.quantity,
                subtotal: (Number(item.price) || 0) * multiplier
            };
        });

        const invoiceData: Invoice = {
            client_name: formValue.client_name,
            client_email: formValue.client_email,
            client_address: formValue.client_address,
            items: items,
            grand_total: this.grandTotal
        };

        const request = this.isEditMode && this.invoiceId
            ? this.invoiceService.updateInvoice(this.invoiceId, invoiceData)
            : this.invoiceService.createInvoice(invoiceData);

        request.subscribe({
            next: (savedInvoice) => {
                this.isGenerating = false;

                Swal.fire({
                    title: 'Quotation Saved!',
                    text: 'What would you like to do next?',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonColor: '#3b82f6',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Download PDF',
                    cancelButtonText: 'Go to List'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (savedInvoice.id) {
                            this.invoiceService.downloadPdf(savedInvoice.id).subscribe({
                                next: (blob) => {
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url);
                                    this.router.navigate(['/dashboard/invoices']);
                                },
                                error: (err) => {
                                    console.error('PDF download error', err);
                                    this.showToast('error', 'Failed to generate PDF');
                                }
                            });
                        }
                    } else {
                        this.router.navigate(['/dashboard/invoices']);
                    }
                });
            },
            error: (err) => {
                console.error('Error saving quotation', err);
                this.showToast('error', 'Failed to save quotation.');
                this.isGenerating = false;
            }
        });
    }

    private showToast(icon: 'success' | 'error' | 'warning' | 'info', title: string) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: icon,
            title: title
        });
    }
}
