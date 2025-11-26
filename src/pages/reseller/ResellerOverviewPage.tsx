import ResellerOverview from "@/components/reseller/ResellerOverview";

const ResellerOverviewPage = () => {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Quick summary of your licenses and allocations</p>
      </div>
      <ResellerOverview />
    </div>
  );
};

export default ResellerOverviewPage;
