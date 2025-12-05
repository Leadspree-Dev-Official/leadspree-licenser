import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BuyerData {
  id: string;
  account_type: string | null;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  amount: number | null;
  software: { name: string };
}

const AdminBuyerDataPage = () => {
  const [buyerData, setBuyerData] = useState<BuyerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyerData();
  }, []);

  const fetchBuyerData = async () => {
    try {
      const { data, error } = await supabase
        .from("licenses")
        .select("id, account_type, buyer_name, buyer_email, buyer_phone, amount, software(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBuyerData(data || []);
    } catch (error) {
      console.error("Error fetching buyer data:", error);
      toast.error("Failed to load buyer data");
    } finally {
      setLoading(false);
    }
  };

  const getExportData = () => {
    return buyerData.map((item) => ({
      "Account Type": item.account_type === "demo" ? "Demo A/c" : "Buyer A/c",
      "Software Name": item.software?.name || "-",
      "Name": item.buyer_name,
      "Email": item.buyer_email || "-",
      "Phone": item.buyer_phone || "-",
      "Amount": item.amount ?? "-",
    }));
  };

  const downloadCSV = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value);
          return stringValue.includes(",") || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `buyer_data_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV downloaded successfully!");
  };

  const downloadXLSX = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buyer Data");
    
    // Auto-size columns
    const maxWidth = 30;
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map((row) => String(row[key as keyof typeof row]).length))),
    }));
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `buyer_data_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel file downloaded successfully!");
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Buyer Data</h1>
          <p className="text-muted-foreground">View and export all user/buyer information</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={downloadXLSX} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            XLSX
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Buyers</CardTitle>
          <CardDescription>Total: {buyerData.length} records</CardDescription>
        </CardHeader>
        <CardContent>
          {buyerData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No buyer data found</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Software Name</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyerData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={item.account_type === "demo" ? "secondary" : "outline"}>
                            {item.account_type === "demo" ? "Demo A/c" : "Buyer A/c"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{item.software?.name || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.buyer_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.buyer_email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.buyer_phone || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.amount ? item.amount.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBuyerDataPage;
