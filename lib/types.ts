export interface SellerInfo {
  id?: string;
  company_name: string;
  email: string;
  contact_number: string;
  address?: string;
  gst_number?: string;
  bank_account_number?: string;
  account_holder_name?: string;
  account_no?: string;
  branch?: string;
  ifsc_code?: string;
  trade_name?: string;
  pan?: string;
  upi_id?: string;
  logo_url?: string;
  default_cgst_pct?: number;
  default_sgst_pct?: number;
  default_cess_pct?: number;
  payment_terms?: string;
  terms_and_conditions?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  hsn_sac?: string;
  hsn_sac_type?: 'HSN' | 'SAC';
  tax_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  cess_rate?: number;
}

export interface BillItem {
  id?: string;
  bill_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  price: number;
  unit: string;
  hsn_sac?: string;
  hsn_sac_type?: 'HSN' | 'SAC';
  tax_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  cess_rate?: number;
  discount_pct?: number;
  additional_desc?: string;
}

export interface Bill {
  id: string;
  invoice_number: string;
  created_at: string;
  date_of_bill: string;
  total_amount: number;
  paid_amount: number;
  is_gst_bill: boolean;
  type: "invoice" | "quotation";
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_gstin?: string;
  comments?: string;
  created_by?: string;
  updated_by?: string;
  created_by_username?: string;
  updated_by_username?: string;
  // Global percentages
  cgst_percentage?: number;
  sgst_percentage?: number;
  cess_percentage?: number;
  discount?: number;
  subtotal_amount?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  cess_amount?: number;
}

export interface AuditLog {
  id: string;
  company_id: string;
  entity_name: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  actor_id?: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}
