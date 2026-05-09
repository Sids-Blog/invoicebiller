import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbUtils, castRow } from "@/lib/db-utils";
import { getSession } from "@/lib/auth";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  hsn_sac?: string;
  hsn_sac_type?: 'HSN' | 'SAC';
  cgst_rate?: number;
  sgst_rate?: number;
  cess_rate?: number;
}

const MandatoryLabel = ({ children }: { children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Label>
        {children} <span className="text-destructive">*</span>
      </Label>
    </TooltipTrigger>
    <TooltipContent>
      <p>This field is required</p>
    </TooltipContent>
  </Tooltip>
);

export const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 15;
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    unit: "pcs",
    hsn_sac: "",
    hsn_sac_type: "HSN",
    cgst_rate: 9,
    sgst_rate: 9,
    cess_rate: 0,
  });

  const session = getSession();
  const company_id = session?.user?.company_id;

  const fetchData = useCallback(async () => {
    if (!company_id) return;
    setLoading(true);
    
    let whereClause = "company_id = $1";
    let params: any[] = [company_id];
    let countParams: any[] = [company_id];
    let countQuery = "SELECT COUNT(*) FROM products WHERE company_id = $1";

    if (searchQuery.trim()) {
      whereClause += " AND name ILIKE $2";
      params.push(`%${searchQuery.trim()}%`);
      countQuery += " AND name ILIKE $2";
      countParams.push(`%${searchQuery.trim()}%`);
    }

    const [prodRes, countRes, sellerRes] = await Promise.all([
      dbUtils.select("products", { 
        where: whereClause, 
        params: params, 
        orderBy: `name ASC LIMIT ${LIMIT} OFFSET ${(page - 1) * LIMIT}` 
      }),
      dbUtils.execute(countQuery, countParams),
      page === 1 ? dbUtils.select("seller_info", { where: "company_id = $1", params: [company_id] }) : Promise.resolve({ data: null, error: null })
    ]);

    if (prodRes.error) {
      toast({ title: "Error fetching products", description: prodRes.error, variant: "destructive" });
    } else {
      setProducts((prodRes.data || []).map((p: any) => castRow(p)) as Product[]);
    }

    if (countRes.data?.[0]) {
      setTotalProducts(parseInt(countRes.data[0].count || "0"));
    }

    if (sellerRes.data && !sellerRes.error && sellerRes.data[0]) {
      setSellerInfo(sellerRes.data[0]);
    }

    setLoading(false);
  }, [company_id, page, toast, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleFormDataChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        unit: product.unit || "pcs",
        hsn_sac: product.hsn_sac || "",
        hsn_sac_type: product.hsn_sac_type || "HSN",
        cgst_rate: product.cgst_rate ?? 0,
        sgst_rate: product.sgst_rate ?? 0,
        cess_rate: product.cess_rate ?? 0,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        price: 0,
        unit: "pcs",
        hsn_sac: "",
        hsn_sac_type: "HSN",
        cgst_rate: sellerInfo?.default_cgst_pct ?? 9,
        sgst_rate: sellerInfo?.default_sgst_pct ?? 9,
        cess_rate: sellerInfo?.default_cess_pct ?? 0,
      });
    }
    setIsDialogOpen(true);
  };

  const saveProduct = async () => {
    if (!company_id) return;
    
    if (!formData.name || formData.price < 0 || !formData.unit) {
      toast({
        title: "Error",
        description: "Please fill all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      company_id,
      name: formData.name,
      price: formData.price,
      unit: formData.unit,
      hsn_sac: formData.hsn_sac,
      hsn_sac_type: formData.hsn_sac_type,
      cgst_rate: formData.cgst_rate,
      sgst_rate: formData.sgst_rate,
      cess_rate: formData.cess_rate,
    };

    let error;
    if (editingProduct) {
      const result = await dbUtils.update("products", payload, "id = $1", [editingProduct.id]);
      error = result.error;
    } else {
      const result = await dbUtils.insert("products", payload);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error saving product",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Product ${editingProduct ? "updated" : "added"} successfully.`,
      });
      fetchData();
      setIsDialogOpen(false);
      setEditingProduct(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await dbUtils.execute("DELETE FROM products WHERE id = $1", [productId]);
    if (error) {
      toast({
        title: "Error deleting product",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Product deleted successfully." });
      fetchData();
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "unit",
      header: "Unit",
    },
    {
      accessorKey: "hsn_sac",
      header: "HSN/SAC",
      cell: ({ row }) => row.original.hsn_sac ? `${row.original.hsn_sac} (${row.original.hsn_sac_type})` : "-",
    },
    {
      id: "gst",
      header: "GST",
      cell: ({ row }) => {
        const p = row.original;
        const totalGst = (p.cgst_rate || 0) + (p.sgst_rate || 0);
        const cess = p.cess_rate || 0;
        return `${totalGst}%${cess > 0 ? ` + ${cess}% Cess` : ''}`;
      }
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price"));
        return `Rs. ${amount.toFixed(2)}`;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openDialog(product)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Add Product</Button></DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Modify existing product specifications." : "Add a new item to your business inventory."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <MandatoryLabel>Product Name</MandatoryLabel>
                <Input id="name" value={formData.name} onChange={(e) => handleFormDataChange("name", e.target.value)} placeholder="Enter product name" />
              </div>
              <div className="space-y-2">
                <MandatoryLabel>Unit</MandatoryLabel>
                <Input id="unit" value={formData.unit} onChange={(e) => handleFormDataChange("unit", e.target.value)} placeholder="e.g. pcs, kg, hrs" />
              </div>
              <div className="space-y-2">
                <MandatoryLabel>Unit Price (Rs.)</MandatoryLabel>
                <NumericInput id="price" value={formData.price} onChange={(v) => handleFormDataChange("price", v)} placeholder="0.00" decimals={2} className="w-full" />
              </div>
            </div>
            <div className="grid gap-4 py-2 grid-cols-2">
              <div className="space-y-2">
                <Label>HSN / SAC</Label>
                <Input value={formData.hsn_sac} onChange={(e) => handleFormDataChange("hsn_sac", e.target.value)} placeholder="Code" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.hsn_sac_type} onChange={(e) => handleFormDataChange("hsn_sac_type", e.target.value)}>
                  <option value="HSN">HSN</option>
                  <option value="SAC">SAC</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 py-2 grid-cols-3">
              <div className="space-y-2">
                <Label>CGST %</Label>
                <NumericInput value={formData.cgst_rate} onChange={(v) => handleFormDataChange("cgst_rate", v)} decimals={2} />
              </div>
              <div className="space-y-2">
                <Label>SGST %</Label>
                <NumericInput value={formData.sgst_rate} onChange={(v) => handleFormDataChange("sgst_rate", v)} decimals={2} />
              </div>
              <div className="space-y-2">
                <Label>CESS %</Label>
                <NumericInput value={formData.cess_rate} onChange={(v) => handleFormDataChange("cess_rate", v)} decimals={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveProduct} className="flex-1">{editingProduct ? "Update" : "Add"} Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        pageCount={Math.ceil(totalProducts / LIMIT)}
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
    </div>
  );
};
