'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signOut } from '@/lib/auth';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CompanyDetailsView } from '@/components/admin/CompanyDetailsView';
import { CompanyDetailsFull } from '@/components/admin/CompanyDetailsFull';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Users, FileText, Plus, Crown,
  UserPlus, LogOut, RefreshCw, Shield, Activity,
  XCircle, CheckCircle2, Clock, Download, Search, Filter, ChevronDown,
  DatabaseBackup,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface Company {
  id: string;
  name: string;
  created_at: string;
  company_name?: string;
  company_email?: string;
  contact_number?: string;
  gst_number?: string;
  address?: string;
  user_count: number;
  bill_count: number;
}

interface CompanyUser {
  id: string;
  email: string;
  username?: string;
  is_superadmin: boolean;
  is_primary: boolean;
  created_at: string;
  company_id?: string;
  company_name?: string;
}

interface Bill {
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
  cgst_percentage?: number;
  sgst_percentage?: number;
  cess_percentage?: number;
  discount?: number;
  subtotal_amount?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  cess_amount?: number;
  company_name: string;
  created_by_email?: string;
  status?: string;
}

interface Session {
  id: string;
  token: string;
  user_id: string;
  user_email: string;
  username?: string;
  is_superadmin: boolean;
  company_name?: string;
  created_at: string;
  expires_at: string;
  last_active: string;
  terminated_at?: string;
  terminated_by_email?: string;
  ip_address?: string;
  user_agent?: string;
}

