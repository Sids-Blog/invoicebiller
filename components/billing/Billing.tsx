import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Trash2, Plus, ChevronsUpDown, Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/hooks/use-toast";
import { dbUtils, castRow } from "@/lib/db-utils";
import { getSession } from "@/lib/auth";
import InvoiceTemplate, { Customer } from "@/components/templates/InvoiceTemplate";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BillItem, Product, Bill, SellerInfo } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";

export const Billing = ({ editId: propEditId, onSuccess }: { editId?: string, onSuccess?: () => void } = {}) => {
  const { toast } = useToast();
  const session = getSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = propEditId || searchParams.get("editId");
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState("");
  const company_id = session?.user?.company_id;

  const [createTab, setCreateTab] = useState<"invoice" | "quotation">("invoice");

  // Create Bill states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [discount, setDiscount] = useState(0);
  const [comments, setComments] = useState("");
  const [isGstBill, setIsGstBill] = useState(false);

  const [sgstPercent, setSgstPercent] = useState(9);
  const [cgstPercent, setCgstPercent] = useState(9);
  const [cessPercent, setCessPercent] = useState(0);

  // Shared states
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!company_id) return;
    setLoading(true);

    const productPromise = dbUtils.select("products", {
      where: "company_id = $1",
      params: [session.user.company_id],
      orderBy: "name ASC"
    });

    const sellerInfoPromise = dbUtils.select("seller_info", {
      where: "company_id = $1",
      params: [session.user.company_id]
    });

    const billPromise = editId
      ? dbUtils.select("bills", { where: "id = $1", params: [editId] })
      : Promise.resolve({ data: null, error: null });

    const billItemsPromise = editId
      ? dbUtils.select("bill_items", { where: "bill_id = $1", params: [editId] })
      : Promise.resolve({ data: null, error: null });

    const [productRes, sellerInfoRes, billRes, billItemsRes] = await Promise.all([
      productPromise,
      sellerInfoPromise,
      billPromise,
      billItemsPromise
    ]);

    if (productRes.error) {
      toast({ title: "Error fetching products", description: productRes.error, variant: "destructive" });
    } else {
      setProducts((productRes.data || []).map(p => castRow(p)) as Product[]);
      if (editId && billRes?.data?.[0]) {
        const bill = castRow(billRes.data[0]);
        setCreateTab(bill.type);
        setCustomerName(bill.customer_name || "");
        setCustomerPhone(bill.customer_phone || "");
        setCustomerAddress(bill.customer_address || "");
        setCustomerGstin(bill.customer_gstin || "");
        setDiscount(Number(bill.discount) || 0);
        setIsGstBill(bill.is_gst_bill || false);
        setComments(bill.comments || "");
        setSgstPercent(Number(bill.sgst_percentage) || 9);
        setCgstPercent(Number(bill.cgst_percentage) || 9);
        setCessPercent(Number(bill.cess_percentage) || 0);
        setEditingInvoiceNumber(bill.invoice_number);
      }
      if (editId && billItemsRes?.data) {
        setBillItems(billItemsRes.data.map(item => ({
          ...castRow(item),
          price: Number(item.price),
          quantity: Number(item.quantity)
        })));
      }
    }

    if (sellerInfoRes.error) {
      toast({ title: "Error fetching seller info", description: sellerInfoRes.error, variant: "destructive" });
    } else {
      setSellerInfo(sellerInfoRes.data?.[0] || null);
    }

    setLoading(false);
  }, [session?.user?.id, toast, editId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = () => {
    if (!selectedProduct) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const cgst = product.cgst_rate ?? sellerInfo?.default_cgst_pct ?? 9;
    const sgst = product.sgst_rate ?? sellerInfo?.default_sgst_pct ?? 9;
    const cess = product.cess_rate ?? sellerInfo?.default_cess_pct ?? 0;

    // The price in the product table is inclusive of tax.
    // If GST is enabled, we reduce the price to its taxable base so the final total matches.
    const totalTaxRate = cgst + sgst + cess;
    const finalPrice = isCurrentlyGst ? (product.price / (1 + (totalTaxRate / 100))) : product.price;

    setBillItems([
      ...billItems,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: Number(finalPrice.toFixed(2)),
        unit: product.unit || "pcs",
        hsn_sac: product.hsn_sac,
        hsn_sac_type: product.hsn_sac_type,
        cgst_rate: cgst,
        sgst_rate: sgst,
        cess_rate: cess,
        additional_desc: "",
      },
    ]);
    setSelectedProduct("");
    setProductSearchOpen(false);
  };

  const removeItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...billItems];
    const item = { ...updatedItems[index] };

    if (field === "quantity" || field === "price") {
      item[field] = Number(value) || 0;
    } else {
      (item as any)[field] = value;
    }

    updatedItems[index] = item;
    setBillItems(updatedItems);
  };

  const isCurrentlyGst = createTab === "invoice" && isGstBill;

  const billCalculations = useMemo(() => {
    const subtotal = billItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const taxableValue = subtotal - discount;

    let cgst = 0;
    let sgst = 0;
    let cess = 0;

    if (isCurrentlyGst) {
      billItems.forEach(item => {
        const itemGross = item.quantity * item.price;
        const globalDiscProportion = subtotal > 0 ? (itemGross / subtotal) * discount : 0;
        const itemTaxable = itemGross - globalDiscProportion;

        const effectiveCgstRate = item.cgst_rate ?? 9;
        const effectiveSgstRate = item.sgst_rate ?? 9;
        const effectiveCessRate = item.cess_rate ?? 0;

        cgst += itemTaxable * (effectiveCgstRate / 100);
        sgst += itemTaxable * (effectiveSgstRate / 100);
        cess += itemTaxable * (effectiveCessRate / 100);
      });
    }

    const rawTotal = taxableValue + cgst + sgst + cess;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    return {
      subtotal,
      grandTotal: rawTotal,
      roundedTotal,
      roundOff,
      discount,
      sgst,
      cgst,
      cess,
      taxableValue,
    };
  }, [billItems, discount, isCurrentlyGst, sgstPercent, cgstPercent, cessPercent]);

  const handleCreateBill = async () => {
    if (!session?.user?.id || !company_id) return;
    if (!customerName || billItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter customer name and add at least one item.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate invoice number using the new numbering system
      let generatedInvoiceNumber = editingInvoiceNumber;
      if (!editId) {
        const invoiceNumberRes = await dbUtils.rpc('generate_invoice_number', {
          company_id: company_id,
          type: createTab // 'invoice' or 'quotation'
        });

        if (invoiceNumberRes.error || !invoiceNumberRes.data || invoiceNumberRes.data.length === 0) {
          toast({
            title: "Error generating invoice number",
            description: invoiceNumberRes.error || "Failed to generate invoice number. Please ensure company has a prefix set.",
            variant: "destructive"
          });
          return;
        }

        generatedInvoiceNumber = invoiceNumberRes.data[0].generate_invoice_number;
      }

      const billPayload = {
        company_id,
        created_by: session.user.id,
        invoice_number: generatedInvoiceNumber,
        customer_name: customerName,
        customer_phone: createTab === "invoice" ? customerPhone : "",
        customer_address: createTab === "invoice" ? customerAddress : "",
        customer_gstin: isCurrentlyGst ? customerGstin : "",
        total_amount: billCalculations.roundedTotal,
        round_off_amount: billCalculations.roundOff,
        discount,
        is_gst_bill: isCurrentlyGst,
        cgst_percentage: isCurrentlyGst ? cgstPercent : 0,
        sgst_percentage: isCurrentlyGst ? sgstPercent : 0,
        cess_percentage: isCurrentlyGst ? cessPercent : 0,
        gst_amount: isCurrentlyGst ? (billCalculations.cgst + billCalculations.sgst + billCalculations.cess) : 0,
        subtotal_amount: billCalculations.subtotal,
        taxable_amount: billCalculations.taxableValue,
        cgst_amount: billCalculations.cgst,
        sgst_amount: billCalculations.sgst,
        cess_amount: billCalculations.cess,
        type: createTab,
        comments,
      };

      let billRes;
      if (editId) {
        billRes = await dbUtils.update("bills", { ...billPayload, updated_by: session.user.id }, "id = $1", [editId]);
      } else {
        billRes = await dbUtils.insert("bills", billPayload);
      }

      if (billRes.error || !billRes.data || billRes.data.length === 0) {
        toast({ title: "Error creating bill", description: billRes.error || "Unknown error", variant: "destructive" });
        return;
      }

      const billId = billRes.data[0].id;
      if (editId) {
        await dbUtils.execute("DELETE FROM bill_items WHERE bill_id = $1", [editId]);
      }

      for (const item of billItems) {
        await dbUtils.insert("bill_items", {
          bill_id: billId,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          hsn_sac: item.hsn_sac,
          hsn_sac_type: item.hsn_sac_type,
          cgst_rate: item.cgst_rate,
          sgst_rate: item.sgst_rate,
          cess_rate: item.cess_rate,
          additional_desc: item.additional_desc,
        });
      }

      // Insert an audit log for this creation
      await dbUtils.insert("audit_logs", {
        company_id,
        entity_name: "bills",
        entity_id: billId,
        action: editId ? "UPDATE" : "CREATE",
        actor_id: session.user.id,
        new_data: billPayload,
      });

      toast({ title: editId ? "Bill Updated" : "Bill Created", description: editId ? "Successfully updated bill." : "Successfully created bill." });
      
      // Reset form fields
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerGstin("");
      setBillItems([]);
      setDiscount(0);
      setComments("");

      if (onSuccess) {
        onSuccess();
      } else if (editId) {
        router.push("/history");
      }
    } catch (error: any) {
      console.error("Error creating bill:", error);
      toast({
        title: "Unexpected Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProductSelectionAndTable = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Add Products</h3>
      <div className="flex gap-2">
        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="flex-1 justify-between bg-background">
              {selectedProduct ? products.find(p => p.id === selectedProduct)?.name : "Select a product..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search products..." />
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                <CommandList>
                  {products.map(product => (
                    <CommandItem key={product.id} onSelect={() => setSelectedProduct(product.id)}>
                      <Check className={`mr-2 h-4 w-4 ${selectedProduct === product.id ? "opacity-100" : "opacity-0"}`} />
                      {product.name} - Rs. {product.price} /{product.unit}
                    </CommandItem>
                  ))}
                </CommandList>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        <Button onClick={addItem} disabled={!selectedProduct}><Plus className="w-4 h-4 mr-2" /> Add</Button>
      </div>

      {billItems.length > 0 && (
        <div className="border rounded-md bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="min-w-[150px]">Item</TableHead>
                  {isCurrentlyGst && <TableHead className="w-20 min-w-[80px]">HSN/SAC</TableHead>}
                  <TableHead className="w-20 min-w-[80px]">Qty</TableHead>
                  <TableHead className="w-24 min-w-[100px]">Price</TableHead>
                  {isCurrentlyGst && <TableHead className="w-20 min-w-[80px]">CGST %</TableHead>}
                  {isCurrentlyGst && <TableHead className="w-20 min-w-[80px]">SGST %</TableHead>}
                  {isCurrentlyGst && <TableHead className="w-20 min-w-[80px]">CESS %</TableHead>}
                  <TableHead className="w-24 text-right min-w-[100px]">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium p-2">
                      <Input value={item.product_name} onChange={(e) => handleItemChange(index, "product_name", e.target.value)} className="w-full h-8 text-xs font-medium" />
                      <Input placeholder="Add description..." value={item.additional_desc || ""} onChange={(e) => handleItemChange(index, "additional_desc", e.target.value)} className="w-full h-7 mt-1 text-xs text-muted-foreground" />
                    </TableCell>
                    {isCurrentlyGst && (
                      <TableCell className="p-2">
                        <Input value={item.hsn_sac || ""} onChange={(e) => handleItemChange(index, "hsn_sac", e.target.value)} className="w-full h-8 px-2 text-xs" />
                      </TableCell>
                    )}
                    <TableCell className="p-2">
                      <NumericInput value={item.quantity} onChange={(v) => handleItemChange(index, "quantity", v)} className="w-full h-8 px-2" />
                    </TableCell>
                    <TableCell className="p-2">
                      <NumericInput value={item.price} onChange={(v) => handleItemChange(index, "price", v)} decimals={2} className="w-full h-8 px-2" />
                    </TableCell>
                    {isCurrentlyGst && (
                      <TableCell className="p-2">
                        <NumericInput value={item.cgst_rate ?? 0} onChange={(v) => handleItemChange(index, "cgst_rate", v)} decimals={2} className="w-full h-8 px-2" />
                      </TableCell>
                    )}
                    {isCurrentlyGst && (
                      <TableCell className="p-2">
                        <NumericInput value={item.sgst_rate ?? 0} onChange={(v) => handleItemChange(index, "sgst_rate", v)} decimals={2} className="w-full h-8 px-2" />
                      </TableCell>
                    )}
                    {isCurrentlyGst && (
                      <TableCell className="p-2">
                        <NumericInput value={item.cess_rate ?? 0} onChange={(v) => handleItemChange(index, "cess_rate", v)} decimals={2} className="w-full h-8 px-2" />
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium p-2">
                      {(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Billing & Quotations</h1>
        <p className="text-muted-foreground">Create invoices and quotations.</p>
      </div>

      <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 max-w-[400px]">
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="quotation">Quotation</TabsTrigger>
        </TabsList>

        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-xl">Create New {createTab === "invoice" ? "Invoice" : "Quotation"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">

            {createTab === "invoice" && (
              <div className="flex items-center space-x-6">
                <ToggleSwitch
                  label="Apply GST"
                  id="isGstBill"
                  checked={isGstBill}
                  onChange={(e) => setIsGstBill(e.target.checked)}
                />
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={createTab === "quotation" ? "col-span-2 space-y-2" : "space-y-2"}>
                  <Label>Name *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name" />
                </div>
                {createTab === "invoice" && (
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" />
                  </div>
                )}
                {createTab === "invoice" && (
                  <div className="col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Full Address" rows={2} />
                  </div>
                )}
              </div>

              {isCurrentlyGst && (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Customer GSTIN</Label>
                    <Input value={customerGstin} onChange={e => setCustomerGstin(e.target.value)} placeholder="GST Number" />
                  </div>
                </div>
              )}
            </div>

            {renderProductSelectionAndTable()}

            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Summary</h3>

              {isCurrentlyGst && (
                <div className="grid grid-cols-3 gap-4 mb-4 bg-muted/30 p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label>CGST %</Label>
                    <NumericInput value={cgstPercent} onChange={(v) => setCgstPercent(v)} decimals={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST %</Label>
                    <NumericInput value={sgstPercent} onChange={(v) => setSgstPercent(v)} decimals={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>CESS %</Label>
                    <NumericInput value={cessPercent} onChange={(v) => setCessPercent(v)} decimals={2} />
                  </div>
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-lg space-y-2 border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>Rs. {billCalculations.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount (Rs.):</span>
                  <NumericInput value={discount} onChange={(v) => setDiscount(v)} decimals={2} className="w-24 h-8 text-right bg-background" />
                </div>

                {isCurrentlyGst && (
                  <div className="pt-2 border-t border-border/50 mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taxable Value:</span><span>Rs. {billCalculations.taxableValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>CGST:</span><span>Rs. {billCalculations.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>SGST:</span><span>Rs. {billCalculations.sgst.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {billCalculations.roundOff !== 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                    <span>Round Off:</span>
                    <span>{billCalculations.roundOff > 0 ? '+' : ''}{billCalculations.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2">
                  <span>Grand Total:</span>
                  <span className="text-primary">Rs. {billCalculations.roundedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comments / Notes</Label>
              <Textarea placeholder="Any additional notes..." value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleCreateBill} disabled={loading || billItems.length === 0 || !customerName} className="w-full text-lg h-12" size="lg">
              {loading ? "Processing..." : (editId ? `Edit ${createTab === "invoice" ? "Invoice" : "Quotation"}` : `Generate ${createTab === "invoice" ? "Invoice" : "Quotation"}`)}
            </Button>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};
