const fs = require('fs');

let content = fs.readFileSync('components/billing/Billing.tsx', 'utf-8');

// 1. Add imports
content = content.replace(
  'import { BillItem, Product, Bill, SellerInfo } from "@/lib/types";',
  'import { BillItem, Product, Bill, SellerInfo } from "@/lib/types";\nimport { useSearchParams, useRouter } from "next/navigation";'
);

// 2. Add search params and edit states
content = content.replace(
  'const session = getSession();',
  'const session = getSession();\n  const searchParams = useSearchParams();\n  const router = useRouter();\n  const editId = searchParams.get("editId");\n  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState("");'
);

// 3. Update fetchData
const fetchDataRegex = /const \[productRes, sellerInfoRes\] = await Promise\.all\(\[\s*productPromise,\s*sellerInfoPromise,\s*\]\);/s;
const fetchLogic = `    const billPromise = editId 
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
    ]);`;
content = content.replace(fetchDataRegex, fetchLogic);

const setProductsRegex = /setProducts\(\(productRes\.data \|\| \[\]\)\.map\(p => castRow\(p\)\) as Product\[\]\);/;
content = content.replace(setProductsRegex, `setProducts((productRes.data || []).map(p => castRow(p)) as Product[]);
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
      }`);

// Add editId to dependency array of fetchData
content = content.replace('}, [session?.user?.id, toast]);', '}, [session?.user?.id, toast, editId]);');

// 4. Update handleCreateBill
content = content.replace(
  'const invoiceNumberRes = await dbUtils.rpc(\'generate_invoice_number\', {',
  'let generatedInvoiceNumber = editingInvoiceNumber;\n    if (!editId) {\n      const invoiceNumberRes = await dbUtils.rpc(\'generate_invoice_number\', {'
);

content = content.replace(
  'const generatedInvoiceNumber = invoiceNumberRes.data[0].generate_invoice_number;',
  'generatedInvoiceNumber = invoiceNumberRes.data[0].generate_invoice_number;\n    }'
);

content = content.replace(
  'const billRes = await dbUtils.insert("bills", billPayload);',
  `let billRes;
    if (editId) {
      billRes = await dbUtils.update("bills", { ...billPayload, updated_by: session.user.id, updated_at: new Date() }, "id = $1", [editId]);
    } else {
      billRes = await dbUtils.insert("bills", billPayload);
    }`
);

content = content.replace(
  'const billId = billRes.data[0].id;',
  `const billId = billRes.data[0].id;
    if (editId) {
      await dbUtils.execute("DELETE FROM bill_items WHERE bill_id = $1", [editId]);
    }`
);

content = content.replace(
  'toast({ title: "Bill Created", description: "Successfully created bill." });',
  'toast({ title: editId ? "Bill Updated" : "Bill Created", description: editId ? "Successfully updated bill." : "Successfully created bill." });\n      if (editId) router.push("/history");'
);

content = content.replace(
  '<Button className="w-full mt-6" onClick={handleCreateBill} disabled={loading}>',
  '<Button className="w-full mt-6" onClick={handleCreateBill} disabled={loading}>\n                {loading ? "Processing..." : (editId ? "Update Bill" : "Create Bill")}'
);
content = content.replace(
  '{loading ? "Creating..." : "Create Bill"}',
  ''
); // remove duplicate children of button since I added one above

fs.writeFileSync('components/billing/Billing.tsx', content);
console.log("Updated Billing.tsx successfully");
