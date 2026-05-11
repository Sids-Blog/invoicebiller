'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession, signOut } from "@/lib/auth";
import { dbUtils } from "@/lib/db-utils";
import { Package, FileText, Receipt, TrendingUp, LogOut, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

export const Dashboard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const session = getSession();
  const company_id = session?.user?.company_id;

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [stats, setStats] = useState({
    products: 0,
    quotations: 0,
    invoices: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!company_id) return;
      setLoading(true);

      try {
        // Fetch company name
        const sellerRes = await dbUtils.select("seller_info", {
          where: "company_id = $1",
          params: [company_id]
        });
        
        if (sellerRes.data && sellerRes.data.length > 0) {
          setCompanyName(sellerRes.data[0].company_name || "Your Company");
        } else {
          setCompanyName("Welcome to Laabham Pro");
        }

        // Fetch product count
        const productRes = await dbUtils.execute("SELECT COUNT(*) FROM products WHERE company_id = $1", [company_id]);
        const productsCount = parseInt(productRes.data?.[0]?.count || "0");

        // Fetch quotations count
        const quoteRes = await dbUtils.execute("SELECT COUNT(*) FROM bills WHERE company_id = $1 AND type = 'quotation'", [company_id]);
        const quotationsCount = parseInt(quoteRes.data?.[0]?.count || "0");

        // Fetch invoices count
        const invRes = await dbUtils.execute("SELECT COUNT(*) FROM bills WHERE company_id = $1 AND type = 'invoice'", [company_id]);
        const invoicesCount = parseInt(invRes.data?.[0]?.count || "0");

        setStats({
          products: productsCount,
          quotations: quotationsCount,
          invoices: invoicesCount
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [company_id]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    router.push('/auth');
  };

  const handleResetPassword = () => {
    // Navigate to forgot password flow which will email them a reset link
    signOut();
    router.push('/forgot-password');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <OrbitalLoader message="Loading dashboard data..." />
      </div>
    );
  }

  // Calculate Conversion Ratio
  const totalBills = stats.quotations + stats.invoices;
  const conversionRate = stats.quotations > 0 ? ((stats.invoices / stats.quotations) * 100).toFixed(1) : 0;
  const invoicePercentage = totalBills > 0 ? (stats.invoices / totalBills) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {companyName}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Welcome back, {session?.user?.username || 'User'}!
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleResetPassword} className="gap-2">
            <KeyRound className="h-4 w-4" /> Reset Password
          </Button>
          <Button variant="destructive" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground mt-1">Items in your catalog</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.quotations}</div>
            <p className="text-xs text-muted-foreground mt-1">Drafted estimates</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.invoices}</div>
            <p className="text-xs text-muted-foreground mt-1">Finalized bills</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Report Section */}
      <div className="w-full">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Conversion Report
            </CardTitle>
            <CardDescription>
              Quotation to Invoice conversion ratio analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 h-full">
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Quotations ({stats.quotations})</span>
                  <span className="font-medium text-primary">Invoices ({stats.invoices})</span>
                </div>
                <Progress value={invoicePercentage} className="h-3" />
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {totalBills === 0 ? "No data to display yet." : `Invoices make up ${invoicePercentage.toFixed(1)}% of all generated documents.`}
                </p>
              </div>

              <div className="min-w-[200px] text-center p-6 bg-muted/20 rounded-xl border">
                <div className="text-4xl font-extrabold text-primary mb-2">
                  {conversionRate}%
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  Conversion Ratio
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Invoices / Quotations)
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
