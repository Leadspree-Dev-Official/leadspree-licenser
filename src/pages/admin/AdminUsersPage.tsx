import UsersManagement from "@/components/admin/UsersManagement";

const AdminUsersPage = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reseller Management</h1>
        <p className="text-muted-foreground">Manage reseller accounts and permissions</p>
      </div>
      <UsersManagement />
    </div>
  );
};

export default AdminUsersPage;
