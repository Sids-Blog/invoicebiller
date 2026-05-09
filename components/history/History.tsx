'use client';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { dbUtils, castRow } from "@/lib/db-utils";
import { getSession } from "@/lib/auth";
import InvoiceTemplate, { Customer } from "@/components/templates/InvoiceTemplate";
import { createRoot } from "react-dom/client";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { BillItem, Bill, SellerInfo } from "@/lib/types";
export const History = () => {
  const { toast } = useToast();
  const session = getSession();
  const company_id = session?.user?.company_id;

  const [listTab, setListTab] = useState<"invoice" | "quotation">("invoice");
  const [bills, setBills] = useState<Bill[]>([]);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterName, setFilterName] = useState("");
  const [filterNumber, setFilterNumber] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const LIMIT = 15;

  const fetchData = useCallback(async () => {
    if (!company_id) return;
    setLoading(true);

    let query = `
      FROM bills b
      LEFT JOIN users c ON b.created_by = c.id
      LEFT JOIN users u ON b.updated_by = u.id
      WHERE b.company_id = $1 AND b.type = $2
    `;
    const params: any[] = [session.user.company_id, listTab];
    let paramIndex = 3;

    if (filterName) {
      query += ` AND b.customer_name ILIKE $${paramIndex++}`;
      params.push(`%${filterName}%`);
    }
    if (filterNumber) {
      query += ` AND b.invoice_number ILIKE $${paramIndex++}`;
      params.push(`%${filterNumber}%`);
    }
    if (filterDateFrom) {
      query += ` AND b.date_of_bill >= $${paramIndex++}`;
      params.push(filterDateFrom);
    }
    if (filterDateTo) {
      query += ` AND b.date_of_bill <= $${paramIndex++}`;
      params.push(filterDateTo);
    }

    const countPromise = dbUtils.execute(`SELECT COUNT(*) ${query}`, params);

    query += ` ORDER BY b.date_of_bill DESC LIMIT ${LIMIT} OFFSET ${(page - 1) * LIMIT}`;
    const billsPromise = dbUtils.execute(`
      SELECT b.*, c.username as created_by_username, u.username as updated_by_username
      ${query}
    `, params);

    const sellerInfoPromise = page === 1 
      ? dbUtils.select("seller_info", {
          where: "company_id = $1",
          params: [session.user.company_id]
        })
      : Promise.resolve({ data: null, error: null });

    const [billsRes, countRes, sellerInfoRes] = await Promise.all([
      billsPromise,
      countPromise,
      sellerInfoPromise,
    ]);

    if (billsRes.error) {
      toast({ title: "Error fetching bills", description: billsRes.error, variant: "destructive" });
    } else {
      const parsedBills = (billsRes.data || []).map(b => castRow(b)) as Bill[];
      setBills(parsedBills);
      if (countRes.data?.[0]) {
        setTotalBills(parseInt(countRes.data[0].count || "0"));
      }
    }

    if (sellerInfoRes.data && !sellerInfoRes.error && sellerInfoRes.data[0]) {
      setSellerInfo(sellerInfoRes.data[0]);
    }

    setLoading(false);
  }, [session?.user?.id, session?.user?.company_id, listTab, page, filterName, filterNumber, filterDateFrom, filterDateTo, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const previewInvoice = async (billDetails: Bill) => {
    // Fetch bill items
    const res = await dbUtils.select("bill_items", { where: "bill_id = $1", params: [billDetails.id] });
    if (res.error) {
      toast({ title: "Error fetching items", description: res.error, variant: "destructive" });
      return;
    }
    const items = res.data as BillItem[];

    const customerDetails: Customer = {
      name: billDetails.customer_name,
      address: billDetails.customer_address,
    };

    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0,0,0,0.8); z-index: 10000;
      display: flex; justify-content: center; align-items: center;
      overflow-y: auto; padding: 20px; box-sizing: border-box;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      background-color: white; width: 210mm; min-height: 297mm;
      position: relative; margin: auto; overflow: visible;
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const controlPanel = document.createElement("div");
    controlPanel.style.cssText = `
      position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 10002;
    `;

    const downloadButton = document.createElement("button");
    downloadButton.innerHTML = "📥 Download PDF";
    downloadButton.style.cssText = `
      background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;
    `;

    const closeButton = document.createElement("button");
    closeButton.innerHTML = "✕ Close";
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
        downloadButton.innerHTML = "⏳ Generating...";
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().from(content).set({
          margin: 0.4,
          filename: `${billDetails.type}_${billDetails.invoice_number}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
        downloadButton.innerHTML = "📥 Download PDF";
      } catch (err) {
        console.error(err);
        downloadButton.innerHTML = "Error!";
      }
    };

    closeButton.onclick = cleanup;
    controlPanel.appendChild(downloadButton);
    controlPanel.appendChild(closeButton);
    modal.appendChild(controlPanel);

    // Fallbacks for historical bills prior to schema update
    let subtotal = Number(billDetails.subtotal_amount);
    let taxableValue = Number(billDetails.taxable_amount);
    let cgst = Number(billDetails.cgst_amount);
    let sgst = Number(billDetails.sgst_amount);
    let cess = Number(billDetails.cess_amount);
    const globalDiscount = Number(billDetails.discount || 0);

    // Legacy calculation fallback
    if (!subtotal && items.length > 0) {
      subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
      taxableValue = subtotal - globalDiscount;
      if (billDetails.is_gst_bill) {
        items.forEach(item => {
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

    root.render(
      <InvoiceTemplate
        billCalculations={{
          sgst, cgst, cess, taxableValue, subtotal, grandTotal: billDetails.total_amount, discount: globalDiscount
        }}
        billDetails={billDetails}
        items={items}
        customerDetails={customerDetails}
        sellerInfo={sellerInfo || undefined}
      />
    );

    modal.onclick = (e) => {
      if (e.target === modal) cleanup();
    };
  };

  const columns: ColumnDef<Bill>[] = [
    {
      accessorKey: "invoice_number",
      header: "Number",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.original.invoice_number}</span>
          <Badge variant={row.original.type === "quotation" ? "secondary" : "default"} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wider">
            {row.original.type}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
    },
    {
      accessorKey: "date_of_bill",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date_of_bill || row.original.created_at).toLocaleDateString()
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => <span className="font-bold">Rs. {Number(row.getValue("total_amount")).toFixed(2)}</span>
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => previewInvoice(row.original)} className="h-8 gap-1 shadow-sm">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      )
    }
  ];

  const renderList = (type: "invoice" | "quotation") => {
    return (
      <DataTable
        columns={columns}
        data={bills}
        loading={loading}
        pageCount={Math.ceil(totalBills / LIMIT)}
        pagination={{ pageIndex: page - 1, pageSize: LIMIT }}
        onPaginationChange={(updater) => {
          if (typeof updater === "function") {
            const newState = updater({ pageIndex: page - 1, pageSize: LIMIT });
            setPage(newState.pageIndex + 1);
          } else {
            setPage(updater.pageIndex + 1);
          }
        }}
        manualPagination
      />
    );
  };

  const clearFilters = () => {
    setFilterName("");
    setFilterNumber("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setIsFilterOpen(false);
  };

  const activeFilterCount = [filterName, filterNumber, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">View and manage past invoices and quotations.</p>
      </div>

      <Card className="shadow-sm flex flex-col min-h-[600px]">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Document List</CardTitle>
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 relative">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 min-w-[16px] flex items-center justify-center text-[10px] rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">Filter Documents</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Customer Name</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name" 
                        value={filterName} 
                        onChange={(e) => setFilterName(e.target.value)} 
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Document Number</Label>
                    <Input 
                      placeholder="e.g. INV2024..." 
                      value={filterNumber} 
                      onChange={(e) => setFilterNumber(e.target.value)} 
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">From Date</Label>
                      <Input 
                        type="date" 
                        value={filterDateFrom} 
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">To Date</Label>
                      <Input 
                        type="date" 
                        value={filterDateTo} 
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                      Clear
                    </Button>
                    <Button size="sm" onClick={() => setIsFilterOpen(false)} className="h-8 text-xs">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-muted/5">
          <Tabs value={listTab} onValueChange={(v) => { setListTab(v as any); setPage(1); }} className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-background">
              <TabsList className="w-full grid grid-cols-2 max-w-[400px]">
                <TabsTrigger value="invoice">Invoices</TabsTrigger>
                <TabsTrigger value="quotation">Quotations</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-auto">
              <TabsContent value="invoice" className="m-0 border-none outline-none">
                {renderList("invoice")}
              </TabsContent>
              <TabsContent value="quotation" className="m-0 border-none outline-none">
                {renderList("quotation")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