// ─── Component ───────────────────────────────────────────────
export function AdminPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const session = getSession();

  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  // Create Company form
  const [companyDialog, setCompanyDialog] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '', email: '', contact_number: '',
    primary_user_email: '', primary_user_password: '', primary_user_username: '',
  });
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Add User form
  const [userDialog, setUserDialog] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [userForm, setUserForm] = useState({
    email: '', username: '', password: '', is_primary: false,
  });
  const [addingUser, setAddingUser] = useState(false);

  // Search filters
  const [companiesSearch, setCompaniesSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [sessionsSearch, setSessionsSearch] = useState('');

  // Bills filters
  const [billsCompanyFilter, setBillsCompanyFilter] = useState('');
  const [billsTypeFilter, setBillsTypeFilter] = useState('');
  const [billsSearch, setBillsSearch] = useState('');
  const [billsDateFrom, setBillsDateFrom] = useState('');
  const [billsDateTo, setBillsDateTo] = useState('');

  // Company details view
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  // ── Guard ──
  if (!session?.user?.is_superadmin) {
    router.replace('/auth');
    return null;
  }

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, userRes, billRes, sessRes] = await Promise.all([
        fetch('/api/admin/companies').then(r => r.json()),
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/admin/bills').then(r => r.json()),
        fetch('/api/admin/sessions').then(r => r.json()),
      ]);
      setCompanies(compRes.companies || []);
      setUsers(userRes.users || []);
      setBills(billRes.bills || []);
      setSessions(sessRes.sessions || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ──
  const handleCreateCompany = async () => {
    if (!companyForm.name || !companyForm.primary_user_email || !companyForm.primary_user_password) {
      toast({ title: 'Validation Error', description: 'Company name, user email and password are required.', variant: 'destructive' });
      return;
    }
    setCreatingCompany(true);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Company created!', description: `${companyForm.name} is now onboarded.` });
      setCompanyDialog(false);
      setCompanyForm({ name: '', email: '', contact_number: '', primary_user_email: '', primary_user_password: '', primary_user_username: '' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setCreatingCompany(false);
  };

  const handleAddUser = async () => {
    if (!userForm.email || !userForm.password || !selectedCompanyId) {
      toast({ title: 'Validation Error', description: 'Email, password and company are required.', variant: 'destructive' });
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userForm, company_id: selectedCompanyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'User added!', description: `${userForm.email} added to company.` });
      setUserDialog(false);
      setUserForm({ email: '', username: '', password: '', is_primary: false });
      setSelectedCompanyId('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAddingUser(false);
  };

  const handleLogout = () => { signOut(); router.push('/auth'); };

  const handleTerminateSession = async (sessionId: string) => {
    if (!session?.user?.id) return;
    setTerminatingSession(sessionId);
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, admin_user_id: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Session terminated', description: 'The user will be logged out on their next action.' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setTerminatingSession(null);
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDetails(true);
  };

  const handleBackToList = () => {
    setShowCompanyDetails(false);
    setSelectedCompany(null);
  };

  const handleCompanyUpdate = async (updatedCompany: Partial<Company>) => {
    try {
      const res = await fetch(`/api/admin/companies/${selectedCompany?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCompany),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: 'Company updated!', description: 'Company details have been updated successfully.' });
      
      // Update the company in the local state
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany?.id ? { ...c, ...updatedCompany } : c
      ));
      
      // Update the selected company
      setSelectedCompany(prev => prev ? { ...prev, ...updatedCompany } : null);
      
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const downloadBillPDF = async (bill: Bill) => {
    try {
      // Fetch bill items
      const res = await fetch(`/api/admin/bills/${bill.id}/items`);
      if (!res.ok) throw new Error('Failed to fetch bill items');
      const itemsData = await res.json();
      const items = itemsData.items || [];

      // Fetch seller info
      const sellerRes = await fetch(`/api/admin/companies/seller-info?companyName=${encodeURIComponent(bill.company_name)}`);
      const sellerInfo = sellerRes.ok ? await sellerRes.json() : {};

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
          sellerInfo={sellerInfo.sellerInfo || undefined}
        />
      );

      modal.onclick = (e) => {
        if (e.target === modal) cleanup();
      };
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredBills = bills.filter(b => {
    if (billsCompanyFilter && b.company_name !== billsCompanyFilter) return false;
    if (billsTypeFilter && b.type !== billsTypeFilter) return false;
    if (billsSearch) {
      const q = billsSearch.toLowerCase();
      if (!b.invoice_number.toLowerCase().includes(q) && !b.customer_name.toLowerCase().includes(q)) return false;
    }
    if (billsDateFrom && new Date(b.date_of_bill) < new Date(billsDateFrom)) return false;
    if (billsDateTo && new Date(b.date_of_bill) > new Date(billsDateTo)) return false;
    return true;
  });

  // Group filtered bills by company
  const billsByCompany = filteredBills.reduce<Record<string, Bill[]>>((acc, b) => {
    const key = b.company_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const exportCSV = (companyName: string, rows: Bill[]) => {
    const headers = ['Invoice #', 'Type', 'Customer', 'Amount', 'Date', 'GST'];
    const csvRows = rows.map(b => [
      b.invoice_number,
      b.type,
      b.customer_name,
      Number(b.total_amount).toFixed(2),
      new Date(b.date_of_bill).toLocaleDateString(),
      b.is_gst_bill ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_documents.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCSV = () => exportCSV('all_companies', filteredBills);

  /** Download a full SQL backup of the database */
  const handleBackup = async () => {
    setBackupLoading(true);
    toast({ title: 'Generating backup…', description: 'This may take a few seconds.' });
    try {
      const res = await fetch('/api/admin/backup', { credentials: 'same-origin' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      // Extract filename from Content-Disposition header
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `laabhampro_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '✅ Backup downloaded', description: `Saved as ${a.download}` });
    } catch (err: any) {
      toast({ title: 'Backup failed', description: err.message, variant: 'destructive' });
    } finally {
      setBackupLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => {
    if (companiesSearch) {
      const q = companiesSearch.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.company_name?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const nonAdminUsers = users.filter(u => !u.is_superadmin);
  const filteredUsers = nonAdminUsers.filter(u => {
    if (usersSearch) {
      const q = usersSearch.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !(u.username?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const activeSessions = sessions.filter(s => !s.terminated_at && new Date(s.expires_at) > new Date());
  
  const filteredSessions = sessions.filter(s => {
    if (sessionsSearch) {
      const q = sessionsSearch.toLowerCase();
      const searchableStr = [
        s.id,
        s.user_email,
        s.username,
        s.company_name,
        s.ip_address,
        s.user_agent,
        s.terminated_by_email,
        s.is_superadmin ? "superadmin" : "",
        s.terminated_at ? "terminated" : "active"
      ].filter(Boolean).join(" ").toLowerCase();
      
      if (!searchableStr.includes(q)) return false;
    }
    return true;
  });

  // ─── Stats ───
  const stats = [
    { label: 'Companies', value: companies.length, icon: Building2, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Users', value: nonAdminUsers.length, icon: Users, color: 'bg-green-500/10 text-green-600' },
    { label: 'Invoices', value: bills.filter(b => b.type === 'invoice').length, icon: FileText, color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Quotations', value: bills.filter(b => b.type === 'quotation').length, icon: FileText, color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Active Sessions', value: activeSessions.length, icon: Activity, color: 'bg-emerald-500/10 text-emerald-600' },
  ];

  // Stats grid — responsive, 3 cols on mobile → 5 on lg
  if (showCompanyDetails && selectedCompany) {
    return (
      <CompanyDetailsFull 
        company={selectedCompany} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-8">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Full platform overview — companies, users &amp; all documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Download SQL Backup */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackup}
            disabled={backupLoading}
            className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30"
          >
            {backupLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <DatabaseBackup className="h-4 w-4" />
            )}
            {backupLoading ? 'Generating…' : 'Backup DB'}
          </Button>

          <Dialog open={userDialog} onOpenChange={setUserDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add User to Company</DialogTitle>
                <DialogDescription>
                  Create a new user account and assign it to a specific company.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="">Select a company…</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="username" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_primary" checked={userForm.is_primary}
                    onChange={e => setUserForm({ ...userForm, is_primary: e.target.checked })} className="h-4 w-4 rounded" />
                  <Label htmlFor="is_primary">Set as Primary User (Company Owner)</Label>
                </div>
                <Button onClick={handleAddUser} disabled={addingUser} className="w-full">
                  {addingUser ? 'Adding…' : 'Add User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Company */}
          <Dialog open={companyDialog} onOpenChange={setCompanyDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Onboard New Company</DialogTitle>
                <DialogDescription>
                  Set up a new business tenant and create their primary administrator account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Email</Label>
                    <Input value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="billing@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input value={companyForm.contact_number} onChange={e => setCompanyForm({ ...companyForm, contact_number: e.target.value })} placeholder="+91 98765…" />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Primary User (Owner)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input value={companyForm.primary_user_email} onChange={e => setCompanyForm({ ...companyForm, primary_user_email: e.target.value })} placeholder="owner@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={companyForm.primary_user_username} onChange={e => setCompanyForm({ ...companyForm, primary_user_username: e.target.value })} placeholder="username" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Password *</Label>
                      <Input type="password" value={companyForm.primary_user_password} onChange={e => setCompanyForm({ ...companyForm, primary_user_password: e.target.value })} placeholder="••••••••" />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateCompany} disabled={creatingCompany} className="w-full">
                  {creatingCompany ? 'Creating…' : 'Create Company & Owner Account'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="shadow-sm border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`p-2.5 rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" /> Companies ({companies.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users ({nonAdminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2">
            <FileText className="h-4 w-4" /> Documents ({bills.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Shield className="h-4 w-4" /> Sessions
            {activeSessions.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 font-bold">{activeSessions.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── COMPANIES ── */}
        <TabsContent value="companies">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">All Companies</CardTitle>
              <div className="relative w-64 text-muted-foreground">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
                <Input 
                  type="search" 
                  placeholder="Search companies..." 
                  className="pl-8 h-9 text-foreground"
                  value={companiesSearch}
                  onChange={e => setCompaniesSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm animate-pulse py-8 text-center">Loading…</p>
              ) : filteredCompanies.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground text-sm">{companies.length === 0 ? "No companies yet." : "No matching companies found."}</p>
                  {companies.length === 0 && <Button size="sm" onClick={() => setCompanyDialog(true)}><Plus className="h-4 w-4 mr-1" /> Create First Company</Button>}
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {filteredCompanies.map(company => {
                    const companyUsers = users.filter(u => u.company_id === company.id);
                    return (
                      <AccordionItem key={company.id} value={company.id} className="border rounded-xl px-4 shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div className="text-left">
                                <div
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCompanyClick(company);
                                  }}
                                  className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer text-left"
                                >
                                  {company.company_name || company.name}
                                </div>
                                <p className="text-xs text-muted-foreground">{company.company_email || 'No email set'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {company.user_count} users
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {company.bill_count} docs
                              </span>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                Since {new Date(company.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pb-4">
                            {/* Company info grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 text-sm border">
                              {company.gst_number && (
                                <div><p className="text-xs text-muted-foreground">GST</p><p className="font-medium">{company.gst_number}</p></div>
                              )}
                              {company.contact_number && (
                                <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium">{company.contact_number}</p></div>
                              )}
                              {company.address && (
                                <div className="col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{company.address}</p></div>
                              )}
                            </div>

                            {/* Users */}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Team Members</p>
                              {companyUsers.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No users linked yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {companyUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border text-sm">
                                      <div className="flex items-center gap-2">
                                        {u.is_primary && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label="Primary" />}
                                        <span className="font-medium">{u.username || u.email}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                      </div>
                                      <Badge variant={u.is_primary ? 'default' : 'secondary'} className="text-[10px]">
                                        {u.is_primary ? 'Primary' : 'Member'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Button
                                size="sm" variant="ghost"
                                className="mt-2 h-7 text-xs gap-1"
                                onClick={() => { setSelectedCompanyId(company.id); setUserDialog(true); }}
                              >
                                <UserPlus className="h-3 w-3" /> Add member
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── USERS ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">All Company Users</CardTitle>
              <div className="relative w-64 text-muted-foreground">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
                <Input 
                  type="search" 
                  placeholder="Search users..." 
                  className="pl-8 h-9 text-foreground"
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm animate-pulse py-8 text-center">Loading…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">{nonAdminUsers.length === 0 ? "No users yet." : "No matching users found."}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.is_primary && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                            {user.username || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {user.company_name
                            ? <Badge variant="outline">{user.company_name}</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_primary ? 'default' : 'secondary'} className="text-[10px]">
                            {user.is_primary ? 'Primary' : 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BILLS ── */}
        <TabsContent value="bills">
          {/* Filter bar */}
          <Card className="mb-4 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px] space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Search</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Invoice # or customer…" value={billsSearch} onChange={e => setBillsSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Company</p>
                  <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs min-w-[140px]" value={billsCompanyFilter} onChange={e => setBillsCompanyFilter(e.target.value)}>
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.company_name || c.name}>{c.company_name || c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Type</p>
                  <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs min-w-[110px]" value={billsTypeFilter} onChange={e => setBillsTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">From</p>
                  <Input type="date" value={billsDateFrom} onChange={e => setBillsDateFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">To</p>
                  <Input type="date" value={billsDateTo} onChange={e => setBillsDateTo(e.target.value)} className="h-8 text-xs w-[130px]" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setBillsSearch(''); setBillsCompanyFilter(''); setBillsTypeFilter(''); setBillsDateFrom(''); setBillsDateTo(''); }}>
                    <XCircle className="h-3.5 w-3.5" /> Clear
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={exportAllCSV} disabled={filteredBills.length === 0}>
                    <Download className="h-3.5 w-3.5" /> Export All
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Showing <strong>{filteredBills.length}</strong> of <strong>{bills.length}</strong> documents
              </p>
            </CardContent>
          </Card>

          {/* Company-wise accordion */}
          {loading ? (
            <p className="text-muted-foreground text-sm animate-pulse py-8 text-center">Loading…</p>
          ) : Object.keys(billsByCompany).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No documents match your filters.</p>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(billsByCompany)} className="space-y-3">
              {Object.entries(billsByCompany).map(([companyName, companyBills]) => {
                const invoiceCount = companyBills.filter(b => b.type === 'invoice').length;
                const quotationCount = companyBills.filter(b => b.type === 'quotation').length;
                const totalValue = companyBills.reduce((s, b) => s + Number(b.total_amount), 0);
                return (
                  <AccordionItem key={companyName} value={companyName} className="border rounded-xl shadow-sm bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-sm">{companyName}</p>
                            <p className="text-xs text-muted-foreground">
                              {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} · {quotationCount} quotation{quotationCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-sm">₹{totalValue.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">total value</p>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs gap-1.5 shrink-0"
                            onClick={e => { e.stopPropagation(); exportCSV(companyName, companyBills); }}
                          >
                            <Download className="h-3 w-3" /> Export
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-xs">Invoice #</TableHead>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                              <TableHead className="text-xs">GST</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companyBills.map(bill => (
                              <TableRow key={bill.id} className="hover:bg-muted/30 text-sm">
                                <TableCell className="font-mono text-xs">{bill.invoice_number}</TableCell>
                                <TableCell>
                                  <Badge variant={bill.type === 'quotation' ? 'secondary' : 'default'} className="text-[10px] uppercase">
                                    {bill.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{bill.customer_name}</TableCell>
                                <TableCell className="text-right font-semibold">₹{Number(bill.total_amount).toFixed(2)}</TableCell>

                                <TableCell>
                                  <Badge variant={bill.is_gst_bill ? 'outline' : 'secondary'} className="text-[10px]">
                                    {bill.is_gst_bill ? 'GST' : 'Non-GST'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(bill.date_of_bill).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs gap-1"
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
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>
        {/* ── SESSIONS ── */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Active Sessions</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sessions expire after <strong>8 hours</strong> or <strong>30 min idle</strong>. You can terminate any session instantly.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="relative w-64 text-muted-foreground">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
                    <Input 
                      type="search" 
                      placeholder="Search sessions..." 
                      className="pl-8 h-9 text-foreground"
                      value={sessionsSearch}
                      onChange={e => setSessionsSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Active</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> Expired</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> Terminated</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm animate-pulse py-8 text-center">Loading…</p>
              ) : filteredSessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">{sessions.length === 0 ? "No sessions recorded yet." : "No matching sessions found."}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>IP / Browser</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map(s => {
                      const now = new Date();
                      const isTerminated = !!s.terminated_at;
                      const isExpired = !isTerminated && new Date(s.expires_at) < now;
                      const isActive = !isTerminated && !isExpired;

                      const statusIcon = isActive
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : isExpired
                          ? <Clock className="h-4 w-4 text-amber-500" />
                          : <XCircle className="h-4 w-4 text-destructive" />;

                      const browserInfo = s.user_agent
                        ? s.user_agent.includes('Chrome') ? 'Chrome'
                          : s.user_agent.includes('Firefox') ? 'Firefox'
                          : s.user_agent.includes('Safari') ? 'Safari'
                          : 'Browser'
                        : '—';

                      return (
                        <TableRow key={s.id} className={`hover:bg-muted/30 ${!isActive ? 'opacity-60' : ''}`}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {statusIcon}
                              <span className="text-xs font-medium">
                                {isActive ? 'Active' : isExpired ? 'Expired' : 'Terminated'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{s.username || s.user_email}</p>
                              <p className="text-xs text-muted-foreground">{s.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.is_superadmin ? (
                              <Badge variant="default" className="text-[10px]">Superadmin</Badge>
                            ) : (
                              s.company_name || '—'
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.last_active).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.expires_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>
                              <p>{s.ip_address || '—'}</p>
                              <p className="text-[10px]">{browserInfo}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                disabled={terminatingSession === s.id}
                                onClick={() => handleTerminateSession(s.id)}
                              >
                                <XCircle className="h-3 w-3" />
                                {terminatingSession === s.id ? 'Ending…' : 'Terminate'}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {isExpired ? 'Auto-expired' : `By ${s.terminated_by_email || 'system'}`}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
