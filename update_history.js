const fs = require('fs');

let content = fs.readFileSync('components/history/History.tsx', 'utf-8');

// 1. Add imports
content = content.replace(
  'import { BillItem, Bill, SellerInfo } from "@/lib/types";',
  'import { BillItem, Bill, SellerInfo } from "@/lib/types";\nimport { Dialog, DialogContent } from "@/components/ui/dialog";\nimport { Billing } from "@/components/billing/Billing";'
);

// 2. Add state
content = content.replace(
  'const [listTab, setListTab] = useState<"invoice" | "quotation">("invoice");',
  'const [listTab, setListTab] = useState<"invoice" | "quotation">("invoice");\n  const [editingBillId, setEditingBillId] = useState<string | null>(null);'
);

// 3. Update Edit button
content = content.replace(
  'onClick={() => window.location.href = `/billing?editId=${row.original.id}`}',
  'onClick={() => setEditingBillId(row.original.id)}'
);

// 4. Add Dialog to return statement
// Find the end of the component return: </div>\n    </div>\n  );\n}
const returnMatch = content.lastIndexOf('</div>');
content = content.slice(0, returnMatch + 6) + `
      <Dialog open={!!editingBillId} onOpenChange={(open) => !open && setEditingBillId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none bg-background">
          {editingBillId && (
            <Billing 
              editId={editingBillId} 
              onSuccess={() => {
                setEditingBillId(null);
                fetchData();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
` + content.slice(returnMatch + 6);

fs.writeFileSync('components/history/History.tsx', content);
console.log("Updated History.tsx successfully");
