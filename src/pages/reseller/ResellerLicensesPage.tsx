import LicenseGeneration from "@/components/reseller/LicenseGeneration";

const ResellerLicensesPage = () => {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Generate License</h1>
        <p className="text-muted-foreground">Create new license keys for your customers</p>
      </div>
      <LicenseGeneration />
    </div>
  );
};

export default ResellerLicensesPage;
