import { useState, useEffect } from 'react';
import { NumericInput } from '@/components/ui/numeric-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Hash, 
  Package,
  DollarSign,
  BarChart3,
  Users,
  FileText,
  Calendar,
  ArrowLeft,
  Download,
  Shield
} from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSession } from '@/lib/auth';
import { Trash2, AlertTriangle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  company_name?: string;
  company_email?: string;
  contact_number?: string;
  gst_number?: string;
  address?: string;
  trade_name?: string;
  pan?: string;
  upi_id?: string;
  logo_url?: string;
  bank_account_number?: string;
  account_holder_name?: string;
  account_no?: string;
  branch?: string;
  ifsc_code?: string;
  default_cgst_pct?: number;
  default_sgst_pct?: number;
  default_cess_pct?: number;
  created_at: string;
  prefix?: string;
  user_count?: number;
  bill_count?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  hsn_sac?: string;
  hsn_sac_type?: 'HSN' | 'SAC';
  cgst_rate: number;
  sgst_rate: number;
  cess_rate: number;
  created_at: string;
}

interface CompanyDetailsFullProps {
  company: Company;
  onBack: () => void;
}

export function CompanyDetailsFull({ company, onBack }: CompanyDetailsFullProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    totalQuotations: 0,
    recentActivity: []
  });
  const [bills, setBills] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Edit company state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: company.company_name || company.name,
    company_email: company.company_email || '',
    contact_number: company.contact_number || '',
    gst_number: company.gst_number || '',
    address: company.address || '',
    trade_name: company.trade_name || '',
    pan: company.pan || '',
    upi_id: company.upi_id || '',
    logo_url: company.logo_url || '',
    bank_account_number: company.bank_account_number || '',
    account_holder_name: company.account_holder_name || '',
    account_no: company.account_no || '',
    branch: company.branch || '',
    ifsc_code: company.ifsc_code || '',
    default_cgst_pct: company.default_cgst_pct ?? 9,
    default_sgst_pct: company.default_sgst_pct ?? 9,
    default_cess_pct: company.default_cess_pct ?? 0,
    prefix: company.prefix || '',
  });

  // Product actions state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: 0,
    unit: 'PCS',
    hsn_sac: '',
    hsn_sac_type: 'HSN' as 'HSN' | 'SAC',
    cgst_rate: 9,
    sgst_rate: 9,
    cess_rate: 0,
  });

  const [activity, setActivity] = useState<any[]>([]);
  const session = getSession();
  const actor_id = session?.user?.id;

  useEffect(() => {
    setFormData({
      company_name: company.company_name || company.name,
      company_email: company.company_email || '',
      contact_number: company.contact_number || '',
      gst_number: company.gst_number || '',
      address: company.address || '',
      trade_name: company.trade_name || '',
      pan: company.pan || '',
      upi_id: company.upi_id || '',
      logo_url: company.logo_url || '',
      bank_account_number: company.bank_account_number || '',
      account_holder_name: company.account_holder_name || '',
      account_no: company.account_no || '',
      branch: company.branch || '',
      ifsc_code: company.ifsc_code || '',
      default_cgst_pct: company.default_cgst_pct ?? 9,
      default_sgst_pct: company.default_sgst_pct ?? 9,
      default_cess_pct: company.default_cess_pct ?? 0,
      prefix: company.prefix || '',
    });
  }, [company]);

  useEffect(() => {
    fetchCompanyData();
  }, [company.id]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsRes = await fetch(`/api/admin/companies/${company.id}/products`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }

      // Fetch company stats
      const statsRes = await fetch(`/api/admin/companies/${company.id}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalRevenue: statsData.stats?.total_revenue || 0,
          totalInvoices: statsData.stats?.invoice_count || 0,
          totalQuotations: statsData.stats?.quotation_count || 0,
          recentActivity: statsData.recent_activity || []
        });
      }

      // Fetch company bills
      const billsRes = await fetch(`/api/admin/bills?companyId=${company.id}`);
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData.bills || []);
      }

      // Fetch company activity
      const activityRes = await fetch(`/api/admin/companies/${company.id}/activity`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.activity || []);
      }
    } catch (error) {
      console.error('Failed to fetch company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const switchToProductsTab = () => {
    setActiveTab('products');
  };

  const handleEditCompany = () => {
    setIsEditing(true);
  };

  const handleSaveCompany = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, actor_id }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update company');
      }

      toast({
        title: 'Success',
        description: 'Company details updated successfully',
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      company_name: company.company_name || company.name,
      company_email: company.company_email || '',
      contact_number: company.contact_number || '',
      gst_number: company.gst_number || '',
      address: company.address || '',
      trade_name: company.trade_name || '',
      pan: company.pan || '',
      upi_id: company.upi_id || '',
      logo_url: company.logo_url || '',
      bank_account_number: company.bank_account_number || '',
      account_holder_name: company.account_holder_name || '',
      account_no: company.account_no || '',
      branch: company.branch || '',
      ifsc_code: company.ifsc_code || '',
      default_cgst_pct: company.default_cgst_pct ?? 9,
      default_sgst_pct: company.default_sgst_pct ?? 9,
      default_cess_pct: company.default_cess_pct ?? 0,
      prefix: company.prefix || '',
    });
    setIsEditing(false);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductFormData({
      name: product.name,
      price: product.price,
      unit: product.unit,
      hsn_sac: product.hsn_sac || '',
      hsn_sac_type: product.hsn_sac_type || 'HSN',
      cgst_rate: product.cgst_rate,
      sgst_rate: product.sgst_rate,
      cess_rate: product.cess_rate,
    });
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...productFormData, 
          company_id: company.id, 
          actor_id 
        }),
      });
      
      if (!res.ok) throw new Error('Failed to update product');

      toast({ title: 'Success', description: 'Product updated successfully' });
      setIsEditingProduct(false);
      fetchCompanyData(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/products/${selectedProduct.id}?company_id=${company.id}&actor_id=${actor_id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete product');

      toast({ title: 'Success', description: 'Product deleted successfully' });
      setIsDeletingProduct(false);
      fetchCompanyData(); // Refresh list
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadProducts = () => {
    if (products.length === 0) return;
    
    const headers = ['Name', 'Price', 'Unit', 'HSN/SAC', 'Type', 'CGST%', 'SGST%', 'CESS%'];
    const csvRows = [
      headers.join(','),
      ...products.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        p.price,
        p.unit,
        p.hsn_sac || '',
        p.hsn_sac_type || '',
        p.cgst_rate,
        p.sgst_rate,
        p.cess_rate
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(company.company_name || company.name).replace(/\s+/g, '_')}_products.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Success', description: 'Product list downloaded as CSV' });
  };

  const handleProductAction = (action: string) => {
    toast({
      title: 'Action Triggered',
      description: `${action} product functionality coming soon.`,
    });
  };

  const downloadBillPDF = async (bill: any) => {
    try {
      toast({ title: "Generating PDF...", description: "Please wait while we prepare your document." });
      
      // Fetch bill items
      const res = await fetch(`/api/admin/bills/${bill.id}/items`);
      if (!res.ok) throw new Error('Failed to fetch bill items');
      const itemsData = await res.json();
      const items = itemsData.items || [];

      // Fetch seller info
      const sellerRes = await fetch(`/api/admin/companies/seller-info?companyName=${encodeURIComponent(company.company_name || company.name)}`);
      const sellerInfoData = sellerRes.ok ? await sellerRes.json() : {};

      const customerDetails = {
        name: bill.customer_name,
        address: bill.customer_address,
      };

      // Create modal for PDF preview
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
        overflow-y: auto; padding: 20px; box-sizing: border-box;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background-color: white; width: 210mm; min-height: 297mm;
        position: relative; margin: auto; overflow: visible;
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      const controlPanel = document.createElement('div');
      controlPanel.style.cssText = `
        position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 10002;
      `;

      const downloadButton = document.createElement('button');
      downloadButton.innerHTML = '📥 Download PDF';
      downloadButton.style.cssText = `
        background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;
      `;

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕ Close';
      closeButton.style.cssText = `
        background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;
      `;

      const root = createRoot(content);
      
      const cleanup = () => {
        root.unmount();
        document.body.removeChild(modal);
      };

      downloadButton.onclick = async () => {
        try {
          downloadButton.innerHTML = '⏳ Generating...';
          const html2pdf = (await import('html2pdf.js')).default;
          await html2pdf().from(content).set({
            margin: 0.4,
            filename: `${bill.type}_${bill.invoice_number}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).save();
          downloadButton.innerHTML = '📥 Download PDF';
        } catch (err) {
          console.error(err);
          downloadButton.innerHTML = 'Error!';
        }
      };

      closeButton.onclick = cleanup;
      controlPanel.appendChild(downloadButton);
      controlPanel.appendChild(closeButton);
      modal.appendChild(controlPanel);

      // Calculate bill calculations
      let subtotal = Number(bill.subtotal_amount) || 0;
      let taxableValue = Number(bill.taxable_amount) || 0;
      let cgst = Number(bill.cgst_amount) || 0;
      let sgst = Number(bill.sgst_amount) || 0;
      let cess = Number(bill.cess_amount) || 0;
      const globalDiscount = Number(bill.discount || 0);

      // Legacy calculation fallback
      if (!subtotal && items.length > 0) {
        subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
        taxableValue = subtotal - globalDiscount;
        if (bill.is_gst_bill) {
          items.forEach((item: any) => {
            const itemGross = item.quantity * item.price;
            const globalDiscProportion = subtotal > 0 ? (itemGross / subtotal) * globalDiscount : 0;
            const itemTaxable = itemGross - globalDiscProportion;
            const taxAmt = itemTaxable * (item.tax_rate || 0) / 100;
            cgst += taxAmt / 2;
            sgst += taxAmt / 2;
            cess += itemTaxable * (item.cess_rate || 0) / 100;
          });
        }
      }

      // Import and render the invoice template
      const { default: InvoiceTemplate } = await import('@/components/templates/InvoiceTemplate');
      
      root.render(
        <InvoiceTemplate
          billCalculations={{
            sgst, cgst, cess, taxableValue, subtotal, 
            grandTotal: bill.total_amount, discount: globalDiscount
          }}
          billDetails={bill}
          items={items}
          customerDetails={customerDetails}
          sellerInfo={sellerInfoData.sellerInfo || undefined}
        />
      );

      modal.onclick = (e) => {
        if (e.target === modal) cleanup();
      };

    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{company.company_name || company.name}</h1>
            <p className="text-sm text-muted-foreground">Company Details & Products</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{company.user_count || 0}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{company.bill_count || 0}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">{formatDate(company.created_at)}</p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleEditCompany}>
                  Edit Details
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Company Name</Label>
                    <p className="font-medium">{formData.company_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prefix</Label>
                    <p className="font-medium">{company.prefix || 'Not set'}</p>
                  </div>
                </div>
                
                {formData.company_email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Business Email</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {formData.company_email}
                    </p>
                  </div>
                )}
                
                {formData.contact_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Number</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {formData.contact_number}
                    </p>
                  </div>
                )}
                
                {formData.gst_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">GST Number</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {formData.gst_number}
                    </p>
                  </div>
                )}
                
                {formData.address && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-medium flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      {formData.address}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Trade Name</Label>
                    <p className="font-medium">{formData.trade_name || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">PAN</Label>
                    <p className="font-medium uppercase">{formData.pan || '—'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">UPI ID</Label>
                  <p className="font-medium">{formData.upi_id || '—'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Hash className="h-5 w-5 text-blue-600" />
                  Bank Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Holder</Label>
                    <p className="font-medium text-sm">{formData.account_holder_name || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IFSC Code</Label>
                    <p className="font-medium text-sm uppercase">{formData.ifsc_code || '—'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Account Number</Label>
                  <p className="font-medium text-sm">{formData.account_no || formData.bank_account_number || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Branch</Label>
                  <p className="font-medium text-sm">{formData.branch || '—'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Branding & Defaults */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-5 w-5 text-green-600" />
                  Branding & Tax Defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.logo_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Logo URL</Label>
                    <p className="font-medium text-xs text-blue-600 truncate underline cursor-pointer" onClick={() => window.open(formData.logo_url, '_blank')}>
                      {formData.logo_url}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-lg border">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">CGST %</Label>
                    <p className="font-bold">{formData.default_cgst_pct}%</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">SGST %</Label>
                    <p className="font-bold">{formData.default_sgst_pct}%</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">CESS %</Label>
                    <p className="font-bold">{formData.default_cess_pct}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Products Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading products...</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products found</p>
                ) : (
                  <div className="space-y-2">
                    {products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(product.price)}</p>
                          {product.hsn_sac && (
                            <Badge variant="outline" className="text-xs">
                              {product.hsn_sac_type}: {product.hsn_sac}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {products.length > 5 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={switchToProductsTab}
                      >
                        View all {products.length} products
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products Catalog ({products.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadProducts} disabled={products.length === 0} className="gap-2">
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                  <Button size="sm" onClick={() => handleProductAction('Add')}>
                    Add Product
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No products found</p>
                  <Button size="sm" onClick={() => handleProductAction('Add')}>Add Your First Product</Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {products.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <Badge variant="outline">{product.unit}</Badge>
                          </div>
                          
                          {product.hsn_sac && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {product.hsn_sac_type}: {product.hsn_sac}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="font-medium">{formatCurrency(product.price)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">CGST</p>
                              <p className="font-medium">{product.cgst_rate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">SGST</p>
                              <p className="font-medium">{product.sgst_rate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">CESS</p>
                              <p className="font-medium">{product.cess_rate}%</p>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Added on {formatDate(product.created_at)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>Edit</Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive" 
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsDeletingProduct(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices & Quotations ({bills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">
                  No documents found for this company.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Invoice #</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">GST</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map(bill => (
                        <TableRow key={bill.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-medium">{bill.invoice_number}</TableCell>
                          <TableCell>
                            <Badge variant={bill.type === 'quotation' ? 'secondary' : 'default'} className="text-[10px] uppercase">
                              {bill.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{bill.customer_name}</TableCell>
                          <TableCell className="text-right font-semibold">₹{Number(bill.total_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(bill.date_of_bill || bill.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bill.is_gst_bill ? 'outline' : 'secondary'} className="text-[10px]">
                              {bill.is_gst_bill ? 'GST' : 'Non-GST'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs gap-1.5"
                              onClick={() => downloadBillPDF(bill)}
                            >
                              <Download className="h-3 w-3" /> PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading activity...</p>
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">
                  No recent activity found.
                </div>
              ) : (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`mt-1 p-1.5 rounded-full ${
                        item.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        item.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.action === 'CREATE' && <Package className="h-3.5 w-3.5" />}
                        {item.action === 'UPDATE' && <Hash className="h-3.5 w-3.5" />}
                        {item.action === 'DELETE' && <Trash2 className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            <span className="font-bold">{item.action}</span> {item.entity_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {item.actor_username || item.actor_email || 'System'}
                        </p>
                        {item.action === 'UPDATE' && item.old_data && item.new_data && (
                          <div className="mt-2 text-[10px] grid grid-cols-2 gap-2 bg-muted/50 p-2 rounded">
                             <div>
                               <p className="font-semibold text-muted-foreground mb-1 uppercase">Changes:</p>
                               {Object.keys(item.new_data).map(key => {
                                 if (item.new_data[key] !== item.old_data[key]) {
                                   return (
                                     <div key={key} className="truncate">
                                       <span className="text-muted-foreground">{key}:</span> {String(item.old_data[key] || '—')} → {String(item.new_data[key])}
                                     </div>
                                   );
                                 }
                                 return null;
                               })}
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription>
              Update comprehensive information for <strong>{company.company_name || company.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="bank">Banking</TabsTrigger>
              <TabsTrigger value="branding">Branding & Tax</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={formData.company_name} 
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={formData.company_email} 
                    onChange={e => setFormData({ ...formData, company_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input 
                    value={formData.contact_number} 
                    onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input 
                    value={formData.gst_number} 
                    onChange={e => setFormData({ ...formData, gst_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix (e.g. INV)</Label>
                  <Input 
                    value={formData.prefix} 
                    onChange={e => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                    placeholder="INV"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PAN</Label>
                  <Input 
                    value={formData.pan} 
                    onChange={e => setFormData({ ...formData, pan: e.target.value })}
                    placeholder="ABCDE1234F"
                  />
                </div>
              <div className="space-y-2">
                <Label>Trade Name</Label>
                <Input 
                  value={formData.trade_name} 
                  onChange={e => setFormData({ ...formData, trade_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input 
                  value={formData.account_holder_name} 
                  onChange={e => setFormData({ ...formData, account_holder_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input 
                  value={formData.account_no || formData.bank_account_number} 
                  onChange={e => setFormData({ ...formData, account_no: e.target.value, bank_account_number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input 
                    value={formData.ifsc_code} 
                    onChange={e => setFormData({ ...formData, ifsc_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input 
                    value={formData.branch} 
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input 
                  value={formData.upi_id} 
                  onChange={e => setFormData({ ...formData, upi_id: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input 
                  value={formData.logo_url} 
                  onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Default CGST %</Label>
                  <NumericInput 
                    value={formData.default_cgst_pct ?? 0}
                    onChange={(v) => setFormData({ ...formData, default_cgst_pct: v })}
                    decimals={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default SGST %</Label>
                  <NumericInput 
                    value={formData.default_sgst_pct ?? 0}
                    onChange={(v) => setFormData({ ...formData, default_sgst_pct: v })}
                    decimals={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default CESS %</Label>
                  <NumericInput 
                    value={formData.default_cess_pct ?? 0}
                    onChange={(v) => setFormData({ ...formData, default_cess_pct: v })}
                    decimals={2}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditingProduct} onOpenChange={setIsEditingProduct}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details, pricing, and tax settings for your catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Product Name</Label>
              <Input 
                value={productFormData.name} 
                onChange={e => setProductFormData({ ...productFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <NumericInput 
                value={productFormData.price ?? 0}
                onChange={(v) => setProductFormData({ ...productFormData, price: v })}
                decimals={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input 
                value={productFormData.unit} 
                onChange={e => setProductFormData({ ...productFormData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>HSN/SAC Code</Label>
              <Input 
                value={productFormData.hsn_sac} 
                onChange={e => setProductFormData({ ...productFormData, hsn_sac: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code Type</Label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={productFormData.hsn_sac_type}
                onChange={e => setProductFormData({ ...productFormData, hsn_sac_type: e.target.value as 'HSN' | 'SAC' })}
              >
                <option value="HSN">HSN</option>
                <option value="SAC">SAC</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>CGST Rate (%)</Label>
              <NumericInput 
                value={productFormData.cgst_rate ?? 0}
                onChange={(v) => setProductFormData({ ...productFormData, cgst_rate: v })}
                decimals={2}
              />
            </div>
            <div className="space-y-2">
              <Label>SGST Rate (%)</Label>
              <NumericInput 
                value={productFormData.sgst_rate ?? 0}
                onChange={(v) => setProductFormData({ ...productFormData, sgst_rate: v })}
                decimals={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProduct(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveProduct} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={isDeletingProduct} onOpenChange={setIsDeletingProduct}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedProduct?.name}</strong>? This will not affect existing invoices but the product will no longer be available for new ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteProduct(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
            >
              {isSaving ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
