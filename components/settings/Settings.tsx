import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dbUtils } from "@/lib/db-utils";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "@/lib/auth";

import { SellerInfo } from "@/lib/types";

export function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<SellerInfo>({
    company_name: "",
    email: "",
    contact_number: "",
    address: "",
    gst_number: "",
    bank_account_number: "",
    account_holder_name: "",
    account_no: "",
    branch: "",
    ifsc_code: "",
    trade_name: "",
    pan: "",
    upi_id: "",
    logo_url: "",
    payment_terms: "",
    terms_and_conditions: "",
  });

  const session = getSession();
  const company_id = session?.user?.company_id;

  useEffect(() => {
    if (!company_id) return;

    const fetchSettings = async () => {
      const res = await dbUtils.select("seller_info", {
        where: "company_id = $1",
        params: [company_id],
      });
      if (res.data && res.data.length > 0) {
        setInfo(res.data[0]);
      }
    };
    fetchSettings();
  }, [company_id]);

  const handleSave = async () => {
    if (!company_id) return;
    setLoading(true);

    const payload = {
      company_id,
      company_name: info.company_name,
      email: info.email,
      contact_number: info.contact_number,
      address: info.address || null,
      gst_number: info.gst_number || null,
      bank_account_number: info.bank_account_number || null,
      account_holder_name: info.account_holder_name || null,
      account_no: info.account_no || null,
      branch: info.branch || null,
      ifsc_code: info.ifsc_code || null,
      trade_name: info.trade_name || null,
      pan: info.pan || null,
      upi_id: info.upi_id || null,
      logo_url: info.logo_url || null,
      default_cgst_pct: info.default_cgst_pct ?? 9,
      default_sgst_pct: info.default_sgst_pct ?? 9,
      default_cess_pct: info.default_cess_pct ?? 0,
      payment_terms: info.payment_terms || null,
      terms_and_conditions: info.terms_and_conditions || null,
    };

    let result;
    if (info.id) {
      result = await dbUtils.update("seller_info", payload, "id = $1", [info.id]);
    } else {
      result = await dbUtils.insert("seller_info", payload);
    }

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Settings updated successfully!" });
      if (!info.id && result.data && result.data.length > 0) {
        setInfo(result.data[0]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-4xl">
      <Card>
        <CardHeader className="px-4 py-6 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl">Company Settings</CardTitle>
          <p className="text-sm text-muted-foreground">These details appear on your invoices and quotations.</p>
        </CardHeader>
        <CardContent className="space-y-6 px-4 py-2 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={info.company_name}
                onChange={(e) => setInfo({ ...info, company_name: e.target.value })}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                value={info.email}
                onChange={(e) => setInfo({ ...info, email: e.target.value })}
                placeholder="billing@yourcompany.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number *</Label>
              <Input
                value={info.contact_number}
                onChange={(e) => setInfo({ ...info, contact_number: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={info.gst_number || ""}
                onChange={(e) => setInfo({ ...info, gst_number: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label>Trade Name (Optional)</Label>
              <Input
                value={info.trade_name || ""}
                onChange={(e) => setInfo({ ...info, trade_name: e.target.value })}
                placeholder="Trade Name"
              />
            </div>
            <div className="space-y-2">
              <Label>PAN (Optional)</Label>
              <Input
                value={info.pan || ""}
                onChange={(e) => setInfo({ ...info, pan: e.target.value })}
                placeholder="ABCDE1234F"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Logo URL</Label>
              <Input
                value={info.logo_url || ""}
                onChange={(e) => setInfo({ ...info, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={info.address}
                onChange={(e) => setInfo({ ...info, address: e.target.value })}
                placeholder="123 Main Street, City, State - 600001"
                rows={2}
              />
            </div>
          </div>

          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mt-8 mb-2">Default Product Tax Rates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label>Default CGST %</Label>
              <NumericInput
                value={info.default_cgst_pct ?? 0}
                onChange={(v) => setInfo({ ...info, default_cgst_pct: v })}
                decimals={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Default SGST %</Label>
              <NumericInput
                value={info.default_sgst_pct ?? 0}
                onChange={(v) => setInfo({ ...info, default_sgst_pct: v })}
                decimals={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Default CESS %</Label>
              <NumericInput
                value={info.default_cess_pct ?? 0}
                onChange={(v) => setInfo({ ...info, default_cess_pct: v })}
                decimals={2}
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pt-6 border-t mt-6">Bank Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input
                value={info.account_holder_name}
                onChange={(e) => setInfo({ ...info, account_holder_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={info.account_no}
                onChange={(e) => setInfo({ ...info, account_no: e.target.value })}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank & Branch Name</Label>
              <Input
                value={info.branch}
                onChange={(e) => setInfo({ ...info, branch: e.target.value })}
                placeholder="State Bank of India, Chennai"
              />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input
                value={info.ifsc_code || ""}
                onChange={(e) => setInfo({ ...info, ifsc_code: e.target.value })}
                placeholder="SBIN0001234"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>UPI ID</Label>
              <Input
                value={info.upi_id || ""}
                onChange={(e) => setInfo({ ...info, upi_id: e.target.value })}
                placeholder="merchant@upi"
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pt-6 border-t mt-6">Invoice Terms</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea
                value={info.payment_terms || ""}
                onChange={(e) => setInfo({ ...info, payment_terms: e.target.value })}
                placeholder="e.g. Payment due within 30 days of invoice date."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={info.terms_and_conditions || ""}
                onChange={(e) => setInfo({ ...info, terms_and_conditions: e.target.value })}
                placeholder="e.g. Goods/services once delivered are non-refundable. Disputes subject to local jurisdiction."
                rows={3}
              />
            </div>
          </div>

          <Button
            className="w-full mt-6"
            onClick={handleSave}
            disabled={loading || !info.company_name || !info.email || !info.contact_number}
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
